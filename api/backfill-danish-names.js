import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

async function langlinkDa(title) {
  if (!title) return null
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&redirects=1&titles=${encodeURIComponent(title)}&prop=langlinks&lllang=da&format=json&origin=*`
    const res = await fetch(url, { headers: { accept: 'application/json' } })
    if (!res.ok) return null
    const json = await res.json()
    const page = Object.values(json?.query?.pages ?? {})[0]
    return page?.langlinks?.[0]?.['*'] || null
  } catch {
    return null
  }
}

// Exact title lookup on da.wikipedia, following redirects. Danish Wikipedia
// typically redirects scientific names to the Danish common-name title, so
// this is precise — it cannot land on an unrelated article.
async function daExactTitle(title) {
  if (!title) return null
  try {
    const url = `https://da.wikipedia.org/w/api.php?action=query&redirects=1&titles=${encodeURIComponent(title)}&format=json&origin=*`
    const res = await fetch(url, { headers: { accept: 'application/json' } })
    if (!res.ok) return null
    const json = await res.json()
    const page = Object.values(json?.query?.pages ?? {})[0]
    if (!page || page.missing !== undefined || page.invalid !== undefined) return null
    return page.title || null
  } catch {
    return null
  }
}

// GBIF vernacular names — global biodiversity database with Danish names from
// herbaria and garden collections. Covers many plants absent from da.wikipedia.
async function gbifDanishName(scientificName) {
  if (!scientificName) return null
  try {
    const matchRes = await fetch(
      `https://api.gbif.org/v1/species?name=${encodeURIComponent(scientificName)}&limit=1`,
      { headers: { accept: 'application/json' } }
    )
    if (!matchRes.ok) return null
    const matchJson = await matchRes.json()
    const key = matchJson?.results?.[0]?.key
    if (!key) return null
    const vernRes = await fetch(
      `https://api.gbif.org/v1/species/${key}/vernacularNames?language=dan&limit=10`,
      { headers: { accept: 'application/json' } }
    )
    if (!vernRes.ok) return null
    const vernJson = await vernRes.json()
    const hit = vernJson?.results?.find((r) => r.language === 'dan')
    return hit?.vernacularName || null
  } catch {
    return null
  }
}

// Fuzzy search fallback — only trusted when the matched article actually
// mentions the queried name, otherwise the top hit can be an unrelated plant.
async function searchDaWiki(query) {
  if (!query) return null
  try {
    const url = `https://da.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(`"${query}"`)}&srlimit=1&format=json&origin=*`
    const res = await fetch(url, { headers: { accept: 'application/json' } })
    if (!res.ok) return null
    const json = await res.json()
    const hit = json?.query?.search?.[0]
    if (!hit) return null
    const haystack = `${hit.title} ${hit.snippet ?? ''}`.toLowerCase()
    if (!haystack.includes(query.toLowerCase())) return null
    return hit.title
  } catch {
    return null
  }
}

async function getEnglishCommonNameFromWiki(title) {
  if (!title) return null
  try {
    const rRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&redirects=1&titles=${encodeURIComponent(title)}&format=json&origin=*`,
      { headers: { accept: 'application/json' } }
    )
    if (!rRes.ok) return null
    const rJson = await rRes.json()
    const page = Object.values(rJson?.query?.pages ?? {})[0]
    if (!page || page.missing !== undefined) return null
    const resolved = page.title || title

    const sumRes = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(resolved)}`,
      { headers: { accept: 'application/json' } }
    )
    if (!sumRes.ok) return null
    const json = await sumRes.json()
    const extract = json?.extract || ''
    const patterns = [
      /(?:also|commonly|informally|colloquially)\s+known\s+as\s+(?:the\s+)?([^,\.;(]+)/i,
      /known\s+(?:informally|colloquially|commonly|also)\s+as\s+(?:the\s+)?([^,\.;(]+)/i,
      /known\s+as\s+(?:the\s+)?([^,\.;(]+)/i,
      /(?:also|commonly|informally)\s+called\s+(?:the\s+)?([^,\.;(]+)/i,
    ]
    for (const re of patterns) {
      const m = extract.match(re)
      if (m) return m[1].trim().toLowerCase().split(/\s+or\s+/)[0].trim()
    }
    return null
  } catch {
    return null
  }
}

async function fetchDanishWikipediaName(species, name) {
  return (
    (await langlinkDa(species)) ||
    (await langlinkDa(name)) ||
    (await daExactTitle(species)) ||
    (await daExactTitle(name)) ||
    (await gbifDanishName(species)) ||
    (await gbifDanishName(name)) ||
    (await searchDaWiki(species)) ||
    (await searchDaWiki(name)) ||
    null
  )
}

export default async function handler(req, res) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

  if (!apiKey) return res.status(500).json({ error: 'Missing ANTHROPIC_API_KEY' })
  if (!supabaseUrl || !supabaseKey) return res.status(500).json({ error: 'Missing Supabase credentials' })

  const supabase = createClient(supabaseUrl, supabaseKey)
  const client = new Anthropic({ apiKey })

  const { data: plants, error } = await supabase
    .from('plants')
    .select('id, name, species')

  if (error) return res.status(500).json({ error: error.message })
  if (!plants?.length) return res.json({ updated: 0, message: 'No plants found.' })

  const results = []

  for (const plant of plants) {
    const searchName = plant.species || plant.name
    try {
      // Try Wikipedia first — its Danish page title is the recognised common name
      let source = 'wikipedia'
      let common_name_da = await fetchDanishWikipediaName(plant.species, plant.name)

      // Fall back: extract the English common name from Wikipedia intro, then
      // translate only that specific name. Far more reliable than asking Claude
      // to both recall and translate from training data.
      if (!common_name_da) {
        source = 'wiki-translate'
        const enCommonName = await getEnglishCommonNameFromWiki(plant.species || plant.name)
        if (enCommonName) {
          const message = await client.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 32,
            messages: [{
              role: 'user',
              content: `Translate the plant name "${enCommonName.replace(/"/g, '')}" to Danish exactly as Danish garden centres (Plantorama, Bauhaus) use it. Direct literal translation only — "fishbone cactus" → "Fiskebenskaktus", "spider plant" → "Edderkoppeplante", "peace lily" → "Fredslilje". Reply with ONLY the Danish name, nothing else.`
            }]
          })
          common_name_da = message.content?.[0]?.text?.trim() || null
        }
      }

      // Last resort: ask Claude to infer both the English name and translate it
      if (!common_name_da) {
        source = 'claude'
        const message = await client.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 64,
          messages: [{
            role: 'user',
            content: `For the plant "${searchName.replace(/"/g, '')}":
Step 1 – What is its most widely used English common name or trade name? (e.g. "fishbone cactus", "spider plant", "peace lily")
Step 2 – Translate that English name to Danish exactly as Danish garden centres (Plantorama, Bauhaus) do. Direct, literal translations: "fishbone cactus" → "Fiskebenskaktus", "spider plant" → "Edderkoppeplante", "peace lily" → "Fredslilje".

Reply with ONLY the final Danish name. Never invent a name — always derive it from the English trade name.`
          }],
        })
        common_name_da = message.content?.[0]?.text?.trim() || null
      }

      if (common_name_da) {
        await supabase.from('plants').update({ common_name_da }).eq('id', plant.id)
        results.push({ id: plant.id, name: plant.name, common_name_da, source })
      }
    } catch (err) {
      results.push({ id: plant.id, name: plant.name, error: err.message })
    }
  }

  return res.json({ updated: results.filter(r => !r.error).length, results })
}
