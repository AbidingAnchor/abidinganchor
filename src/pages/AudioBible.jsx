import { useState, useEffect } from 'react'
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
  const [currentVerseIndex, setCurrentVerseIndex] = useState(null)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)

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
      
      const voice = mappedVoices[selectedVoice]
      if (voice) {
        utterance.voice = voice
      }
      
      utterance.rate = playbackSpeed
      
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

        // Map voice personalities to available voices
        const englishVoices = voices.filter(v => v.lang.startsWith('en'))
        const maleVoices = englishVoices.filter(v => 
          v.name.toLowerCase().includes('male') || 
          v.name.toLowerCase().includes('david') ||
          v.name.toLowerCase().includes('daniel') ||
          v.name.toLowerCase().includes('james') ||
          !v.name.toLowerCase().includes('female')
        )
        const femaleVoices = englishVoices.filter(v => 
          v.name.toLowerCase().includes('female') ||
          v.name.toLowerCase().includes('samantha') ||
          v.name.toLowerCase().includes('victoria') ||
          v.name.toLowerCase().includes('karen') ||
          v.name.toLowerCase().includes('moira')
        )

        const mappings = {
          David: maleVoices[0] || englishVoices[0] || voices[0],
          Grace: femaleVoices[0] || englishVoices[1] || voices[1],
          Elijah: maleVoices[1] || maleVoices[0] || englishVoices[2] || voices[2],
          Miriam: femaleVoices[1] || femaleVoices[0] || englishVoices[3] || voices[3]
        }

        setMappedVoices(mappings)
      }

      // Load voices immediately if available, otherwise wait for onvoiceschanged
      if (window.speechSynthesis.getVoices().length > 0) {
        loadVoices()
      }

      window.speechSynthesis.onvoiceschanged = loadVoices

      return () => {
        window.speechSynthesis.onvoiceschanged = null
      }
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
      
      const voice = mappedVoices[selectedVoice]
      if (voice) {
        utterance.voice = voice
      }
      
      utterance.rate = playbackSpeed
      
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
  }, [isPlaying, verses, mappedVoices, selectedVoice, playbackSpeed])

  return (
    <div className="content-scroll min-h-screen px-4 pt-6 pb-32">
      {/* Screen Title */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">📖</span>
        <h1 className="text-page-title text-gold-accent">Audio Bible</h1>
      </div>

      {/* Book Selector */}
      <div className="mb-4">
        <label className="block text-section-header mb-2 text-gold-accent">Book</label>
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

      {/* Chapter Selector */}
      <div className="mb-6">
        <label className="block text-section-header mb-2 text-gold-accent">Chapter</label>
        <select
          value={selectedChapter}
          onChange={handleChapterChange}
          className="app-input cursor-pointer"
          style={{ appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23D4A843'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '20px' }}
        >
          {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map(chapter => (
            <option key={chapter} value={chapter} className="bg-slate-900 text-white">
              Chapter {chapter}
            </option>
          ))}
        </select>
      </div>

      {/* Glass Card with Chapter Text */}
      <div className="glass p-6 mb-6 min-h-[300px]">
        <div className="text-center mb-4">
          <h2 className="text-section-header text-gold-accent">
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
          <div className="space-y-4 font-serif text-white leading-relaxed">
            {verses.map((verse, index) => (
              <div 
                key={verse.verse} 
                className={`flex gap-3 transition-all duration-300 ${
                  currentVerseIndex === index ? 'bg-[#D4A843]/10 -mx-2 px-2 py-1 rounded' : ''
                }`}
              >
                <span className={`font-bold min-w-[24px] ${
                  currentVerseIndex === index ? 'text-[#D4A843] scale-110' : 'text-gold-accent'
                }`}>
                  {verse.verse}
                </span>
                <span className={currentVerseIndex === index ? 'text-white' : 'text-white/90'}>
                  {verse.text}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Voice Selector */}
      <div className="mb-6">
        <label className="block text-section-header mb-3 text-gold-accent text-center">Voice</label>
        <div className="flex flex-wrap justify-center gap-3">
          {[
            { id: 'David', emoji: '👨', name: 'David', desc: 'deep, calm' },
            { id: 'Grace', emoji: '👩', name: 'Grace', desc: 'warm, gentle' },
            { id: 'Elijah', emoji: '👴', name: 'Elijah', desc: 'strong, resonant' },
            { id: 'Miriam', emoji: '👩‍🦳', name: 'Miriam', desc: 'soft, contemplative' }
          ].map(voice => (
            <button
              key={voice.id}
              onClick={() => setSelectedVoice(voice.id)}
              className={`
                px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
                ${selectedVoice === voice.id
                  ? 'bg-[#D4A843] text-[#1a0533]'
                  : 'glass border border-[#D4A843] text-white hover:bg-[#D4A843]/10'
                }
              `}
            >
              <span className="mr-1">{voice.emoji}</span>
              <span>{voice.name}</span>
              <span className="text-xs opacity-70 ml-1">({voice.desc})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Playback Speed Control */}
      <div className="mb-4">
        <label className="block text-section-header mb-2 text-gold-accent text-center">Speed</label>
        <div className="flex justify-center gap-2">
          {[0.75, 1, 1.25, 1.5].map(speed => (
            <button
              key={speed}
              onClick={() => setPlaybackSpeed(speed)}
              className={`
                px-3 py-1 rounded-full text-xs font-medium transition-all duration-200
                ${playbackSpeed === speed
                  ? 'bg-[#D4A843] text-[#1a0533]'
                  : 'glass border border-[#D4A843]/50 text-white/70 hover:bg-[#D4A843]/10 hover:text-white'
                }
              `}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>

      {/* Playback Controls */}
      <div className="flex justify-center gap-4">
        <button
          onClick={togglePlay}
          className="btn-primary flex items-center gap-2"
          disabled={!selectedBook}
        >
          {isPlaying ? (
            <>
              <span>⏸</span>
              <span>Pause</span>
            </>
          ) : (
            <>
              <span>▶</span>
              <span>Play</span>
            </>
          )}
        </button>
        
        <button
          onClick={stopPlayback}
          className="btn-secondary flex items-center gap-2"
          disabled={!isPlaying}
        >
          <span>⏹</span>
          <span>Stop</span>
        </button>
      </div>

      {/* Fixed Bottom Player Bar */}
      {isPlaying && (
        <div
          className="glass"
          style={{
            position: 'fixed',
            bottom: 'calc(65px + env(safe-area-inset-bottom, 12px))',
            left: '16px',
            right: '16px',
            zIndex: 9997,
            padding: '12px 16px',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.3)',
          }}
        >
          {/* Current chapter info */}
          <div className="flex items-center gap-2">
            <span className="text-gold-accent font-semibold text-sm">
              {selectedBook.name} {selectedChapter}
            </span>
            <span className="text-white/50 text-xs">
              {currentVerseIndex !== null ? `${currentVerseIndex + 1}/${verses.length}` : `0/${verses.length}`}
            </span>
          </div>

          {/* Playback controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={goToPreviousChapter}
              className="text-white/70 hover:text-[#D4A843] transition-colors text-xl"
              style={{ fontSize: '20px' }}
            >
              ⏮
            </button>
            
            <button
              onClick={togglePlay}
              className="bg-[#D4A843] text-[#1a0533] w-10 h-10 rounded-full flex items-center justify-center font-semibold hover:bg-[#B8902E] transition-colors"
              style={{ fontSize: '16px' }}
            >
              {window.speechSynthesis?.paused ? '▶' : '⏸'}
            </button>
            
            <button
              onClick={goToNextChapter}
              className="text-white/70 hover:text-[#D4A843] transition-colors text-xl"
              style={{ fontSize: '20px' }}
            >
              ⏭
            </button>
          </div>

          {/* Progress bar */}
          <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#D4A843] transition-all duration-300"
              style={{
                width: `${currentVerseIndex !== null ? ((currentVerseIndex + 1) / verses.length) * 100 : 0}%`
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
