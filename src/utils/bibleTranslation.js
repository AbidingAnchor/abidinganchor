import { resolveGetBibleTranslationId, fetchGetBibleChapter } from '../services/getBibleApi'

export const BIBLE_LANG_MAP = {
  en: 'WEB',
  es: 'NVI',
  pt: 'NTLH',
  hi: 'HIOV',
  ko: 'KRV',
  ru: 'SYNOD',      // Russian Synodal Bible (bolls.life) ✅
  zh: 'CUV',        // Chinese Union Version 和合本 (bolls.life) ✅
  // Italian (it): uses getBible API → 'giovanni' (Giovanni Diodati 1649)
  // Romanian (ro): uses getBible API → 'cornilescu'
  // French (fr): no valid bolls.life translation found; falls through to getBible API
  // German (de): no valid bolls.life translation found; falls through to getBible API
  // Tagalog (tl): no valid bolls.life translation; falls through to getBible API with 'tagalog' slug
}

export function getBollsTranslation(langCode) {
  const normalized = String(langCode || 'en').toLowerCase().split(/[-_]/)[0]
  return BIBLE_LANG_MAP[normalized] || 'WEB'
}

export async function fetchVerse(book, chapter, verse, langCode) {
  const normalized = String(langCode || 'en').toLowerCase().split(/[-_]/)[0]
  const translation = getBollsTranslation(normalized)
  
  // Try bolls.life first if translation mapping exists
  let bollsFailed = false
  if (translation && BIBLE_LANG_MAP[normalized]) {
    try {
      const url = `https://bolls.life/get-verse/${translation}/${book}/${chapter}/${verse}/`
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
        // Treat any non-OK response as failure and fall through
        console.warn(`[fetchVerse] bolls.life returned ${res.status} for ${translation}/${book}/${chapter}/${verse} - trying fallback`)
        bollsFailed = true
      }
    } catch (err) {
      console.error('[fetchVerse] bolls.life error:', err)
      bollsFailed = true
    }
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
