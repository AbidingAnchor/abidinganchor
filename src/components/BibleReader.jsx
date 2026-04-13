import { useEffect, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { dedupeVersesByNumber, prepareBibleReaderVerseText } from '../utils/kjvVerseText'
import { BOOK_CDN_TO_OSIS } from '../utils/bookOsisMap'
import { fetchApiBibleChapterVerses, resolveBibleIdForLanguage } from '../services/apiBible'
import { fetchGetBibleChapter, resolveGetBibleTranslationId } from '../services/getBibleApi'

/** Free JSON API — see https://bible-api.com/ and GET /data for supported translations (public domain). */
const BIBLE_API_COM = 'https://bible-api.com'

const BIBLE_READER_TRANSLATION_KEY = 'abidinganchor-bible-reader-translation'

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

function getStoredTranslationId() {
  if (typeof window === 'undefined') return DEFAULT_BIBLE_API_COM_TRANSLATION
  const raw = localStorage.getItem(BIBLE_READER_TRANSLATION_KEY)
  // OEB ids were returning 404 from bible-api.com; migrate to WEB.
  if (raw === 'oeb-us' || raw === 'oeb') {
    try {
      localStorage.setItem(BIBLE_READER_TRANSLATION_KEY, DEFAULT_BIBLE_API_COM_TRANSLATION)
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
  const uiLang = (i18n.resolvedLanguage || i18n.language || 'en').toLowerCase().split(/[-_]/)[0]

  const [bookIndex, setBookIndex] = useState(0)
  const [chapter, setChapter] = useState(1)
  const [verses, setVerses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showBookPicker, setShowBookPicker] = useState(false)
  const [showChapterPicker, setShowChapterPicker] = useState(false)
  const [showTranslationPicker, setShowTranslationPicker] = useState(false)
  const [translationId, setTranslationId] = useState(getStoredTranslationId)
  const [fontSize, setFontSize] = useState(() => {
    if (typeof window !== 'undefined') {
      return parseInt(localStorage.getItem('bibleFontSize')) || 18
    }
    return 18
  })

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

  useEffect(() => {
    if (!open) return
    
    // Load from localStorage
    const savedBookIndex = localStorage.getItem('bibleBookIndex')
    const savedChapter = localStorage.getItem('bibleChapter')
    
    if (savedBookIndex !== null) {
      setBookIndex(parseInt(savedBookIndex))
    }
    if (savedChapter !== null) {
      setChapter(parseInt(savedChapter))
    }
  }, [open])

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
          if (selectedBook.cdnName === 'genesis' && chapter === 3) {
            console.log('[BibleReader] Raw API response (Genesis 3):', data)
            const rawV6 = (data.verses || []).find((v) => Number(v.verse) === 6)
            console.log('[BibleReader] Genesis 3:6 raw verse text from API:', rawV6?.text)
          }

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
        console.error('Error loading verses:', err)
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
      localStorage.setItem('bibleBookIndex', bookIndex.toString())
      localStorage.setItem('bibleChapter', chapter.toString())
    }
  }, [bookIndex, chapter, selectedBook])

  useEffect(() => {
    localStorage.setItem(BIBLE_READER_TRANSLATION_KEY, translationId)
  }, [translationId])

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

  return (
    <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'transparent' }}>
      {/* Top Bar */}
      <div
        className="glass-nav-bar"
        style={{
        position: 'fixed',
        top: '60px',
        left: 0,
        right: 0,
        zIndex: 100,
        padding: '12px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}
      >
        <div style={{ maxWidth: '680px', margin: '0 auto' }}>
          {/* Row 1: Book selector | Chapter selector | Translation */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
            <button
              type="button"
              onClick={() => setShowBookPicker(true)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: '18px',
                fontWeight: 700,
                cursor: 'pointer',
                padding: '4px 12px'
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
                fontSize: '18px',
                fontWeight: 700,
                cursor: 'pointer',
                padding: '4px 12px'
              }}
            >
              {t('bible.chapter', { n: chapter })}
            </button>

            {showEnglishBibleVersions ? (
            <button
              type="button"
              onClick={() => setShowTranslationPicker(true)}
              style={{
                background: 'rgba(212,168,67,0.12)',
                border: '1px solid rgba(212,168,67,0.35)',
                borderRadius: '999px',
                color: '#D4A843',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                padding: '6px 12px',
                letterSpacing: '0.04em',
              }}
              aria-expanded={showTranslationPicker}
              aria-haspopup="listbox"
            >
              {HAS_API_BIBLE ? uiLang.toUpperCase() : selectedTranslation.label} ▾
            </button>
            ) : (
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(212,168,67,0.85)', padding: '6px 8px' }}>
                {getBibleSlug ? String(getBibleSlug).toUpperCase() : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Read | Listen toggle - in normal document flow */}
      {onModeChange && (
        <div style={{ 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 'fit-content',
          margin: '100px auto 12px auto',
          position: 'relative',
          zIndex: 1
        }}>
          <div className="glass" style={{
            borderRadius: '50px',
            padding: '4px',
            display: 'flex',
            gap: '4px',
            border: '1px solid var(--glass-border)'
          }}>
            <button
              type="button"
              onClick={() => onModeChange('read')}
              style={{
                background: mode === 'read' ? 'var(--gold)' : 'transparent',
                color: mode === 'read' ? 'white' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: '50px',
                padding: '6px 20px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.3s ease'
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
                padding: '6px 20px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              {t('bible.listen')}
            </button>
          </div>
        </div>
      )}

      {/* Verse Content - Scrollable */}
      <div style={{ 
        flex: 1,
        overflowY: 'auto',
        paddingBottom: mode === 'listen' ? '160px' : '120px', 
        padding: '24px 20px', 
        maxWidth: '680px', 
        margin: '0 auto'
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '32px', marginBottom: '16px' }}>✝</div>
            <p style={{ color: 'var(--text-secondary)' }}>{t('bible.loading')}</p>
          </div>
        ) : (
          <div>
            {/* Verse Text - Premium Styling */}
            <div style={{
              padding: '20px',
              color: 'var(--text-primary)',
              fontSize: '1.1rem',
              lineHeight: '1.8',
              fontFamily: 'Lora, serif',
              paddingBottom: mode === 'listen' ? '160px' : '80px'
            }}>
              {verses.map(v => (
                <p key={v.verse} style={{
                  marginBottom: '1.2rem',
                  textAlign: 'justify'
                }}>
                  <sup style={{
                    color: 'var(--gold)',
                    fontSize: '0.75em',
                    fontWeight: 600,
                    marginRight: '4px',
                    verticalAlign: 'super'
                  }}>
                    {v.verse}
                  </sup>
                  {v.text}
                </p>
              ))}
            </div>

            {/* Font Size Controls - Fixed above tab bar */}
            <div className="glass-panel" style={{
              position: 'fixed',
              bottom: '80px',
              right: '20px',
              borderRadius: '50px',
              padding: '8px 16px',
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
              zIndex: 150,
            }}>
              <button
                type="button"
                onClick={() => {
                  const newSize = Math.max(14, fontSize - 2)
                  setFontSize(newSize)
                  localStorage.setItem('bibleFontSize', newSize.toString())
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#D4A843',
                  fontSize: '16px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                A-
              </button>
              <div style={{ 
                width: '1px', 
                height: '16px', 
                background: 'rgba(255,255,255,0.2)' 
              }} />
              <button
                type="button"
                onClick={() => {
                  const newSize = Math.min(28, fontSize + 2)
                  setFontSize(newSize)
                  localStorage.setItem('bibleFontSize', newSize.toString())
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--gold)',
                  fontSize: '16px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                A+
              </button>
            </div>

            {/* Chapter Navigation - Normal Flow */}
            <div className="glass-panel" style={{
              padding: '16px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              margin: '0 -24px'
            }}>
              <button
                type="button"
                onClick={goToPreviousChapter}
                disabled={chapter === 1}
                style={{
                  background: 'none',
                  border: '1px solid rgba(212,168,67,0.4)',
                  borderRadius: '20px',
                  color: '#D4A843',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '10px 20px',
                  opacity: chapter === 1 ? 0.3 : 1
                }}
              >
                {t('bible.previous')}
              </button>
              <button
                type="button"
                onClick={goToNextChapter}
                disabled={chapter === maxChapter}
                style={{
                  background: 'none',
                  border: '1px solid rgba(212,168,67,0.4)',
                  borderRadius: '20px',
                  color: '#D4A843',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '10px 20px',
                  opacity: chapter === maxChapter ? 0.3 : 1
                }}
              >
                {t('bible.next')}
              </button>
            </div>
          </div>
        )}
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

      {/* Translation Picker — bottom sheet */}
      {showTranslationPicker && showEnglishBibleVersions && (
        <>
          <div
            onClick={() => setShowTranslationPicker(false)}
            className="glass-scrim"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 200,
            }}
            aria-hidden
          />
          <div
            className="glass-panel"
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 201,
              borderRadius: '24px 24px 0 0',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              padding: '24px 20px 32px',
              maxHeight: '72vh',
              overflowY: 'auto',
              animation: 'slideUp 0.3s ease-out',
            }}
            role="listbox"
            aria-label={t('bible.translation')}
          >
            <div style={{ maxWidth: '680px', margin: '0 auto' }}>
              <div
                style={{
                  width: '40px',
                  height: '4px',
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: '2px',
                  margin: '0 auto 20px',
                }}
              />
              <h2
                style={{
                  color: '#D4A843',
                  fontSize: '20px',
                  fontWeight: 700,
                  marginBottom: '8px',
                  textAlign: 'center',
                }}
              >
                {t('bible.translation')}
              </h2>
              <p style={{ color: 'rgba(245,230,200,0.65)', fontSize: '12px', textAlign: 'center', marginBottom: '20px', lineHeight: 1.45 }}>
                {HAS_API_BIBLE ? t('bible.apiFollowsAppLanguage') : t('bible.publicDomainNote')}
              </p>
              {!HAS_API_BIBLE ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {translationOptions.map((opt) => {
                  const active = opt.id === translationId
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => {
                        setTranslationId(opt.id)
                        setShowTranslationPicker(false)
                      }}
                      style={{
                        background: active ? 'rgba(212,168,67,0.18)' : 'transparent',
                        border: '1px solid ' + (active ? 'rgba(212,168,67,0.45)' : 'rgba(255,255,255,0.06)'),
                        borderRadius: '14px',
                        color: '#F5E6C8',
                        cursor: 'pointer',
                        padding: '14px 16px',
                        textAlign: 'left',
                        width: '100%',
                        transition: 'background 0.2s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px' }}>
                        <span style={{ fontSize: '16px', fontWeight: 700, color: active ? '#D4A843' : '#F5E6C8' }}>{opt.label}</span>
                        {active ? <span style={{ fontSize: '12px', color: '#D4A843' }}>✓</span> : null}
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 600, marginTop: '4px', color: 'rgba(245,230,200,0.95)' }}>{opt.subtitle}</div>
                    </button>
                  )
                })}
              </div>
              ) : null}
              <button
                type="button"
                onClick={() => setShowTranslationPicker(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(245,230,200,0.7)',
                  fontSize: '15px',
                  cursor: 'pointer',
                  marginTop: '20px',
                  padding: '12px',
                  width: '100%',
                }}
              >
                {t('common.close')}
              </button>
            </div>
          </div>
          <style>{`
            @keyframes slideUp {
              from { transform: translateY(100%); }
              to { transform: translateY(0); }
            }
          `}</style>
        </>
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
