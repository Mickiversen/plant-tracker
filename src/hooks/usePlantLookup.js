import { useState, useCallback } from 'react'

export function usePlantLookup() {
  const [loading, setLoading] = useState(false)
  const [suggestion, setSuggestion] = useState(null) // the raw data from API

  const lookup = useCallback(async (name) => {
    if (!name || name.trim().length < 3) return
    setLoading(true)
    setSuggestion(null)
    try {
      const res = await fetch(`/api/lookup-plant?name=${encodeURIComponent(name.trim())}`)
      const json = await res.json()
      setSuggestion(json.data ?? null)
    } catch {
      setSuggestion(null)
    } finally {
      setLoading(false)
    }
  }, [])

  function clear() {
    setSuggestion(null)
  }

  return { lookup, loading, suggestion, clear }
}
