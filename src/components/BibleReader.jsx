import { useCallback, useEffect, useState } from 'react'
import { saveToJournal } from '../utils/journal'
import { recordReadingToday } from '../utils/streak'
import { getHighlightsForChapter, saveHighlight } from '../utils/highlights'
import { recordChapterRead } from '../utils/readingHistory'
import SaveToast from './SaveToast'
import ShareVerse from './ShareVerse'
import { supabase } from '../lib/supabase'
import { getBooks, getChapters, getChapter, getSavedBibleId, POPULAR_BIBLES } from '../services/bibleApi'
import BibleTranslationSelector from './BibleTranslationSelector'

export default function BibleReader({
  open,
  onClose,
  journalTags = ['Reading Plan'],
}) {
  const [bibleId, setBibleId] = useState(getSavedBibleId())
  const [books, setBooks] = useState([])
  const [selectedBook, setSelectedBook] = useState(null)
  const [chapters, setChapters] = useState([])
  const [selectedChapter, setSelectedChapter] = useState(null)
  const [chapterContent, setChapterContent] = useState(null)
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState(false)
  const [showTranslation, setShowTranslation] = useState(false)
  const [showBookPicker, setShowBookPicker] = useState(false)
  const [showChapterPicker, setShowChapterPicker] = useState(false)
  const [testamentFilter, setTestamentFilter] = useState('all')
  const [fontSize, setFontSize] = useState(17)
  const [toastTrigger, setToastTrigger] = useState(0)
  const [shareVerse, setShareVerse] = useState(null)
  const [highlightMap, setHighlightMap] = useState({})
  const [activeVerse, setActiveVerse] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  const currentBible = POPULAR_BIBLES.find(b => b.id === bibleId) || POPULAR_BIBLES[0]

  const loadBooks = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getBooks(bibleId)
      setBooks(data)
      if (!selectedBook && data.length > 0) {
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
      if (!selectedChapter && data.length > 0) {
        setSelectedChapter(data[0])
      }
    } catch {
      setFetchError(true)
    }
  }, [bibleId, selectedBook, selectedChapter])

  const loadChapterContent = useCallback(async () => {
    if (!selectedChapter) return
    try {
      setLoading(true)
      setFetchError(false)
      const data = await getChapter(bibleId, selectedChapter.id)
      setChapterContent(data)
      
      await recordReadingToday()
      const bookName = selectedBook.name
      const chapterNum = selectedChapter.number
      await supabase.from('profiles').update({
        last_book: bookName,
        last_chapter: chapterNum,
      }).eq('id', (await supabase.auth.getUser()).data.user?.id)
      
      const oldBooks = new Set(['Genesis','Exodus','Leviticus','Numbers','Deuteronomy','Joshua','Judges','Ruth','1 Samuel','2 Samuel','1 Kings','2 Kings','1 Chronicles','2 Chronicles','Ezra','Nehemiah','Esther','Job','Psalms','Proverbs','Ecclesiastes','Song of Solomon','Isaiah','Jeremiah','Lamentations','Ezekiel','Daniel','Hosea','Joel','Amos','Obadiah','Jonah','Micah','Nahum','Habakkuk','Zephaniah','Haggai','Zechariah','Malachi'])
      recordChapterRead({ book: bookName, chapter: chapterNum, testament: oldBooks.has(bookName) ? 'old' : 'new' })
      
      const chapterHighlights = getHighlightsForChapter(bookName, chapterNum)
      const byVerse = chapterHighlights.reduce((acc, entry) => {
        acc[entry.verse] = entry.color
        return acc
      }, {})
      setHighlightMap(byVerse)
    } catch {
      setFetchError(true)
    } finally {
      setLoading(false)
    }
  }, [bibleId, selectedBook, selectedChapter])

  const handleSaveVerse = async (verse) => {
    await saveToJournal({
      verse: verse.text,
      reference: `${selectedBook.name} ${selectedChapter.number}:${verse.number}`,
      tags: journalTags,
    })
    setToastTrigger((t) => t + 1)
    setActiveVerse(null)
  }

  const handleHighlight = (verse) => {
    if (highlightMap[verse.number]) {
      saveHighlight({
        book: selectedBook.name,
        chapter: selectedChapter.number,
        verse: verse.number,
        color: null,
        text: verse.text,
        reference: `${selectedBook.name} ${selectedChapter.number}:${verse.number}`,
      })
      setHighlightMap((prev) => ({ ...prev, [verse.number]: null }))
    } else {
      saveHighlight({
        book: selectedBook.name,
        chapter: selectedChapter.number,
        verse: verse.number,
        color: '#D4A843',
        text: verse.text,
        reference: `${selectedBook.name} ${selectedChapter.number}:${verse.number}`,
      })
      setHighlightMap((prev) => ({ ...prev, [verse.number]: '#D4A843' }))
    }
    setActiveVerse(null)
  }

  const handleCopyVerse = (verse) => {
    navigator.clipboard.writeText(`${verse.text} — ${selectedBook.name} ${selectedChapter.number}:${verse.number}`)
    setActiveVerse(null)
  }

  const handleShareVerse = (verse) => {
    setShareVerse({ text: verse.text, reference: `${selectedBook.name} ${selectedChapter.number}:${verse.number}` })
    setActiveVerse(null)
  }

  const handleBookSelect = (book) => {
    setSelectedBook(book)
    setChapters([])
    setSelectedChapter(null)
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
    setChapterContent(null)
  }

  const filteredBooks = books.filter(book => 
    book.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const oldTestamentBooks = new Set(['Genesis','Exodus','Leviticus','Numbers','Deuteronomy','Joshua','Judges','Ruth','1 Samuel','2 Samuel','1 Kings','2 Kings','1 Chronicles','2 Chronicles','Ezra','Nehemiah','Esther','Job','Psalms','Proverbs','Ecclesiastes','Song of Solomon','Isaiah','Jeremiah','Lamentations','Ezekiel','Daniel','Hosea','Joel','Amos','Obadiah','Jonah','Micah','Nahum','Habakkuk','Zephaniah','Haggai','Zechariah','Malachi'])

  const getTestament = (bookName) => {
    return oldTestamentBooks.has(bookName) ? 'old' : 'new'
  }

  const testamentFilteredBooks = filteredBooks.filter(book => {
    if (testamentFilter === 'all') return true
    return getTestament(book.name) === testamentFilter
  })

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
    loadChapterContent()
  }, [open, selectedChapter, loadChapterContent])

  useEffect(() => {
    if (!open || loading || fetchError) return
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [open, loading, fetchError, selectedChapter])

  if (!open) return null

  return (
    <>
      <div style={{ position: 'relative', minHeight: '100vh' }}>
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: 'rgba(8,20,50,0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          padding: '12px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.7)',
                fontSize: '14px',
                cursor: 'pointer',
                padding: 0
              }}
            >
              ←
            </button>

            <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
              <button
                type="button"
                onClick={() => setShowBookPicker(true)}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(212,168,67,0.3)',
                  borderRadius: '50px',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 600,
                  padding: '8px 14px',
                  flex: 1,
                  textAlign: 'center',
                  cursor: 'pointer'
                }}
              >
                {selectedBook?.name || 'Genesis'}
              </button>

              <button
                type="button"
                onClick={() => setShowChapterPicker(true)}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(212,168,67,0.3)',
                  borderRadius: '50px',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 600,
                  padding: '8px 14px',
                  flex: 1,
                  textAlign: 'center',
                  cursor: 'pointer'
                }}
              >
                {selectedChapter?.number || '1'}
              </button>

              <button
                type="button"
                onClick={() => setShowTranslation(true)}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(212,168,67,0.3)',
                  borderRadius: '50px',
                  color: '#D4A843',
                  fontSize: '13px',
                  fontWeight: 600,
                  padding: '8px 14px',
                  flex: 1,
                  textAlign: 'center',
                  cursor: 'pointer'
                }}
              >
                {currentBible.abbr}
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setFontSize((f) => Math.max(14, f - 2))}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '8px',
                  color: 'white',
                  padding: '6px 10px',
                  cursor: 'pointer'
                }}
              >
                A-
              </button>
              <button
                type="button"
                onClick={() => setFontSize((f) => Math.min(24, f + 2))}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '8px',
                  color: 'white',
                  padding: '6px 10px',
                  cursor: 'pointer'
                }}
              >
                A+
              </button>
            </div>
          </div>
        </div>

        <div style={{ paddingTop: '80px', paddingBottom: '120px', padding: '16px', maxWidth: '680px', margin: '0 auto' }}>
          {loading && !chapterContent ? (
            <div style={{ padding: '20px 0' }}>
              {[1, 2, 3].map((i) => (
                <div key={i} style={{
                  background: 'rgba(255,255,255,0.06)',
                  borderRadius: '8px',
                  height: '18px',
                  marginBottom: '12px',
                  animation: `pulse 1.5s ease-in-out ${i * 0.2}s infinite`
                }} />
              ))}
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
                onClick={loadChapterContent}
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
          ) : chapterContent ? (
            <div>
              <h2 style={{
                color: '#D4A843',
                fontSize: '13px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: '16px'
              }}>
                {selectedBook?.name} {selectedChapter?.number}
              </h2>
              
              {chapterContent.content && chapterContent.content.map((verse) => (
                <div key={verse.number}>
                  <div
                    onClick={() => setActiveVerse((prev) => (prev === verse.number ? null : verse.number))}
                    style={{
                      display: 'flex',
                      gap: '8px',
                      alignItems: 'flex-start',
                      marginBottom: '12px',
                      padding: highlightMap[verse.number] ? '6px 10px' : '16px',
                      background: highlightMap[verse.number] ? 'rgba(212,168,67,0.12)' : 'rgba(8,20,50,0.72)',
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)',
                      border: '1px solid rgba(212,168,67,0.2)',
                      borderRadius: '16px',
                      borderLeft: highlightMap[verse.number] ? '3px solid #D4A843' : '1px solid rgba(212,168,67,0.2)',
                      cursor: 'pointer'
                    }}
                  >
                    <span style={{
                      color: '#D4A843',
                      fontSize: '12px',
                      fontWeight: 700,
                      minWidth: '28px',
                      marginTop: '4px'
                    }}>
                      {verse.number}
                    </span>
                    <p style={{
                      color: '#FFFFFF',
                      fontSize: `${fontSize}px`,
                      lineHeight: 1.8,
                      fontWeight: 400,
                      margin: 0,
                      flex: 1
                    }}>
                      {verse.text}
                    </p>
                  </div>

                  {activeVerse === verse.number && (
                    <div style={{
                      background: 'rgba(8,20,50,0.85)',
                      borderRadius: '12px',
                      padding: '8px 12px',
                      marginBottom: '12px',
                      display: 'flex',
                      gap: '16px',
                      flexWrap: 'wrap'
                    }}>
                      <button
                        type="button"
                        onClick={() => handleHighlight(verse)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'rgba(212,168,67,0.7)',
                          fontSize: '13px',
                          cursor: 'pointer',
                          padding: 0
                        }}
                      >
                        {highlightMap[verse.number] ? 'Remove ★' : 'Highlight ★'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopyVerse(verse)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'rgba(212,168,67,0.7)',
                          fontSize: '13px',
                          cursor: 'pointer',
                          padding: 0
                        }}
                      >
                        Copy 📋
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveVerse(verse)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'rgba(212,168,67,0.7)',
                          fontSize: '13px',
                          cursor: 'pointer',
                          padding: 0
                        }}
                      >
                        Save to Journal ✏️
                      </button>
                      <button
                        type="button"
                        onClick={() => handleShareVerse(verse)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'rgba(212,168,67,0.7)',
                          fontSize: '13px',
                          cursor: 'pointer',
                          padding: 0
                        }}
                      >
                        Share 🔗
                      </button>
                    </div>
                  )}
                </div>
              ))}

              <div style={{
                color: 'rgba(255,255,255,0.3)',
                fontSize: '11px',
                textAlign: 'center',
                padding: '16px',
                marginTop: '24px'
              }}>
                Scripture from {currentBible.abbr} via <a href="https://api.bible" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'underline' }}>API.Bible</a>
              </div>
            </div>
          ) : null}
        </div>

        <div style={{
          position: 'fixed',
          bottom: '80px',
          left: 0,
          right: 0,
          background: 'rgba(8,20,50,0.92)',
          borderTop: '1px solid rgba(212,168,67,0.2)',
          padding: '12px',
          zIndex: 100
        }}>
          <button
            type="button"
            style={{
              background: 'none',
              border: '1px solid #D4A843',
              borderRadius: '50px',
              color: '#D4A843',
              fontWeight: 600,
              padding: '10px 24px',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'block',
              margin: '0 auto'
            }}
          >
            ▶ Listen to Chapter
          </button>
        </div>
      </div>

      <BibleTranslationSelector
        isOpen={showTranslation}
        onClose={() => setShowTranslation(false)}
        currentBibleId={bibleId}
        onSelect={handleTranslationSelect}
      />

      {showBookPicker && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 200,
          background: 'rgba(8,20,50,0.97)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)'
        }}>
          <div style={{ padding: '20px', height: '100%', overflowY: 'auto' }}>
            <button
              type="button"
              onClick={() => setShowBookPicker(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.7)',
                fontSize: '14px',
                cursor: 'pointer',
                marginBottom: '20px'
              }}
            >
              ← Close
            </button>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search books..."
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(212,168,67,0.3)',
                borderRadius: '12px',
                color: 'white',
                padding: '12px 16px',
                width: '100%',
                marginBottom: '16px',
                fontSize: '16px',
                outline: 'none'
              }}
            />
            
            <p style={{
              color: '#D4A843',
              fontSize: '12px',
              textAlign: 'center',
              marginBottom: '8px'
            }}>
              Reading in {currentBible.abbr}
            </p>

            <div style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '16px'
            }}>
              <button
                type="button"
                onClick={() => setTestamentFilter('all')}
                style={{
                  flex: 1,
                  background: 'none',
                  border: 'none',
                  color: testamentFilter === 'all' ? '#D4A843' : 'rgba(255,255,255,0.5)',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '8px',
                  borderBottom: testamentFilter === 'all' ? '2px solid #D4A843' : 'none'
                }}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setTestamentFilter('old')}
                style={{
                  flex: 1,
                  background: 'none',
                  border: 'none',
                  color: testamentFilter === 'old' ? '#D4A843' : 'rgba(255,255,255,0.5)',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '8px',
                  borderBottom: testamentFilter === 'old' ? '2px solid #D4A843' : 'none'
                }}
              >
                Old Testament
              </button>
              <button
                type="button"
                onClick={() => setTestamentFilter('new')}
                style={{
                  flex: 1,
                  background: 'none',
                  border: 'none',
                  color: testamentFilter === 'new' ? '#D4A843' : 'rgba(255,255,255,0.5)',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '8px',
                  borderBottom: testamentFilter === 'new' ? '2px solid #D4A843' : 'none'
                }}
              >
                New Testament
              </button>
            </div>

            <div style={{ display: 'grid', gap: '8px' }}>
              {testamentFilteredBooks.map((book) => (
                <button
                  key={book.id}
                  type="button"
                  onClick={() => handleBookSelect(book)}
                  style={{
                    background: 'none',
                    border: '1px solid rgba(212,168,67,0.25)',
                    borderRadius: '12px',
                    color: selectedBook?.id === book.id ? '#D4A843' : '#FFFFFF',
                    fontSize: '16px',
                    fontWeight: selectedBook?.id === book.id ? 700 : 400,
                    cursor: 'pointer',
                    padding: '12px 16px',
                    textAlign: 'left',
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <span>{book.name}</span>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
                    {book.chapters ? `${book.chapters} ${book.chapters === 1 ? 'chapter' : 'chapters'}` : ''}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showChapterPicker && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 200,
          background: 'rgba(8,20,50,0.97)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)'
        }}>
          <div style={{ padding: '20px', height: '100%', overflowY: 'auto' }}>
            <button
              type="button"
              onClick={() => setShowChapterPicker(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.7)',
                fontSize: '14px',
                cursor: 'pointer',
                marginBottom: '20px'
              }}
            >
              ← Close
            </button>
            <h2 style={{ color: '#D4A843', fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>
              {selectedBook?.name}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px' }}>
              {chapters.map((chapter) => (
                <button
                  key={chapter.id}
                  type="button"
                  onClick={() => handleChapterSelect(chapter)}
                  style={{
                    background: selectedChapter?.id === chapter.id ? '#D4A843' : 'rgba(255,255,255,0.08)',
                    color: selectedChapter?.id === chapter.id ? '#0a1a3e' : '#FFFFFF',
                    borderRadius: '50%',
                    width: '44px',
                    height: '44px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '15px',
                    fontWeight: selectedChapter?.id === chapter.id ? 700 : 400,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {chapter.number}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <SaveToast trigger={toastTrigger} />
      {shareVerse ? <ShareVerse text={shareVerse.text} reference={shareVerse.reference} onClose={() => setShareVerse(null)} /> : null}
    </>
  )
}
