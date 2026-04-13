import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { bibleBooks } from '../data/bibleBooks'

export default function AudioBible() {
  const [selectedBook, setSelectedBook] = useState(bibleBooks[0])
  const [selectedChapter, setSelectedChapter] = useState(1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [verses, setVerses] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedVoice, setSelectedVoice] = useState('David')
  const selectedVoiceRef = useRef('David')
  const [speechSupported, setSpeechSupported] = useState(true)
  const currentChunkRef = useRef(0)
  const chunksRef = useRef([])
  const isPlayingRef = useRef(false)
  const location = useLocation()
  const [currentVerseIndex, setCurrentVerseIndex] = useState(null)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [isMinimized, setIsMinimized] = useState(false)
  const [showVoiceSelector, setShowVoiceSelector] = useState(false)

  const handleBookChange = (e) => {
    const book = bibleBooks.find(b => b.name === e.target.value)
    setSelectedBook(book)
    setSelectedChapter(1)
  }

  const handleChapterChange = (e) => {
    setSelectedChapter(parseInt(e.target.value))
  }

  // Voice profile definitions with gender keywords and pitch/rate settings
  const voiceProfiles = {
    David: {
      genderKeywords: ['male', 'david', 'james', 'john', 'mark', 'daniel', 'google us english', 'microsoft david'],
      pitch: 0.75,
      rate: 0.9,
    },
    Elijah: {
      genderKeywords: ['male', 'elijah', 'thomas', 'george', 'paul', 'richard', 'google uk english male'],
      pitch: 0.70,
      rate: 0.88,
    },
    Grace: {
      genderKeywords: ['female', 'grace', 'samantha', 'karen', 'victoria', 'zira', 'susan', 'fiona', 'moira', 'tessa', 'google uk english female', 'microsoft zira', 'microsoft susan'],
      pitch: 1.35,
      rate: 0.93,
    },
    Miriam: {
      genderKeywords: ['female', 'miriam', 'allison', 'ava', 'alex', 'linda', 'kate', 'stephanie', 'emily', 'lisa', 'google us english female'],
      pitch: 1.45,
      rate: 0.95,
    },
  }

  // Get voice with profile based on voice name
  const getVoice = (voiceName) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      return { voice: null, pitch: 1, rate: 1 }
    }

    const voices = window.speechSynthesis.getVoices()
    const profile = voiceProfiles[voiceName]
    
    if (!profile) {
      return { voice: voices[0] || null, pitch: 1, rate: 1 }
    }

    // Try to find a matching voice by keyword in name
    const matched = voices.find((v) =>
      profile.genderKeywords.some((kw) =>
        v.name.toLowerCase().includes(kw)
      )
    )

    // Fallback: for female profiles, pick any non-default voice
    // For male profiles, use the first available voice
    const fallback = profile.pitch > 1
      ? voices.find((v) => v !== voices[0]) || voices[0]
      : voices[0]

    return {
      voice: matched || fallback || null,
      pitch: profile.pitch,
      rate: profile.rate,
    }
  }

  // Load voices with proper voiceschanged event handling
  const loadVoices = () => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        resolve([])
        return
      }

      const voices = window.speechSynthesis.getVoices()
      if (voices.length > 0) {
        resolve(voices)
        return
      }

      window.speechSynthesis.addEventListener('voiceschanged', () => {
        resolve(window.speechSynthesis.getVoices())
      }, { once: true })
    })
  }

  // Chunk text for iOS Safari workaround (prevents cutoff after ~15 seconds)
  const chunkText = (text) => {
    return text
      .split(/(?<=[.!?;,])\s+/)
      .reduce((chunks, sentence) => {
        const last = chunks[chunks.length - 1]
        if (last && (last + ' ' + sentence).length < 180) {
          chunks[chunks.length - 1] = last + ' ' + sentence
        } else {
          chunks.push(sentence)
        }
        return chunks
      }, [])
      .filter(Boolean)
  }

  // Speak from specific chunk with locked voice
  const speakFromChunk = async (startIndex) => {
    await loadVoices()
    window.speechSynthesis.cancel()
    await new Promise(r => setTimeout(r, 150))

    const { voice, pitch, rate } = getVoice(selectedVoiceRef.current)
    const chunks = chunksRef.current
    if (!chunks.length || startIndex >= chunks.length) return

    isPlayingRef.current = true
    setIsPlaying(true)

    const speakChunk = (index) => {
      if (index >= chunks.length || !isPlayingRef.current) {
        if (index >= chunks.length) {
          setIsPlaying(false)
          isPlayingRef.current = false
          currentChunkRef.current = 0
          setCurrentVerseIndex(null)
        }
        return
      }

      currentChunkRef.current = index
      const utterance = new SpeechSynthesisUtterance(chunks[index])
      utterance.voice = voice
      utterance.pitch = pitch
      utterance.rate = rate * playbackSpeed
      utterance.volume = 1

      // Track current verse being spoken
      utterance.onboundary = (event) => {
        if (event.name === 'word') {
          const textSoFar = chunks.slice(0, index).join(' ') + ' ' + chunks[index].substring(0, event.charIndex)
          const versePattern = /(\d+)\.\s/g
          let match
          let lastVerseNum = 1
          
          while ((match = versePattern.exec(textSoFar)) !== null) {
            lastVerseNum = parseInt(match[1])
          }
          
          const verseIndex = verses.findIndex(v => v.verse === lastVerseNum)
          if (verseIndex !== -1) {
            setCurrentVerseIndex(verseIndex)
          }
        }
      }

      utterance.onend = () => {
        if (isPlayingRef.current) {
          speakChunk(index + 1)
        }
      }

      utterance.onerror = (e) => {
        if (e.error !== 'canceled' && e.error !== 'interrupted') {
          console.error('Speech error:', e.error)
          if (isPlayingRef.current) {
            speakChunk(index + 1)
          }
        }
      }

      window.speechSynthesis.speak(utterance)
    }

    speakChunk(startIndex)
  }

  // Handle voice change with immediate effect
  const handleVoiceChange = async (newVoiceName) => {
    setSelectedVoice(newVoiceName)
    selectedVoiceRef.current = newVoiceName
    setShowVoiceSelector(false)
    
    if (!isPlayingRef.current) return
    
    // Stop and restart with new voice from current position
    const resumeFrom = currentChunkRef.current
    isPlayingRef.current = false
    window.speechSynthesis.cancel()
    
    await new Promise(r => setTimeout(r, 150))
    speakFromChunk(resumeFrom)
  }

  const togglePlay = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      return
    }

    if (isPlayingRef.current) {
      // PAUSE: stop speech, remember position
      isPlayingRef.current = false
      setIsPlaying(false)
      window.speechSynthesis.cancel()
      // currentChunkRef.current already holds our position
    } else {
      // PLAY/RESUME: start from saved position
      if (!chunksRef.current.length) {
        // First play — chunk the text
        const fullText = verses.map(v => `${v.verse}. ${v.text}`).join(' ')
        chunksRef.current = chunkText(fullText)
        currentChunkRef.current = 0
      }
      speakFromChunk(currentChunkRef.current)
    }
  }

  const stopPlayback = () => {
    setIsPlaying(false)
    isPlayingRef.current = false
    setCurrentVerseIndex(null)
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
  }

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

  // Cleanup on unmount - stop all speech
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel()
      setIsPlaying(false)
      isPlayingRef.current = false
    }
  }, [])

  // Stop speech on visibility change (tab switch, app minimize)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        window.speechSynthesis.cancel()
        setIsPlaying(false)
        isPlayingRef.current = false
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  // Stop speech on route change away from audio bible
  useEffect(() => {
    if (!location.pathname.includes('audio')) {
      window.speechSynthesis.cancel()
      setIsPlaying(false)
      isPlayingRef.current = false
    }
  }, [location.pathname])

  // Keep voice ref in sync
  useEffect(() => {
    selectedVoiceRef.current = selectedVoice
  }, [selectedVoice])

  // iOS keepalive - prevents silent stall after ~15 seconds
  useEffect(() => {
    if (!isPlaying) return
    
    const keepalive = setInterval(() => {
      if (isPlayingRef.current && window.speechSynthesis.paused) {
        window.speechSynthesis.resume()
      }
    }, 10000)

    return () => clearInterval(keepalive)
  }, [isPlaying])

  // Initialize voices on mount
  useEffect(() => {
    const initVoices = async () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        await loadVoices()
        console.log('Voices loaded successfully')
      } else {
        setSpeechSupported(false)
      }
    }
    initVoices()
  }, [])

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
        window.speechSynthesis.cancel()
        isPlayingRef.current = false
        setIsPlaying(false)
        currentChunkRef.current = 0
        chunksRef.current = []
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


  if (!speechSupported) {
    return (
      <div className="content-scroll min-h-screen px-4 pt-6 pb-32 flex items-center justify-center">
        <div className="glass p-8 rounded-2xl text-center max-w-md">
          <div className="text-5xl mb-4">🙏</div>
          <p className="text-white/90 text-lg mb-2">
            Audio not supported on this device.
          </p>
          <p className="text-white/60 text-sm">
            We're working on bringing you more options soon.
          </p>
        </div>
      </div>
    )
  }

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
          <label className="block text-section-header mb-2 text-gold-accent text-sm">Book</label>
          <select
            value={selectedBook.name}
            onChange={handleBookChange}
            className="app-input cursor-pointer"
            style={{ appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23D4A843'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '20px' }}
          >
            {bibleBooks.map(book => (
              <option key={book.id} value={book.name} className="bg-slate-900 text-white">
                {book.name}
              </option>
            ))}
          </select>
        </div>
        <div className="w-32">
          <label className="block text-section-header mb-2 text-gold-accent text-sm">Chapter</label>
          <select
            value={selectedChapter}
            onChange={handleChapterChange}
            className="app-input cursor-pointer"
            style={{ appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23D4A843'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '20px' }}
          >
            {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map(chapter => (
              <option key={chapter} value={chapter} className="bg-slate-900 text-white">
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
            {selectedVoice}
          </span>
        )}

        {/* Voice Selector Button (only when expanded) */}
        {!isMinimized && (
          <button
            onClick={() => setShowVoiceSelector(!showVoiceSelector)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--gold)',
              fontSize: '14px',
              cursor: 'pointer',
              padding: '4px 8px',
            }}
          >
            🎤
          </button>
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

      {/* Voice Selector Dropdown (opens upward from pill) */}
      {showVoiceSelector && !isMinimized && (
        <div
          style={{
            position: 'fixed',
            bottom: '136px',
            left: '12px',
            right: '12px',
            zIndex: 50,
            background: 'var(--card-parchment)',
            border: '1px solid var(--glass-border)',
            borderRadius: '16px',
            boxShadow: 'var(--glass-shadow)',
            padding: '12px',
            animation: 'slideUp 0.2s ease-out',
          }}
        >
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            justifyContent: 'center',
          }}>
            {[
              { id: 'David', emoji: '👨', name: 'David' },
              { id: 'Grace', emoji: '👩', name: 'Grace' },
              { id: 'Elijah', emoji: '👴', name: 'Elijah' },
              { id: 'Miriam', emoji: '👩‍🦳', name: 'Miriam' }
            ].map(voice => (
              <button
                key={voice.id}
                onClick={() => handleVoiceChange(voice.id)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  background: selectedVoice === voice.id
                    ? 'var(--gold)'
                    : 'rgba(255, 255, 255, 0.08)',
                  color: selectedVoice === voice.id
                    ? '#0a1a3e'
                    : 'var(--text-primary)',
                  border: '1px solid var(--glass-border)',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <span style={{ marginRight: '6px' }}>{voice.emoji}</span>
                <span>{voice.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

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
