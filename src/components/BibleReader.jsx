import { useCallback, useEffect, useState } from 'react'
import { getBooks, getChapters, getSavedBibleId, POPULAR_BIBLES } from '../services/bibleApi'
import BibleTranslationSelector from './BibleTranslationSelector'

export default function BibleReader({ open, onClose }) {
  const [bibleId, setBibleId] = useState(getSavedBibleId())
  const [books, setBooks] = useState([])
  const [selectedBook, setSelectedBook] = useState(null)
  const [chapters, setChapters] = useState([])
  const [selectedChapter, setSelectedChapter] = useState(null)
  const [verses, setVerses] = useState([])
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState(false)
  const [showBookPicker, setShowBookPicker] = useState(false)
  const [showChapterPicker, setShowChapterPicker] = useState(false)
  const [fontSize, setFontSize] = useState(() => {
    if (typeof window !== 'undefined') {
      return parseInt(localStorage.getItem('bibleFontSize')) || 18
    }
    return 18
  })
  const [showTranslation, setShowTranslation] = useState(false)

  const currentBible = POPULAR_BIBLES.find(b => b.id === bibleId) || POPULAR_BIBLES[0]

  const loadBooks = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getBooks(bibleId)
      setBooks(data)
      
      // Load continue reading from localStorage
      const lastBookName = localStorage.getItem('lastReadBook')
      
      if (lastBookName && !selectedBook) {
        const book = data.find(b => b.name === lastBookName)
        if (book) {
          setSelectedBook(book)
        } else if (data.length > 0) {
          setSelectedBook(data[0])
        }
      } else if (!selectedBook && data.length > 0) {
        setSelectedBook(data[0])
      }
    } catch {
      setFetchError(true)
    } finally {
      setLoading(false)
    }
  }, [bibleId, selectedBook])

  const loadChapters = useCallback(async () => {
    if (!selectedBook) return
    try {
      const data = await getChapters(bibleId, selectedBook.id)
      setChapters(data)
      
      const lastChapterNum = localStorage.getItem('lastReadChapter')
      if (lastChapterNum && !selectedChapter) {
        const chapter = data.find(c => c.number === parseInt(lastChapterNum))
        if (chapter) {
          setSelectedChapter(chapter)
        } else if (data.length > 0) {
          setSelectedChapter(data[0])
        }
      } else if (!selectedChapter && data.length > 0) {
        setSelectedChapter(data[0])
      }
    } catch {
      setFetchError(true)
    }
  }, [bibleId, selectedBook, selectedChapter])

  const loadVerses = useCallback(async () => {
    if (!selectedChapter) return
    try {
      setLoading(true)
      setFetchError(false)
      
      const response = await fetch(`/api/bible?path=bibles/${bibleId}/chapters/${selectedChapter.id}/verses`)
      if (!response.ok) throw new Error('Failed to fetch verses')
      const data = await response.json()
      
      // Parse API response - extract verse number from id and text from text field
      const parsedVerses = data.data.map((verse) => {
        // Extract verse number from ID like "GEN.1.1" -> "1"
        const verseNum = verse.id.split('.')[2];
        
        // Strip HTML tags from text
        const text = verse.text
          .replace(/<[^>]*>/g, '')  // remove HTML tags
          .replace(/¶/g, '')         // remove paragraph marks
          .trim();
        
        return { number: verseNum, text };
      })
      
      setVerses(parsedVerses)
      
      // Save to localStorage
      localStorage.setItem('lastReadBook', selectedBook.name)
      localStorage.setItem('lastReadChapter', selectedChapter.number)
    } catch {
      setFetchError(true)
    } finally {
      setLoading(false)
    }
  }, [bibleId, selectedBook, selectedChapter])

  const handleBookSelect = (book) => {
    setSelectedBook(book)
    setChapters([])
    setSelectedChapter(null)
    setVerses([])
    setShowBookPicker(false)
    setShowChapterPicker(true)
  }

  const handleChapterSelect = (chapter) => {
    setSelectedChapter(chapter)
    setShowChapterPicker(false)
  }

  const handleTranslationSelect = (newBibleId) => {
    setBibleId(newBibleId)
    setBooks([])
    setSelectedBook(null)
    setChapters([])
    setSelectedChapter(null)
    setVerses([])
  }

  const goToPreviousChapter = () => {
    const currentIndex = chapters.findIndex(c => c.id === selectedChapter?.id)
    if (currentIndex > 0) {
      setSelectedChapter(chapters[currentIndex - 1])
    }
  }

  const goToNextChapter = () => {
    const currentIndex = chapters.findIndex(c => c.id === selectedChapter?.id)
    if (currentIndex < chapters.length - 1) {
      setSelectedChapter(chapters[currentIndex + 1])
    }
  }

  useEffect(() => {
    if (!open) return
    loadBooks()
  }, [open, loadBooks])

  useEffect(() => {
    if (!open || !selectedBook) return
    loadChapters()
  }, [open, selectedBook, loadChapters])

  useEffect(() => {
    if (!open || !selectedChapter) return
    loadVerses()
  }, [open, selectedChapter, loadVerses])

  useEffect(() => {
    if (!open || loading || fetchError) return
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [open, loading, fetchError, selectedChapter])

  if (!open) return null

  return (
    <>
      <div style={{ position: 'relative', minHeight: '100vh', background: '#0a1a3e' }}>
        {/* Top Bar */}
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: 'rgba(10, 26, 62, 0.95)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          padding: '12px 20px',
          borderBottom: '1px solid rgba(212, 168, 67, 0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', maxWidth: '680px', margin: '0 auto' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                position: 'absolute',
                left: '20px',
                background: 'none',
                border: 'none',
                color: '#D4A843',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '4px 8px'
              }}
            >
              ←
            </button>

            <button
              type="button"
              onClick={() => setShowBookPicker(true)}
              style={{
                background: 'none',
                border: 'none',
                color: '#FFFFFF',
                fontSize: '18px',
                fontWeight: 700,
                cursor: 'pointer',
                padding: '4px 12px'
              }}
            >
              {selectedBook?.name || 'Loading...'}
            </button>

            <span style={{ color: 'rgba(255,255,255,0.5)' }}> </span>

            <button
              type="button"
              onClick={() => setShowChapterPicker(true)}
              style={{
                background: 'none',
                border: 'none',
                color: '#D4A843',
                fontSize: '18px',
                fontWeight: 700,
                cursor: 'pointer',
                padding: '4px 12px'
              }}
            >
              {selectedChapter?.number || '1'}
            </button>

            <button
              type="button"
              onClick={() => setShowTranslation(true)}
              style={{
                position: 'absolute',
                right: '20px',
                background: 'none',
                border: '1px solid rgba(212,168,67,0.4)',
                borderRadius: '20px',
                color: '#D4A843',
                fontSize: '13px',
                fontWeight: 600,
                padding: '4px 12px',
                cursor: 'pointer'
              }}
            >
              {currentBible.abbr}
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ 
          paddingTop: '80px', 
          paddingBottom: '100px', 
          padding: '24px 20px', 
          maxWidth: '680px', 
          margin: '0 auto'
        }}>
          {loading && !verses.length ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '32px', marginBottom: '16px' }}>✝</div>
              <p style={{ color: 'rgba(255,255,255,0.6)' }}>Loading scripture...</p>
            </div>
          ) : fetchError ? (
            <div style={{
              textAlign: 'center',
              padding: '48px 24px',
              color: 'rgba(255,255,255,0.6)'
            }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>✝</div>
              <p style={{ marginBottom: '16px' }}>Could not load this passage. Please check your connection.</p>
              <button
                type="button"
                onClick={loadVerses}
                style={{
                  background: '#D4A843',
                  color: '#0a1a3e',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px 24px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Try Again
              </button>
            </div>
          ) : verses.length > 0 ? (
            <div>
              {/* Chapter Title */}
              <h2 style={{
                color: '#D4A843',
                fontSize: '24px',
                fontWeight: 700,
                marginBottom: '32px',
                textAlign: 'center'
              }}>
                {selectedBook?.name} {selectedChapter?.number}
              </h2>
              
              {/* Verse Text - Continuous Flow */}
              <div style={{
                fontFamily: 'Georgia, serif',
                lineHeight: '2.2',
                fontSize: `${fontSize}px`,
                color: '#FFFFFF',
                fontWeight: 400
              }}>
                {verses.map((verse) => (
                  <span key={verse.number}>
                    <sup style={{
                      color: '#D4A843',
                      fontSize: '10px',
                      fontWeight: 700,
                      verticalAlign: 'super',
                      marginRight: '2px',
                      fontFamily: 'Arial, sans-serif'
                    }}>
                      {verse.number}
                    </sup>
                    {verse.text}{' '}
                  </span>
                ))}
              </div>

              {/* Font Size Controls */}
              <div style={{
                position: 'fixed',
                bottom: '100px',
                right: '20px',
                background: 'rgba(8,20,50,0.85)',
                borderRadius: '50px',
                border: '1px solid rgba(212,168,67,0.3)',
                padding: '8px 16px',
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
                zIndex: 150,
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)'
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
                    color: '#D4A843',
                    fontSize: '16px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  A+
                </button>
              </div>

              {/* Chapter Navigation */}
              <div style={{
                position: 'fixed',
                bottom: '20px',
                left: 0,
                right: 0,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 20px',
                zIndex: 150,
                maxWidth: '680px',
                margin: '0 auto'
              }}>
                <button
                  type="button"
                  onClick={goToPreviousChapter}
                  disabled={!selectedChapter || chapters.findIndex(c => c.id === selectedChapter?.id) === 0}
                  style={{
                    background: 'none',
                    border: '1px solid rgba(212,168,67,0.4)',
                    borderRadius: '20px',
                    color: '#D4A843',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '10px 20px',
                    opacity: selectedChapter && chapters.findIndex(c => c.id === selectedChapter?.id) === 0 ? 0.3 : 1
                  }}
                >
                  ← Previous
                </button>
                <button
                  type="button"
                  onClick={goToNextChapter}
                  disabled={!selectedChapter || chapters.findIndex(c => c.id === selectedChapter?.id) === chapters.length - 1}
                  style={{
                    background: 'none',
                    border: '1px solid rgba(212,168,67,0.4)',
                    borderRadius: '20px',
                    color: '#D4A843',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '10px 20px',
                    opacity: selectedChapter && chapters.findIndex(c => c.id === selectedChapter?.id) === chapters.length - 1 ? 0.3 : 1
                  }}
                >
                  Next →
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <BibleTranslationSelector
        isOpen={showTranslation}
        onClose={() => setShowTranslation(false)}
        currentBibleId={bibleId}
        onSelect={handleTranslationSelect}
      />

      {/* Book Picker Modal */}
      {showBookPicker && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 200,
          background: 'rgba(8,20,50,0.97)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)'
        }}>
          <div style={{ padding: '20px', height: '100%', overflowY: 'auto', maxWidth: '680px', margin: '0 auto' }}>
            <h2 style={{ 
              color: '#D4A843', 
              fontSize: '20px', 
              fontWeight: 700, 
              marginBottom: '24px',
              textAlign: 'center'
            }}>
              Select Book
            </h2>
            
            {/* Continue Reading */}
            {localStorage.getItem('lastReadBook') && (
              <button
                type="button"
                onClick={() => {
                  const lastBook = localStorage.getItem('lastReadBook')
                  const book = books.find(b => b.name === lastBook)
                  if (book) handleBookSelect(book)
                }}
                style={{
                  background: 'rgba(212,168,67,0.15)',
                  border: '1px solid rgba(212,168,67,0.3)',
                  borderRadius: '12px',
                  padding: '16px',
                  width: '100%',
                  textAlign: 'left',
                  cursor: 'pointer',
                  marginBottom: '20px',
                  color: '#D4A843',
                  fontWeight: 600
                }}
              >
                📖 Continue Reading: {localStorage.getItem('lastReadBook')} {localStorage.getItem('lastReadChapter')}
              </button>
            )}

            {/* Book List */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {books.map((book) => (
                <button
                  key={book.id}
                  type="button"
                  onClick={() => handleBookSelect(book)}
                  style={{
                    background: 'none',
                    border: 'none',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    color: '#FFFFFF',
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
                    e.currentTarget.style.color = '#FFFFFF'
                  }}
                >
                  {book.name}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowBookPicker(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.7)',
                fontSize: '15px',
                cursor: 'pointer',
                marginTop: '24px',
                padding: '12px',
                width: '100%'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Chapter Picker Modal */}
      {showChapterPicker && (
        <>
          <div 
            onClick={() => setShowChapterPicker(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 200,
              background: 'rgba(0,0,0,0.5)'
            }}
          />
          <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 201,
            background: 'rgba(8,20,50,0.97)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: '24px 24px 0 0',
            borderTop: '1px solid rgba(212,168,67,0.3)',
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
                {selectedBook?.name}
              </h2>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(6, 1fr)', 
                gap: '12px',
                justifyContent: 'center'
              }}>
                {chapters.map((chapter) => (
                  <button
                    key={chapter.id}
                    type="button"
                    onClick={() => handleChapterSelect(chapter)}
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      color: '#FFFFFF',
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
                      e.currentTarget.style.color = '#FFFFFF'
                    }}
                  >
                    {chapter.number}
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
    </>
  )
}
