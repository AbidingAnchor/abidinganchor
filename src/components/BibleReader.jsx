import { useEffect, useLayoutEffect, useState, useMemo, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { dedupeVersesByNumber, prepareBibleReaderVerseText } from '../utils/kjvVerseText'
import { BOOK_CDN_TO_OSIS } from '../utils/bookOsisMap'
import { fetchApiBibleChapterVerses, resolveBibleIdForLanguage } from '../services/apiBible'
import { fetchGetBibleChapter, resolveGetBibleTranslationId } from '../services/getBibleApi'
import { useAuth } from '../context/AuthContext'
import { userStorageKey } from '../utils/userStorage'
import { supabase } from '../lib/supabase'

/** Free JSON API — see https://bible-api.com/ and GET /data for supported translations (public domain). */
const BIBLE_API_COM = 'https://bible-api.com'

const BIBLE_FONT_MIN = 14
const BIBLE_FONT_MAX = 24
const BIBLE_FONT_DEFAULT = 18
const BIBLE_FONT_STEP = 2

/** Layout zones (viewport-fixed). Zone 1 = app header, Zone 5 = tab bar — defined in App; not styled here. */
const APP_BAR_HEIGHT_PX = 56
const CHAPTER_ZONE_HEIGHT_PX = 90
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

export default function BibleReader({ open, onClose, mode = 'read', onModeChange }) {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const uiLang = (i18n.resolvedLanguage || i18n.language || 'en').toLowerCase().split(/[-_]/)[0]

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
  const [translationId, setTranslationId] = useState(DEFAULT_BIBLE_API_COM_TRANSLATION)
  const [fontSize, setFontSize] = useState(BIBLE_FONT_DEFAULT)

  useEffect(() => {
    setTranslationId(getStoredTranslationId(user?.id))
    try {
      const raw = localStorage.getItem(userStorageKey(user?.id, 'bible-font-size'))
      if (raw != null) setFontSize(clampBibleFontSize(parseInt(raw, 10)))
    } catch {
      /* ignore */
    }
  }, [user?.id])

  const selectedBook = BOOKS[bookIndex]
  const maxChapter = selectedBook?.chapters || 1
  const bookNumber = bookIndex + 1
  const getBibleSlug = resolveGetBibleTranslationId(uiLang, translationId)
  const showEnglishBibleVersions = uiLang === 'en'
  const bookKey = selectedBook?.cdnName || ''
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
    [t, i18n.language],
  )
  const selectedTranslation = translationOptions.find((x) => x.id === translationId) ?? translationOptions[0]

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

    let cancelled = false
    setLoading(true)

    const loadFromBibleApiCom = () => {
      const url = `${BIBLE_API_COM}/${encodeURIComponent(selectedBook.cdnName)}+${chapter}?translation=${encodeURIComponent(translationId)}`
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

    ;(async () => {
      try {
        if (getBibleSlug) {
          const { verses: rawGb } = await fetchGetBibleChapter(getBibleSlug, bookNumber, chapter)
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
        if (HAS_API_BIBLE && showEnglishBibleVersions) {
          const bibleId = await resolveBibleIdForLanguage(uiLang)
          const osis = BOOK_CDN_TO_OSIS[selectedBook.cdnName]
          if (bibleId && osis) {
            const raw = await fetchApiBibleChapterVerses(bibleId, osis, chapter)
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
    })()

    return () => {
      cancelled = true
    }
  }, [open, selectedBook, chapter, translationId, uiLang, getBibleSlug, bookNumber, showEnglishBibleVersions])

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
  }, [open, bookKey, chapter, translationId])

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
      const chapterUrl = `${BIBLE_API_COM}/${encodeURIComponent(ref.book)}+${ref.chapter}?translation=${encodeURIComponent(translationId)}`
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
      localStorage.setItem(translationStorageKey(user?.id), translationId)
    } catch {
      /* ignore */
    }
  }, [translationId, user?.id])

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
    background: 'none',
    border: '1px solid rgba(212,168,67,0.4)',
    borderRadius: '16px',
    color: '#D4A843',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    padding: '6px 14px',
    lineHeight: 1.2,
  }

  return (
    <div style={{ position: 'relative', zIndex: 10, width: '100%', minHeight: '100dvh', background: 'transparent' }}>
      {/*
        ZONE 1 — App bar (logo, Read title, settings): fixed in App — do not style here.
        ZONE 2 — Chapter header + Read/Listen (fixed below app bar)
      */}
      <div
        style={{
          position: 'fixed',
          top: APP_BAR_TOP_OFFSET,
          left: 0,
          right: 0,
          height: CHAPTER_ZONE_HEIGHT_PX,
          zIndex: 90,
          background: 'var(--bible-chrome-bg)',
          borderBottom: '1px solid var(--glass-border)',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '6px 20px 8px',
        }}
      >
        <div style={{ maxWidth: '680px', margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setShowBookPicker(true)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: '17px',
                fontWeight: 700,
                cursor: 'pointer',
                padding: '2px 8px',
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
                color: 'var(--text-primary)',
                fontSize: '17px',
                fontWeight: 700,
                cursor: 'pointer',
                padding: '2px 8px',
              }}
            >
              {t('bible.chapter', { n: chapter })}
            </button>
            {showEnglishBibleVersions ? (
              <button
                ref={translationButtonRef}
                type="button"
                onClick={() => setShowTranslationPicker((o) => !o)}
                style={{
                  background: 'var(--bible-chrome-bg)',
                  border: '1px solid rgba(212,168,67,0.38)',
                  borderRadius: '999px',
                  color: 'var(--text-primary)',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: '5px 10px',
                  letterSpacing: '0.04em',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
                }}
                aria-expanded={showTranslationPicker}
                aria-haspopup="listbox"
              >
                {HAS_API_BIBLE ? uiLang.toUpperCase() : selectedTranslation.label} ▾
              </button>
            ) : (
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(212,168,67,0.85)', padding: '4px 6px' }}>
                {getBibleSlug ? String(getBibleSlug).toUpperCase() : ''}
              </span>
            )}
          </div>
        </div>
        {onModeChange ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: '2px' }}>
            <div
              className="glass"
              style={{
                borderRadius: '50px',
                padding: '3px',
                display: 'flex',
                gap: '4px',
                border: '1px solid var(--glass-border)',
              }}
            >
              <button
                type="button"
                onClick={() => onModeChange('read')}
                style={{
                  background: mode === 'read' ? 'var(--gold)' : 'transparent',
                  color: mode === 'read' ? 'white' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: '50px',
                  padding: '5px 16px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                }}
              >
                {t('bible.read')}
              </button>
              <button
                type="button"
                onClick={() => onModeChange('listen')}
                style={{
                  background: mode === 'listen' ? 'var(--gold)' : 'transparent',
                  color: mode === 'listen' ? 'white' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: '50px',
                  padding: '5px 16px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                }}
              >
                {t('bible.listen')}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ minHeight: '4px' }} aria-hidden />
        )}
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
          padding: '16px 20px',
          zIndex: 40,
          boxSizing: 'border-box',
        }}
      >
        <div style={{ maxWidth: '680px', margin: '0 auto', width: '100%' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '32px', marginBottom: '16px' }}>✝</div>
              <p style={{ color: 'var(--text-secondary)' }}>{t('bible.loading')}</p>
            </div>
          ) : (
            <div
              className="bible-verse-well"
              style={{
                color: 'var(--text-primary)',
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
                    marginBottom: '1.2rem',
                    textAlign: 'justify',
                    cursor: 'pointer',
                    padding: highlightsByVerse[String(v.verse)] || isJumpHighlight ? '10px 12px' : '0px',
                    borderRadius: '10px',
                    background:
                      highlightsByVerse[String(v.verse)] || isJumpHighlight
                        ? 'rgba(212,175,55,0.3)'
                        : 'transparent',
                    borderLeft:
                      highlightsByVerse[String(v.verse)] || isJumpHighlight
                        ? '3px solid #D4AF37'
                        : '3px solid transparent',
                    boxShadow:
                      highlightsByVerse[String(v.verse)] || isJumpHighlight
                        ? '0 4px 16px rgba(212,175,55,0.12)'
                        : 'none',
                    transition: 'background 0.15s ease, border 0.15s ease',
                  }}
                >
                  <sup
                    style={{
                      color: 'var(--verse-number-color)',
                      fontSize: '0.75em',
                      fontWeight: 600,
                      marginRight: '4px',
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
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '0 0 0 8px',
                        margin: 0,
                        color: '#D4AF37',
                        fontSize: '14px',
                        fontWeight: 800,
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
              style={{ position: 'fixed', inset: 0, zIndex: 10030, background: 'transparent' }}
              aria-hidden
            />
            <div
              className="glass-panel"
              style={{
                position: 'fixed',
                top: verseMenuRect.top,
                left: verseMenuRect.left,
                width: verseMenuRect.width,
                zIndex: 10031,
                borderRadius: '14px',
                border: '1px solid rgba(255,255,255,0.10)',
                padding: '10px',
                background: 'var(--card-bg, rgba(15,20,45,0.94))',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                boxShadow: '0 16px 40px rgba(0,0,0,0.35)',
                color: 'var(--card-text, var(--text-primary))',
              }}
              onClick={(e) => e.stopPropagation()}
              role="menu"
              aria-label="Verse options"
            >
              <p style={{ margin: '0 0 8px', fontSize: '11px', opacity: 0.8, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-secondary)' }}>
                VERSE {activeVerse ?? ''}
              </p>
              <button
                type="button"
                onClick={() => saveHighlight(activeVerse)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  background: 'rgba(212,175,55,0.18)',
                  border: '1px solid rgba(212,175,55,0.30)',
                  color: '#1a1a1a',
                  borderRadius: '12px',
                  padding: '10px 12px',
                  cursor: 'pointer',
                  fontWeight: 900,
                  marginBottom: '8px',
                }}
              >
                🟡 Highlight
              </button>
              <button
                type="button"
                onClick={() => openAddNote(activeVerse)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  background: 'rgba(255,255,255,0.82)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  color: '#1a1a1a',
                  borderRadius: '12px',
                  padding: '10px 12px',
                  cursor: 'pointer',
                  fontWeight: 900,
                  marginBottom: '8px',
                }}
              >
                📝 Add Note
              </button>
              <button
                type="button"
                onClick={() => openCrossReferences(activeVerse)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  background: 'rgba(255,255,255,0.82)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  color: '#1a1a1a',
                  borderRadius: '12px',
                  padding: '10px 12px',
                  cursor: 'pointer',
                  fontWeight: 900,
                  marginBottom: '8px',
                }}
              >
                🔗 Cross References
              </button>
              <button
                type="button"
                onClick={() => openStrongsConcordance(activeVerse)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  background: 'rgba(255,255,255,0.82)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  color: '#1a1a1a',
                  borderRadius: '12px',
                  padding: '10px 12px',
                  cursor: 'pointer',
                  fontWeight: 900,
                  marginBottom: '8px',
                }}
              >
                📚 Strong&apos;s Concordance
              </button>
              <button
                type="button"
                onClick={() => {
                  setVerseMenuRect(null)
                  setActiveVerse(null)
                }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  background: 'rgba(255,255,255,0.82)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  color: '#1a1a1a',
                  borderRadius: '12px',
                  padding: '10px 12px',
                  cursor: 'pointer',
                  fontWeight: 900,
                }}
              >
                ❌ Cancel
              </button>
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
                  background: 'var(--card-bg, rgba(15,20,45,0.94))',
                  backdropFilter: 'blur(12px)',
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
                  background: 'var(--card-bg, rgba(15,20,45,0.94))',
                  backdropFilter: 'blur(12px)',
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
                  background: 'var(--card-bg, rgba(15,20,45,0.94))',
                  backdropFilter: 'blur(12px)',
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
                  background: 'var(--card-bg, rgba(15,20,45,0.94))',
                  backdropFilter: 'blur(12px)',
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
              onClick={goToPreviousChapter}
              disabled={chapter === 1 || loading}
              style={{
                ...navBtnStyle,
                opacity: chapter === 1 || loading ? 0.35 : 1,
                cursor: chapter === 1 || loading ? 'not-allowed' : 'pointer',
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
                background: 'none',
                border: 'none',
                color: '#D4A843',
                fontSize: '14px',
                fontWeight: 700,
                cursor: fontSize <= BIBLE_FONT_MIN ? 'not-allowed' : 'pointer',
                padding: '4px 6px',
                opacity: fontSize <= BIBLE_FONT_MIN ? 0.35 : 1,
              }}
            >
              A-
            </button>
            <div style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.2)' }} />
            <button
              type="button"
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
                background: 'none',
                border: 'none',
                color: 'var(--gold)',
                fontSize: '14px',
                fontWeight: 700,
                cursor: fontSize >= BIBLE_FONT_MAX ? 'not-allowed' : 'pointer',
                padding: '4px 6px',
                opacity: fontSize >= BIBLE_FONT_MAX ? 0.35 : 1,
              }}
            >
              A+
            </button>
          </div>
          <div style={{ flex: '1 1 0', display: 'flex', justifyContent: 'flex-end', minWidth: 0 }}>
            <button
              type="button"
              onClick={goToNextChapter}
              disabled={chapter === maxChapter || loading}
              style={{
                ...navBtnStyle,
                opacity: chapter === maxChapter || loading ? 0.35 : 1,
                cursor: chapter === maxChapter || loading ? 'not-allowed' : 'pointer',
              }}
            >
              {t('bible.next')}
            </button>
          </div>
        </div>
      </div>

      {/* Book Picker Modal */}
      {showBookPicker && (
        <>
          <div
            onClick={() => setShowBookPicker(false)}
            className="glass-scrim"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 200,
            }}
          />
          <div
            className="glass-panel"
            style={{
              position: 'fixed',
              top: `calc(${BIBLE_SCROLL_TOP_OFFSET} + 8px)`,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 'min(680px, calc(100vw - 20px))',
              maxHeight: `calc(100dvh - (${BIBLE_SCROLL_TOP_OFFSET} + 16px))`,
              overflowY: 'auto',
              zIndex: 201,
              borderRadius: '20px',
              border: '1px solid var(--glass-border, rgba(255,255,255,0.12))',
              background: 'var(--card-bg, rgba(15,20,45,0.96))',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              boxShadow: '0 24px 70px rgba(0,0,0,0.42)',
              padding: '18px 16px 16px',
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Book selector"
          >
            <div style={{ maxWidth: '640px', margin: '0 auto' }}>
              <div
                style={{
                  width: '38px',
                  height: '4px',
                  borderRadius: '999px',
                  background: 'rgba(255,255,255,0.22)',
                  margin: '0 auto 14px',
                }}
              />
            <h2 style={{ 
              color: '#D4A843', 
              fontSize: '20px', 
              fontWeight: 700, 
              marginBottom: '16px',
              textAlign: 'center'
            }}>
              {t('bible.selectBook')}
            </h2>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '18px' }}>
              <button
                type="button"
                onClick={() => setTestamentFilter('old')}
                style={{
                  flex: 1,
                  borderRadius: '999px',
                  border: testamentFilter === 'old' ? '1px solid rgba(212,175,55,0.55)' : '1px solid var(--glass-border, rgba(255,255,255,0.16))',
                  background: testamentFilter === 'old' ? 'rgba(212,175,55,0.18)' : 'transparent',
                  color: 'var(--text-primary)',
                  fontWeight: 700,
                  padding: '8px 12px',
                  cursor: 'pointer',
                }}
              >
                Old Testament
              </button>
              <button
                type="button"
                onClick={() => setTestamentFilter('new')}
                style={{
                  flex: 1,
                  borderRadius: '999px',
                  border: testamentFilter === 'new' ? '1px solid rgba(212,175,55,0.55)' : '1px solid var(--glass-border, rgba(255,255,255,0.16))',
                  background: testamentFilter === 'new' ? 'rgba(212,175,55,0.18)' : 'transparent',
                  color: 'var(--text-primary)',
                  fontWeight: 700,
                  padding: '8px 12px',
                  cursor: 'pointer',
                }}
              >
                New Testament
              </button>
            </div>

            {/* Book List */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {filteredBooks.map(({ book, index }) => (
                <button
                  key={book.name}
                  type="button"
                  onClick={() => handleBookSelect(index)}
                  style={{
                    background: 'none',
                    border: 'none',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    color: 'var(--text-primary)',
                    fontSize: '17px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '16px 4px',
                    textAlign: 'left',
                    width: '100%',
                    transition: 'background 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(212,168,67,0.1)'
                    e.currentTarget.style.color = '#D4A843'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'none'
                    e.currentTarget.style.color = 'var(--text-primary)'
                  }}
                >
                  {bookDisplayName(book)}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowBookPicker(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '15px',
                cursor: 'pointer',
                marginTop: '18px',
                padding: '12px',
                width: '100%'
              }}
            >
              {t('common.cancel')}
            </button>
            </div>
          </div>
        </>
      )}

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
                    const active = opt.id === translationId
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
                            setTranslationId(opt.id)
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
                              color: active ? '#D4A843' : 'var(--text-primary)',
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
      {showChapterPicker && (
        <>
          <div 
            onClick={() => setShowChapterPicker(false)}
            className="glass-scrim"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 200,
            }}
          />
          <div
            className="glass-panel"
            style={{
              position: 'fixed',
              top: `calc(${BIBLE_SCROLL_TOP_OFFSET} + 8px)`,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 'min(680px, calc(100vw - 20px))',
              maxHeight: `calc(100dvh - (${BIBLE_SCROLL_TOP_OFFSET} + 16px))`,
              overflowY: 'auto',
              zIndex: 201,
              borderRadius: '20px',
              border: '1px solid var(--glass-border, rgba(255,255,255,0.12))',
              background: 'var(--card-bg, rgba(15,20,45,0.96))',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              boxShadow: '0 24px 70px rgba(0,0,0,0.42)',
              padding: '18px 16px 16px',
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Chapter selector"
          >
            <div style={{ maxWidth: '640px', margin: '0 auto' }}>
              <div style={{
                width: '40px',
                height: '4px',
                background: 'rgba(255,255,255,0.2)',
                borderRadius: '2px',
                margin: '0 auto 14px'
              }} />
              <h2 style={{ 
                color: '#D4A843', 
                fontSize: '20px', 
                fontWeight: 700, 
                marginBottom: '16px',
                textAlign: 'center'
              }}>
                {selectedBook ? bookDisplayName(selectedBook) : ''}
              </h2>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(6, 1fr)', 
                gap: '12px',
                justifyContent: 'center'
              }}>
                {Array.from({ length: maxChapter }, (_, i) => i + 1).map((chapterNum) => (
                  <button
                    key={chapterNum}
                    type="button"
                    onClick={() => handleChapterSelect(chapterNum)}
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      color: 'var(--text-primary, #2c1810)',
                      borderRadius: '50%',
                      width: '48px',
                      height: '48px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '15px',
                      fontWeight: 400,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(212,168,67,0.3)'
                      e.currentTarget.style.color = '#D4A843'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
                      e.currentTarget.style.color = 'var(--text-primary, #2c1810)'
                    }}
                  >
                    {chapterNum}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setShowChapterPicker(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  fontSize: '15px',
                  cursor: 'pointer',
                  marginTop: '18px',
                  padding: '12px',
                  width: '100%',
                }}
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
