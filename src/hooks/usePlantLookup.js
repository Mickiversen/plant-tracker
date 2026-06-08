import { useState, useCallback } from 'react'

export function usePlantLookup() {
  const [loading, setLoading] = useState(false)
  const [suggestion, setSuggestion] = useState(null)
  const [lookupError, setLookupError] = useState(null)

  const lookup = useCallback(async (name) => {
    if (!name || name.trim().length < 2) return
    setLoading(true)
    setSuggestion(null)
    setLookupError(null)
    try {
      const res = await fetch(`/api/lookup-plant?name=${encodeURIComponent(name.trim())}`)
      const json = await res.json()
      if (json.error) {
        setLookupError(json.error)
      } else if (json.data) {
        setSuggestion(json.data)
      } else {
        setLookupError('Plant not recognised')
      }
    } catch (err) {
      setLookupError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  function clear() {
    setSuggestion(null)
    setLookupError(null)
  }

  return { lookup, loading, suggestion, lookupError, clear }
}
