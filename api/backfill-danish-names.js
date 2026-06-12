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

async function fetchDanishWikipediaName(species, name) {
  return (
    (await langlinkDa(species)) ||
    (await langlinkDa(name)) ||
    (await daExactTitle(species)) ||
    (await daExactTitle(name)) ||
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

      // Fall back to Claude if Wikipedia has no Danish page
      if (!common_name_da) {
        source = 'claude'
        const message = await client.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 64,
          messages: [{
            role: 'user',
            content: `What is the Danish name for the plant "${searchName.replace(/"/g, '')}"? Use the name as it appears in Danish garden centres (Plantorama, Bauhaus havecentre) if you know it. If not, use the name from the Danish Wikipedia page or Dansk Botanisk Forening. Reply with ONLY the name — never refuse, always give your best answer.`
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
