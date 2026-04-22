/**
 * Official getBible v2 API (JSON) — https://api.getbible.net/v2/docs
 * Same translations as documented at getbible.net; hosted at api.getbible.net.
 */
export const GETBIBLE_V2_BASE = 'https://api.getbible.net/v2'

/** App UI language → primary getbible translation slug (verified on api.getbible.net). */
export const UI_LANG_TO_GETBIBLE = {
  es: 'valera',
  pt: 'almeida',
  fr: 'ls1910',
  de: 'schlachter',
  // Hindi: no verified v2 slug (e.g. /v2/hindi/... returns 404); Hindi text uses API.Bible when configured.
}

/**
 * @param {string} uiLang 2-letter code (en, es, pt, fr, de)
 * @param {string} englishTranslationId bible-api.com translation id when uiLang is en (kjv uses getbible)
 * @returns {string|null} getbible slug or null to use bible-api.com / API.Bible fallback
 */
export function resolveGetBibleTranslationId(uiLang, englishTranslationId) {
  if (uiLang === 'en') {
    return englishTranslationId === 'kjv' ? 'kjv' : null
  }
  return UI_LANG_TO_GETBIBLE[uiLang] || null
}

/**
 * @param {number} bookNumber 1–66 (Genesis = 1)
 * @param {number} chapter
 * @returns {Promise<{ verses: Array<{ verse: number, text: string }> }>}
 */
export async function fetchGetBibleChapter(translationSlug, bookNumber, chapter) {
  const url = `${GETBIBLE_V2_BASE}/${encodeURIComponent(translationSlug)}/${bookNumber}/${chapter}.json`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`getBible ${res.status}`)
  const data = await res.json()
  const verses = (data.verses || []).map((v) => ({
    verse: Number(v.verse),
    text: typeof v.text === 'string' ? v.text : '',
  }))
  return { verses, meta: data }
}
