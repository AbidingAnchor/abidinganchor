import { useCallback, useEffect, useState } from 'react'
import { saveToJournal } from '../utils/journal'
import SaveToast from './SaveToast'

/**
 * Calm, distraction-free chapter reader (WEB).
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {string} props.bookDisplayName — e.g. "1 Corinthians"
 * @param {string} props.apiBookName — e.g. "1corinthians" (no spaces)
 * @param {number} props.chapterNumber
 * @param {(n: number) => void} props.onChapterChange
 * @param {number} props.totalChapters
 * @param {string[]} [props.journalTags]
 * @param {boolean} [props.showChapterPicker]
 */
export default function BibleReader({
  open,
  onClose,
  bookDisplayName,
  apiBookName,
  chapterNumber,
  onChapterChange,
  totalChapters,
  journalTags = ['Reading Plan'],
  showChapterPicker = false,
}) {
  const [verses, setVerses] = useState([])
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState(false)
  const [toastTrigger, setToastTrigger] = useState(0)

  const fetchChapter = useCallback(async () => {
    if (!open || !apiBookName) return
    setLoading(true)
    setFetchError(false)
    try {
      const q = `${apiBookName} ${chapterNumber}`
      const response = await fetch(`https://bible-api.com/${encodeURIComponent(q)}?translation=web`)
      const data = await response.json()
      if (!response.ok || data.error || !Array.isArray(data.verses)) {
        setVerses([])
        setFetchError(true)
        return
      }
      setVerses(
        data.verses.map((v) => ({
          verse: v.verse,
          text: (v.text ?? '').trim(),
        })),
      )
      setFetchError(false)
    } catch {
      setVerses([])
      setFetchError(true)
    } finally {
      setLoading(false)
    }
  }, [open, apiBookName, chapterNumber])

  useEffect(() => {
    if (!open) return
    fetchChapter()
  }, [open, fetchChapter])

  useEffect(() => {
    if (!open || loading || fetchError) return
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [open, loading, fetchError, chapterNumber])

  const handlePrevChapter = () => {
    if (chapterNumber <= 1) return
    onChapterChange(chapterNumber - 1)
  }

  const handleNextChapter = () => {
    if (chapterNumber >= totalChapters) return
    onChapterChange(chapterNumber + 1)
  }

  const handleSaveVerse = (verse) => {
    saveToJournal({
      verse: verse.text,
      reference: `${bookDisplayName} ${chapterNumber}:${verse.verse}`,
      tags: journalTags,
    })
    setToastTrigger((t) => t + 1)
  }

  if (!open) return null

  return (
    <>
      <style>
        {`
          @keyframes bible-reader-pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.4; transform: scale(0.85); }
          }
        `}
      </style>

      <section className="space-y-0" style={{ paddingBottom: '8px' }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.7)',
            fontSize: '14px',
            cursor: 'pointer',
            padding: '0 0 16px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          ← Back
        </button>

        {showChapterPicker && totalChapters > 0 ? (
          <div className="flex gap-2 overflow-x-auto pb-3" style={{ marginBottom: '4px' }}>
            {Array.from({ length: totalChapters }, (_, idx) => idx + 1).map((ch) => (
              <button
                key={ch}
                type="button"
                onClick={() => onChapterChange(ch)}
                className="h-8 w-8 shrink-0 rounded-full text-xs font-semibold"
                style={{
                  background: chapterNumber === ch ? 'linear-gradient(135deg, #D4A843, #B8860B)' : 'rgba(255,255,255,0.12)',
                  color: chapterNumber === ch ? '#fff' : 'rgba(255,255,255,0.9)',
                  border: '1px solid rgba(255,255,255,0.2)',
                }}
              >
                {ch}
              </button>
            ))}
          </div>
        ) : null}

        <div
          style={{
            background: 'rgba(255,255,255,0.08)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '16px',
            padding: '16px 20px',
            marginBottom: '16px',
            textAlign: 'center',
          }}
        >
          <p
            style={{
              color: '#D4A843',
              fontSize: '11px',
              fontWeight: '700',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              marginBottom: '4px',
            }}
          >
            World English Bible
          </p>
          <h2
            style={{
              color: '#fff',
              fontSize: '24px',
              fontWeight: '700',
              margin: 0,
            }}
          >
            {bookDisplayName} {chapterNumber}
          </h2>
        </div>

        {loading ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '300px',
              gap: '16px',
            }}
          >
            <div
              style={{
                fontSize: '48px',
                animation: 'bible-reader-pulse 1.5s ease-in-out infinite',
                color: '#D4A843',
              }}
            >
              ✝
            </div>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>Loading Scripture...</p>
          </div>
        ) : fetchError ? (
          <div
            style={{
              textAlign: 'center',
              padding: '48px 24px',
              color: 'rgba(255,255,255,0.6)',
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>✝</div>
            <p style={{ marginBottom: '16px' }}>Could not load this passage. Please check your connection.</p>
            <button
              type="button"
              onClick={() => fetchChapter()}
              style={{
                background: 'linear-gradient(135deg, #D4A843, #B8860B)',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                padding: '10px 24px',
                cursor: 'pointer',
                fontWeight: '600',
              }}
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            {verses.map((verse) => (
              <div
                key={verse.verse}
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '14px',
                  padding: '14px',
                  marginBottom: '10px',
                  display: 'flex',
                  gap: '14px',
                  alignItems: 'flex-start',
                }}
              >
                <span
                  style={{
                    background: 'linear-gradient(135deg, #D4A843, #B8860B)',
                    color: '#fff',
                    fontSize: '11px',
                    fontWeight: '800',
                    borderRadius: '999px',
                    minWidth: '26px',
                    height: '26px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px',
                    boxShadow: '0 2px 8px rgba(212,168,67,0.4)',
                  }}
                >
                  {verse.verse}
                </span>
                <p
                  style={{
                    color: 'rgba(255,255,255,0.92)',
                    fontSize: '15px',
                    lineHeight: '1.75',
                    margin: 0,
                    fontFamily: 'Georgia, serif',
                    flex: 1,
                  }}
                >
                  {verse.text}
                </p>
                <button
                  type="button"
                  onClick={() => handleSaveVerse(verse)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'rgba(212,168,67,0.6)',
                    fontSize: '18px',
                    padding: '0',
                    flexShrink: 0,
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.color = '#D4A843'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.color = 'rgba(212,168,67,0.6)'
                  }}
                  title="Save to Journal"
                >
                  🔖
                </button>
              </div>
            ))}

            <div
              style={{
                display: 'flex',
                gap: '12px',
                marginTop: '24px',
                marginBottom: '32px',
              }}
            >
              <button
                type="button"
                onClick={handlePrevChapter}
                disabled={chapterNumber <= 1}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(255,255,255,0.08)',
                  color: chapterNumber <= 1 ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.85)',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: chapterNumber <= 1 ? 'not-allowed' : 'pointer',
                  backdropFilter: 'blur(8px)',
                }}
              >
                ← Previous Chapter
              </button>
              <button
                type="button"
                onClick={handleNextChapter}
                disabled={chapterNumber >= totalChapters}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '12px',
                  border: '1px solid rgba(212,168,67,0.4)',
                  background:
                    chapterNumber >= totalChapters ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #D4A843, #B8860B)',
                  color: chapterNumber >= totalChapters ? 'rgba(255,255,255,0.25)' : '#fff',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: chapterNumber >= totalChapters ? 'not-allowed' : 'pointer',
                  boxShadow: chapterNumber >= totalChapters ? 'none' : '0 4px 16px rgba(212,168,67,0.35)',
                }}
              >
                Next Chapter →
              </button>
            </div>
          </>
        )}
      </section>

      <SaveToast trigger={toastTrigger} />
    </>
  )
}
