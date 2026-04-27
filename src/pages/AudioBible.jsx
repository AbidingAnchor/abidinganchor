import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { bibleBooks } from '../data/bibleBooks'

const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY
const ELEVENLABS_VOICE_ID = '1KNqBv4TutQtzSIACsMC'
const ELEVENLABS_MODEL_ID = 'eleven_multilingual_v2'
const ELEVENLABS_API_URL = `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`

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
  const location = useLocation()
  const [currentVerseIndex, setCurrentVerseIndex] = useState(null)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [isMinimized, setIsMinimized] = useState(false)
  const [showVoiceSelector, setShowVoiceSelector] = useState(false)


  const playAudio = async (text) => {
    if (!ELEVENLABS_API_KEY) {
      console.error('ElevenLabs API key not found.')
      setError('ElevenLabs API key not found.')
      return
    }

    setIsGeneratingAudio(true)
    setError(null)
    setIsPlaying(true)
    isPlayingRef.current = true

    try {
      const response = await fetch(ELEVENLABS_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text: text,
          model_id: ELEVENLABS_MODEL_ID,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`ElevenLabs API error: ${errorData.detail}`)
      }

      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)

      if (audioPlayer.current) {
        audioPlayer.current.src = audioUrl
        audioPlayer.current.playbackRate = playbackSpeed
        audioPlayer.current.play()
      } else {
        audioPlayer.current = new Audio(audioUrl)
        audioPlayer.current.playbackRate = playbackSpeed
        audioPlayer.current.play()
      }
      
      audioPlayer.current.onended = () => {
        setIsPlaying(false)
        isPlayingRef.current = false
      }

    } catch (err) {
      console.error('Error generating audio:', err)
      setError(`Audio generation failed: ${err.message}`)
      setIsPlaying(false)
      isPlayingRef.current = false
    } finally {
      setIsGeneratingAudio(false)
    }
  }

  const stopAudio = () => {
    if (audioPlayer.current) {
      audioPlayer.current.pause()
      audioPlayer.current.currentTime = 0
      URL.revokeObjectURL(audioPlayer.current.src)
      audioPlayer.current = null
    }
    setIsPlaying(false)
    isPlayingRef.current = false
  }

  const togglePlay = async () => {
    if (isPlayingRef.current) {
      stopAudio()
    } else {
      const fullText = verses.map(v => `${v.verse}. ${v.text}`).join(' ')
      playAudio(fullText)
    }
  }

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




  // Fetch Bible chapter text from API
  useEffect(() => {
    const fetchChapter = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        const response = await fetch(
          `https://bible-api.com/${selectedBook.name.toLowerCase()}+${selectedChapter}?translation=web`,
        )
        if (!response.ok) {
          throw new Error('Failed to fetch scripture')
        }
        const data = await response.json()
        setVerses(data.verses || [])
        
        // Reset position when passage changes
        stopAudio()
        setCurrentVerseIndex(null)
      } catch (err) {
        setError(err.message)
        setVerses([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchChapter()
  }, [selectedBook, selectedChapter])



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
        {/* Play/Pause Button */}
        <button
          onClick={togglePlay}
          style={{
            width: isMinimized ? '28px' : '32px',
            height: isMinimized ? '28px' : '32px',
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
          }}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        {/* Voice Name (center) - only shown when expanded */}
        {!isMinimized && (
          <span
            style={{
              color: 'var(--text-primary)',
              fontSize: '14px',
              fontWeight: 500,
              flex: 1,
              textAlign: 'center',
            }}
          >
            ElevenLabs Voice
          </span>
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



      {/* Playback Speed Controls (separate pill, only when expanded) */}
      {!isMinimized && (
        <div
          style={{
            position: 'fixed',
            bottom: '136px',
            right: '12px',
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
          {[0.75, 1, 1.25, 1.5].map(speed => (
            <button
              key={speed}
              onClick={() => setPlaybackSpeed(speed)}
              style={{
                padding: '6px 10px',
                borderRadius: '12px',
                background: playbackSpeed === speed
                  ? 'var(--gold)'
                  : 'rgba(255, 255, 255, 0.05)',
                color: playbackSpeed === speed
                  ? '#0a1a3e'
                  : 'var(--text-primary)',
                border: 'none',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {speed}x
            </button>
          ))}
        </div>
      )}

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
