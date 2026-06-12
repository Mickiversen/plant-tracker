import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

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
    .select()

  if (error) return res.status(500).json({ error: error.message })
  if (!plants?.length) return res.json({ updated: 0, message: 'All plants already have a Danish name.' })

  const results = []

  for (const plant of plants) {
    const searchName = plant.species || plant.name
    try {
      const message = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 64,
        messages: [{
          role: 'user',
          content: `What is the Danish name for the plant "${searchName.replace(/"/g, '')}" exactly as it appears on the label in Danish garden centres (Plantorama, Bauhaus havecentre, etc.)? Use the name a Danish customer would read on the plant tag — not a literal translation. Reply with ONLY the name, nothing else.`
        }],
      })
      const common_name_da = message.content?.[0]?.text?.trim() || null
      if (common_name_da) {
        await supabase.from('plants').update({ common_name_da }).eq('id', plant.id)
        results.push({ id: plant.id, name: plant.name, common_name_da })
      }
    } catch (err) {
      results.push({ id: plant.id, name: plant.name, error: err.message })
    }
  }

  return res.json({ updated: results.filter(r => !r.error).length, results })
}
