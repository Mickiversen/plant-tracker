export function daysUntil(lastAt, everyDays) {
  if (!everyDays) return null
  if (!lastAt) return 0
  const next = new Date(lastAt).getTime() + everyDays * 86400000
  return Math.ceil((next - Date.now()) / 86400000)
}
