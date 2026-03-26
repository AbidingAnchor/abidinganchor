const PRAYER_KEY = 'abidinganchor-prayers'

function read() {
  try {
    const raw = localStorage.getItem(PRAYER_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function write(entries) {
  localStorage.setItem(PRAYER_KEY, JSON.stringify(entries))
}

export function getPrayerEntries() {
  return read()
}

export function savePrayer({ text, date, answered = false }) {
  const entries = read()
  const next = [{ id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, text: text.trim(), date, answered }, ...entries]
  write(next)
  return next
}

export function toggleAnswered(id) {
  const entries = read().map((entry) => (entry.id === id ? { ...entry, answered: !entry.answered } : entry))
  write(entries)
  return entries
}

export function deletePrayer(id) {
  const entries = read().filter((entry) => entry.id !== id)
  write(entries)
  return entries
}
