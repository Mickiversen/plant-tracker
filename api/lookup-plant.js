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

    // Attach a photo — try the scientific species first, fall back to the typed name
    if (data) {
      data.photo_url =
        (await fetchPlantPhoto(data.species)) || (await fetchPlantPhoto(name)) || null
    }

    return res.json({ data })
  } catch (err) {
    return res.status(500).json({ data: null, error: err.message })
  }
}
