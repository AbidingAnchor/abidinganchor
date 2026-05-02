import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  deleteBook,
  getDownloadedBooks,
  getStorageSize,
  saveBook,
} from '../services/offlineStorage'
import { useAuth } from '../context/AuthContext'
import { BIBLE_LANG_MAP } from '../utils/bibleTranslation'
import { userStorageKey } from '../utils/userStorage'

const BOOKS = [
  { book: 1, name: 'Genesis', chapters: 50 },
  { book: 2, name: 'Exodus', chapters: 40 },
  { book: 3, name: 'Leviticus', chapters: 27 },
  { book: 4, name: 'Numbers', chapters: 36 },
  { book: 5, name: 'Deuteronomy', chapters: 34 },
  { book: 6, name: 'Joshua', chapters: 24 },
  { book: 7, name: 'Judges', chapters: 21 },
  { book: 8, name: 'Ruth', chapters: 4 },
  { book: 9, name: '1 Samuel', chapters: 31 },
  { book: 10, name: '2 Samuel', chapters: 24 },
  { book: 11, name: '1 Kings', chapters: 22 },
  { book: 12, name: '2 Kings', chapters: 25 },
  { book: 13, name: '1 Chronicles', chapters: 29 },
  { book: 14, name: '2 Chronicles', chapters: 36 },
  { book: 15, name: 'Ezra', chapters: 10 },
  { book: 16, name: 'Nehemiah', chapters: 13 },
  { book: 17, name: 'Esther', chapters: 10 },
  { book: 18, name: 'Job', chapters: 42 },
  { book: 19, name: 'Psalms', chapters: 150 },
  { book: 20, name: 'Proverbs', chapters: 31 },
  { book: 21, name: 'Ecclesiastes', chapters: 12 },
  { book: 22, name: 'Song of Solomon', chapters: 8 },
  { book: 23, name: 'Isaiah', chapters: 66 },
  { book: 24, name: 'Jeremiah', chapters: 52 },
  { book: 25, name: 'Lamentations', chapters: 5 },
  { book: 26, name: 'Ezekiel', chapters: 48 },
  { book: 27, name: 'Daniel', chapters: 12 },
  { book: 28, name: 'Hosea', chapters: 14 },
  { book: 29, name: 'Joel', chapters: 3 },
  { book: 30, name: 'Amos', chapters: 9 },
  { book: 31, name: 'Obadiah', chapters: 1 },
  { book: 32, name: 'Jonah', chapters: 4 },
  { book: 33, name: 'Micah', chapters: 7 },
  { book: 34, name: 'Nahum', chapters: 3 },
  { book: 35, name: 'Habakkuk', chapters: 3 },
  { book: 36, name: 'Zephaniah', chapters: 3 },
  { book: 37, name: 'Haggai', chapters: 2 },
  { book: 38, name: 'Zechariah', chapters: 14 },
  { book: 39, name: 'Malachi', chapters: 4 },
  { book: 40, name: 'Matthew', chapters: 28 },
  { book: 41, name: 'Mark', chapters: 16 },
  { book: 42, name: 'Luke', chapters: 24 },
  { book: 43, name: 'John', chapters: 21 },
  { book: 44, name: 'Acts', chapters: 28 },
  { book: 45, name: 'Romans', chapters: 16 },
  { book: 46, name: '1 Corinthians', chapters: 16 },
  { book: 47, name: '2 Corinthians', chapters: 13 },
  { book: 48, name: 'Galatians', chapters: 6 },
  { book: 49, name: 'Ephesians', chapters: 6 },
  { book: 50, name: 'Philippians', chapters: 4 },
  { book: 51, name: 'Colossians', chapters: 4 },
  { book: 52, name: '1 Thessalonians', chapters: 5 },
  { book: 53, name: '2 Thessalonians', chapters: 3 },
  { book: 54, name: '1 Timothy', chapters: 6 },
  { book: 55, name: '2 Timothy', chapters: 4 },
  { book: 56, name: 'Titus', chapters: 3 },
  { book: 57, name: 'Philemon', chapters: 1 },
  { book: 58, name: 'Hebrews', chapters: 13 },
  { book: 59, name: 'James', chapters: 5 },
  { book: 60, name: '1 Peter', chapters: 5 },
  { book: 61, name: '2 Peter', chapters: 3 },
  { book: 62, name: '1 John', chapters: 5 },
  { book: 63, name: '2 John', chapters: 1 },
  { book: 64, name: '3 John', chapters: 1 },
  { book: 65, name: 'Jude', chapters: 1 },
  { book: 66, name: 'Revelation', chapters: 22 },
]

const SECTIONS = [
  { name: 'Torah', min: 1, max: 5 },
  { name: 'Historical', min: 6, max: 17 },
  { name: 'Wisdom', min: 18, max: 22 },
  { name: 'Prophets', min: 23, max: 39 },
  { name: 'Gospels', min: 40, max: 44 },
  { name: 'Epistles', min: 45, max: 65 },
  { name: 'Apocalyptic', min: 66, max: 66 },
]

const TRANSLATION_LABELS = {
  WEB: 'World English Bible',
  KJV: 'King James Version',
  ASV: 'American Standard Version',
  WEBBE: 'World English Bible (British Edition)',
  BBE: 'Bible in Basic English',
  DARBY: 'Darby Translation',
  RVR1960: 'Reina Valera 1960',
  ARC: 'Almeida Revista e Corrigida',
  LSG: 'Louis Segond',
  LUTH1545: 'Luther 1545',
  IRV: 'Hindi Bible (IRV)',
  HIOV: 'Hindi (HIOV)',
  KRPBA: 'Korean Revised Bible',
  KRV: 'Korean Version',
  CNVS: 'Chinese New Version',
  CUV: 'Chinese Union Version',
  SYNOD: 'Russian Synodal',
  NAV: 'Arabic New Arabic Version',
  SVD: 'Arabic Van Dyck',
  NVI: 'Nueva Version Internacional',
  BDS: 'La Bible du Semeur',
  NTLH: 'Nova Tradução na Linguagem de Hoje',
  ELB: 'Elberfelder',
}

const MAX_CHAPTER_RETRIES = 2

function progressPercent(entry) {
  if (!entry || !entry.total) return 0
  return Math.max(0, Math.min(100, Math.round((entry.current / entry.total) * 100)))
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function formatDownloadError(error, context = {}) {
  if (!error) return 'Unknown download error.'
  if (error.name === 'AbortError') return 'Download timed out. Please retry.'
  const msg = String(error.message || error)
  if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) {
    return `Network/CORS error${context.chapter ? ` at chapter ${context.chapter}` : ''}: ${msg}`
  }
  return msg
}

async function fetchChapterJson(translation, book, chapter, source) {
  const directUrl = `https://bolls.life/get-text/${encodeURIComponent(translation)}/${book}/${chapter}/`
  const proxyUrl = `/api/bolls?translation=${encodeURIComponent(translation)}&book=${book}&chapter=${chapter}`
  const url = source === 'proxy' ? proxyUrl : directUrl

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    })

    let json = null
    try {
      json = await res.json()
    } catch {
      json = null
    }

    if (!res.ok) {
      throw new Error(
        `${source} fetch failed (${res.status})${json?.error ? `: ${json.error}` : ''}`,
      )
    }

    if (source === 'proxy') return Array.isArray(json?.data) ? json.data : []
    return Array.isArray(json) ? json : []
  } finally {
    clearTimeout(timeout)
  }
}

async function fetchChapterWithRetry(translation, book, chapter) {
  let lastErr = null

  for (let attempt = 0; attempt <= MAX_CHAPTER_RETRIES; attempt += 1) {
    try {
      return await fetchChapterJson(translation, book, chapter, 'direct')
    } catch (err) {
      lastErr = err
      // On fetch/network/CORS failures, try the proxy path as fallback.
      const msg = String(err?.message || err)
      if (/Failed to fetch|NetworkError|Load failed|direct fetch failed/i.test(msg)) {
        try {
          return await fetchChapterJson(translation, book, chapter, 'proxy')
        } catch (proxyErr) {
          lastErr = proxyErr
        }
      }
      if (attempt < MAX_CHAPTER_RETRIES) await sleep(400 * (attempt + 1))
    }
  }

  throw lastErr || new Error(`Failed chapter ${chapter}`)
}

export default function OfflineManager({ translation = null }) {
  const { i18n } = useTranslation()
  const { user } = useAuth()
  const [downloadedBooks, setDownloadedBooks] = useState(new Set())
  const [downloads, setDownloads] = useState({})
  const [storageMb, setStorageMb] = useState(0)
  const [error, setError] = useState('')
  const [activeTranslation, setActiveTranslation] = useState(translation)

  const groupedBooks = useMemo(() => {
    return SECTIONS.map((section) => ({
      ...section,
      books: BOOKS.filter((book) => book.book >= section.min && book.book <= section.max),
    }))
  }, [])

  const activeTranslationName = TRANSLATION_LABELS[activeTranslation] || activeTranslation

  const resolveStoredTranslation = () => {
    if (translation) return translation
    const uiLang = (i18n.resolvedLanguage || i18n.language || 'en').toLowerCase().slice(0, 2)
    if (uiLang === 'en') {
      const key = userStorageKey(user?.id, 'bible-reader-translation')
      const legacy = 'abidinganchor-bible-reader-translation'
      const raw = (localStorage.getItem(key) || localStorage.getItem(legacy) || 'web').toLowerCase()
      const englishBollsMap = {
        web: 'WEB',
        kjv: 'KJV',
        asv: 'ASV',
        webbe: 'WEBBE',
        bbe: 'BBE',
        darby: 'DARBY',
      }
      return englishBollsMap[raw] || 'WEB'
    }
    return BIBLE_LANG_MAP[uiLang] || 'WEB'
  }

  const refreshStats = async (translationId) => {
    const [books, size] = await Promise.all([
      getDownloadedBooks(translationId),
      getStorageSize(),
    ])
    setDownloadedBooks(new Set(books))
    setStorageMb(Number(size) || 0)
  }

  useEffect(() => {
    const syncTranslation = () => {
      try {
        const next = resolveStoredTranslation()
        setActiveTranslation((prev) => (prev === next ? prev : next))
      } catch {
        setActiveTranslation('WEB')
      }
    }

    syncTranslation()
    const interval = setInterval(syncTranslation, 1500)
    const onStorage = () => syncTranslation()
    window.addEventListener('storage', onStorage)
    return () => {
      clearInterval(interval)
      window.removeEventListener('storage', onStorage)
    }
  }, [translation, i18n.resolvedLanguage, i18n.language, user?.id])

  useEffect(() => {
    setDownloads({})
    refreshStats(activeTranslation).catch(() => {
      setError('Unable to load offline download status.')
    })
  }, [activeTranslation])

  const handleDownload = async (bookMeta) => {
    setError('')
    setDownloads((prev) => ({
      ...prev,
      [bookMeta.book]: { state: 'downloading', current: 0, total: bookMeta.chapters },
    }))

    try {
      const chapters = {}
      for (let chapter = 1; chapter <= bookMeta.chapters; chapter += 1) {
        const data = await fetchChapterWithRetry(activeTranslation, bookMeta.book, chapter)
        chapters[String(chapter)] = Array.isArray(data)
          ? data.map((verse) => ({
              verse: Number(verse?.verse) || 0,
              text: String(verse?.text || ''),
            }))
          : []
        setDownloads((prev) => ({
          ...prev,
          [bookMeta.book]: { state: 'downloading', current: chapter, total: bookMeta.chapters },
        }))
      }

      await saveBook(activeTranslation, bookMeta.book, chapters)
      setDownloads((prev) => ({
        ...prev,
        [bookMeta.book]: { state: 'downloaded', current: bookMeta.chapters, total: bookMeta.chapters },
      }))
      await refreshStats(activeTranslation)
    } catch (err) {
      setDownloads((prev) => ({
        ...prev,
        [bookMeta.book]: { state: 'failed', current: 0, total: bookMeta.chapters },
      }))
      const detailed = formatDownloadError(err, { chapter: downloads[bookMeta.book]?.current || 1 })
      setError(
        `Download failed for ${bookMeta.name}: ${detailed}. If you are on localhost, try running via Vercel dev/serverless proxy.`,
      )
      console.error('[OfflineManager] download error', {
        book: bookMeta.book,
        name: bookMeta.name,
        translation: activeTranslation,
        error: err,
      })
    }
  }

  const handleDelete = async (bookMeta) => {
    setError('')
    try {
      await deleteBook(activeTranslation, bookMeta.book)
      setDownloads((prev) => {
        const next = { ...prev }
        delete next[bookMeta.book]
        return next
      })
      await refreshStats(activeTranslation)
    } catch {
      setError(`Could not delete ${bookMeta.name}.`)
    }
  }

  return (
    <div
      style={{
        background: 'var(--card-bg, rgba(255,255,255,0.08))',
        color: 'var(--text-primary)',
        minHeight: '100%',
        width: '100%',
        padding: '16px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          background: 'var(--card-bg, rgba(255,255,255,0.08))',
          border: '1px solid rgba(212, 168, 67, 0.45)',
          borderRadius: '14px',
          padding: '14px',
          marginBottom: '14px',
        }}
      >
        <p style={{ margin: 0, color: '#D4A843', fontSize: '13px', fontWeight: 700, letterSpacing: '0.06em' }}>
          OFFLINE STORAGE
        </p>
        <p style={{ margin: '6px 0 0', fontSize: '22px', fontWeight: 700 }}>
          {storageMb.toFixed(2)} MB used
        </p>
        <p style={{ margin: '6px 0 0', color: 'rgba(245, 246, 251, 0.72)', fontSize: '12px' }}>
          Translation: {activeTranslationName} ({activeTranslation})
        </p>
      </div>

      {error ? (
        <p
          style={{
            margin: '0 0 12px',
            borderRadius: '10px',
            background: 'rgba(180, 40, 40, 0.2)',
            border: '1px solid rgba(255, 120, 120, 0.45)',
            padding: '10px 12px',
            fontSize: '13px',
          }}
        >
          {error}
        </p>
      ) : null}

      {groupedBooks.map((section) => (
        <div key={section.name} style={{ marginBottom: '16px' }}>
          <h3
            style={{
              margin: '0 0 8px',
              color: '#D4A843',
              fontSize: '14px',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            {section.name}
          </h3>

          <div style={{ display: 'grid', gap: '8px' }}>
            {section.books.map((bookMeta) => {
              const dl = downloads[bookMeta.book]
              const isDownloading = dl?.state === 'downloading'
              const isFailed = dl?.state === 'failed'
              const isDownloaded = downloadedBooks.has(bookMeta.book)
              const statusText = isDownloading
                ? `Downloading (${dl.current}/${dl.total})`
                : isFailed
                  ? 'Download failed'
                : isDownloaded
                  ? 'Downloaded'
                  : 'Not downloaded'

              return (
                <div
                  key={bookMeta.book}
                  style={{
                    background: 'var(--card-bg, rgba(255,255,255,0.08))',
                    border: '1px solid rgba(212, 168, 67, 0.2)',
                    borderRadius: '12px',
                    padding: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>
                        {bookMeta.book}. {bookMeta.name}
                      </p>
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'rgba(245, 246, 251, 0.7)' }}>
                        {bookMeta.chapters} chapters
                      </p>
                      <p
                        style={{
                          margin: '4px 0 0',
                          fontSize: '12px',
                          color: isDownloading
                            ? '#D4A843'
                            : isDownloaded
                              ? '#89d689'
                              : isFailed
                                ? '#ff9f9f'
                                : 'rgba(245, 246, 251, 0.65)',
                          fontWeight: 600,
                        }}
                      >
                        {statusText}
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                      {!isDownloaded ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleDownload(bookMeta)}
                            disabled={isDownloading}
                            style={{
                              border: 'none',
                              borderRadius: '10px',
                              padding: '8px 10px',
                              background: '#D4A843',
                              color: 'var(--text-primary)',
                              fontWeight: 700,
                              fontSize: '12px',
                              cursor: isDownloading ? 'not-allowed' : 'pointer',
                              opacity: isDownloading ? 0.6 : 1,
                            }}
                          >
                            Download
                          </button>
                          {isFailed ? (
                            <button
                              type="button"
                              onClick={() => handleDownload(bookMeta)}
                              style={{
                                border: '1px solid rgba(212, 168, 67, 0.45)',
                                borderRadius: '10px',
                                padding: '8px 10px',
                                background: 'rgba(212, 168, 67, 0.12)',
                                color: '#D4A843',
                                fontWeight: 700,
                                fontSize: '12px',
                                cursor: 'pointer',
                              }}
                            >
                              Retry
                            </button>
                          ) : null}
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleDelete(bookMeta)}
                          disabled={isDownloading}
                          style={{
                            border: '1px solid rgba(255, 140, 140, 0.45)',
                            borderRadius: '10px',
                            padding: '8px 10px',
                            background: 'rgba(120, 20, 20, 0.22)',
                            color: '#ffd3d3',
                            fontWeight: 700,
                            fontSize: '12px',
                            cursor: isDownloading ? 'not-allowed' : 'pointer',
                            opacity: isDownloading ? 0.6 : 1,
                          }}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>

                  {isDownloading ? (
                    <div style={{ marginTop: '8px' }}>
                      <div
                        style={{
                          height: '8px',
                          width: '100%',
                          background: 'rgba(255, 255, 255, 0.14)',
                          borderRadius: '999px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${progressPercent(dl)}%`,
                            background: '#D4A843',
                            transition: 'width 0.2s ease',
                          }}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
