const KEY = 'abidinganchor-reading-history'

function read() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function write(entries) {
  localStorage.setItem(KEY, JSON.stringify(entries))
}

export function getReadingHistory() {
  return read()
}

export function recordChapterRead({ book, chapter, testament }) {
  const entries = read()
  const key = `${book}|${chapter}`
  const exists = entries.some((entry) => `${entry.book}|${entry.chapter}` === key)
  if (exists) return entries
  const next = [{ book, chapter, testament, date: new Date().toISOString() }, ...entries]
  write(next)
  return next
}
