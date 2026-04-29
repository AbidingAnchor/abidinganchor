import { resolveGetBibleTranslationId, fetchGetBibleChapter } from '../services/getBibleApi'

/**
 * App UI language (2-letter) → bolls.life `get-text/{id}/{book}/{chapter}/` translation id.
 * it / ro / tl: no entry here; Audio Bible & BibleReader use getBible or bible-api.com.
 * If a primary id returns an empty list, `BOLLS_GETTEXT_FALLBACK` (below) is used before other APIs.
 */
export const BIBLE_LANG_MAP = {
  en: 'WEB',
  es: 'RVR1960',
  fr: 'LSG',
  pt: 'ARC',
  de: 'LUTH1545',
  hi: 'IRV',
  ko: 'KRPBA',
  zh: 'CNVS',
  ru: 'SYNOD',
  ar: 'NAV',
}

/** When the primary bolls id returns `[]` (or no rows), try this id before getBible / bible-api.com. */
export const BOLLS_GETTEXT_FALLBACK = {
  es: 'NVI',
  fr: 'BDS',
  pt: 'NTLH',
  de: 'ELB',
  hi: 'HIOV',
  ko: 'KRV',
  zh: 'CUV',
  ar: 'SVD',
}

/**
 * Map our translation IDs to bolls.life slugs
 * These need to match the exact slugs used by bolls.life API
 * BST is not supported by bolls.life - falls back to ebible.org
 */
export const TRANSLATION_ID_TO_BOLLS_SLUG = {
  web: 'WEB',
  kjv: 'KJV',
  asv: 'ASV',
  dra: 'DRA',
  // bst: null, // Not supported by bolls.life - falls back to ebible.org
}

/**
 * Fetch from bolls.life using a specific translation ID instead of uiLang
 * Used by BibleReader when user selects a specific translation (DRA, BST, etc.)
 * @param {string} translationId - Our internal translation ID (dra, bst, kjv, web, etc.)
 * @param {number} bookNumber 1–66
 * @param {number} chapter
 * @returns {Promise<Array<{ verse: number, text?: string, pk?: number }> | null>} verse rows, or null if translation not supported
 */
export async function fetchBollsGetTextForTranslationId(translationId, bookNumber, chapter) {
  const bollsSlug = TRANSLATION_ID_TO_BOLLS_SLUG[translationId.toLowerCase()]
  if (!bollsSlug) {
    console.log(`[bolls.life] No slug mapping for translation: ${translationId}`)
    return null
  }
  try {
    const url = `https://bolls.life/get-text/${bollsSlug}/${bookNumber}/${chapter}/`
    console.log(`[bolls.life] Fetching: ${url}`)
    const res = await fetch(url)
    if (!res.ok) {
      console.warn(`[bolls.life] Returned ${res.status} for ${bollsSlug}/${bookNumber}/${chapter}`)
      return null
    }
    const data = await res.json()
    if (Array.isArray(data) && data.length) {
      console.log(`[bolls.life] Got ${data.length} verses from ${bollsSlug}`)
      // Strip numeric codes (Strong's numbers) from verse text
      const cleanedData = data.map(v => ({
        ...v,
        text: v.text ? v.text.replace(/\d+/g, '').trim() : v.text
      }))
      return cleanedData
    }
    console.warn(`[bolls.life] Empty response for ${bollsSlug}/${bookNumber}/${chapter}`)
    return null
  } catch (err) {
    console.error('[bolls.life] Error:', err)
    return null
  }
}

/**
 * bolls.life get-text: primary from BIBLE_LANG_MAP, then BOLLS_GETTEXT_FALLBACK if the first id returns an empty list.
 * Used by BibleReader and AudioBible so both stay aligned (e.g. ko: KRPBA then KRV).
 * @param {string} uiLang
 * @param {number} bookNumber 1–66
 * @param {number} chapter
 * @returns {Promise<Array<{ verse: number, text?: string, pk?: number }> | null>} verse rows, or null if this language is not in BIBLE_LANG_MAP
 */
export async function fetchBollsGetTextForUiLang(uiLang, bookNumber, chapter) {
  const code = String(uiLang || 'en')
    .toLowerCase()
    .split(/[-_]/)[0]
  const primaryId = BIBLE_LANG_MAP[code]
  const fallbackId = BOLLS_GETTEXT_FALLBACK[code]
  if (!primaryId) return null
  const tryBolls = async (translation) => {
    const res = await fetch(
      `https://bolls.life/get-text/${translation}/${bookNumber}/${chapter}/`,
    )
    if (!res.ok) return null
    const data = await res.json()
    if (Array.isArray(data) && data.length) {
      // Strip numeric codes (Strong's numbers) from verse text
      const cleanedData = data.map(v => ({
        ...v,
        text: v.text ? v.text.replace(/\d+/g, '').trim() : v.text
      }))
      return cleanedData
    }
    return null
  }
  return (
    (await tryBolls(primaryId)) ||
    (fallbackId && fallbackId !== primaryId ? await tryBolls(fallbackId) : null) ||
    null
  )
}

export function getBollsTranslation(langCode) {
  const normalized = String(langCode || 'en').toLowerCase().split(/[-_]/)[0]
  return BIBLE_LANG_MAP[normalized] || 'WEB'
}

export async function fetchVerse(book, chapter, verse, langCode) {
  const normalized = String(langCode || 'en').toLowerCase().split(/[-_]/)[0]
  const translation = getBollsTranslation(normalized)
  
  // Try bolls.life if translation mapping exists; optional secondary id (same as get-text in Audio Bible)
  let bollsFailed = false
  if (translation && BIBLE_LANG_MAP[normalized]) {
    const bollsIds = [translation]
    const alt = BOLLS_GETTEXT_FALLBACK[normalized]
    if (alt && alt !== translation) bollsIds.push(alt)
    let gotBollsVerse = false
    for (const t of bollsIds) {
      try {
        const url = `https://bolls.life/get-verse/${t}/${book}/${chapter}/${verse}/`
        const res = await fetch(url)
        if (res.ok) {
          const data = await res.json()
          if (data?.text) {
            gotBollsVerse = true
            return data.text
              .replace(/[ⓐ-ⓩ]/gu, '')
              .replace(/<[^>]*>/g, '')
              .replace(/\s{2,}/g, ' ')
              .trim()
          }
        } else {
          console.warn(`[fetchVerse] bolls.life returned ${res.status} for ${t}/${book}/${chapter}/${verse} - trying fallback`)
          bollsFailed = true
        }
      } catch (err) {
        console.error('[fetchVerse] bolls.life error:', err)
        bollsFailed = true
      }
    }
    if (!gotBollsVerse) bollsFailed = true
  }

  // Fallback to getBible API if bolls.life failed or no mapping exists
  const getBibleSlug = resolveGetBibleTranslationId(normalized, 'web')
  if (bollsFailed || !translation || !BIBLE_LANG_MAP[normalized]) {
    if (getBibleSlug) {
      try {
        const { verses } = await fetchGetBibleChapter(getBibleSlug, book, chapter)
        const verseData = verses?.find(v => v.verse === verse)
        if (verseData?.text) {
          return verseData.text
        }
      } catch (err) {
        console.error('[fetchVerse] getBible API error:', err)
      }
    }
  }

  // Final fallback to English WEB if all else fails
  try {
    const url = `https://bolls.life/get-verse/WEB/${book}/${chapter}/${verse}/`
    const res = await fetch(url)
    if (res.ok) {
      const data = await res.json()
      if (data?.text) {
        return data.text
          .replace(/[ⓐ-ⓩ]/gu, '')
          .replace(/<[^>]*>/g, '')
          .replace(/\s{2,}/g, ' ')
          .trim()
      }
    } else {
      console.warn(`[fetchVerse] WEB fallback returned ${res.status} for ${book}/${chapter}/${verse}`)
    }
  } catch (err) {
    console.error('[fetchVerse] WEB fallback error:', err)
  }

  // Return empty string gracefully instead of crashing
  return ''
}
