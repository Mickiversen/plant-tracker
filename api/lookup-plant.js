export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const name = searchParams.get('name')?.trim()

  if (!name || name.length < 2) {
    return Response.json({ data: null })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'Missing ANTHROPIC_API_KEY' }, { status: 500 })
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

Plant name: "${name.replace(/"/g, '')}"`.trim()

  const res = await fetch('https://api.anthropic.com/v1/messages', {
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

  if (!res.ok) {
    return Response.json({ error: 'Claude API error' }, { status: 502 })
  }

  const json = await res.json()
  const text = json.content?.[0]?.text ?? ''

  try {
    const data = JSON.parse(text)
    return Response.json({ data })
  } catch {
    return Response.json({ data: null })
  }
}
