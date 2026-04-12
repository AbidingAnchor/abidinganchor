/**
 * bible-api.com returns verse text with internal newlines (KJV line breaks). Collapse to a single
 * readable line for the reader UI; trim and strip pilcrows.
 */
export function formatBibleApiVerseText(text) {
  if (text == null || typeof text !== 'string') return ''
  let t = text.replace(/\u00b6\s*/g, '').replace(/¶/g, '')
  t = t.replace(/\s+/g, ' ').trim()
  return t
}

/**
 * Legacy / defensive: wldeh jsDelivr en-kjv appended KJV marginal notes after verse text, e.g.:
 * "...darkness.1.4 the light from…: Heb. …" — strip from first chapter.verse anchor onward.
 * Safe to run after formatBibleApiVerseText if any source still concatenates notes.
 */
export function cleanKjvVerseText(text) {
  if (text == null || typeof text !== 'string') return ''
  let t = text.replace(/\u00b6\s*/g, '').replace(/¶/g, '').trim()
  const re = /\d{1,3}\.\d{1,3}/
  const m = t.match(re)
  if (!m || m.index === undefined) return t
  if (m.index === 0) return ''
  return t.slice(0, m.index).trimEnd()
}

/**
 * True if trimmed text already ends on a sentence boundary per reader rules:
 * ends in . ? ! ; or a closing straight/curly quote.
 * Trailing marginal "etc." counts as incomplete so we can trim back to the real sentence.
 */
export function hasCompleteSentenceEnding(text) {
  if (text == null || typeof text !== 'string') return true
  const s = text.trim()
  if (!s) return true
  if (/\betc\.\s*$/i.test(s)) return false
  const last = s[s.length - 1]
  if ('.?!;'.includes(last)) return true
  if (last === '"' || last === "'" || last === '\u201d' || last === '\u2019') return true
  return false
}

/** Word before a period when that period is likely an abbreviation, not sentence end (scanning from the right). */
function isSkippablePeriodBefore(t, dotIndex) {
  if (t[dotIndex] !== '.') return false
  const before = t.slice(0, dotIndex).trimEnd()
  const lastWord = before.split(/\s+/).pop()?.toLowerCase().replace(/[,:;]+$/, '') ?? ''
  return lastWord === 'etc' || lastWord === 'eg' || lastWord === 'ie' || lastWord === 'e.g' || lastWord === 'i.e'
}

/**
 * Trim whitespace; if the verse does not end on a complete sentence, drop trailing junk by
 * keeping text through the last . ? ! ; (skip a trailing `etc.`-style period so we keep the prior sentence).
 */
export function truncateVerseToLastCompleteSentence(text) {
  if (text == null || typeof text !== 'string') return ''
  const t = text.trim()
  if (!t) return t
  if (hasCompleteSentenceEnding(t)) return t

  for (let i = t.length - 1; i >= 0; i--) {
    const c = t[i]
    if (!'.?!;'.includes(c)) continue
    if (c === '.' && isSkippablePeriodBefore(t, i)) continue
    return t.slice(0, i + 1).trimEnd()
  }

  const qStraight = t.lastIndexOf('"')
  const qCurly = t.lastIndexOf('\u201d')
  const q = Math.max(qStraight, qCurly)
  if (q > 0 && q === t.length - 1) return t

  return t
}

/** Normalize bible-api.com lines, strip marginal junk, then enforce clean sentence ending. */
export function prepareBibleReaderVerseText(text) {
  const step1 = formatBibleApiVerseText(text)
  const step2 = cleanKjvVerseText(step1)
  return truncateVerseToLastCompleteSentence(step2)
}

/** wldeh chapter JSON sometimes repeats verse rows; keep first occurrence per verse number. */
export function dedupeVersesByNumber(verses) {
  if (!Array.isArray(verses)) return []
  const seen = new Set()
  return verses.filter((v) => {
    const n = String(v.verse ?? '')
    if (!n || seen.has(n)) return false
    seen.add(n)
    return true
  })
}
