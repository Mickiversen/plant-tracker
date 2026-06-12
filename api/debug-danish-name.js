// Diagnostic endpoint — shows exactly what each Danish-name lookup step returns
// for a given plant, so we can see where the chain fails.
// Usage: /api/debug-danish-name?name=Epiphyllum%20anguliger

async function fetchJson(url) {
  try {
    const res = await fetch(url, { headers: { accept: 'application/json' } })
    if (!res.ok) return { ok: false, status: res.status }
    return { ok: true, json: await res.json() }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

async function langlinkDa(title) {
  if (!title) return { result: null, raw: 'no title' }
  const url = `https://en.wikipedia.org/w/api.php?action=query&redirects=1&titles=${encodeURIComponent(title)}&prop=langlinks&lllang=da&format=json&origin=*`
  const r = await fetchJson(url)
  if (!r.ok) return { result: null, raw: r }
  const page = Object.values(r.json?.query?.pages ?? {})[0]
  return { result: page?.langlinks?.[0]?.['*'] || null, resolvedEnTitle: page?.title, redirects: r.json?.query?.redirects }
}

async function daExactTitle(title) {
  if (!title) return { result: null, raw: 'no title' }
  const url = `https://da.wikipedia.org/w/api.php?action=query&redirects=1&titles=${encodeURIComponent(title)}&format=json&origin=*`
  const r = await fetchJson(url)
  if (!r.ok) return { result: null, raw: r }
  const page = Object.values(r.json?.query?.pages ?? {})[0]
  const missing = page?.missing !== undefined || page?.invalid !== undefined
  return { result: missing ? null : (page?.title || null), missing, redirects: r.json?.query?.redirects }
}

async function gbifDanishName(scientificName) {
  if (!scientificName) return { result: null, raw: 'no name' }
  try {
    const matchRes = await fetch(
      `https://api.gbif.org/v1/species?name=${encodeURIComponent(scientificName)}&limit=1`,
      { headers: { accept: 'application/json' } }
    )
    if (!matchRes.ok) return { result: null, raw: { status: matchRes.status } }
    const matchJson = await matchRes.json()
    const key = matchJson?.results?.[0]?.key
    if (!key) return { result: null, raw: 'no match key', topResult: matchJson?.results?.[0] }
    const vernRes = await fetch(
      `https://api.gbif.org/v1/species/${key}/vernacularNames?language=dan&limit=10`,
      { headers: { accept: 'application/json' } }
    )
    if (!vernRes.ok) return { result: null, raw: { status: vernRes.status } }
    const vernJson = await vernRes.json()
    const hit = vernJson?.results?.find((r) => r.language === 'dan')
    return { result: hit?.vernacularName || null, allDanish: vernJson?.results?.filter((r) => r.language === 'dan'), key }
  } catch (err) {
    return { result: null, error: err.message }
  }
}

async function searchDaWiki(query) {
  if (!query) return { result: null, raw: 'no query' }
  const url = `https://da.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(`"${query}"`)}&srlimit=3&format=json&origin=*`
  const r = await fetchJson(url)
  if (!r.ok) return { result: null, raw: r }
  const hits = r.json?.query?.search ?? []
  const top = hits[0]
  let validated = null
  if (top) {
    const haystack = `${top.title} ${top.snippet ?? ''}`.toLowerCase()
    if (haystack.includes(query.toLowerCase())) validated = top.title
  }
  return { result: validated, topHits: hits.map((h) => h.title) }
}

export default async function handler(req, res) {
  const name = req.query?.name?.trim()
  const species = req.query?.species?.trim() || name

  if (!name) return res.status(400).json({ error: 'Pass ?name=...' })

  const steps = {
    '1_langlinkDa(species)': await langlinkDa(species),
    '2_langlinkDa(name)': await langlinkDa(name),
    '3_daExactTitle(species)': await daExactTitle(species),
    '4_daExactTitle(name)': await daExactTitle(name),
    '5_gbifDanishName(species)': await gbifDanishName(species),
    '6_gbifDanishName(name)': await gbifDanishName(name),
    '7_searchDaWiki(species)': await searchDaWiki(species),
    '8_searchDaWiki(name)': await searchDaWiki(name),
  }

  const firstHit =
    steps['1_langlinkDa(species)'].result ||
    steps['2_langlinkDa(name)'].result ||
    steps['3_daExactTitle(species)'].result ||
    steps['4_daExactTitle(name)'].result ||
    steps['5_gbifDanishName(species)'].result ||
    steps['6_gbifDanishName(name)'].result ||
    steps['7_searchDaWiki(species)'].result ||
    steps['8_searchDaWiki(name)'].result ||
    null

  return res.json({ name, species, firstHit, fellBackToClaude: !firstHit, steps })
}
