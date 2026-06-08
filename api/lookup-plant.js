export default async function handler(req, res) {
  const name = req.query?.name?.trim()

  if (!name || name.length < 2) {
    return res.json({ data: null })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'Missing ANTHROPIC_API_KEY' })
  }

  const prompt = `You are a plant care expert. Given a plant name, return care data as a JSON object.

Fields to return:
- species: scientific name string (or null if unknown)
- water_every_days: integer (how often to water)
- light_level: one of "low", "medium", "high", "direct"
- soil_type: short string describing ideal soil (or null)
- fertilize_every_days: integer or null
- notes: one short sentence of care advice (or null)

If the plant is not a real/recognisable plant, return the JSON value null.

Respond with ONLY valid JSON — no explanation, no markdown.

Plant name: "${name.replace(/"/g, '')}"`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 256,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('Claude API error:', err)
      return res.status(502).json({ error: 'Claude API error' })
    }

    const json = await response.json()
    const text = json.content?.[0]?.text ?? ''

    try {
      const data = JSON.parse(text)
      return res.json({ data })
    } catch {
      return res.json({ data: null })
    }
  } catch (err) {
    console.error('lookup-plant error:', err)
    return res.status(500).json({ error: 'Internal error' })
  }
}
