import { useEffect, useLayoutEffect, useState, useMemo, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { dedupeVersesByNumber, prepareBibleReaderVerseText } from '../utils/kjvVerseText'
import { BOOK_CDN_TO_OSIS } from '../utils/bookOsisMap'
import { fetchApiBibleChapterVerses, resolveBibleIdForLanguage } from '../services/apiBible'
import { fetchGetBibleChapter, resolveGetBibleTranslationId } from '../services/getBibleApi'
import { POPULAR_BIBLES, getSavedBibleId, saveBibleId } from '../services/bibleApi'
import BibleTranslationSelector from './BibleTranslationSelector'
import { useAuth } from '../context/AuthContext'
import { useThemeBackgroundType } from '../hooks/useThemeBackgroundType'
import { userStorageKey } from '../utils/userStorage'
import { supabase } from '../lib/supabase'
import { BIBLE_LANG_MAP, fetchBollsGetTextForUiLang } from '../utils/bibleTranslation'

/** Free JSON API — see https://bible-api.com/ and GET /data for supported translations (public domain). */
const BIBLE_API_COM = 'https://bible-api.com'

const BIBLE_FONT_MIN = 14
const BIBLE_FONT_MAX = 24
const BIBLE_FONT_DEFAULT = 18
const BIBLE_FONT_STEP = 2

/** Layout zones (viewport-fixed). Zone 1 = app header, Zone 5 = tab bar — defined in App; not styled here. */
const APP_BAR_HEIGHT_PX = 56
/** Scroll offset ~ compact chapter header (title row + pills; border below both). */
const CHAPTER_ZONE_HEIGHT_PX = 118
const BOTTOM_CHROME_NAV_PX = 60
const BOTTOM_TAB_BAR_PX = 60
const OLD_TESTAMENT_LAST_INDEX = 38
const APP_BAR_TOP_OFFSET = `calc(env(safe-area-inset-top, 0px) + ${APP_BAR_HEIGHT_PX}px)`
const BIBLE_SCROLL_TOP_OFFSET = `calc(env(safe-area-inset-top, 0px) + ${APP_BAR_HEIGHT_PX + CHAPTER_ZONE_HEIGHT_PX}px)`
const BIBLE_SCROLL_BOTTOM_PX = BOTTOM_CHROME_NAV_PX + BOTTOM_TAB_BAR_PX

function clampBibleFontSize(n) {
  if (!Number.isFinite(n)) return BIBLE_FONT_DEFAULT
  return Math.min(BIBLE_FONT_MAX, Math.max(BIBLE_FONT_MIN, Math.round(n)))
}

/** Default for bible-api.com when no API.Bible key or when using non-getBible English texts — WEB is reliable on bible-api.com. */
const DEFAULT_BIBLE_API_COM_TRANSLATION = 'web'

const HAS_API_BIBLE = Boolean(import.meta.env.VITE_API_BIBLE_KEY)

/** bible-api.com `translation` ids — labels match the actual public-domain texts. */
const BIBLE_READER_TRANSLATIONS = [
  { id: 'kjv', labelKey: 'bible.kjv', subtitleKey: 'bible.subtitleKjv' },
  { id: 'web', labelKey: 'bible.web', subtitleKey: 'bible.subtitleWeb' },
  { id: 'asv', labelKey: 'bible.asv', subtitleKey: 'bible.subtitleAsv' },
  { id: 'webbe', labelKey: 'bible.webbe', subtitleKey: 'bible.subtitleWebbe' },
  { id: 'bbe', labelKey: 'bible.bbe', subtitleKey: 'bible.subtitleBbe' },
  { id: 'darby', labelKey: 'bible.darby', subtitleKey: 'bible.subtitleDarby' },
]

function translationStorageKey(userId) {
  return userStorageKey(userId, 'bible-reader-translation')
}

function getStoredTranslationId(userId) {
  if (typeof window === 'undefined') return DEFAULT_BIBLE_API_COM_TRANSLATION
  const k = translationStorageKey(userId)
  let raw = localStorage.getItem(k)
  if (raw == null && userId) {
    const legacy = localStorage.getItem('abidinganchor-bible-reader-translation')
    if (legacy) {
      raw = legacy
      try {
        localStorage.setItem(k, legacy)
      } catch {
        /* ignore */
      }
    }
  }
  // OEB ids were returning 404 from bible-api.com; migrate to WEB.
  if (raw === 'oeb-us' || raw === 'oeb') {
    try {
      localStorage.setItem(k, DEFAULT_BIBLE_API_COM_TRANSLATION)
    } catch {
      /* ignore */
    }
    return DEFAULT_BIBLE_API_COM_TRANSLATION
  }
  if (raw && BIBLE_READER_TRANSLATIONS.some((t) => t.id === raw)) return raw
  return DEFAULT_BIBLE_API_COM_TRANSLATION
}

const BOOKS = [
  {name:'Genesis',cdnName:'genesis',chapters:50},
  {name:'Exodus',cdnName:'exodus',chapters:40},
  {name:'Leviticus',cdnName:'leviticus',chapters:27},
  {name:'Numbers',cdnName:'numbers',chapters:36},
  {name:'Deuteronomy',cdnName:'deuteronomy',chapters:34},
  {name:'Joshua',cdnName:'joshua',chapters:24},
  {name:'Judges',cdnName:'judges',chapters:21},
  {name:'Ruth',cdnName:'ruth',chapters:4},
  {name:'1 Samuel',cdnName:'1samuel',chapters:31},
  {name:'2 Samuel',cdnName:'2samuel',chapters:24},
  {name:'1 Kings',cdnName:'1kings',chapters:22},
  {name:'2 Kings',cdnName:'2kings',chapters:25},
  {name:'1 Chronicles',cdnName:'1chronicles',chapters:29},
  {name:'2 Chronicles',cdnName:'2chronicles',chapters:36},
  {name:'Ezra',cdnName:'ezra',chapters:10},
  {name:'Nehemiah',cdnName:'nehemiah',chapters:13},
  {name:'Esther',cdnName:'esther',chapters:10},
  {name:'Job',cdnName:'job',chapters:42},
  {name:'Psalms',cdnName:'psalms',chapters:150},
  {name:'Proverbs',cdnName:'proverbs',chapters:31},
  {name:'Ecclesiastes',cdnName:'ecclesiastes',chapters:12},
  {name:'Song of Solomon',cdnName:'songofsolomon',chapters:8},
  {name:'Isaiah',cdnName:'isaiah',chapters:66},
  {name:'Jeremiah',cdnName:'jeremiah',chapters:52},
  {name:'Lamentations',cdnName:'lamentations',chapters:5},
  {name:'Ezekiel',cdnName:'ezekiel',chapters:48},
  {name:'Daniel',cdnName:'daniel',chapters:12},
  {name:'Hosea',cdnName:'hosea',chapters:14},
  {name:'Joel',cdnName:'joel',chapters:3},
  {name:'Amos',cdnName:'amos',chapters:9},
  {name:'Obadiah',cdnName:'obadiah',chapters:1},
  {name:'Jonah',cdnName:'jonah',chapters:4},
  {name:'Micah',cdnName:'micah',chapters:7},
  {name:'Nahum',cdnName:'nahum',chapters:3},
  {name:'Habakkuk',cdnName:'habakkuk',chapters:3},
  {name:'Zephaniah',cdnName:'zephaniah',chapters:3},
  {name:'Haggai',cdnName:'haggai',chapters:2},
  {name:'Zechariah',cdnName:'zechariah',chapters:14},
  {name:'Malachi',cdnName:'malachi',chapters:4},
  {name:'Matthew',cdnName:'matthew',chapters:28},
  {name:'Mark',cdnName:'mark',chapters:16},
  {name:'Luke',cdnName:'luke',chapters:24},
  {name:'John',cdnName:'john',chapters:21},
  {name:'Acts',cdnName:'acts',chapters:28},
  {name:'Romans',cdnName:'romans',chapters:16},
  {name:'1 Corinthians',cdnName:'1corinthians',chapters:16},
  {name:'2 Corinthians',cdnName:'2corinthians',chapters:13},
  {name:'Galatians',cdnName:'galatians',chapters:6},
  {name:'Ephesians',cdnName:'ephesians',chapters:6},
  {name:'Philippians',cdnName:'philippians',chapters:4},
  {name:'Colossians',cdnName:'colossians',chapters:4},
  {name:'1 Thessalonians',cdnName:'1thessalonians',chapters:5},
  {name:'2 Thessalonians',cdnName:'2thessalonians',chapters:3},
  {name:'1 Timothy',cdnName:'1timothy',chapters:6},
  {name:'2 Timothy',cdnName:'2timothy',chapters:4},
  {name:'Titus',cdnName:'titus',chapters:3},
  {name:'Philemon',cdnName:'philemon',chapters:1},
  {name:'Hebrews',cdnName:'hebrews',chapters:13},
  {name:'James',cdnName:'james',chapters:5},
  {name:'1 Peter',cdnName:'1peter',chapters:5},
  {name:'2 Peter',cdnName:'2peter',chapters:3},
  {name:'1 John',cdnName:'1john',chapters:5},
  {name:'2 John',cdnName:'2john',chapters:1},
  {name:'3 John',cdnName:'3john',chapters:1},
  {name:'Jude',cdnName:'jude',chapters:1},
  {name:'Revelation',cdnName:'revelation',chapters:22},
]

let crossReferencesDatasetPromise = null
function loadCrossReferencesDataset() {
  if (!crossReferencesDatasetPromise) {
    crossReferencesDatasetPromise = import('../data/crossReferences.json')
      .then((m) => m.default || {})
      .catch(() => ({}))
  }
  return crossReferencesDatasetPromise
}

let strongsHebrewDatasetPromise = null
let strongsGreekDatasetPromise = null
const strongsWordLookupCache = {
  hebrew: new Map(),
  greek: new Map(),
}

function loadStrongsHebrewDataset() {
  if (!strongsHebrewDatasetPromise) {
    strongsHebrewDatasetPromise = import('../data/strongsHebrew.json')
      .then((m) => m.default || {})
      .catch(() => ({}))
  }
  return strongsHebrewDatasetPromise
}

function loadStrongsGreekDataset() {
  if (!strongsGreekDatasetPromise) {
    strongsGreekDatasetPromise = import('../data/strongsGreek.json')
      .then((m) => m.default || {})
      .catch(() => ({}))
  }
  return strongsGreekDatasetPromise
}

export default function BibleReader({ open, onModeChange }) {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const skyPeriod = useThemeBackgroundType()
  const dayTheme = skyPeriod === 'day'

  /** Normalize locale (e.g. ar-SA) to 2-letter language code. */
  const uiLang = (i18n.resolvedLanguage || i18n.language || 'en').toLowerCase().slice(0, 2)

  const [bookIndex, setBookIndex] = useState(0)
  const [chapter, setChapter] = useState(1)
  const [verses, setVerses] = useState([])
  const [loading, setLoading] = useState(true)
  const [highlightsByVerse, setHighlightsByVerse] = useState({})
  const [notesByVerse, setNotesByVerse] = useState({})
  const [activeVerse, setActiveVerse] = useState(null)
  const [verseMenuRect, setVerseMenuRect] = useState(null)
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [noteDraft, setNoteDraft] = useState('')
  const [showNoteViewer, setShowNoteViewer] = useState(false)
  const [showCrossRefsModal, setShowCrossRefsModal] = useState(false)
  const [crossRefsLoading, setCrossRefsLoading] = useState(false)
  const [crossRefs, setCrossRefs] = useState([])
  const [showStrongsModal, setShowStrongsModal] = useState(false)
  const [strongsWords, setStrongsWords] = useState([])
  const [selectedStrongsEntry, setSelectedStrongsEntry] = useState(null)
  const [jumpHighlightTarget, setJumpHighlightTarget] = useState(null)
  const [showBookPicker, setShowBookPicker] = useState(false)
  const [testamentFilter, setTestamentFilter] = useState('old')
  const [showChapterPicker, setShowChapterPicker] = useState(false)
  const [showTranslationPicker, setShowTranslationPicker] = useState(false)
  const [translationDropdownRect, setTranslationDropdownRect] = useState(null)
  const translationButtonRef = useRef(null)
  const [activeTranslationId, setActiveTranslationId] = useState(DEFAULT_BIBLE_API_COM_TRANSLATION)
  const [bibleId, setBibleId] = useState(() => getSavedBibleId() || DEFAULT_BIBLE_API_COM_TRANSLATION)
  const bibleIdRef = useRef(bibleId)
  const [fontSize, setFontSize] = useState(BIBLE_FONT_DEFAULT)
  const [showReadingControls, setShowReadingControls] = useState(false)
  const [showHindiBiblePicker, setShowHindiBiblePicker] = useState(false)
  const [cachedHindiCatalogId, setCachedHindiCatalogId] = useState(null)
  const [hindiSavedBibleId, setHindiSavedBibleId] = useState(null)

  const selectedBook = useMemo(() => {
    const book = BOOKS[bookIndex];
    if (book) {
      return { ...book, bookNumber: bookIndex + 1 };
    }
    return null;
  }, [bookIndex]);

  const getBibleSlug = resolveGetBibleTranslationId(uiLang, activeTranslationId)
  const showEnglishBibleVersions = uiLang === 'en'
  const showHindiApiBiblePicker = uiLang === 'hi' && HAS_API_BIBLE

  const loadChapter = useCallback(async (overrideBibleId, currentBook, currentChapter) => {
    let cancelled = false
    setLoading(true)

    const idToUse = overrideBibleId || bibleIdRef.current

    const loadFromBibleApiCom = () => {
      const url = `${BIBLE_API_COM}/${encodeURIComponent(currentBook.cdnName)}+${currentChapter}?translation=${encodeURIComponent(activeTranslationId)}`
      return fetch(url)
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`)
          return r.json()
        })
        .then((data) => {
          const rows = dedupeVersesByNumber(data.verses || [])
          return rows.map((v) => ({
            verse: v.verse,
            text: prepareBibleReaderVerseText(v.text),
          }))
        })
    }

    try {
      // LANGUAGE-SPECIFIC BIBLE — same bolls get-text + fallback as AudioBible (BIBLE_LANG_MAP + BOLLS_GETTEXT_FALLBACK, e.g. ko: KRPBA then KRV).
      let bollsRows = null
      try {
        bollsRows = await fetchBollsGetTextForUiLang(uiLang, currentBook.bookNumber, currentChapter)
      } catch (err) {
        console.error('[BibleReader] bolls.life error:', err)
      }
      if (bollsRows?.length) {
        if (!cancelled) {
          const normalized = bollsRows.map((v) => ({
            verse: v.verse,
            text: prepareBibleReaderVerseText((v.text || '').replace(/[ⓐ-ⓩ]/g, '').replace(/<[^>]*>/g, '').replace(/\s{2,}/g, ' ').trim()),
          }))
          setVerses(normalized)
          setLoading(false)
        }
        return
      }

      if (getBibleSlug) {
        const { verses: rawGb } = await fetchGetBibleChapter(getBibleSlug, currentBook.bookNumber, currentChapter)
        if (!cancelled) {
          if (rawGb?.length) {
            const normalized = dedupeVersesByNumber(
              rawGb.map((v) => ({
                verse: v.verse,
                text: prepareBibleReaderVerseText(v.text),
              })),
            )
            setVerses(normalized)
          } else {
            setVerses([])
          }
          setLoading(false)
          return
        }
      }
      if (HAS_API_BIBLE && (showEnglishBibleVersions || uiLang === 'hi')) {
        let currentBibleId = await resolveBibleIdForLanguage(uiLang)
        if (uiLang === 'hi') {
          const catalogHi = currentBibleId
          if (catalogHi && !cancelled) setCachedHindiCatalogId(catalogHi)
          let saved = hindiSavedBibleId
          try {
            saved = saved ?? getSavedBibleId()
          } catch {
            saved = null
          }
          const hindiIds = new Set(
            POPULAR_BIBLES.filter((b) => b.language === 'हिंदी' && b.id).map((b) => b.id),
          )
          if (catalogHi) hindiIds.add(catalogHi)
          if (saved && hindiIds.has(saved)) currentBibleId = saved
        }
        const osis = BOOK_CDN_TO_OSIS[currentBook.cdnName]
        if (idToUse && osis) { // Use idToUse here
          console.log('[BibleReader] Fetching Bible with ID:', idToUse) // Fixed console.log
          const raw = await fetchApiBibleChapterVerses(idToUse, osis, currentChapter) // Use idToUse here
          if (!cancelled && raw?.length) {
            const normalized = dedupeVersesByNumber(
              raw.map((v) => ({
                verse: v.verse,
                text: prepareBibleReaderVerseText(v.text),
              })),
            )
            setVerses(normalized)
            setLoading(false)
            return
          }
        }
      }
      const rows = await loadFromBibleApiCom()
      if (!cancelled) {
        setVerses(rows || [])
        setLoading(false)
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error('Error loading verses:', err)
      if (!cancelled) {
        setVerses([])
        setLoading(false)
      }
    }

  }, [
    activeTranslationId,
    getBibleSlug,
    hindiSavedBibleId,
    open,
    showEnglishBibleVersions,
    uiLang,
    setLoading,
    setVerses,
    setCachedHindiCatalogId,
    bibleIdRef,
  ])

  useEffect(() => {
    setActiveTranslationId(getStoredTranslationId(user?.id))
    try {
      const raw = localStorage.getItem(userStorageKey(user?.id, 'bible-font-size'))
      if (raw != null) setFontSize(clampBibleFontSize(parseInt(raw, 10)))
    } catch {
      /* ignore */
    }
  }, [user?.id])

  useEffect(() => {
    bibleIdRef.current = bibleId
  }, [bibleId])

  useEffect(() => {
    if (uiLang === 'hi') {
      try {
        const savedId = getSavedBibleId()
        setHindiSavedBibleId(savedId)
        // Auto-switch to Hindi Bible if still using default English KJV
        const HINDI_BIBLE_ID = '1e8ab327edbce67f-01'
        const DEFAULT_ENGLISH_ID = 'de4e12af7f28f599-02'
        const ENGLISH_IDS = new Set([
          DEFAULT_ENGLISH_ID,
          '592420522e16049f-01', // ESV
          '7142879509583d59-04', // NIV
          'b32b9d1b64b4ef29-04', // NLT
          '592420522e16049f-02', // NKJV
        ])
        // Only auto-switch if current Bible is an English version
        if (ENGLISH_IDS.has(savedId)) {
          console.log('[BibleReader] Auto-switching to Hindi Bible:', HINDI_BIBLE_ID)
          saveBibleId(HINDI_BIBLE_ID)
          setHindiSavedBibleId(HINDI_BIBLE_ID)
          bibleIdRef.current = HINDI_BIBLE_ID // Add this line
          loadChapter(HINDI_BIBLE_ID, selectedBook, chapter) // Replace setVerses([]) and setLoading(true)
        }
      } catch {
        setHindiSavedBibleId(null)
      }
    } else {
      setHindiSavedBibleId(null)
      setCachedHindiCatalogId(null)
      // Restore to English when switching back from Hindi
      try {
        const savedId = getSavedBibleId()
        const HINDI_BIBLE_ID = '1e8ab327edbce67f-01'
        if (savedId === HINDI_BIBLE_ID) {
          console.log('[BibleReader] Restoring to English Bible:', 'de4e12af7f28f599-02')
          saveBibleId('de4e12af7f28f599-02')
        }
      } catch {
        /* ignore */
      }
    }
  }, [uiLang, user?.id, loadChapter, selectedBook, chapter])

  useEffect(() => {
    let newBibleId = null;
    if (uiLang === 'hi') {
      newBibleId = hindiSavedBibleId;
    } else {
      newBibleId = activeTranslationId;
    }
    setBibleId(newBibleId);
  }, [uiLang, activeTranslationId, hindiSavedBibleId, setBibleId]);

  useEffect(() => {
    try {
      localStorage.setItem(userStorageKey(user?.id, 'bible-font-size'), String(fontSize))
    } catch {
      /* ignore */
    }
  }, [fontSize, user?.id])

  const maxChapter = selectedBook?.chapters || 1
  const hindiBiblePickerList = useMemo(() => {
    if (!showHindiApiBiblePicker) return []
    const fromPopular = POPULAR_BIBLES.filter((b) => b.language === 'हिंदी' && b.id)
    const fromCatalog = cachedHindiCatalogId
      ? [
          {
            id: cachedHindiCatalogId,
            name: 'Hindi Bible',
            abbr: 'HINIRV',
            language: 'हिंदी',
          },
        ]
      : []
    const byId = new Map()
    for (const b of [...fromCatalog, ...fromPopular]) {
      if (b.id) byId.set(b.id, b)
    }
    return Array.from(byId.values())
  }, [showHindiApiBiblePicker, cachedHindiCatalogId])
  const hindiPillAbbr =
    hindiBiblePickerList.find((b) => b.id === (hindiSavedBibleId || cachedHindiCatalogId))?.name || 'Hindi Bible (IRV)'
  const bookKey = selectedBook?.cdnName || ''

  useEffect(() => {
    if (!open || uiLang !== 'hi' || !HAS_API_BIBLE) return
    let cancelled = false
    ;(async () => {
      const id = await resolveBibleIdForLanguage('hi')
      if (!cancelled && id) setCachedHindiCatalogId(id)
    })()
    const navBtnStyle = {
    background: 'transparent',
    border: '1px solid #D4A843',
    borderRadius: '16px',
    color: '#D4A843',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    padding: '6px 14px',
    lineHeight: 1.2,
  };

  return () => {
      cancelled = true
    }
  }, [open, uiLang])

  // Re-fetch chapter when Hindi Bible ID changes
  useEffect(() => {
    if (uiLang === 'hi' && hindiSavedBibleId && selectedBook && chapter && open) {
      console.log('[BibleReader] Hindi Bible ID changed, re-fetching chapter:', hindiSavedBibleId)
      // Trigger re-fetch by clearing verses to force reload
      setVerses([])
      setLoading(true)
    }
  }, [hindiSavedBibleId, uiLang, selectedBook, chapter, open])
  const filteredBooks = useMemo(() => {
    const start = testamentFilter === 'old' ? 0 : OLD_TESTAMENT_LAST_INDEX + 1
    const end = testamentFilter === 'old' ? OLD_TESTAMENT_LAST_INDEX : BOOKS.length - 1
    return BOOKS.slice(start, end + 1).map((book, offset) => ({
      book,
      index: start + offset,
    }))
  }, [testamentFilter])

  const translationOptions = useMemo(
    () =>
      BIBLE_READER_TRANSLATIONS.map((tr) => ({
        id: tr.id,
        label: t(tr.labelKey),
        subtitle: t(tr.subtitleKey),
      })),
    [t],
  )
  const selectedTranslation = translationOptions.find((x) => x.id === activeTranslationId) ?? translationOptions[0]

  const bookDisplayName = (book) =>
    book ? t(`bible.books.${book.cdnName}`, { defaultValue: book.name }) : ''

  useEffect(() => {
    if (!showEnglishBibleVersions) setShowTranslationPicker(false)
  }, [showEnglishBibleVersions])

  const measureTranslationDropdownPosition = useCallback(() => {
    const el = translationButtonRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const gap = 6
    const menuWidth = Math.min(200, window.innerWidth - 16)
    let left = r.right - menuWidth
    left = Math.max(8, Math.min(left, window.innerWidth - menuWidth - 8))
    const top = r.bottom + gap
    setTranslationDropdownRect({ top, left })
  }, [])

  useLayoutEffect(() => {
    if (!showTranslationPicker || !showEnglishBibleVersions) {
      setTranslationDropdownRect(null)
      return undefined
    }
    measureTranslationDropdownPosition()
    const onScrollOrResize = () => measureTranslationDropdownPosition()
    window.addEventListener('resize', onScrollOrResize)
    window.addEventListener('scroll', onScrollOrResize, true)
    return () => {
      window.removeEventListener('resize', onScrollOrResize)
      window.removeEventListener('scroll', onScrollOrResize, true)
    }
  }, [showTranslationPicker, showEnglishBibleVersions, measureTranslationDropdownPosition])

  useEffect(() => {
    if (!showTranslationPicker || !showEnglishBibleVersions) return undefined
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setShowTranslationPicker(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [showTranslationPicker, showEnglishBibleVersions])

  useEffect(() => {
    if (!open) return

    const savedBookIndex = localStorage.getItem(userStorageKey(user?.id, 'bible-book-index'))
    const savedChapter = localStorage.getItem(userStorageKey(user?.id, 'bible-chapter'))

    if (savedBookIndex !== null) {
      setBookIndex(parseInt(savedBookIndex, 10))
    }
    if (savedChapter !== null) {
      setChapter(parseInt(savedChapter, 10))
    }
  }, [open, user?.id])



  useEffect(() => {
    if (!open || !selectedBook) return
    loadChapter(null, selectedBook, chapter)
  }, [open, selectedBook, chapter, loadChapter])

  useEffect(() => {
    if (!showBookPicker) return
    setTestamentFilter(bookIndex <= OLD_TESTAMENT_LAST_INDEX ? 'old' : 'new')
  }, [showBookPicker, bookIndex])

  useEffect(() => {
    if (!open) return
    setActiveVerse(null)
    setVerseMenuRect(null)
    setShowNoteModal(false)
    setShowNoteViewer(false)
    setShowCrossRefsModal(false)
    setShowStrongsModal(false)
    setStrongsWords([])
    setSelectedStrongsEntry(null)
    setCrossRefs([])
    setCrossRefsLoading(false)
    setNoteDraft('')
  }, [open, bookKey, chapter, activeTranslationId])

  useEffect(() => {
    if (!jumpHighlightTarget) return undefined
    const timeoutId = setTimeout(() => setJumpHighlightTarget(null), 4500)
    return () => clearTimeout(timeoutId)
  }, [jumpHighlightTarget])

  useEffect(() => {
    if (!open || !user?.id || !bookKey || !chapter) {
      setHighlightsByVerse({})
      setNotesByVerse({})
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const [hiRes, noteRes] = await Promise.all([
          supabase
            .from('verse_highlights')
            .select('verse,color')
            .eq('user_id', user.id)
            .eq('book', bookKey)
            .eq('chapter', chapter),
          supabase
            .from('verse_notes')
            .select('verse,note_text')
            .eq('user_id', user.id)
            .eq('book', bookKey)
            .eq('chapter', chapter),
        ])

        if (cancelled) return

        const nextHighlights = {}
        for (const row of hiRes?.data || []) {
          nextHighlights[String(row.verse)] = row.color || 'gold'
        }
        const nextNotes = {}
        for (const row of noteRes?.data || []) {
          nextNotes[String(row.verse)] = row.note_text || ''
        }

        setHighlightsByVerse(nextHighlights)
        setNotesByVerse(nextNotes)
      } catch (err) {
        if (import.meta.env.DEV) console.error('Load verse highlights/notes:', err)
        if (!cancelled) {
          setHighlightsByVerse({})
          setNotesByVerse({})
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [open, user?.id, bookKey, chapter])

  useEffect(() => {
    if (!verseMenuRect && !showNoteModal && !showNoteViewer && !showCrossRefsModal && !showStrongsModal) return undefined
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setVerseMenuRect(null)
        setActiveVerse(null)
        setShowNoteModal(false)
        setShowNoteViewer(false)
        setShowCrossRefsModal(false)
        setShowStrongsModal(false)
        setSelectedStrongsEntry(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [verseMenuRect, showNoteModal, showNoteViewer, showCrossRefsModal, showStrongsModal])

  const openVerseMenu = (verseNum, clientX, clientY) => {
    if (!verseNum) return
    setActiveVerse(Number(verseNum))
    const menuWidth = 230
    const gap = 10
    const maxLeft = window.innerWidth - menuWidth - 8
    const left = Math.max(8, Math.min(clientX - menuWidth / 2, maxLeft))
    const top = Math.max(8, clientY + gap)
    setVerseMenuRect({ top, left, width: menuWidth })
  }

  const saveHighlight = async (verseNum) => {
    if (!user?.id || !bookKey || !chapter || !verseNum) return
    const verse = Number(verseNum)
    const color = 'gold'
    setHighlightsByVerse((prev) => ({ ...(prev || {}), [String(verse)]: color }))
    setVerseMenuRect(null)
    try {
      const { error } = await supabase
        .from('verse_highlights')
        .upsert(
          { user_id: user.id, book: bookKey, chapter, verse, color },
          { onConflict: 'user_id,book,chapter,verse' },
        )
      if (error) throw error
    } catch (err) {
      if (import.meta.env.DEV) console.error('Save highlight:', err)
    }
  }

  const openAddNote = (verseNum) => {
    const verse = Number(verseNum)
    setVerseMenuRect(null)
    setShowNoteViewer(false)
    setActiveVerse(verse)
    setNoteDraft(notesByVerse[String(verse)] || '')
    setShowNoteModal(true)
  }

  const saveNote = async () => {
    if (!user?.id || !bookKey || !chapter || !activeVerse) return
    const verse = Number(activeVerse)
    const note_text = String(noteDraft || '').trim()
    setNotesByVerse((prev) => ({ ...(prev || {}), [String(verse)]: note_text }))
    setShowNoteModal(false)
    try {
      const { error } = await supabase
        .from('verse_notes')
        .upsert(
          { user_id: user.id, book: bookKey, chapter, verse, note_text },
          { onConflict: 'user_id,book,chapter,verse' },
        )
      if (error) throw error
    } catch (err) {
      if (import.meta.env.DEV) console.error('Save note:', err)
    }
  }

  const openNoteViewer = (verseNum) => {
    const verse = Number(verseNum)
    setActiveVerse(verse)
    setShowNoteModal(false)
    setVerseMenuRect(null)
    setShowNoteViewer(true)
  }

  const resolveBookFromCdn = (cdnName) => BOOKS.find((b) => b.cdnName === cdnName)

  const fetchReferenceVerseText = async (ref) => {
    try {
      const chapterUrl = `${BIBLE_API_COM}/${encodeURIComponent(ref.book)}+${ref.chapter}?translation=${encodeURIComponent(activeTranslationId)}`
      const res = await fetch(chapterUrl)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const chapterVerses = dedupeVersesByNumber(data.verses || [])
      const hit = chapterVerses.find((v) => Number(v.verse) === Number(ref.verseStart))
      if (!hit) return ''
      return prepareBibleReaderVerseText(hit.text)
    } catch {
      return ''
    }
  }

  const openCrossReferences = async (verseNum) => {
    const verse = Number(verseNum)
    if (!bookKey || !chapter || !verse) return
    setActiveVerse(verse)
    setVerseMenuRect(null)
    setShowNoteModal(false)
    setShowNoteViewer(false)
    setShowCrossRefsModal(true)
    setCrossRefsLoading(true)

    const key = `${bookKey}.${chapter}.${verse}`
    const dataset = await loadCrossReferencesDataset()
    const refs = dataset[key] || []
    try {
      const rows = await Promise.all(
        refs.map(async (ref) => {
          const book = resolveBookFromCdn(ref.book)
          const text = await fetchReferenceVerseText(ref)
          return {
            ...ref,
            referenceLabel:
              Number(ref.chapter) === Number(ref.chapterEnd) && Number(ref.verseStart) === Number(ref.verseEnd)
                ? `${book?.name || ref.book} ${ref.chapter}:${ref.verseStart}`
                : `${book?.name || ref.book} ${ref.chapter}:${ref.verseStart}-${ref.chapterEnd}:${ref.verseEnd}`,
            text: text || 'Verse text unavailable for this translation.',
            bookIndex: book ? BOOKS.findIndex((b) => b.cdnName === ref.book) : -1,
          }
        }),
      )
      setCrossRefs(rows)
    } finally {
      setCrossRefsLoading(false)
    }
  }

  const jumpToCrossReference = (ref) => {
    if (!ref || ref.bookIndex < 0) return
    setShowCrossRefsModal(false)
    setShowNoteViewer(false)
    setShowNoteModal(false)
    setShowBookPicker(false)
    setShowChapterPicker(false)
    setBookIndex(ref.bookIndex)
    setChapter(ref.chapter)
    setJumpHighlightTarget({
      book: ref.book,
      chapter: ref.chapter,
      verse: Number(ref.verseStart),
    })
  }

  const openStrongsConcordance = async (verseNum) => {
    const verse = Number(verseNum)
    const verseObj = verses.find((v) => Number(v.verse) === verse)
    if (!verseObj) return
    const words = String(verseObj.text || '')
      .replace(/[^\p{L}\p{N}\s'-]/gu, ' ')
      .split(/\s+/)
      .map((w) => w.trim())
      .filter(Boolean)
      .filter((w, idx, arr) => arr.findIndex((x) => x.toLowerCase() === w.toLowerCase()) === idx)
    setActiveVerse(verse)
    setVerseMenuRect(null)
    setShowNoteModal(false)
    setShowNoteViewer(false)
    setShowCrossRefsModal(false)
    setSelectedStrongsEntry(null)
    setStrongsWords(words)
    setShowStrongsModal(true)
  }

  const isOldTestamentBook = bookIndex < 39

  const findStrongsEntryForWord = (dictionary, rawWord) => {
    const needle = String(rawWord || '').toLowerCase()
    if (!needle) return null
    for (const [strongsNumber, entry] of Object.entries(dictionary || {})) {
      const kjvDef = String(entry?.kjv_def || '').toLowerCase()
      if (!kjvDef) continue
      const tokens = kjvDef
        .replace(/[^a-z0-9\s'-]/g, ' ')
        .split(/\s+/)
        .filter(Boolean)
      if (tokens.includes(needle)) {
        return { strongsNumber, entry }
      }
    }
    return null
  }

  const openStrongsWordDetail = async (rawWord) => {
    const wordKey = String(rawWord || '').toLowerCase()
    const cacheBucket = isOldTestamentBook ? strongsWordLookupCache.hebrew : strongsWordLookupCache.greek
    if (cacheBucket.has(wordKey)) {
      setSelectedStrongsEntry(cacheBucket.get(wordKey))
      return
    }
    const dictionary = isOldTestamentBook
      ? await loadStrongsHebrewDataset()
      : await loadStrongsGreekDataset()
    const hit = findStrongsEntryForWord(dictionary, rawWord)
    if (hit) {
      const mapped = {
        word: rawWord,
        strongsNumber: hit.strongsNumber,
        originalWord: hit.entry.lemma || rawWord,
        transliteration: hit.entry.translit || hit.entry.xlit || '',
        definition: hit.entry.strongs_def || hit.entry.kjv_def || 'No definition available.',
      }
      cacheBucket.set(wordKey, mapped)
      setSelectedStrongsEntry(mapped)
      return
    }
    const fallback = {
      word: rawWord,
      strongsNumber: 'N/A',
      originalWord: rawWord,
      transliteration: String(rawWord || '').toLowerCase(),
      definition: `Strong's entry not found in the ${isOldTestamentBook ? 'Hebrew' : 'Greek'} dictionary for this word yet.`,
    }
    cacheBucket.set(wordKey, fallback)
    setSelectedStrongsEntry(fallback)
  }

  useEffect(() => {
    if (selectedBook) {
      try {
        localStorage.setItem(userStorageKey(user?.id, 'bible-book-index'), bookIndex.toString())
        localStorage.setItem(userStorageKey(user?.id, 'bible-chapter'), chapter.toString())
      } catch {
        /* ignore */
      }
    }
  }, [bookIndex, chapter, selectedBook, user?.id])

  useEffect(() => {
    try {
      localStorage.setItem(translationStorageKey(user?.id), activeTranslationId)
    } catch {
      /* ignore */
    }
  }, [activeTranslationId, user?.id])

  const handleBookSelect = (index) => {
    setBookIndex(index)
    setChapter(1)
    setShowBookPicker(false)
    setShowChapterPicker(true)
  }

  const handleChapterSelect = (num) => {
    setChapter(num)
    setShowChapterPicker(false)
  }

  const goToPreviousChapter = () => {
    if (chapter > 1) {
      setChapter(chapter - 1)
    }
  }

  const goToNextChapter = () => {
    if (chapter < maxChapter) {
      setChapter(chapter + 1)
    }
  }

  if (!open) return null

  const navBtnStyle = {
    background: 'transparent',
    border: '1px solid #D4A843',
    borderRadius: '16px',
    color: '#D4A843',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    padding: '6px 14px',
    lineHeight: 1.2,
  };

  return (
    <div style={{ position: 'relative', zIndex: 10, width: '100%', minHeight: '100dvh', background: 'transparent' }}>
      {/*
        ZONE 1 — App bar (logo, Read title, settings): fixed in App — do not style here.
        ZONE 2 — Chapter header + Read/Listen (fixed below app bar)
      */}
      <div
        className="bible-reader-header"
        style={{
          position: 'fixed',
          top: APP_BAR_TOP_OFFSET,
          left: 0,
          right: 0,
          height: 'auto',
          zIndex: 90,
          background: 'rgba(6, 15, 38, 0.75)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          paddingTop: 12,
          paddingBottom: 12,
          paddingLeft: 20,
          paddingRight: 20,
        }}
      >
        <div style={{ maxWidth: '680px', margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '0 16px' }}>
            <button
              type="button"
              className="bible-nav-arrow"
              onClick={() => {
                if (chapter > 1) {
                  setChapter(chapter - 1)
                } else if (bookIndex > 0) {
                  setBookIndex(bookIndex - 1)
                  setChapter(BOOKS[bookIndex - 1]?.chapters || 1)
                }
              }}
              disabled={bookIndex === 0 && chapter === 1}
              style={{
                background: 'rgba(240, 192, 64, 0.1)',
                border: '1px solid rgba(240, 192, 64, 0.3)',
                borderRadius: '12px',
                color: dayTheme ? '#D4A843' : '#F0C040',
                borderColor: dayTheme ? '#D4A843' : 'rgba(240, 192, 64, 0.3)',
                fontSize: '24px',
                cursor: (bookIndex === 0 && chapter === 1) ? 'not-allowed' : 'pointer',
                padding: '6px 12px',
                lineHeight: '1',
                opacity: (bookIndex === 0 && chapter === 1) ? 0.3 : 1,
                transition: 'all 0.2s ease',
                alignSelf: 'center',
              }}
            >
              ←
            </button>
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setShowBookPicker(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '28px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '0 8px',
                  letterSpacing: '-0.02em',
                  lineHeight: '1.1',
                }}
              >
                {selectedBook ? bookDisplayName(selectedBook) : t('bible.loading')}
              </button>
              <button
                type="button"
                onClick={() => setShowChapterPicker(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#F0C040',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '0 8px',
                  lineHeight: '1.2',
                }}
              >
                {t('bible.chapter', { n: chapter })}
              </button>
            </div>
            
            <button
              type="button"
              className="bible-nav-arrow"
              onClick={() => {
                if (chapter < maxChapter) {
                  setChapter(chapter + 1)
                } else if (bookIndex < BOOKS.length - 1) {
                  setBookIndex(bookIndex + 1)
                  setChapter(1)
                }
              }}
              disabled={bookIndex === BOOKS.length - 1 && chapter === maxChapter}
              style={{
                background: 'rgba(240, 192, 64, 0.1)',
                border: '1px solid rgba(240, 192, 64, 0.3)',
                borderRadius: '12px',
                color: dayTheme ? '#D4A843' : '#F0C040',
                borderColor: dayTheme ? '#D4A843' : 'rgba(240, 192, 64, 0.3)',
                fontSize: '24px',
                cursor: (bookIndex === BOOKS.length - 1 && chapter === maxChapter) ? 'not-allowed' : 'pointer',
                padding: '6px 12px',
                lineHeight: '1',
                opacity: (bookIndex === BOOKS.length - 1 && chapter === maxChapter) ? 0.3 : 1,
                transition: 'all 0.2s ease',
                alignSelf: 'center',
              }}
            >
              →
            </button>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 4, marginBottom: 0, gap: '8px', flexShrink: 0 }}>
            {showEnglishBibleVersions || showHindiApiBiblePicker ? (
              <button
                ref={translationButtonRef}
                type="button"
                className="bible-translation-btn"
                onClick={() => {
                  if (showHindiApiBiblePicker) setShowHindiBiblePicker(true)
                  else setShowTranslationPicker((o) => !o)
                }}
                style={{
                  background: 'rgba(240, 192, 64, 0.1)',
                  border: '1px solid rgba(240, 192, 64, 0.4)',
                  borderRadius: '50px',
                  color: dayTheme ? '#D4A843' : 'rgba(255, 255, 255, 0.7)',
                  borderColor: dayTheme ? '#D4A843' : 'rgba(240, 192, 64, 0.4)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '0 16px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'all 0.2s ease',
                }}
                aria-expanded={showHindiApiBiblePicker ? showHindiBiblePicker : showTranslationPicker}
                aria-haspopup="listbox"
              >
                {HAS_API_BIBLE && showHindiApiBiblePicker
                  ? hindiPillAbbr
                  : HAS_API_BIBLE
                    ? uiLang.toUpperCase()
                    : selectedTranslation.label}
              </button>
            ) : (
              <span className="bible-translation-btn" style={{
                fontSize: '12px',
                fontWeight: 600,
                color: dayTheme ? '#D4A843' : 'rgba(255, 255, 255, 0.7)',
                borderColor: dayTheme ? '#D4A843' : 'rgba(240, 192, 64, 0.4)',
                padding: '0 16px',
                height: '40px',
                display: 'inline-flex',
                alignItems: 'center',
                background: 'rgba(240, 192, 64, 0.1)',
                border: '1px solid rgba(240, 192, 64, 0.4)',
                borderRadius: '50px',
              }}>
                {getBibleSlug ? String(getBibleSlug).toUpperCase() : ''}
              </span>
            )}
            
            {onModeChange && (
              <button
                type="button"
                className="bible-read-btn"
                onClick={() => onModeChange('read')}
                style={{
                  background: '#D4A843',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '50px',
                  padding: '0 16px',
                  height: '40px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'all 0.2s ease',
                }}
              >
                {t('bible.read')}
              </button>
            )}
            
            <button
              type="button"
              className="bible-settings-btn"
              onClick={() => setShowReadingControls(true)}
              style={{
                background: 'rgba(240, 192, 64, 0.1)',
                border: '1px solid rgba(240, 192, 64, 0.4)',
                borderRadius: '50px',
                color: dayTheme ? '#D4A843' : '#F0C040',
                borderColor: dayTheme ? '#D4A843' : 'rgba(240, 192, 64, 0.4)',
                fontSize: '16px',
                cursor: 'pointer',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
              }}
              aria-label="Reading settings"
            >
              ⚙
            </button>
          </div>
        </div>
      </div>

      {/* ZONE 3 — Scrollable Bible text only */}
      <div
        style={{
          position: 'fixed',
          top: BIBLE_SCROLL_TOP_OFFSET,
          bottom: BIBLE_SCROLL_BOTTOM_PX,
          left: 0,
          right: 0,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          padding: '24px 20px',
          zIndex: 40,
          boxSizing: 'border-box',
          background: 'transparent',
        }}
      >
        <div style={{ maxWidth: '680px', margin: '0 auto', width: '100%', animation: 'fadeIn 0.6s ease-out' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '80px 24px' }}>
              <div style={{ fontSize: '48px', marginBottom: '24px', filter: 'drop-shadow(0 0 20px rgba(240, 192, 64, 0.3))' }}>✝</div>
              <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '15px' }}>{t('bible.loading')}</p>
            </div>
          ) : (
            <div
              className="bible-verse-well"
              style={{
                color: 'var(--bible-verse-text)',
                fontSize: `${fontSize}px`,
                lineHeight: '1.8',
                fontFamily: 'Lora, serif',
              }}
            >
              {verses.map((v) => (
                (() => {
                  const isJumpHighlight =
                    jumpHighlightTarget &&
                    jumpHighlightTarget.book === bookKey &&
                    Number(jumpHighlightTarget.chapter) === Number(chapter) &&
                    Number(jumpHighlightTarget.verse) === Number(v.verse)
                  return (
                <p
                  key={v.verse}
                  onClick={(e) => openVerseMenu(v.verse, e.clientX, e.clientY)}
                  style={{
                    marginBottom: '10px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    padding: '14px 18px',
                    borderRadius: '12px',
                    background: highlightsByVerse[String(v.verse)] || isJumpHighlight
                      ? 'rgba(212, 168, 67, 0.15)'
                      : 'rgba(10, 20, 50, 0.6)',
                    color: 'rgba(255, 255, 255, 0.9)',
                    borderLeft: highlightsByVerse[String(v.verse)] || isJumpHighlight
                      ? '3px solid rgba(212, 168, 67, 0.6)'
                      : '3px solid transparent',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <sup
                    style={{
                      color: '#F0C040',
                      fontSize: '11px',
                      fontWeight: 700,
                      marginRight: '5px',
                      verticalAlign: 'super',
                    }}
                  >
                    {v.verse}
                  </sup>
                  {v.text}
                  {notesByVerse[String(v.verse)] ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        openNoteViewer(v.verse)
                      }}
                      style={{
                        background: 'rgba(240, 192, 64, 0.15)',
                        border: '1px solid rgba(240, 192, 64, 0.3)',
                        cursor: 'pointer',
                        padding: '4px 10px',
                        margin: '0 0 0 8px',
                        color: '#F0C040',
                        fontSize: '12px',
                        fontWeight: 600,
                        borderRadius: '99px',
                        transition: 'all 0.2s ease',
                      }}
                      aria-label={`View note for verse ${v.verse}`}
                      title="View note"
                    >
                      📝
                    </button>
                  ) : null}
                </p>
                  )
                })()
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Verse action menu (portaled) */}
      {verseMenuRect &&
        typeof document !== 'undefined' &&
        createPortal(
          <>
            <div
              onClick={() => {
                setVerseMenuRect(null)
                setActiveVerse(null)
              }}
              style={{ position: 'fixed', inset: 0, zIndex: 10030, background: 'rgba(0, 0, 0, 0.5)' }}
              aria-hidden
            />
            <div
              style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 10031,
                background: 'rgba(6, 15, 38, 0.75)',
                backdropFilter: 'blur(28px)',
                WebkitBackdropFilter: 'blur(28px)',
                borderTop: '1px solid rgba(255, 255, 255, 0.09)',
                borderRadius: '24px 24px 0 0',
                padding: '24px',
                animation: 'slideUp 0.3s ease-out',
              }}
              onClick={(e) => e.stopPropagation()}
              role="menu"
              aria-label="Verse options"
            >
              <div style={{ maxWidth: '680px', margin: '0 auto' }}>
                <p style={{ margin: '0 0 20px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.18em', color: '#F0C040', textTransform: 'uppercase', textAlign: 'center' }}>
                  Verse {activeVerse ?? ''}
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => saveHighlight(activeVerse)}
                    style={{
                      background: 'rgba(240, 192, 64, 0.15)',
                      border: '1px solid rgba(240, 192, 64, 0.3)',
                      color: '#F0C040',
                      borderRadius: '16px',
                      padding: '12px 20px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '14px',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    � Highlight
                  </button>
                  <button
                    type="button"
                    onClick={() => openAddNote(activeVerse)}
                    style={{
                      background: 'rgba(240, 192, 64, 0.15)',
                      border: '1px solid rgba(240, 192, 64, 0.3)',
                      color: '#F0C040',
                      borderRadius: '16px',
                      padding: '12px 20px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '14px',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    📝 Note
                  </button>
                  <button
                    type="button"
                    onClick={() => openCrossReferences(activeVerse)}
                    style={{
                      background: 'rgba(240, 192, 64, 0.15)',
                      border: '1px solid rgba(240, 192, 64, 0.3)',
                      color: '#F0C040',
                      borderRadius: '16px',
                      padding: '12px 20px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '14px',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    🔗 Cross Ref
                  </button>
                  <button
                    type="button"
                    onClick={() => openStrongsConcordance(activeVerse)}
                    style={{
                      background: 'rgba(240, 192, 64, 0.15)',
                      border: '1px solid rgba(240, 192, 64, 0.3)',
                      color: '#F0C040',
                      borderRadius: '16px',
                      padding: '12px 20px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '14px',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    📖 Strong's
                  </button>
                </div>
              </div>
            </div>
          </>,
          document.body,
        )}

      {/* Add Note modal */}
      {showNoteModal && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="glass-scrim"
              style={{ position: 'fixed', inset: 0, zIndex: 10040, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={() => setShowNoteModal(false)}
            >
              <div
                className="glass-panel"
                style={{
                  width: 'min(520px, calc(100vw - 24px))',
                  borderRadius: '18px',
                  padding: '16px',
                  border: '1px solid rgba(255,255,255,0.10)',
                  background: 'rgba(10, 20, 50, 0.6)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
                  color: 'var(--card-text, var(--text-primary))',
                }}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="Add note"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <p style={{ margin: 0, fontWeight: 900, letterSpacing: '0.02em', color: 'var(--text-primary)' }}>
                    📝 Note — {selectedBook ? bookDisplayName(selectedBook) : ''} {chapter}:{activeVerse}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowNoteModal(false)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '14px' }}
                  >
                    ✕
                  </button>
                </div>
                <textarea
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  placeholder="Type your note…"
                  style={{
                    width: '100%',
                    minHeight: '120px',
                    resize: 'vertical',
                    borderRadius: '12px',
                    border: '1px solid var(--input-border, rgba(255,255,255,0.14))',
                    background: 'var(--input-bg, rgba(255,255,255,0.06))',
                    color: 'var(--text-primary)',
                    padding: '12px',
                    fontSize: '14px',
                    lineHeight: 1.4,
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setShowNoteModal(false)}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--input-border, rgba(255,255,255,0.14))',
                      color: 'var(--text-primary)',
                      borderRadius: '14px',
                      padding: '10px 14px',
                      cursor: 'pointer',
                      fontWeight: 800,
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveNote}
                    style={{
                      background: '#D4AF37',
                      border: 'none',
                      color: '#0b1026',
                      borderRadius: '14px',
                      padding: '10px 14px',
                      cursor: 'pointer',
                      fontWeight: 900,
                    }}
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {/* Cross References modal */}
      {showCrossRefsModal && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="glass-scrim"
              style={{ position: 'fixed', inset: 0, zIndex: 10045, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={() => setShowCrossRefsModal(false)}
            >
              <div
                className="glass-panel"
                style={{
                  width: 'min(560px, calc(100vw - 24px))',
                  maxHeight: 'min(78vh, 720px)',
                  overflowY: 'auto',
                  borderRadius: '18px',
                  padding: '16px',
                  border: '1px solid rgba(255,255,255,0.10)',
                  background: 'rgba(10, 20, 50, 0.6)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
                  color: 'var(--card-text, var(--text-primary))',
                }}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="Cross references"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <p style={{ margin: 0, fontWeight: 900, letterSpacing: '0.02em', color: 'var(--text-primary)' }}>
                    🔗 Cross References — {selectedBook ? bookDisplayName(selectedBook) : ''} {chapter}:{activeVerse}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowCrossRefsModal(false)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '14px' }}
                  >
                    ✕
                  </button>
                </div>

                {crossRefsLoading ? (
                  <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Loading cross references…</p>
                ) : crossRefs.length === 0 ? (
                  <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                    No cross references are available for this verse in the local dataset yet.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {crossRefs.map((ref) => (
                      <button
                        key={`${ref.book}-${ref.chapter}-${ref.verseStart}-${ref.chapterEnd}-${ref.verseEnd}`}
                        type="button"
                        onClick={() => jumpToCrossReference(ref)}
                        style={{
                          background: 'var(--input-bg, rgba(255,255,255,0.06))',
                          border: '1px solid var(--input-border, rgba(255,255,255,0.14))',
                          borderRadius: '12px',
                          padding: '10px 12px',
                          textAlign: 'left',
                          cursor: ref.bookIndex >= 0 ? 'pointer' : 'not-allowed',
                          opacity: ref.bookIndex >= 0 ? 1 : 0.65,
                        }}
                      >
                        <p style={{ margin: 0, color: '#D4AF37', fontWeight: 800, fontSize: '13px' }}>{ref.referenceLabel}</p>
                        <p style={{ margin: '6px 0 0', color: 'var(--text-primary)', fontSize: '13px', lineHeight: 1.45 }}>
                          {ref.text}
                        </p>
                      </button>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setShowCrossRefsModal(false)}
                    style={{
                      background: '#D4AF37',
                      border: 'none',
                      color: '#1a1a1a',
                      borderRadius: '14px',
                      padding: '10px 14px',
                      cursor: 'pointer',
                      fontWeight: 900,
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {/* Strong's Concordance modal */}
      {showStrongsModal && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="glass-scrim"
              style={{ position: 'fixed', inset: 0, zIndex: 10047, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={() => {
                setShowStrongsModal(false)
                setSelectedStrongsEntry(null)
              }}
            >
              <div
                className="glass-panel"
                style={{
                  width: 'min(560px, calc(100vw - 24px))',
                  maxHeight: 'min(80vh, 760px)',
                  overflowY: 'auto',
                  borderRadius: '18px',
                  padding: '16px',
                  border: '1px solid rgba(255,255,255,0.10)',
                  background: 'rgba(10, 20, 50, 0.6)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
                  color: 'var(--card-text, var(--text-primary))',
                }}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="Strong's Concordance"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <p style={{ margin: 0, fontWeight: 900, letterSpacing: '0.02em', color: 'var(--text-primary)' }}>
                    📚 Strong&apos;s Concordance - {selectedBook ? bookDisplayName(selectedBook) : ''} {chapter}:{activeVerse}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowStrongsModal(false)
                      setSelectedStrongsEntry(null)
                    }}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '14px' }}
                  >
                    ✕
                  </button>
                </div>

                {selectedStrongsEntry ? (
                  <div>
                    <button
                      type="button"
                      onClick={() => setSelectedStrongsEntry(null)}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--input-border, rgba(255,255,255,0.14))',
                        color: 'var(--text-primary)',
                        borderRadius: '12px',
                        padding: '8px 12px',
                        cursor: 'pointer',
                        fontWeight: 700,
                        marginBottom: '12px',
                      }}
                    >
                      ← Back
                    </button>
                    <div
                      style={{
                        borderRadius: '12px',
                        border: '1px solid var(--input-border, rgba(255,255,255,0.14))',
                        background: 'var(--input-bg, rgba(255,255,255,0.06))',
                        padding: '12px',
                      }}
                    >
                      <p style={{ margin: 0, color: '#D4AF37', fontWeight: 900, fontSize: '16px' }}>
                        {selectedStrongsEntry.strongsNumber}
                      </p>
                      <p style={{ margin: '8px 0 0', color: 'var(--text-primary)', fontSize: '14px' }}>
                        <strong>Word:</strong> {selectedStrongsEntry.originalWord}
                      </p>
                      <p style={{ margin: '6px 0 0', color: 'var(--text-primary)', fontSize: '14px' }}>
                        <strong>Transliteration:</strong> {selectedStrongsEntry.transliteration}
                      </p>
                      <p style={{ margin: '6px 0 0', color: 'var(--text-primary)', fontSize: '14px', lineHeight: 1.5 }}>
                        <strong>Definition:</strong> {selectedStrongsEntry.definition}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p style={{ margin: '0 0 10px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                      Tap a word to view its Strong&apos;s entry.
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {strongsWords.map((word, idx) => (
                        <button
                          key={`${word}-${idx}`}
                          type="button"
                          onClick={() => openStrongsWordDetail(word)}
                          style={{
                            borderRadius: '999px',
                            border: '1px solid rgba(212,175,55,0.42)',
                            background: 'rgba(212,175,55,0.14)',
                            color: 'var(--text-primary)',
                            padding: '6px 12px',
                            fontSize: '13px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          {word}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowStrongsModal(false)
                      setSelectedStrongsEntry(null)
                    }}
                    style={{
                      background: '#D4AF37',
                      border: 'none',
                      color: '#1a1a1a',
                      borderRadius: '14px',
                      padding: '10px 14px',
                      cursor: 'pointer',
                      fontWeight: 900,
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {/* Note viewer */}
      {showNoteViewer && activeVerse && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="glass-scrim"
              style={{ position: 'fixed', inset: 0, zIndex: 10050, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={() => setShowNoteViewer(false)}
            >
              <div
                className="glass-panel"
                style={{
                  width: 'min(520px, calc(100vw - 24px))',
                  borderRadius: '18px',
                  padding: '16px',
                  border: '1px solid rgba(255,255,255,0.10)',
                  background: 'rgba(10, 20, 50, 0.6)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
                  color: 'var(--card-text, var(--text-primary))',
                }}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="View note"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <p style={{ margin: 0, fontWeight: 900, letterSpacing: '0.02em', color: 'var(--text-primary)' }}>
                    📝 Note — {selectedBook ? bookDisplayName(selectedBook) : ''} {chapter}:{activeVerse}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowNoteViewer(false)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '14px' }}
                  >
                    ✕
                  </button>
                </div>
                <div
                  style={{
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.5,
                    fontSize: '14px',
                    padding: '12px',
                    borderRadius: '12px',
                    border: '1px solid var(--input-border, rgba(255,255,255,0.14))',
                    background: 'var(--input-bg, rgba(255,255,255,0.06))',
                    color: 'var(--text-primary)',
                  }}
                >
                  {notesByVerse[String(activeVerse)] || ''}
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '12px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNoteViewer(false)
                      openAddNote(activeVerse)
                    }}
                    style={{
                      background: '#D4AF37',
                      border: 'none',
                      color: '#1a1a1a',
                      borderRadius: '14px',
                      padding: '10px 14px',
                      cursor: 'pointer',
                      fontWeight: 900,
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNoteViewer(false)}
                    style={{
                      background: '#D4AF37',
                      border: 'none',
                      color: '#0b1026',
                      borderRadius: '14px',
                      padding: '10px 14px',
                      cursor: 'pointer',
                      fontWeight: 900,
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {/* ZONE 4 — Chapter / font nav (fixed above bottom tab bar). ZONE 5 — tab bar: fixed in App. */}
      <div
        className="bible-reader-bottom-controls"
        style={{
          position: 'fixed',
          bottom: BOTTOM_TAB_BAR_PX,
          left: 0,
          right: 0,
          height: BOTTOM_CHROME_NAV_PX,
          zIndex: 90,
          background: 'var(--bible-nav-bar-bg)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderTop: '1px solid var(--glass-border)',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
        }}
      >
        <div
          style={{
            maxWidth: '680px',
            margin: '0 auto',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <div style={{ flex: '1 1 0', display: 'flex', justifyContent: 'flex-start', minWidth: 0 }}>
            <button
              type="button"
              className="reader-chapter-nav-day"
              onClick={goToPreviousChapter}
              disabled={chapter === 1 || loading}
              style={{
                background: '#D4A843',
                border: 'none',
                borderRadius: '16px',
                color: '#0a1a3e',
                fontSize: '13px',
                fontWeight: 600,
                cursor: chapter === 1 || loading ? 'not-allowed' : 'pointer',
                padding: '6px 14px',
                lineHeight: 1.2,
                opacity: 1,
              }}
            >
              {t('bible.previous')}
            </button>
          </div>
          <div
            style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: '8px', padding: '0 4px' }}
            aria-label="Bible text size"
          >
            <button
              type="button"
              className="reader-font-btn-day"
              onClick={() => {
                setFontSize((s) => {
                  const next = clampBibleFontSize(s - BIBLE_FONT_STEP)
                  try {
                    localStorage.setItem(userStorageKey(user?.id, 'bible-font-size'), String(next))
                  } catch {
                    /* ignore */
                  }
                  return next
                })
              }}
              disabled={fontSize <= BIBLE_FONT_MIN}
              style={{
                backgroundColor: '#D4A843',
                border: 'none',
                color: '#0a1a3e',
                fontSize: '14px',
                fontWeight: 700,
                cursor: fontSize <= BIBLE_FONT_MIN ? 'not-allowed' : 'pointer',
                padding: '4px 6px',
                opacity: fontSize <= BIBLE_FONT_MIN ? 0.35 : 1,
                borderRadius: '16px',
              }}
            >
              A-
            </button>
            <div style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.2)' }} />
            <button
              type="button"
              className="reader-font-btn-day"
              onClick={() => {
                setFontSize((s) => {
                  const next = clampBibleFontSize(s + BIBLE_FONT_STEP)
                  try {
                    localStorage.setItem(userStorageKey(user?.id, 'bible-font-size'), String(next))
                  } catch {
                    /* ignore */
                  }
                  return next
                })
              }}
              disabled={fontSize >= BIBLE_FONT_MAX}
              style={{
                backgroundColor: '#D4A843',
                border: 'none',
                color: '#0a1a3e',
                fontSize: '14px',
                fontWeight: 700,
                cursor: fontSize >= BIBLE_FONT_MAX ? 'not-allowed' : 'pointer',
                padding: '4px 6px',
                opacity: fontSize >= BIBLE_FONT_MAX ? 0.35 : 1,
                borderRadius: '16px',
              }}
            >
              A+
            </button>
          </div>
          <div style={{ flex: '1 1 0', display: 'flex', justifyContent: 'flex-end', minWidth: 0 }}>
            <button
              type="button"
              className="reader-chapter-nav-day"
              onClick={goToNextChapter}
              disabled={chapter === maxChapter || loading}
              style={{
                background: '#D4A843',
                border: 'none',
                borderRadius: '16px',
                color: '#0a1a3e',
                fontSize: '13px',
                fontWeight: 600,
                cursor: chapter === maxChapter || loading ? 'not-allowed' : 'pointer',
                padding: '6px 14px',
                lineHeight: 1.2,
                opacity: 1,
              }}
            >
              {t('bible.next')}
            </button>
          </div>
        </div>
      </div>

      {/* Book Picker Modal */}
      {showBookPicker && typeof document !== 'undefined' ? createPortal(
        <>
          <div
            onClick={() => setShowBookPicker(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0, 0, 0, 0.5)' }}
            aria-hidden
          />
          <div
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 201,
              maxHeight: '85vh',
              background: 'rgba(6, 15, 38, 0.75)',
              backdropFilter: 'blur(28px)',
              WebkitBackdropFilter: 'blur(28px)',
              borderTop: '1px solid rgba(255, 255, 255, 0.09)',
              borderRadius: '24px 24px 0 0',
              padding: '24px',
              animation: 'slideUp 0.3s ease-out',
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Book selector"
          >
            <div style={{ maxWidth: '680px', margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ 
                  color: '#F0C040', 
                  fontSize: '20px', 
                  fontWeight: 600, 
                  margin: 0
                }}>
                  {t('bible.selectBook')}
                </h2>
                <button
                  type="button"
                  onClick={() => setShowBookPicker(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontSize: '24px',
                    cursor: 'pointer',
                    padding: '8px',
                  }}
                >
                  ✕
                </button>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                <button
                  type="button"
                  onClick={() => setTestamentFilter('old')}
                  style={{
                    flex: 1,
                    borderRadius: '99px',
                    border: testamentFilter === 'old' ? 'none' : '1px solid rgba(240, 192, 64, 0.3)',
                    background: testamentFilter === 'old' ? 'linear-gradient(135deg, #F0C040 0%, #C08010 100%)' : 'rgba(10, 15, 40, 0.6)',
                    color: testamentFilter === 'old' ? '#0a0f28' : 'rgba(255, 255, 255, 0.7)',
                    fontWeight: 600,
                    padding: '10px 16px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  Old Testament
                </button>
                <button
                  type="button"
                  onClick={() => setTestamentFilter('new')}
                  style={{
                    flex: 1,
                    borderRadius: '99px',
                    border: testamentFilter === 'new' ? 'none' : '1px solid rgba(240, 192, 64, 0.3)',
                    background: testamentFilter === 'new' ? 'linear-gradient(135deg, #F0C040 0%, #C08010 100%)' : 'rgba(10, 15, 40, 0.6)',
                    color: testamentFilter === 'new' ? '#0a0f28' : 'rgba(255, 255, 255, 0.7)',
                    fontWeight: 600,
                    padding: '10px 16px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  New Testament
                </button>
              </div>

              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(3, 1fr)', 
                gap: '12px',
                maxHeight: '50vh',
                overflowY: 'auto',
                paddingBottom: '20px'
              }}>
                {filteredBooks.map(({ book, index }) => (
                  <button
                    key={book.name}
                    type="button"
                    onClick={() => handleBookSelect(index)}
                    style={{
                      background: index === bookIndex ? 'rgba(240, 192, 64, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                      border: index === bookIndex ? '1px solid rgba(240, 192, 64, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: index === bookIndex ? '#F0C040' : 'rgba(255, 255, 255, 0.85)',
                      fontSize: '14px',
                      fontWeight: index === bookIndex ? 600 : 500,
                      cursor: 'pointer',
                      padding: '14px 12px',
                      borderRadius: '12px',
                      textAlign: 'left',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {bookDisplayName(book)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>,
        document.body,
      ) : null}

      {/* Translation dropdown — portaled + anchored to WEB pill (see Journal modals pattern) */}
      {showTranslationPicker &&
        showEnglishBibleVersions &&
        translationDropdownRect &&
        typeof document !== 'undefined' &&
        createPortal(
          <>
            <div
              onClick={() => setShowTranslationPicker(false)}
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 10019,
                background: 'transparent',
              }}
              aria-hidden
            />
            <div
              className="read-translation-picker"
              style={{
                position: 'fixed',
                top: `max(${translationDropdownRect.top}px, calc(env(safe-area-inset-top, 0px) + 8px))`,
                left: translationDropdownRect.left,
                width: 200,
                boxSizing: 'border-box',
                zIndex: 10020,
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border-hover)',
                borderRadius: '12px',
                padding: '10px 8px 8px',
                maxHeight: 'min(200px, calc(100dvh - env(safe-area-inset-top, 0px) - 16px))',
                overflowY: 'auto',
                overflowX: 'hidden',
                pointerEvents: 'auto',
                boxShadow: 'var(--glass-shadow)',
                color: 'var(--text-primary)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
              }}
              role="listbox"
              aria-label={t('bible.translation')}
              onClick={(e) => e.stopPropagation()}
            >
              <p
                className="read-translation-picker__title"
                style={{
                  color: 'var(--text-primary)',
                  fontSize: '11px',
                  fontWeight: 700,
                  margin: '0 6px 6px',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                {t('bible.translation')}
              </p>
              <p
                className="read-translation-picker__note"
                style={{
                  color: 'var(--text-muted)',
                  fontSize: '10px',
                  margin: '0 6px 8px',
                  lineHeight: 1.35,
                }}
              >
                {HAS_API_BIBLE ? t('bible.apiFollowsAppLanguage') : t('bible.publicDomainNote')}
              </p>
              {!HAS_API_BIBLE ? (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {translationOptions.map((opt, index) => {
                    const active = opt.id === activeTranslationId
                    return (
                      <li
                        key={opt.id}
                        style={{
                          margin: 0,
                          padding: 0,
                          borderBottom:
                            index < translationOptions.length - 1
                              ? '1px solid var(--glass-border)'
                              : 'none',
                        }}
                      >
                        <button
                          type="button"
                          role="option"
                          aria-selected={active}
                          onClick={() => {
                            setActiveTranslationId(opt.id)
                            setShowTranslationPicker(false)
                          }}
                          style={{
                            background: active ? 'var(--glass-bg-hover)' : 'transparent',
                            border: active ? '1px solid var(--glass-border-hover)' : '1px solid transparent',
                            borderRadius: '8px',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            padding: '10px 10px',
                            textAlign: 'left',
                            width: '100%',
                            display: 'block',
                            transition: 'background 0.15s ease',
                          }}
                        >
                          <span
                            className="read-translation-picker__label"
                            style={{
                              fontSize: '14px',
                              fontWeight: 700,
                              color: active ? '#F0C040' : 'var(--text-primary)',
                              display: 'block',
                            }}
                          >
                            {opt.label}
                          </span>
                          <span
                            className="read-translation-picker__sublabel"
                            style={{
                              fontSize: '11px',
                              fontWeight: 500,
                              color: 'var(--text-secondary)',
                              display: 'block',
                              marginTop: '2px',
                              lineHeight: 1.3,
                            }}
                          >
                            {opt.subtitle}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              ) : null}
              <button
                type="button"
                className="read-translation-picker__close"
                onClick={() => setShowTranslationPicker(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '12px',
                  cursor: 'pointer',
                  marginTop: '6px',
                  padding: '8px 10px',
                  width: '100%',
                }}
              >
                {t('common.close')}
              </button>
            </div>
          </>,
          document.body,
        )}

      {/* Chapter Picker Modal */}
      {showChapterPicker && typeof document !== 'undefined' ? createPortal(
        <>
          <div
            onClick={() => setShowChapterPicker(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0, 0, 0, 0.5)' }}
            aria-hidden
          />
          <div
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 201,
              maxHeight: '85vh',
              background: 'rgba(6, 15, 38, 0.75)',
              backdropFilter: 'blur(28px)',
              WebkitBackdropFilter: 'blur(28px)',
              borderTop: '1px solid rgba(255, 255, 255, 0.09)',
              borderRadius: '24px 24px 0 0',
              padding: '24px',
              animation: 'slideUp 0.3s ease-out',
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Chapter selector"
          >
            <div style={{ maxWidth: '680px', margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ 
                  color: '#F0C040', 
                  fontSize: '20px', 
                  fontWeight: 600, 
                  margin: 0
                }}>
                  {selectedBook ? bookDisplayName(selectedBook) : ''}
                </h2>
                <button
                  type="button"
                  onClick={() => setShowChapterPicker(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontSize: '24px',
                    cursor: 'pointer',
                    padding: '8px',
                  }}
                >
                  ✕
                </button>
              </div>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(6, 1fr)', 
                gap: '12px',
                maxHeight: '50vh',
                overflowY: 'auto',
                paddingBottom: '20px'
              }}>
                {Array.from({ length: maxChapter }, (_, i) => i + 1).map((chapterNum) => (
                  <button
                    key={chapterNum}
                    type="button"
                    onClick={() => handleChapterSelect(chapterNum)}
                    style={{
                      background: chapterNum === chapter ? 'rgba(240, 192, 64, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                      color: chapterNum === chapter ? '#F0C040' : 'rgba(255, 255, 255, 0.85)',
                      borderRadius: '12px',
                      width: '48px',
                      height: '48px',
                      border: chapterNum === chapter ? '1px solid rgba(240, 192, 64, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                      cursor: 'pointer',
                      fontSize: '15px',
                      fontWeight: chapterNum === chapter ? 600 : 500,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {chapterNum}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>,
        document.body,
      ) : null}

      {/* Reading Controls Modal */}
      {showReadingControls && typeof document !== 'undefined' ? createPortal(
        <>
          <div
            onClick={() => setShowReadingControls(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0, 0, 0, 0.5)' }}
            aria-hidden
          />
          <div
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 201,
              maxHeight: '85vh',
              background: 'rgba(6, 15, 38, 0.75)',
              backdropFilter: 'blur(28px)',
              WebkitBackdropFilter: 'blur(28px)',
              borderTop: '1px solid rgba(255, 255, 255, 0.09)',
              borderRadius: '24px 24px 0 0',
              padding: '24px',
              animation: 'slideUp 0.3s ease-out',
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Reading controls"
          >
            <div style={{ maxWidth: '680px', margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ 
                  color: '#F0C040', 
                  fontSize: '20px', 
                  fontWeight: 600, 
                  margin: 0
                }}>
                  Reading Settings
                </h2>
                <button
                  type="button"
                  onClick={() => setShowReadingControls(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontSize: '24px',
                    cursor: 'pointer',
                    padding: '8px',
                  }}
                >
                  ✕
                </button>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <p style={{ 
                  color: 'rgba(255, 255, 255, 0.7)', 
                  fontSize: '13px', 
                  fontWeight: 600, 
                  marginBottom: '12px',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase'
                }}>
                  Font Size
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <button
                    type="button"
                    onClick={() => setFontSize(Math.max(BIBLE_FONT_MIN, fontSize - BIBLE_FONT_STEP))}
                    disabled={fontSize <= BIBLE_FONT_MIN}
                    style={{
                      background: 'transparent',
                      border: '1px solid #D4A843',
                      borderRadius: '16px',
                      color: '#D4A843',
                      fontSize: '20px',
                      cursor: fontSize <= BIBLE_FONT_MIN ? 'not-allowed' : 'pointer',
                      padding: '12px 16px',
                      opacity: fontSize <= BIBLE_FONT_MIN ? 0.3 : 1,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    −
                  </button>
                  <div style={{
                    background: 'rgba(240, 192, 64, 0.1)',
                    border: '1px solid rgba(240, 192, 64, 0.3)',
                    borderRadius: '12px',
                    padding: '12px 24px',
                    minWidth: '80px',
                    textAlign: 'center',
                    color: '#F0C040',
                    fontSize: '16px',
                    fontWeight: 600,
                  }}>
                    {fontSize}px
                  </div>
                  <button
                    type="button"
                    onClick={() => setFontSize(Math.min(BIBLE_FONT_MAX, fontSize + BIBLE_FONT_STEP))}
                    disabled={fontSize >= BIBLE_FONT_MAX}
                    style={{
                      background: 'transparent',
                      border: '1px solid #D4A843',
                      borderRadius: '16px',
                      color: '#D4A843',
                      fontSize: '20px',
                      cursor: fontSize >= BIBLE_FONT_MAX ? 'not-allowed' : 'pointer',
                      padding: '12px 16px',
                      opacity: fontSize >= BIBLE_FONT_MAX ? 0.3 : 1,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    +
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setFontSize(BIBLE_FONT_MIN)}
                  style={{
                    flex: 1,
                    background: 'rgba(240, 192, 64, 0.1)',
                    border: '1px solid rgba(240, 192, 64, 0.3)',
                    borderRadius: '12px',
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    padding: '12px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  Small
                </button>
                <button
                  type="button"
                  onClick={() => setFontSize(BIBLE_FONT_DEFAULT)}
                  style={{
                    flex: 1,
                    background: 'rgba(240, 192, 64, 0.15)',
                    border: '1px solid rgba(240, 192, 64, 0.4)',
                    borderRadius: '12px',
                    color: '#F0C040',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '12px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  Default
                </button>
                <button
                  type="button"
                  onClick={() => setFontSize(BIBLE_FONT_MAX)}
                  style={{
                    flex: 1,
                    background: 'rgba(240, 192, 64, 0.1)',
                    border: '1px solid rgba(240, 192, 64, 0.3)',
                    borderRadius: '12px',
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    padding: '12px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  Large
                </button>
              </div>
            </div>
          </div>
        </>,
        document.body,
      ) : null}

      {showHindiApiBiblePicker ? (
        <BibleTranslationSelector
          isOpen={showHindiBiblePicker}
          onClose={() => setShowHindiBiblePicker(false)}
          currentBibleId={hindiSavedBibleId || cachedHindiCatalogId || ''}
          bibles={hindiBiblePickerList}
          onSelect={(id) => {
            setHindiSavedBibleId(id)
          }}
        />
      ) : null}
    </div>
  )
}
