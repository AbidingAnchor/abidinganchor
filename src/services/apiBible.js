/**
 * API.Bible (scripture.api.bible) — requires VITE_API_BIBLE_KEY from https://scripture.api.bible
 * @see https://scripture.api.bible/
 */

const BASE = 'https://api.scripture.api.bible/v1'

/** Default KJV (API.Bible). Other languages: resolved via /v1/bibles?language= or VITE_API_BIBLE_ID_* env. */
export const API_BIBLE_ID_BY_LANG = {
  en: 'de4e12af7f28f599-02',
}

function getApiKey() {
  return import.meta.env.VITE_API_BIBLE_KEY || ''
}

function headers() {
  const key = getApiKey()
  if (!key) return null
  return { 'api-key': key }
}

const bibleIdCache = Object.create(null)

/**
 * Resolve bible id: env override per language, else catalog, else static map.
 */
export async function resolveBibleIdForLanguage(lang) {
  const key = getApiKey()
  if (!key) return null

  const code = String(lang).split(/[-_]/)[0].toLowerCase()
  if (bibleIdCache[code] !== undefined) return bibleIdCache[code]

  const envOverride =
    import.meta.env[`VITE_API_BIBLE_ID_${code.toUpperCase()}`] ||
    import.meta.env.VITE_API_BIBLE_ID
  if (envOverride) {
    bibleIdCache[code] = envOverride
    return envOverride
  }

  if (API_BIBLE_ID_BY_LANG[code]) {
    bibleIdCache[code] = API_BIBLE_ID_BY_LANG[code]
    return API_BIBLE_ID_BY_LANG[code]
  }

  const iso = { en: 'eng', es: 'spa', pt: 'por', fr: 'fra', de: 'deu' }[code] || 'eng'
  try {
    const res = await fetch(`${BASE}/bibles?language=${iso}`, { headers: headers() })
    if (!res.ok) {
      bibleIdCache[code] = API_BIBLE_ID_BY_LANG.en
      return API_BIBLE_ID_BY_LANG.en
    }
    const json = await res.json()
    const first = json.data?.[0]?.id
    const id = first || API_BIBLE_ID_BY_LANG.en
    bibleIdCache[code] = id
    return id
  } catch {
    bibleIdCache[code] = API_BIBLE_ID_BY_LANG.en
    return API_BIBLE_ID_BY_LANG.en
  }
}

function parseVerseNumberFromId(verseId) {
  if (!verseId || typeof verseId !== 'string') return 0
  const parts = verseId.split('.')
  const n = parseInt(parts[parts.length - 1], 10)
  return Number.isFinite(n) ? n : 0
}

function stripTags(html) {
  if (!html) return ''
  if (typeof html !== 'string') return String(html)
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}

/**
 * Fetch all verses for a chapter. Chapter id format: GEN.3
 */
export async function fetchApiBibleChapterVerses(bibleId, bookOsis, chapterNum) {
  const h = headers()
  if (!h) return null

  const chapterId = `${bookOsis}.${chapterNum}`
  const url = `${BASE}/bibles/${bibleId}/chapters/${encodeURIComponent(chapterId)}/verses?content-type=json`
  const res = await fetch(url, { headers: h })
  if (!res.ok) {
    if (import.meta.env.DEV) console.warn('[apiBible] verses fetch failed:', res.status)
    return null
  }
  const json = await res.json()
  const rows = json.data || []
  return rows
    .map((v) => {
      const rawNum = v.number ?? parseVerseNumberFromId(v.id)
      const num = typeof rawNum === 'string' ? parseInt(rawNum, 10) : rawNum
      let text = ''
      if (typeof v.content === 'string') text = stripTags(v.content)
      else if (v.content && typeof v.content === 'object' && v.content.text) text = stripTags(v.content.text)
      else if (v.text) text = stripTags(v.text)
      return { verse: num, text }
    })
    .filter((x) => Number.isFinite(x.verse) && x.verse > 0 && x.text)
}
