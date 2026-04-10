import { useCallback, useEffect, useState } from 'react'

// Book list with CDN-compatible lowercase names
const BOOKS = [
  { name: 'Genesis', cdnName: 'genesis' },
  { name: 'Exodus', cdnName: 'exodus' },
  { name: 'Leviticus', cdnName: 'leviticus' },
  { name: 'Numbers', cdnName: 'numbers' },
  { name: 'Deuteronomy', cdnName: 'deuteronomy' },
  { name: 'Joshua', cdnName: 'joshua' },
  { name: 'Judges', cdnName: 'judges' },
  { name: 'Ruth', cdnName: 'ruth' },
  { name: '1 Samuel', cdnName: '1samuel' },
  { name: '2 Samuel', cdnName: '2samuel' },
  { name: '1 Kings', cdnName: '1kings' },
  { name: '2 Kings', cdnName: '2kings' },
  { name: '1 Chronicles', cdnName: '1chronicles' },
  { name: '2 Chronicles', cdnName: '2chronicles' },
  { name: 'Ezra', cdnName: 'ezra' },
  { name: 'Nehemiah', cdnName: 'nehemiah' },
  { name: 'Esther', cdnName: 'esther' },
  { name: 'Job', cdnName: 'job' },
  { name: 'Psalms', cdnName: 'psalms' },
  { name: 'Proverbs', cdnName: 'proverbs' },
  { name: 'Ecclesiastes', cdnName: 'ecclesiastes' },
  { name: 'Song of Solomon', cdnName: 'songofsolomon' },
  { name: 'Isaiah', cdnName: 'isaiah' },
  { name: 'Jeremiah', cdnName: 'jeremiah' },
  { name: 'Lamentations', cdnName: 'lamentations' },
  { name: 'Ezekiel', cdnName: 'ezekiel' },
  { name: 'Daniel', cdnName: 'daniel' },
  { name: 'Hosea', cdnName: 'hosea' },
  { name: 'Joel', cdnName: 'joel' },
  { name: 'Amos', cdnName: 'amos' },
  { name: 'Obadiah', cdnName: 'obadiah' },
  { name: 'Jonah', cdnName: 'jonah' },
  { name: 'Micah', cdnName: 'micah' },
  { name: 'Nahum', cdnName: 'nahum' },
  { name: 'Habakkuk', cdnName: 'habakkuk' },
  { name: 'Zephaniah', cdnName: 'zephaniah' },
  { name: 'Haggai', cdnName: 'haggai' },
  { name: 'Zechariah', cdnName: 'zechariah' },
  { name: 'Malachi', cdnName: 'malachi' },
  { name: 'Matthew', cdnName: 'matthew' },
  { name: 'Mark', cdnName: 'mark' },
  { name: 'Luke', cdnName: 'luke' },
  { name: 'John', cdnName: 'john' },
  { name: 'Acts', cdnName: 'acts' },
  { name: 'Romans', cdnName: 'romans' },
  { name: '1 Corinthians', cdnName: '1corinthians' },
  { name: '2 Corinthians', cdnName: '2corinthians' },
  { name: 'Galatians', cdnName: 'galatians' },
  { name: 'Ephesians', cdnName: 'ephesians' },
  { name: 'Philippians', cdnName: 'philippians' },
  { name: 'Colossians', cdnName: 'colossians' },
  { name: '1 Thessalonians', cdnName: '1thessalonians' },
  { name: '2 Thessalonians', cdnName: '2thessalonians' },
  { name: '1 Timothy', cdnName: '1timothy' },
  { name: '2 Timothy', cdnName: '2timothy' },
  { name: 'Titus', cdnName: 'titus' },
  { name: 'Philemon', cdnName: 'philemon' },
  { name: 'Hebrews', cdnName: 'hebrews' },
  { name: 'James', cdnName: 'james' },
  { name: '1 Peter', cdnName: '1peter' },
  { name: '2 Peter', cdnName: '2peter' },
  { name: '1 John', cdnName: '1john' },
  { name: '2 John', cdnName: '2john' },
  { name: '3 John', cdnName: '3john' },
  { name: 'Jude', cdnName: 'jude' },
  { name: 'Revelation', cdnName: 'revelation' },
]

// Chapter counts for each book
const CHAPTER_COUNTS = {
  genesis: 50, exodus: 40, leviticus: 27, numbers: 36, deuteronomy: 34,
  joshua: 24, judges: 21, ruth: 4, '1samuel': 31, '2samuel': 24,
  '1kings': 22, '2kings': 25, '1chronicles': 29, '2chronicles': 36,
  ezra: 10, nehemiah: 13, esther: 10, job: 42, psalms: 150, proverbs: 31,
  ecclesiastes: 12, songofsolomon: 8, isaiah: 66, jeremiah: 52,
  lamentations: 5, ezekiel: 48, daniel: 12, hosea: 14, joel: 3,
  amos: 9, obadiah: 1, jonah: 4, micah: 7, nahum: 3, habakkuk: 3,
  zephaniah: 3, haggai: 2, zechariah: 14, malachi: 4, matthew: 28,
  mark: 16, luke: 24, john: 21, acts: 28, romans: 16, '1corinthians': 16,
  '2corinthians': 13, galatians: 6, ephesians: 6, philippians: 4,
  colossians: 4, '1thessalonians': 5, '2thessalonians': 3, '1timothy': 6,
  '2timothy': 4, titus: 3, philemon: 1, hebrews: 13, james: 5,
  '1peter': 5, '2peter': 3, '1john': 5, '2john': 1, '3john': 1,
  jude: 1, revelation: 22
}

export default function BibleReader({ open, onClose }) {
  const [selectedBook, setSelectedBook] = useState(null)
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

  const chapters = selectedBook 
    ? Array.from({ length: CHAPTER_COUNTS[selectedBook.cdnName] || 1 }, (_, i) => i + 1)
    : []

  const loadVerses = useCallback(async () => {
    if (!selectedBook || !selectedChapter) return
    try {
      setLoading(true)
      setFetchError(false)
      
      const url = `https://cdn.jsdelivr.net/gh/wldeh/bible-api/bibles/en-kjv/books/${selectedBook.cdnName}/chapters/${selectedChapter}.json`
      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to fetch verses')
      const data = await response.json()
      
      setVerses(data.data || [])
      
      // Save to localStorage
      localStorage.setItem('lastReadBook', selectedBook.name)
      localStorage.setItem('lastReadChapter', selectedChapter.toString())
    } catch {
      setFetchError(true)
    } finally {
      setLoading(false)
    }
  }, [selectedBook, selectedChapter])

  const handleBookSelect = (book) => {
    setSelectedBook(book)
    setSelectedChapter(null)
    setVerses([])
    setShowBookPicker(false)
    setShowChapterPicker(true)
  }

  const handleChapterSelect = (chapter) => {
    setSelectedChapter(chapter)
    setShowChapterPicker(false)
  }

  const goToPreviousChapter = () => {
    if (selectedChapter && selectedChapter > 1) {
      setSelectedChapter(selectedChapter - 1)
    }
  }

  const goToNextChapter = () => {
    const maxChapter = CHAPTER_COUNTS[selectedBook?.cdnName] || 1
    if (selectedChapter && selectedChapter < maxChapter) {
      setSelectedChapter(selectedChapter + 1)
    }
  }

  useEffect(() => {
    if (!open) return
    
    // Load continue reading from localStorage
    const lastBookName = localStorage.getItem('lastReadBook')
    const lastChapterNum = localStorage.getItem('lastReadChapter')
    
    if (lastBookName) {
      const book = BOOKS.find(b => b.name === lastBookName)
      if (book) {
        setSelectedBook(book)
        if (lastChapterNum) {
          setSelectedChapter(parseInt(lastChapterNum))
        } else {
          setSelectedChapter(1)
        }
      } else {
        setSelectedBook(BOOKS[0])
        setSelectedChapter(1)
      }
    } else {
      setSelectedBook(BOOKS[0])
      setSelectedChapter(1)
    }
  }, [open])

  useEffect(() => {
    if (!open || !selectedBook || !selectedChapter) return
    loadVerses()
  }, [open, selectedBook, selectedChapter, loadVerses])

  useEffect(() => {
    if (!open || loading || fetchError) return
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [open, loading, fetchError, selectedChapter])

  if (!open) return null

  const maxChapter = CHAPTER_COUNTS[selectedBook?.cdnName] || 1

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
              {selectedChapter || '1'}
            </button>

            <div style={{
              position: 'absolute',
              right: '20px',
              color: '#D4A843',
              fontSize: '13px',
              fontWeight: 600,
              padding: '4px 12px'
            }}>
              KJV
            </div>
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
                {selectedBook?.name} {selectedChapter}
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
                  <span key={verse.verse}>
                    <sup style={{
                      color: '#D4A843',
                      fontSize: '10px',
                      fontWeight: 700,
                      verticalAlign: 'super',
                      marginRight: '2px',
                      fontFamily: 'Arial, sans-serif'
                    }}>
                      {verse.verse}
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
                  disabled={!selectedChapter || selectedChapter === 1}
                  style={{
                    background: 'none',
                    border: '1px solid rgba(212,168,67,0.4)',
                    borderRadius: '20px',
                    color: '#D4A843',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '10px 20px',
                    opacity: selectedChapter === 1 ? 0.3 : 1
                  }}
                >
                  ← Previous
                </button>
                <button
                  type="button"
                  onClick={goToNextChapter}
                  disabled={!selectedChapter || selectedChapter === maxChapter}
                  style={{
                    background: 'none',
                    border: '1px solid rgba(212,168,67,0.4)',
                    borderRadius: '20px',
                    color: '#D4A843',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '10px 20px',
                    opacity: selectedChapter === maxChapter ? 0.3 : 1
                  }}
                >
                  Next →
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

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
                  const book = BOOKS.find(b => b.name === lastBook)
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
              {BOOKS.map((book) => (
                <button
                  key={book.name}
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
                    key={chapter}
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
                    {chapter}
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
