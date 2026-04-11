import { useState, useEffect, useRef } from 'react'
import { bibleBooks } from '../data/bibleBooks'

export default function AudioBible() {
  const [selectedBook, setSelectedBook] = useState(bibleBooks[0])
  const [selectedChapter, setSelectedChapter] = useState(1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [verses, setVerses] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedVoice, setSelectedVoice] = useState('David')
  const [mappedVoices, setMappedVoices] = useState({})
  const selectedVoiceRef = useRef('David')
  const [speechSupported, setSpeechSupported] = useState(true)
  const [currentVerseIndex, setCurrentVerseIndex] = useState(null)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [voiceSettings, setVoiceSettings] = useState({})
  const [isMinimized, setIsMinimized] = useState(true)

  const handleBookChange = (e) => {
    const book = bibleBooks.find(b => b.name === e.target.value)
    setSelectedBook(book)
    setSelectedChapter(1)
  }

  const handleChapterChange = (e) => {
    setSelectedChapter(parseInt(e.target.value))
  }

  const togglePlay = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      return
    }

    if (isPlaying) {
      // Pause
      window.speechSynthesis.pause()
      setIsPlaying(false)
    } else if (window.speechSynthesis.paused) {
      // Resume
      window.speechSynthesis.resume()
      setIsPlaying(true)
    } else {
      // Start new playback
      const fullText = verses.map(v => `${v.verse}. ${v.text}`).join(' ')
      const utterance = new SpeechSynthesisUtterance(fullText)
      
      // Always read from ref to avoid stale closures
      const voice = mappedVoices[selectedVoiceRef.current]
      if (voice) {
        utterance.voice = voice
      }
      
      // Apply voice-specific pitch and rate settings
      const settings = voiceSettings[selectedVoiceRef.current]
      if (settings) {
        utterance.pitch = settings.pitch
        utterance.rate = settings.rate * playbackSpeed
      } else {
        utterance.rate = playbackSpeed
      }
      
      // Track current verse being spoken
      utterance.onboundary = (event) => {
        if (event.name === 'word') {
          // Calculate which verse we're currently reading
          const textSoFar = fullText.substring(0, event.charIndex)
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
        setIsPlaying(false)
        setCurrentVerseIndex(null)
      }
      
      utterance.onerror = () => {
        setIsPlaying(false)
        setCurrentVerseIndex(null)
      }
      
      window.speechSynthesis.speak(utterance)
      setIsPlaying(true)
    }
  }

  const stopPlayback = () => {
    setIsPlaying(false)
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
    // Auto-start after chapter loads
    setTimeout(() => {
      if (window.speechSynthesis && !window.speechSynthesis.speaking) {
        setIsPlaying(true)
      }
    }, 500)
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
    // Auto-start after chapter loads
    setTimeout(() => {
      if (window.speechSynthesis && !window.speechSynthesis.speaking) {
        setIsPlaying(true)
      }
    }, 500)
  }

  // Load and map voices using Web Speech API
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices()
        console.log('Available voices:', voices.map(v => v.name))
        
        if (voices.length > 0) {
          // Map voice personalities to available voices with flexible search
          const englishVoices = voices.filter(v => v.lang.startsWith('en'))
          console.log('English voices:', englishVoices.map(v => v.name))

          // More flexible male voice search
          const maleVoices = englishVoices.filter(v => 
            v.name.toLowerCase().includes('male') || 
            v.name.toLowerCase().includes('david') ||
            v.name.toLowerCase().includes('daniel') ||
            v.name.toLowerCase().includes('james') ||
            v.name.toLowerCase().includes('google us english') ||
            !v.name.toLowerCase().includes('female')
          )
          console.log('Male voices found:', maleVoices.map(v => v.name))

          // More flexible female voice search
          const femaleVoices = englishVoices.filter(v => 
            v.name.toLowerCase().includes('female') ||
            v.name.toLowerCase().includes('google uk english female') ||
            v.name.toLowerCase().includes('samantha') ||
            v.name.toLowerCase().includes('victoria') ||
            v.name.toLowerCase().includes('karen') ||
            v.name.toLowerCase().includes('moira') ||
            v.name.toLowerCase().includes('google us english') && v.name.toLowerCase().includes('female')
          )
          console.log('Female voices found:', femaleVoices.map(v => v.name))

          // Voice mappings with fallback
          const voiceMappings = {
            David: maleVoices[0] || englishVoices[0] || voices[0],
            Grace: femaleVoices[0] || englishVoices[1] || voices[1],
            Elijah: maleVoices[1] || maleVoices[0] || englishVoices[2] || voices[2],
            Miriam: femaleVoices[1] || femaleVoices[0] || englishVoices[3] || voices[3]
          }

          console.log('Voice mappings:', {
            David: voiceMappings.David?.name,
            Grace: voiceMappings.Grace?.name,
            Elijah: voiceMappings.Elijah?.name,
            Miriam: voiceMappings.Miriam?.name
          })

          setMappedVoices(voiceMappings)

          // Set voice settings with pitch/rate for gender differentiation
          const settings = {
            David: { pitch: 0.75, rate: 0.9 },
            Grace: { pitch: 1.4, rate: 0.95 },
            Elijah: { pitch: 0.8, rate: 0.9 },
            Miriam: { pitch: 1.35, rate: 0.95 }
          }
          setVoiceSettings(settings)
        }
      }

      window.speechSynthesis.onvoiceschanged = loadVoices
      loadVoices() // Call immediately

      return () => {
        window.speechSynthesis.onvoiceschanged = null
      }
    } else {
      setSpeechSupported(false)
    }
  }, [])

  // Fetch Bible chapter text from API
  useEffect(() => {
    const fetchChapter = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        const response = await fetch(`https://bible-api.com/${selectedBook.name.toLowerCase()}+${selectedChapter}`)
        if (!response.ok) {
          throw new Error('Failed to fetch scripture')
        }
        const data = await response.json()
        setVerses(data.verses || [])
      } catch (err) {
        setError(err.message)
        setVerses([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchChapter()
  }, [selectedBook, selectedChapter])

  // Auto-play when isPlaying becomes true and verses are loaded
  useEffect(() => {
    if (isPlaying && verses.length > 0 && !window.speechSynthesis?.speaking && !window.speechSynthesis?.paused) {
      const fullText = verses.map(v => `${v.verse}. ${v.text}`).join(' ')
      const utterance = new SpeechSynthesisUtterance(fullText)
      
      // Always read from ref to avoid stale closures
      const voice = mappedVoices[selectedVoiceRef.current]
      if (voice) {
        utterance.voice = voice
      }
      
      // Apply voice-specific pitch and rate settings
      const settings = voiceSettings[selectedVoiceRef.current]
      if (settings) {
        utterance.pitch = settings.pitch
        utterance.rate = settings.rate * playbackSpeed
      } else {
        utterance.rate = playbackSpeed
      }
      
      utterance.onboundary = (event) => {
        if (event.name === 'word') {
          const textSoFar = fullText.substring(0, event.charIndex)
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
        setIsPlaying(false)
        setCurrentVerseIndex(null)
      }
      
      utterance.onerror = () => {
        setIsPlaying(false)
        setCurrentVerseIndex(null)
      }
      
      window.speechSynthesis.speak(utterance)
    }
  }, [isPlaying, verses, mappedVoices, playbackSpeed, voiceSettings])

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
    <div className="content-scroll min-h-screen px-4 pt-6 pb-32">
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

      {/* Minimized Audio Player Pill */}
      <div
        className="glass"
        style={{
          position: 'fixed',
          bottom: '65px',
          left: '16px',
          right: '16px',
          zIndex: 9997,
          padding: '12px 20px',
          borderRadius: '50px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          transition: 'all 0.3s ease',
        }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            className="w-10 h-10 rounded-full bg-[#D4A843] text-[#0a1a3e] hover:bg-[#B8902E] transition-all flex items-center justify-center font-semibold shadow-lg shadow-[#D4A843]/30"
            style={{ fontSize: '16px' }}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <span className="text-white/90 text-sm font-medium">{selectedVoice}</span>
        </div>
        
        <button
          onClick={() => setIsMinimized(false)}
          className="text-[#D4A843] hover:text-[#B8902E] transition-colors"
          style={{ fontSize: '18px' }}
        >
          ▲
        </button>
      </div>

      {/* Expanded Audio Player (hidden by default) */}
      {!isMinimized && (
        <div
          className="glass"
          style={{
            position: 'fixed',
            bottom: '65px',
            left: '16px',
            right: '16px',
            zIndex: 9997,
            padding: '16px',
            borderRadius: '20px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            transform: 'translateY(0)',
            transition: 'transform 0.3s ease',
          }}
        >
          {/* Minimize Button */}
          <div className="flex justify-end mb-3">
            <button
              onClick={() => setIsMinimized(true)}
              className="text-[#D4A843] hover:text-[#B8902E] transition-colors"
              style={{ fontSize: '18px' }}
            >
              ▼
            </button>
          </div>

          {/* Voice Selector */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gold-accent mb-2 text-center">Voice</label>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                { id: 'David', emoji: '👨', name: 'David' },
                { id: 'Grace', emoji: '👩', name: 'Grace' },
                { id: 'Elijah', emoji: '👴', name: 'Elijah' },
                { id: 'Miriam', emoji: '👩‍🦳', name: 'Miriam' }
              ].map(voice => (
                <button
                  key={voice.id}
                  onClick={() => {
                    setSelectedVoice(voice.id)
                    selectedVoiceRef.current = voice.id
                    if (isPlaying) {
                      stopPlayback()
                      // Immediate restart with new voice
                      setTimeout(() => {
                        setIsPlaying(true)
                      }, 50)
                    }
                  }}
                  className={`
                    px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200
                    ${selectedVoice === voice.id
                      ? 'bg-[#D4A843] text-[#0a1a3e]'
                      : 'bg-white/5 text-white/70 hover:bg-white/10'
                    }
                  `}
                >
                  <span className="mr-1">{voice.emoji}</span>
                  <span>{voice.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Playback Speed & Controls */}
          <div className="flex items-center justify-between gap-4">
            {/* Speed */}
            <div className="flex gap-1">
              {[0.75, 1, 1.25, 1.5].map(speed => (
                <button
                  key={speed}
                  onClick={() => setPlaybackSpeed(speed)}
                  className={`
                    px-2 py-1 rounded-full text-xs font-medium transition-all duration-200
                    ${playbackSpeed === speed
                      ? 'bg-[#D4A843] text-[#0a1a3e]'
                      : 'bg-white/5 text-white/60 hover:bg-white/10'
                    }
                  `}
                >
                  {speed}x
                </button>
              ))}
            </div>

            {/* Chapter Navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={goToPreviousChapter}
                className="w-8 h-8 rounded-full bg-white/10 text-white/80 hover:bg-white/20 hover:text-[#D4A843] transition-all flex items-center justify-center"
                style={{ fontSize: '14px' }}
              >
                ⏮
              </button>
              
              <button
                onClick={togglePlay}
                className="w-12 h-12 rounded-full bg-[#D4A843] text-[#0a1a3e] hover:bg-[#B8902E] transition-all flex items-center justify-center font-semibold shadow-lg shadow-[#D4A843]/30"
                style={{ fontSize: '18px' }}
              >
                {isPlaying ? '⏸' : '▶'}
              </button>
              
              <button
                onClick={goToNextChapter}
                className="w-8 h-8 rounded-full bg-white/10 text-white/80 hover:bg-white/20 hover:text-[#D4A843] transition-all flex items-center justify-center"
                style={{ fontSize: '14px' }}
              >
                ⏭
              </button>
            </div>

            {/* Progress */}
            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#D4A843] transition-all duration-300"
                style={{
                  width: `${currentVerseIndex !== null ? ((currentVerseIndex + 1) / verses.length) * 100 : 0}%`
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
