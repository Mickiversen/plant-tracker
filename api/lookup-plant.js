import Anthropic from '@anthropic-ai/sdk'

// Fetch a representative photo from Wikipedia (free, no API key)
async function fetchPlantPhoto(title) {
  if (!title) return null
  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
      { headers: { accept: 'application/json' } }
    )
    if (!res.ok) return null
    const json = await res.json()
    return json.originalimage?.source || json.thumbnail?.source || null
  } catch {
    return null
  }
}

// Look up the Danish-language Wikipedia link from an English page (resolving redirects)
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

// Search the Danish Wikipedia directly for a scientific name — its article title
// is the recognised Danish common name. Catches plants whose English page has no
// Danish langlink (e.g. Disocactus/Epiphyllum anguliger → "Fiskebenskaktus").

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

// Resolve the best Danish name, most precise source first.
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
  const name = req.query?.name?.trim()

  if (!name || name.length < 2) {
    return res.json({ data: null })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ data: null, error: 'Missing ANTHROPIC_API_KEY' })
  }

  const client = new Anthropic({ apiKey })

  const prompt = `You are a plant care expert. Given a plant name, return care data as a JSON object.

Fields to return (always provide a best-estimate value for every field — only use null if truly not applicable):
- common_name_da: the Danish name. First identify the most widely used ENGLISH common/trade name (e.g. "fishbone cactus", "spider plant"), then translate it to Danish exactly as Danish garden centres do — direct, literal translations: "fishbone cactus" → "Fiskebenskaktus", "spider plant" → "Edderkoppeplante", "peace lily" → "Fredslilje". Never invent a name from botanical features. Always provide your best answer.
- species: scientific name string
- water_every_days: integer (how often to water in days)
- light_level: one of "low", "medium", "high", "direct"
- soil_type: short string describing ideal soil
- fertilize_every_days: integer — typical fertilizing cadence in days during the growing season (e.g. 14, 30). Always provide a realistic number for a healthy houseplant; do not return null unless the plant genuinely should never be fertilized.
- light_ppfd: recommended photosynthetic photon flux density as a short range string with units, e.g. "100-300 µmol/m²/s"
- light_dli: recommended daily light integral as a short range string with units, e.g. "4-6 mol/m²/day"
- humidity_min: minimum preferred relative humidity as an integer percentage (e.g. 40)
- humidity_max: maximum preferred relative humidity as an integer percentage (e.g. 70)
- temp_min: minimum preferred temperature in Celsius as an integer (e.g. 15)
- temp_max: maximum preferred temperature in Celsius as an integer (e.g. 30)
- repot_every_days: how often to repot in days as an integer (e.g. 548 for ~18 months). Always provide a realistic number.
- notes: one short sentence of care advice

If the plant is not a real or recognisable plant, return the JSON value null (not an object).

Respond with ONLY valid JSON — no explanation, no markdown code fences.

Plant name: "${name.replace(/"/g, '')}"`

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    })

    let text = message.content?.[0]?.text ?? ''
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()

    let data
    try {
      data = JSON.parse(text)
    } catch {
      return res.json({ data: null, error: 'parse_failed', raw: text })
    }

    if (data) {
      // Override common_name_da with the real Danish Wikipedia title when available —
      // far more reliable than the AI's training data for less common plants
      const wikiDaName = await fetchDanishWikipediaName(data.species, name)
      if (wikiDaName) data.common_name_da = wikiDaName

      // Attach photo
      data.photo_url =
        (await fetchPlantPhoto(data.species)) || (await fetchPlantPhoto(name)) || null
    }

    return res.json({ data })
  } catch (err) {
    return res.status(500).json({ data: null, error: err.message })
  }
}
