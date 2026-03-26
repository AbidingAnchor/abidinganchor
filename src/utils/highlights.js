const HIGHLIGHT_KEY = 'abidinganchor-highlights'

function read() {
  try {
    const raw = localStorage.getItem(HIGHLIGHT_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function write(entries) {
  localStorage.setItem(HIGHLIGHT_KEY, JSON.stringify(entries))
}

export function saveHighlight({ book, chapter, verse, color, text }) {
  const entries = read()
  const deduped = entries.filter((h) => !(h.book === book && h.chapter === chapter && h.verse === verse))
  const next = [{ id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, book, chapter, verse, color, text }, ...deduped]
  write(next)
  return next
}

export function getHighlights() {
  return read()
}

export function getHighlightsForChapter(book, chapter) {
  return read().filter((h) => h.book === book && Number(h.chapter) === Number(chapter))
}

export function deleteHighlight(id) {
  const next = read().filter((h) => h.id !== id)
  write(next)
  return next
}
