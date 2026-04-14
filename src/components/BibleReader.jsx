import { useEffect, useLayoutEffect, useState, useMemo, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { dedupeVersesByNumber, prepareBibleReaderVerseText } from '../utils/kjvVerseText'
import { BOOK_CDN_TO_OSIS } from '../utils/bookOsisMap'
import { fetchApiBibleChapterVerses, resolveBibleIdForLanguage } from '../services/apiBible'
import { fetchGetBibleChapter, resolveGetBibleTranslationId } from '../services/getBibleApi'
import { useAuth } from '../context/AuthContext'
import { userStorageKey } from '../utils/userStorage'

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

export default function BibleReader({ open, onClose, mode = 'read', onModeChange }) {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const uiLang = (i18n.resolvedLanguage || i18n.language || 'en').toLowerCase().split(/[-_]/)[0]

  const [bookIndex, setBookIndex] = useState(0)
  const [chapter, setChapter] = useState(1)
  const [verses, setVerses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showBookPicker, setShowBookPicker] = useState(false)
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
                <p key={v.verse} style={{ marginBottom: '1.2rem', textAlign: 'justify' }}>
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
                </p>
              ))}
            </div>
          )}
        </div>
      </div>

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
        <div className="glass-scrim" style={{
          position: 'fixed',
          inset: 0,
          zIndex: 200,
        }}>
          <div style={{ padding: '20px', height: '100%', overflowY: 'auto', maxWidth: '680px', margin: '0 auto' }}>
            <h2 style={{ 
              color: '#D4A843', 
              fontSize: '20px', 
              fontWeight: 700, 
              marginBottom: '24px',
              textAlign: 'center'
            }}>
              {t('bible.selectBook')}
            </h2>

            {/* Book List */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {BOOKS.map((book, index) => (
                <button
                  key={book.name}
                  type="button"
                  onClick={() => handleBookSelect(index)}
                  style={{
                    background: 'none',
                    border: 'none',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    color: '#F5E6C8',
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
                    e.currentTarget.style.color = '#F5E6C8'
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
                color: 'rgba(245,230,200,0.7)',
                fontSize: '15px',
                cursor: 'pointer',
                marginTop: '24px',
                padding: '12px',
                width: '100%'
              }}
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
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
                zIndex: 9499,
                background: 'transparent',
              }}
              aria-hidden
            />
            <div
              style={{
                position: 'fixed',
                top: translationDropdownRect.top,
                left: translationDropdownRect.left,
                width: 200,
                boxSizing: 'border-box',
                zIndex: 9500,
                background: 'rgba(10, 15, 40, 0.97)',
                border: '1px solid rgba(212, 168, 67, 0.24)',
                borderRadius: '16px',
                padding: '10px 8px 8px',
                maxHeight: `min(200px, calc(100dvh - 16px - ${translationDropdownRect.top}px))`,
                overflowY: 'auto',
                overflowX: 'hidden',
                pointerEvents: 'auto',
                boxShadow: '0 18px 40px rgba(0,0,0,0.45)',
              }}
              role="listbox"
              aria-label={t('bible.translation')}
              onClick={(e) => e.stopPropagation()}
            >
              <p
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
              <p style={{ color: 'rgba(245,230,200,0.55)', fontSize: '10px', margin: '0 6px 8px', lineHeight: 1.35 }}>
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
                              ? '1px solid rgba(255, 255, 255, 0.05)'
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
                            background: active ? 'rgba(212, 168, 67, 0.16)' : 'rgba(255,255,255,0.02)',
                            border: active ? '1px solid rgba(212, 168, 67, 0.55)' : '1px solid transparent',
                            borderRadius: '12px',
                            color: '#F8F5EC',
                            cursor: 'pointer',
                            padding: '10px 10px',
                            textAlign: 'left',
                            width: '100%',
                            display: 'block',
                            transition: 'background 0.15s ease',
                          }}
                        >
                          <span style={{ fontSize: '14px', fontWeight: 700, color: active ? '#D4A843' : '#F8F5EC', display: 'block' }}>
                            {opt.label}
                          </span>
                          <span style={{ fontSize: '11px', fontWeight: 500, color: 'rgba(245,230,200,0.58)', display: 'block', marginTop: '2px', lineHeight: 1.3 }}>
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
                onClick={() => setShowTranslationPicker(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(245,230,200,0.65)',
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
          <div className="glass-panel" style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 201,
            borderRadius: '24px 24px 0 0',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            padding: '24px 20px 32px',
            maxHeight: '70vh',
            overflowY: 'auto',
            animation: 'slideUp 0.3s ease-out'
          }}>
            <div style={{ maxWidth: '680px', margin: '0 auto' }}>
              <div style={{
                width: '40px',
                height: '4px',
                background: 'rgba(255,255,255,0.2)',
                borderRadius: '2px',
                margin: '0 auto 24px'
              }} />
              <h2 style={{ 
                color: '#D4A843', 
                fontSize: '20px', 
                fontWeight: 700, 
                marginBottom: '24px',
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
                      color: '#F5E6C8',
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
                      e.currentTarget.style.color = '#F5E6C8'
                    }}
                  >
                    {chapterNum}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <style>{`
            @keyframes slideUp {
              from {
                transform: translateY(100%);
              }
              to {
                transform: translateY(0);
              }
            }
          `}</style>
        </>
      )}
    </div>
  )
}
