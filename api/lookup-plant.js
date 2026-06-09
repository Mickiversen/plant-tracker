import Anthropic from '@anthropic-ai/sdk'

export default async function handler(req, res) {
  const name = req.query?.name?.trim()

  if (!name || name.length < 2) {
    return res.json({ data: null })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    // Diagnostic: report which env var names are visible at runtime (names only, no values)
    const visibleKeys = Object.keys(process.env).filter(
      (k) => !/SECRET|TOKEN|PASSWORD|PRIVATE/i.test(k)
    )
    return res.status(500).json({
      data: null,
      error: 'Missing ANTHROPIC_API_KEY',
      debug: {
        hasKey: 'ANTHROPIC_API_KEY' in process.env,
        anthropicKeys: visibleKeys.filter((k) => /ANTHROPIC/i.test(k)),
        envKeyCount: Object.keys(process.env).length,
      },
    })
  }

  const client = new Anthropic({ apiKey })

  const prompt = `You are a plant care expert. Given a plant name, return care data as a JSON object.

Fields to return:
- species: scientific name string (or null if unknown)
- water_every_days: integer (how often to water in days)
- light_level: one of "low", "medium", "high", "direct"
- soil_type: short string describing ideal soil
- fertilize_every_days: integer or null
- notes: one short sentence of care advice or null

If the plant is not a real or recognisable plant, return the JSON value null (not an object).

Respond with ONLY valid JSON — no explanation, no markdown code fences.

Plant name: "${name.replace(/"/g, '')}"`

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    })

    let text = message.content?.[0]?.text ?? ''
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()

    try {
      const data = JSON.parse(text)
      return res.json({ data })
    } catch {
      return res.json({ data: null, error: 'parse_failed', raw: text })
    }
  } catch (err) {
    return res.status(500).json({ data: null, error: err.message })
  }
}
