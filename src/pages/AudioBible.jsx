import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { bibleBooks } from '../data/bibleBooks'
import { fetchBollsGetTextForUiLang } from '../utils/bibleTranslation'
import { resolveGetBibleTranslationId, fetchGetBibleChapter } from '../services/getBibleApi'
import { prepareBibleReaderVerseText } from '../utils/kjvVerseText'

const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY
const ELEVENLABS_DEFAULT_VOICE_ID = '1KNqBv4TutQtzSIACsMC' // Harry
/** First segment size so TTS + stream returns quickly; remaining verses are fetched in parallel. */
const FIRST_TTS_VERSE_COUNT = 3
const ELEVENLABS_VOICES = [
  { id: '1KNqBv4TutQtzSIACsMC', name: 'Harry', note: 'Multilingual, best for European languages' },
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', note: 'American English, calm and clear' },
  { id: '9BWtsMINqrJLrRacOk9x', name: 'Aria', note: 'American, warm and natural' },
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', note: 'British, deep and authoritative' },
  { id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda', note: 'American, warm narrator' },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', note: 'American, young and friendly' },
  { id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte', note: 'Swedish, warm and clear' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', note: 'British, authoritative narrator' },
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', note: 'British, warm and natural' },
  { id: 'nPczCjzI2devNBz1zQrb', name: 'Brian', note: 'American, deep and calm' },
]

function versesToTtsText(verseList) {
  return verseList.map((v) => `${v.verse}. ${v.text}`).join(' ')
}

/**
 * Stream endpoint returns chunked body; we consume the ReadableStream into a single Blob for the HTML5 Audio element.
 */
async function streamTtsToBlob(text, voiceId, signal) {
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': ELEVENLABS_API_KEY,
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
      optimize_streaming_latency: 3,
    }),
  })
  if (!response.ok) {
    let message = `ElevenLabs error (${response.status})`
    try {
      const j = await response.json()
      if (j.detail != null) {
        message = typeof j.detail === 'string' ? j.detail : JSON.stringify(j.detail)
      }
    } catch {
      /* ignore */
    }
    throw new Error(message)
  }
  return new Response(response.body).blob()
}

export default function AudioBible() {
  const [selectedBook, setSelectedBook] = useState(bibleBooks[0])
  const [selectedChapter, setSelectedChapter] = useState(1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [verses, setVerses] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false)
  const audioPlayer = useRef(null)
  const isPlayingRef = useRef(false)
  const { t, i18n } = useTranslation()
  const [currentVerseIndex, setCurrentVerseIndex] = useState(null)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [volume, setVolume] = useState(1)
  const [isMinimized, setIsMinimized] = useState(false)
  const [showVoiceSelector, setShowVoiceSelector] = useState(false)
  const [selectedVoiceId, setSelectedVoiceId] = useState(ELEVENLABS_DEFAULT_VOICE_ID)

  const ttsAbortRef = useRef(null)
  const selectedVoice = ELEVENLABS_VOICES.find((v) => v.id === selectedVoiceId) || ELEVENLABS_VOICES[0]
  const uiLang = (i18n.resolvedLanguage || i18n.language || 'en').toLowerCase().slice(0, 2)

  // Auto-suggest voice by language (user can still override manually afterwards).
  useEffect(() => {
    const suggested =
      uiLang === 'ko' || uiLang === 'zh' || uiLang === 'hi'
        ? '9BWtsMINqrJLrRacOk9x' // Aria
        : uiLang === 'ru' || uiLang === 'ro'
          ? 'onwK4e9ZLuTAKqWW03F9' // Daniel
          : uiLang === 'fr' || uiLang === 'it'
            ? 'XB0fDUnXU5powFXDhCwa' // Charlotte
            : uiLang === 'es' || uiLang === 'pt'
              ? 'TX3LPaxmHKxFdv7VOQHJ' // Liam
          : '1KNqBv4TutQtzSIACsMC' // Harry
    setSelectedVoiceId(suggested)
  }, [uiLang])

  const finishPlayback = useCallback(() => {
    setIsPlaying(false)
    isPlayingRef.current = false
    setIsGeneratingAudio(false)
  }, [])

  const stopAudio = useCallback(() => {
    ttsAbortRef.current?.abort()
    ttsAbortRef.current = null
    if (audioPlayer.current) {
      try {
        audioPlayer.current.pause()
        audioPlayer.current.onended = null
      } catch {
        /* ignore */
      }
      if (audioPlayer.current.src && audioPlayer.current.src.startsWith('blob:')) {
        URL.revokeObjectURL(audioPlayer.current.src)
      }
      audioPlayer.current = null
    }
    setIsPlaying(false)
    isPlayingRef.current = false
    setIsGeneratingAudio(false)
  }, [])

  const startChapterPlayback = useCallback(async (voiceIdOverride) => {
    if (!ELEVENLABS_API_KEY) {
      setError('ElevenLabs API key not found.')
      return
    }
    if (!verses.length) return

    ttsAbortRef.current?.abort()
    const ac = new AbortController()
    ttsAbortRef.current = ac
    setError(null)
    setIsPlaying(true)
    isPlayingRef.current = true
    setIsGeneratingAudio(true)

    const head = verses.slice(0, FIRST_TTS_VERSE_COUNT)
    const tail = verses.slice(FIRST_TTS_VERSE_COUNT)
    const headText = versesToTtsText(head)
    const tailText = tail.length ? versesToTtsText(tail) : ''
    const voiceId = voiceIdOverride || selectedVoiceId

    const ensureAudio = () => {
      if (!audioPlayer.current) {
        audioPlayer.current = new Audio()
      }
      audioPlayer.current.volume = volume
      return audioPlayer.current
    }

    let restPromise = null
    if (tail.length) {
      const restSignal = ttsAbortRef.current?.signal || ac.signal
      // Catch early to prevent unhandled rejections if segment 2 fails before we await it.
      restPromise = streamTtsToBlob(tailText, voiceId, restSignal).catch((e) => {
        if (e?.name === 'AbortError' || restSignal?.aborted) return null
        throw e
      })
    }

    try {
      const blob1 = await streamTtsToBlob(headText, voiceId, ac.signal)
      if (ac.signal.aborted) {
        finishPlayback()
        return
      }

      setIsGeneratingAudio(false)
      const el = ensureAudio()
      el.playbackRate = playbackSpeed
      const url1 = URL.createObjectURL(blob1)
      if (el.src && el.src.startsWith('blob:')) {
        URL.revokeObjectURL(el.src)
      }
      el.src = url1

      const afterFirst = async () => {
        el.onended = null
        try {
          if (el.src) {
            const u = el.src
            el.removeAttribute('src')
            if (u.startsWith('blob:')) {
              URL.revokeObjectURL(u)
            }
          }
        } catch {
          /* ignore */
        }
        if (ac.signal.aborted) {
          finishPlayback()
          return
        }
        if (!restPromise) {
          finishPlayback()
          return
        }
        setIsGeneratingAudio(true)
        let blob2
        try {
          blob2 = await restPromise
        } catch (e) {
          if (e.name === 'AbortError' || ac.signal.aborted) {
            finishPlayback()
            return
          }
          setError(`Second segment failed. Tap play to retry. (${e?.message || String(e)})`)
          finishPlayback()
          return
        }
        if (!blob2) {
          finishPlayback()
          return
        }
        if (ac.signal.aborted) {
          finishPlayback()
          return
        }
        setIsGeneratingAudio(false)
        const url2 = URL.createObjectURL(blob2)
        el.src = url2
        el.onended = () => {
          el.onended = null
          if (el.src && el.src.startsWith('blob:')) {
            URL.revokeObjectURL(el.src)
          }
          finishPlayback()
        }
        try {
          await el.play()
        } catch {
          setError('Playback was blocked. Try again.')
          if (el.src && el.src.startsWith('blob:')) {
            URL.revokeObjectURL(el.src)
          }
          finishPlayback()
        }
      }

      el.onended = afterFirst
      try {
        await el.play()
      } catch {
        setError('Playback was blocked. Try again.')
        if (el.src && el.src.startsWith('blob:')) {
          URL.revokeObjectURL(el.src)
        }
        finishPlayback()
      }
    } catch (err) {
      if (err.name === 'AbortError' || ac.signal.aborted) {
        return
      }
      console.error('Error generating audio:', err)
      setError(`Audio generation failed: ${err?.message || String(err)}`)
      const a = audioPlayer.current
      if (a?.src && a.src.startsWith('blob:')) {
        URL.revokeObjectURL(a.src)
      }
      finishPlayback()
    }
  }, [verses, playbackSpeed, finishPlayback, selectedVoiceId, volume])

  const togglePlay = useCallback(() => {
    if (isPlayingRef.current) {
      stopAudio()
      return
    }
    void startChapterPlayback()
  }, [startChapterPlayback, stopAudio])

  useEffect(() => {
    if (audioPlayer.current) {
      audioPlayer.current.playbackRate = playbackSpeed
    }
  }, [playbackSpeed])

  useEffect(() => {
    if (audioPlayer.current) {
      audioPlayer.current.volume = volume
    }
  }, [volume])

  // Stop any active audio when leaving this page/tab.
  useEffect(() => {
    return () => {
      stopAudio()
    }
  }, [stopAudio])

  const stopPlayback = () => {
    stopAudio()
    setCurrentVerseIndex(null)
  }

  const handleBookChange = (e) => {
    const book = bibleBooks.find(b => b.name === e.target.value)
    setSelectedBook(book)
    setSelectedChapter(1)
  }

  const handleChapterChange = (e) => {
    setSelectedChapter(parseInt(e.target.value))
  }

  // Voice profile definitions with gender keywords and pitch/rate settings

  const goToPreviousChapter = () => {
    stopPlayback()
    if (selectedChapter > 1) {
      setSelectedChapter(selectedChapter - 1)
    } else {
      // Go to previous book's last chapter
      const currentBookIndex = bibleBooks.findIndex(b => b.name === selectedBook.name)
      if (currentBookIndex > 0) {
        const prevBook = bibleBooks[currentBookIndex - 1]
        setSelectedBook(prevBook)
        setSelectedChapter(prevBook.chapters)
      }
    }
  }

  const goToNextChapter = () => {
    stopPlayback()
    if (selectedChapter < selectedBook.chapters) {
      setSelectedChapter(selectedChapter + 1)
    } else {
      // Go to next book's first chapter
      const currentBookIndex = bibleBooks.findIndex(b => b.name === selectedBook.name)
      if (currentBookIndex < bibleBooks.length - 1) {
        const nextBook = bibleBooks[currentBookIndex + 1]
        setSelectedBook(nextBook)
        setSelectedChapter(1)
      }
    }
  }
  // Fetch chapter: bolls.life (per UI language) → getBible → bible-api.com (WEB)
  useEffect(() => {
    let cancelled = false

    const run = async () => {
      setIsLoading(true)
      setError(null)
      const bookNum = bibleBooks.findIndex((b) => b.name === selectedBook.name) + 1
      if (bookNum < 1) {
        if (!cancelled) {
          setError('Invalid book')
          setVerses([])
        }
        setIsLoading(false)
        return
      }

      const applyNewVerses = (rows) => {
        stopAudio()
        setCurrentVerseIndex(null)
        setVerses(rows)
      }

      const mapBollsRow = (v) => ({
        verse: v.verse,
        text: prepareBibleReaderVerseText(
          (v.text || '')
            .replace(/[ⓐ-ⓩ]/g, '')
            .replace(/<[^>]*>/g, '')
            .replace(/\s{2,}/g, ' ')
            .trim(),
        ),
      })

      try {
        const rows = await fetchBollsGetTextForUiLang(uiLang, bookNum, selectedChapter)
        if (rows?.length) {
          if (!cancelled) {
            applyNewVerses(rows.map(mapBollsRow))
          }
          return
        }

        const getBibleSlug = resolveGetBibleTranslationId(uiLang, 'web')
        if (getBibleSlug) {
          const { verses: raw } = await fetchGetBibleChapter(getBibleSlug, bookNum, selectedChapter)
          if (raw?.length) {
            if (!cancelled) {
              applyNewVerses(
                raw.map((v) => ({
                  verse: v.verse,
                  text: prepareBibleReaderVerseText(v.text),
                })),
              )
            }
            return
          }
        }

        const ref = `${selectedBook.name.toLowerCase()}+${selectedChapter}`
        const response = await fetch(
          `https://bible-api.com/${encodeURIComponent(ref)}?translation=web`,
        )
        if (!response.ok) {
          throw new Error('Failed to fetch scripture')
        }
        const data = await response.json()
        if (!cancelled) {
          applyNewVerses(
            (data.verses || []).map((v) => ({
              verse: v.verse,
              text: prepareBibleReaderVerseText(v.text),
            })),
          )
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || String(err))
          setVerses([])
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [selectedBook, selectedChapter, uiLang, stopAudio])



  return (
    <div className="content-scroll min-h-screen px-4 pt-6" style={{ paddingBottom: '160px' }}>
      {/* Screen Title */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">📖</span>
        <h1 className="text-page-title text-gold-accent">Audio Bible</h1>
      </div>

      {/* Book & Chapter Selectors */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1">
          <label className="block text-section-header mb-2 text-sm" style={{ color: '#1A1A1A' }}>Book</label>
          <select
            value={selectedBook.name}
            onChange={handleBookChange}
            className="app-input cursor-pointer"
            style={{
              appearance: 'none',
              backgroundColor: '#F0E8D4',
              color: '#1A1A1A',
              border: '1px solid rgba(212,168,67,0.3)',
              borderRadius: 12,
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23D4A843'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 12px center',
              backgroundSize: '20px',
            }}
          >
            {bibleBooks.map(book => (
              <option
                key={book.id}
                value={book.name}
                style={{
                  backgroundColor: selectedBook.name === book.name ? '#D4A843' : '#F0E8D4',
                  color: '#1A1A1A',
                }}
              >
                {book.name}
              </option>
            ))}
          </select>
        </div>
        <div className="w-32">
          <label className="block text-section-header mb-2 text-sm" style={{ color: '#1A1A1A' }}>Chapter</label>
          <select
            value={selectedChapter}
            onChange={handleChapterChange}
            className="app-input cursor-pointer"
            style={{
              appearance: 'none',
              backgroundColor: '#F0E8D4',
              color: '#1A1A1A',
              border: '1px solid rgba(212,168,67,0.3)',
              borderRadius: 12,
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23D4A843'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 12px center',
              backgroundSize: '20px',
            }}
          >
            {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map(chapter => (
              <option
                key={chapter}
                value={chapter}
                style={{
                  backgroundColor: selectedChapter === chapter ? '#D4A843' : '#F0E8D4',
                  color: '#1A1A1A',
                }}
              >
                {chapter}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Verse Text Background */}
      <div className="glass p-6 mb-6 min-h-[400px]" style={{ paddingBottom: '140px' }}>
        <div className="text-center mb-6">
          <h2 className="text-3xl font-semibold text-gold-accent mb-2" style={{ fontFamily: 'Lora, serif', letterSpacing: '0.02em' }}>
            {selectedBook.name} {selectedChapter}
          </h2>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <p className="text-gold-accent text-lg">Loading Scripture…</p>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-48">
            <p className="text-white/70 text-center">
              Unable to load Scripture. Please check your connection.
            </p>
          </div>
        ) : (
          <div className="space-y-0" style={{ fontFamily: 'Lora, serif', fontSize: '1.1rem', lineHeight: '1.8', color: '#F5E6C8' }}>
            {verses.map((verse, index) => (
              <p 
                key={verse.verse} 
                style={{ 
                  marginBottom: '1.2rem',
                  textAlign: 'justify',
                  transition: 'all 0.3s ease',
                  padding: currentVerseIndex === index ? '8px 12px' : '0',
                  background: currentVerseIndex === index ? 'rgba(212, 168, 67, 0.15)' : 'transparent',
                  borderRadius: currentVerseIndex === index ? '8px' : '0'
                }}
              >
                <sup style={{
                  color: '#D4A843',
                  fontSize: '0.75em',
                  fontWeight: 600,
                  marginRight: '4px',
                  verticalAlign: 'super'
                }}>
                  {verse.verse}
                </sup>
                {verse.text}
              </p>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes audioBibleSpin {
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      {/* Audio Player Pill */}
      <div
        style={{
          position: 'fixed',
          bottom: '72px',
          left: '12px',
          right: '12px',
          zIndex: 40,
          height: isMinimized ? '36px' : '56px',
          background: 'var(--card-parchment)',
          border: '1px solid var(--glass-border)',
          borderRadius: isMinimized ? '18px' : '28px',
          boxShadow: 'var(--glass-shadow)',
          padding: isMinimized ? '0 12px' : '0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          transition: 'all 0.3s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {/* Play / pause / loading */}
          <button
            type="button"
            aria-busy={isGeneratingAudio}
            aria-label={isGeneratingAudio
              ? t('audioBible.generatingAudio', { defaultValue: 'Generating audio' })
              : isPlaying
                ? t('audioBible.pause', { defaultValue: 'Pause' })
                : t('audioBible.play', { defaultValue: 'Play' })}
            onClick={togglePlay}
            style={{
              width: isMinimized ? '28px' : '32px',
              height: isMinimized ? '28px' : '32px',
              minWidth: isMinimized ? '28px' : '32px',
              minHeight: isMinimized ? '28px' : '32px',
              borderRadius: '50%',
              background: 'var(--gold)',
              color: '#0a1a3e',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: isMinimized ? '14px' : '16px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              position: 'relative',
            }}
          >
            {isGeneratingAudio ? (
              <span
                aria-hidden
                style={{
                  display: 'inline-block',
                  width: isMinimized ? '14px' : '16px',
                  height: isMinimized ? '14px' : '16px',
                  border: '2px solid rgba(10,26,62,0.35)',
                  borderTopColor: '#0a1a3e',
                  borderRadius: '50%',
                  animation: 'audioBibleSpin 0.7s linear infinite',
                  flexShrink: 0,
                }}
              />
            ) : isPlaying ? (
              '⏸'
            ) : (
              '▶'
            )}
          </button>

          <button
            type="button"
            aria-label={t('audioBible.stop', { defaultValue: 'Stop' })}
            onClick={stopPlayback}
            style={{
              width: isMinimized ? '28px' : '32px',
              height: isMinimized ? '28px' : '32px',
              minWidth: isMinimized ? '28px' : '32px',
              minHeight: isMinimized ? '28px' : '32px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.08)',
              color: 'var(--text-primary)',
              border: '1px solid var(--glass-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: isMinimized ? '13px' : '15px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            ⏹
          </button>
        </div>

        {!isMinimized && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              minWidth: '120px',
            }}
          >
            <span aria-hidden style={{ fontSize: '13px' }}>🔊</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              aria-label={t('audioBible.volume', { defaultValue: 'Volume' })}
              style={{
                width: '90px',
                accentColor: '#a884ff',
                cursor: 'pointer',
              }}
            />
          </div>
        )}

        {/* Voice status / picker (center) - only when expanded */}
        {!isMinimized && (
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={() => setShowVoiceSelector((s) => !s)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              {isGeneratingAudio
                ? t('audioBible.generatingAudio', { defaultValue: 'Generating audio…' })
                : `${selectedVoice.name} ▾`}
            </button>
            {showVoiceSelector && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '42px',
                  minWidth: '270px',
                  maxWidth: '340px',
                  background: 'var(--card-parchment)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '14px',
                  boxShadow: 'var(--glass-shadow)',
                  padding: '8px',
                  zIndex: 60,
                }}
              >
                {ELEVENLABS_VOICES.map((voice) => (
                  <button
                    key={voice.id}
                    type="button"
                    onClick={async () => {
                      const shouldRestart = isPlayingRef.current || isGeneratingAudio
                      if (shouldRestart) {
                        stopAudio()
                      }
                      setSelectedVoiceId(voice.id)
                      setShowVoiceSelector(false)
                      if (shouldRestart) {
                        // Restart immediately from verse 1 with the new voice.
                        await startChapterPlayback(voice.id)
                      }
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      marginBottom: '6px',
                      background: selectedVoiceId === voice.id ? 'rgba(212,168,67,0.18)' : 'transparent',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '10px',
                      padding: '8px 10px',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{voice.name}</div>
                    <div style={{ fontSize: '11px', opacity: 0.8 }}>{voice.note}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {!isMinimized && (
          <div style={{ display: 'flex', gap: '4px' }}>
            {[0.75, 1, 1.25, 1.5].map((speed) => (
              <button
                key={speed}
                onClick={() => setPlaybackSpeed(speed)}
                style={{
                  padding: '6px 8px',
                  borderRadius: '10px',
                  background: playbackSpeed === speed ? 'var(--gold)' : 'rgba(255, 255, 255, 0.05)',
                  color: playbackSpeed === speed ? '#0a1a3e' : 'var(--text-primary)',
                  border: 'none',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {speed}x
              </button>
            ))}
          </div>
        )}



        {/* Minimize/Expand Button */}
        <button
          onClick={() => setIsMinimized(!isMinimized)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--gold)',
            fontSize: '16px',
            cursor: 'pointer',
            padding: '4px',
          }}
        >
          {isMinimized ? '▲' : '▼'}
        </button>
      </div>



      {/* Chapter Navigation (separate pill, only when expanded) */}
      {!isMinimized && (
        <div
          style={{
            position: 'fixed',
            bottom: '136px',
            left: '12px',
            zIndex: 49,
            background: 'var(--card-parchment)',
            border: '1px solid var(--glass-border)',
            borderRadius: '20px',
            boxShadow: 'var(--glass-shadow)',
            padding: '8px',
            display: 'flex',
            gap: '4px',
          }}
        >
          <button
            onClick={goToPreviousChapter}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.1)',
              color: 'var(--text-primary)',
              border: 'none',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            ⏮
          </button>
          <button
            onClick={goToNextChapter}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.1)',
              color: 'var(--text-primary)',
              border: 'none',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            ⏭
          </button>
        </div>
      )}
    </div>
  )
}
