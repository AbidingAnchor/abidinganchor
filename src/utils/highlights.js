import { getActiveStorageUserId, userStorageKey } from './userStorage'

function highlightKey() {
  return userStorageKey(getActiveStorageUserId(), 'highlights')
}

function read() {
  try {
    const raw = localStorage.getItem(highlightKey())
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function write(entries) {
  localStorage.setItem(highlightKey(), JSON.stringify(entries))
}

export function saveHighlight({ book, chapter, verse, color, text, reference }) {
  const entries = read()
  const key = reference || `${book} ${chapter}:${verse}`
  if (!color) {
    delete entries[key]
    write(entries)
    return entries
  }
  const next = {
    ...entries,
    [key]: { color, text, reference: key, book, chapter, verse },
  }
  write(next)
  return next
}

export function getHighlights() {
  return read()
}

export function getHighlightsForChapter(book, chapter) {
  const all = read()
  return Object.values(all || {}).filter((h) => h.book === book && Number(h.chapter) === Number(chapter))
}

export function deleteHighlight(reference) {
  const all = read()
  if (reference && all[reference]) {
    delete all[reference]
    write(all)
  }
  return all
}
