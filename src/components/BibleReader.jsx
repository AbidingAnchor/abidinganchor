import { useEffect, useState } from 'react'

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
  const [bookIndex, setBookIndex] = useState(0)
  const [chapter, setChapter] = useState(1)
  const [verses, setVerses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showBookPicker, setShowBookPicker] = useState(false)
  const [showChapterPicker, setShowChapterPicker] = useState(false)
  const [fontSize, setFontSize] = useState(() => {
    if (typeof window !== 'undefined') {
      return parseInt(localStorage.getItem('bibleFontSize')) || 18
    }
    return 18
  })

  const selectedBook = BOOKS[bookIndex]
  const maxChapter = selectedBook?.chapters || 1

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
    
    setLoading(true)
    fetch(`https://cdn.jsdelivr.net/gh/wldeh/bible-api/bibles/en-kjv/books/${selectedBook.cdnName}/chapters/${chapter}.json`)
      .then(r => r.json())
      .then(json => {
        setVerses(json.data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error loading verses:', err)
        setLoading(false)
      })
  }, [open, selectedBook, chapter])

  useEffect(() => {
    if (selectedBook) {
      localStorage.setItem('bibleBookIndex', bookIndex.toString())
      localStorage.setItem('bibleChapter', chapter.toString())
    }
  }, [bookIndex, chapter, selectedBook])

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
          {/* Row 1: Book selector | Chapter selector | Translation (KJV) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '12px' }}>
            <button
              type="button"
              onClick={() => setShowBookPicker(true)}
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
              {selectedBook?.name || 'Loading...'}
            </button>

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
              Chapter {chapter}
            </button>

            <div style={{
              color: '#D4A843',
              fontSize: '13px',
              fontWeight: 600
            }}>
              KJV
            </div>
          </div>

          {/* Row 2: 📖 Read | 🎧 Listen toggle centered below */}
          {onModeChange && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '8px' }}>
              <div className="glass" style={{
                borderRadius: '50px',
                padding: '4px',
                display: 'flex',
                gap: '4px'
              }}>
                <button
                  type="button"
                  onClick={() => onModeChange('read')}
                  style={{
                    background: mode === 'read' ? '#D4A843' : 'transparent',
                    color: mode === 'read' ? '#0a1a3e' : 'rgba(255,255,255,0.7)',
                    border: 'none',
                    borderRadius: '50px',
                    padding: '8px 24px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                >
                  📖 Read
                </button>
                <button
                  type="button"
                  onClick={() => onModeChange('listen')}
                  style={{
                    background: mode === 'listen' ? '#D4A843' : 'transparent',
                    color: mode === 'listen' ? '#0a1a3e' : 'rgba(255,255,255,0.7)',
                    border: 'none',
                    borderRadius: '50px',
                    padding: '8px 24px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                >
                  🎧 Listen
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Verse Content - Scrollable */}
      <div style={{ 
        flex: 1,
        overflowY: 'auto',
        paddingTop: '140px', 
        paddingBottom: mode === 'listen' ? '220px' : '120px', 
        padding: '24px 20px', 
        maxWidth: '680px', 
        margin: '0 auto'
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '32px', marginBottom: '16px' }}>✝</div>
            <p style={{ color: 'rgba(245,230,200,0.6)' }}>Loading scripture...</p>
          </div>
        ) : (
          <div>
            {/* Chapter Title */}
            <h2 style={{
              color: '#D4A843',
              fontSize: '32px',
              fontWeight: 600,
              marginBottom: '40px',
              textAlign: 'center',
              fontFamily: 'Lora, serif',
              letterSpacing: '0.02em'
            }}>
              {selectedBook?.name} {chapter}
            </h2>
            
            {/* Verse Text - Premium Styling */}
            <div style={{
              padding: '20px',
              color: '#F5E6C8',
              fontSize: '1.1rem',
              lineHeight: '1.8',
              fontFamily: 'Lora, serif',
              paddingBottom: mode === 'listen' ? '220px' : '80px'
            }}>
              {verses.map(v => (
                <p key={v.verse} style={{
                  marginBottom: '1.2rem',
                  textAlign: 'justify'
                }}>
                  <sup style={{
                    color: '#D4A843',
                    fontSize: '0.75em',
                    fontWeight: 600,
                    marginRight: '4px',
                    verticalAlign: 'super'
                  }}>
                    {v.verse}
                  </sup>
                  {v.text.replace(/¶/g, '').replace(/\d+\.\d+[^:]*: [A-Za-z]+\.?/g, '').trim()}
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
                ← Previous
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
                Next →
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
              Select Book
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
                color: 'rgba(245,230,200,0.7)',
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
                {selectedBook?.name}
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
