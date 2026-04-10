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
  profile,
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
  const [fontSize, setFontSize] = useState(18)
  const [toastTrigger, setToastTrigger] = useState(0)
  const [shareVerse, setShareVerse] = useState(null)
  const [highlightMap, setHighlightMap] = useState({})
  const [activeVerse, setActiveVerse] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [scrollProgress, setScrollProgress] = useState(0)
  const [showGuidedStudy, setShowGuidedStudy] = useState(false)
  const [guidedStudyStep, setGuidedStudyStep] = useState(1)
  const [guidedStudyData, setGuidedStudyData] = useState({})
  const [guidedStudyLoading, setGuidedStudyLoading] = useState(false)
  const [focusMode, setFocusMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('abidinganchor_focus_mode') === 'true'
    }
    return false
  })

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
      
      // Save to localStorage
      localStorage.setItem('lastReadBook', bookName)
      localStorage.setItem('lastReadChapter', chapterNum)
      localStorage.setItem('lastReadBibleId', bibleId)
      
      // Save to Supabase
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase.from('profiles').upsert({
            id: user.id,
            last_book: bookName,
            last_chapter: chapterNum,
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' })
        }
      } catch (error) {
        console.error('Profile update error:', error)
      }
      
      const oldBooks = new Set(['Genesis','Exodus','Leviticus','Numbers','Deuteronomy','Joshua','Judges','Ruth','1 Samuel','2 Samuel','1 Kings','2 Kings','1 Chronicles','2 Chronicles','Ezra','Nehemiah','Esther','Job','Psalms','Proverbs','Ecclesiastes','Song of Solomon','Isaiah','Jeremiah','Lamentations','Ezekiel','Daniel','Hosea','Joel','Amos','Obadiah','Jonah','Micah','Nahum','Habakkuk','Zephaniah','Haggai','Zechariah','Malachi'])
      recordChapterRead({ book: bookName, chapter: chapterNum, testament: oldBooks.has(bookName) ? 'old' : 'new' })
      
      const chapterHighlights = getHighlightsForChapter(bookName, chapterNum)
      const byVerse = (chapterHighlights || []).reduce((acc, entry) => {
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

  const loadUnderstandContent = async () => {
    setGuidedStudyLoading(true)
    try {
      const bookName = selectedBook?.name
      const chapterNum = selectedChapter?.number
      
      const response = await fetch('/api/ai-companion', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: `In 2-3 sentences, what is the main message of ${bookName} chapter ${chapterNum}? Keep it simple and clear.`
            }
          ]
        })
      })
      const data = await response.json()
      const bigPicture = data?.reply || 'Could not load content.'

      const response2 = await fetch('/api/ai-companion', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: `What was happening historically and culturally when this was written? What do we need to know to understand this chapter better? ${bookName} ${chapterNum}`
            }
          ]
        })
      })
      const data2 = await response2.json()
      const historicalContext = data2?.reply || 'Could not load content.'

      const response3 = await fetch('/api/ai-companion', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: `What is the single most important verse in ${bookName} ${chapterNum} and why? Format as: Verse reference + text, then 1 sentence explanation.`
            }
          ]
        })
      })
      const data3 = await response3.json()
      const keyVerseData = data3?.reply || 'Could not load content.'
      
      setGuidedStudyData(prev => ({
        ...prev,
        bigPicture,
        historicalContext,
        keyVerse: keyVerseData
      }))
    } catch (error) {
      console.error('Error loading understand content:', error)
    } finally {
      setGuidedStudyLoading(false)
    }
  }

  const loadApplyContent = async () => {
    setGuidedStudyLoading(true)
    try {
      const bookName = selectedBook?.name
      const chapterNum = selectedChapter?.number
      
      const response = await fetch('/api/ai-companion', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: `Based on ${bookName} ${chapterNum}, give 2 specific, practical action steps a person can take THIS WEEK to apply what they just read. Make them concrete and life-relevant, not vague. Format as JSON: { actionSteps: [ { step: '...', description: '...' }, { step: '...', description: '...' } ] }`
            }
          ]
        })
      })
      const data = await response.json()
      let actionSteps = []
      
      try {
        const clean = data?.reply?.replace(/```json|```/g, '').trim()
        actionSteps = JSON.parse(clean)?.actionSteps || [
          { step: 'Step 1', description: 'Could not load action steps.' },
          { step: 'Step 2', description: 'Please try again.' }
        ]
      } catch {
        actionSteps = [
          { step: 'Step 1', description: 'Could not load action steps.' },
          { step: 'Step 2', description: 'Please try again.' }
        ]
      }
      
      setGuidedStudyData(prev => ({
        ...prev,
        actionSteps: actionSteps.map(s => ({ ...s, completed: false }))
      }))
    } catch (error) {
      console.error('Error loading apply content:', error)
    } finally {
      setGuidedStudyLoading(false)
    }
  }

  const toggleActionStep = (index) => {
    setGuidedStudyData(prev => ({
      ...prev,
      actionSteps: prev.actionSteps?.map((step, i) => 
        i === index ? { ...step, completed: !step.completed } : step
      )
    }))
  }

  const loadReflectContent = async () => {
    setGuidedStudyLoading(true)
    try {
      const bookName = selectedBook?.name
      const chapterNum = selectedChapter?.number
      
      const response = await fetch('/api/ai-companion', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: `Give one deep personal reflection question based on ${bookName} ${chapterNum}. Something that makes the reader think about their own life and relationship with God.`
            }
          ]
        })
      })
      const data = await response.json()
      const reflectionQuestion = data?.reply || 'Could not load content.'
      
      setGuidedStudyData(prev => ({
        ...prev,
        reflectionQuestion
      }))
    } catch (error) {
      console.error('Error loading reflect content:', error)
    } finally {
      setGuidedStudyLoading(false)
    }
  }

  const handleCompleteStudy = async () => {
    try {
      const bookName = selectedBook?.name
      const chapterNum = selectedChapter?.number
      const reflection = guidedStudyData.reflectionAnswer
      
      // Save to journal
      if (reflection) {
        await saveToJournal({
          verse: reflection,
          reference: `${bookName} ${chapterNum} - Guided Study Reflection`,
          tags: ['Guided Study', 'Reflection'],
        })
        setToastTrigger((t) => t + 1)
      }
      
      // Save to Supabase
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase.from('guided_study_progress').upsert({
            id: `${user.id}_${bookName}_${chapterNum}`,
            user_id: user.id,
            book_name: bookName,
            chapter_number: chapterNum,
            completed_at: new Date().toISOString(),
            action_steps_completed: guidedStudyData.actionSteps?.filter(s => s.completed).length || 0,
            reflection_saved: !!reflection
          }, { onConflict: 'id' })
        }
      } catch (error) {
        console.error('Error saving guided study progress:', error)
      }
      
      setGuidedStudyStep(5)
    } catch (error) {
      console.error('Error completing study:', error)
    }
  }

  const toggleFocusMode = () => {
    setFocusMode((prev) => {
      const newValue = !prev
      localStorage.setItem('abidinganchor_focus_mode', newValue.toString())
      return newValue
    })
  }

  const filteredBooks = (books || []).filter(book => 
    book.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const oldTestamentBooks = new Set(['Genesis','Exodus','Leviticus','Numbers','Deuteronomy','Joshua','Judges','Ruth','1 Samuel','2 Samuel','1 Kings','2 Kings','1 Chronicles','2 Chronicles','Ezra','Nehemiah','Esther','Job','Psalms','Proverbs','Ecclesiastes','Song of Solomon','Isaiah','Jeremiah','Lamentations','Ezekiel','Daniel','Hosea','Joel','Amos','Obadiah','Jonah','Micah','Nahum','Habakkuk','Zephaniah','Haggai','Zechariah','Malachi'])

  const getTestament = (bookName) => {
    return oldTestamentBooks.has(bookName) ? 'old' : 'new'
  }

  const testamentFilteredBooks = (filteredBooks || []).filter(book => {
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

  useEffect(() => {
    if (!open || !chapterContent) return
    const handleScroll = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0
      setScrollProgress(Math.min(100, Math.max(0, progress)))
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [open, chapterContent])

  if (!open) return null

  return (
    <>
      <div style={{ position: 'relative', minHeight: '100vh' }}>
        {/* Focus Mode Overlay */}
        {focusMode && (
          <>
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.3)',
              zIndex: 50,
              pointerEvents: 'none'
            }} />
            <button
              type="button"
              onClick={toggleFocusMode}
              style={{
                position: 'fixed',
                top: '20px',
                left: '20px',
                background: 'rgba(8,20,50,0.8)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '12px',
                color: 'rgba(255,255,255,0.7)',
                fontSize: '13px',
                fontWeight: 600,
                padding: '8px 16px',
                cursor: 'pointer',
                zIndex: 200
              }}
            >
              ← Exit Focus
            </button>
            <div style={{
              position: 'fixed',
              bottom: '100px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(8,20,50,0.8)',
              color: 'rgba(255,255,255,0.5)',
              fontSize: '12px',
              borderRadius: '20px',
              padding: '6px 16px',
              zIndex: 200
            }}>
              Focus Mode
            </div>
          </>
        )}

        {/* Reading Progress Bar */}
        <div style={{
          position: 'fixed',
          top: '0',
          left: '0',
          right: '0',
          height: '2px',
          background: 'rgba(255,255,255,0.1)',
          zIndex: 101,
          display: focusMode ? 'none' : 'block'
        }}>
          <div style={{
            height: '100%',
            background: '#D4A843',
            width: `${scrollProgress}%`,
            transition: 'width 0.1s ease'
          }} />
        </div>

        <div style={{
          position: 'fixed',
          top: '0',
          left: '0',
          right: '0',
          zIndex: 100,
          background: 'rgba(8,20,50,0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: '0 0 20px 20px',
          padding: '12px 20px',
          borderBottom: 'none',
          display: focusMode ? 'none' : 'block'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', maxWidth: '680px', margin: '0 auto' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#D4A843',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '4px 8px'
              }}
            >
              ← {selectedBook?.name || 'Genesis'}
            </button>

            <p style={{
              color: '#FFFFFF',
              fontSize: '16px',
              fontWeight: 700,
              margin: 0,
              flex: 1,
              textAlign: 'center'
            }}>
              Chapter {selectedChapter?.number || '1'}
            </p>

            <button
              type="button"
              onClick={() => setShowTranslation(true)}
              style={{
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

            <button
              type="button"
              onClick={toggleFocusMode}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.6)',
                fontSize: '18px',
                cursor: 'pointer',
                padding: '4px 8px'
              }}
              title="Focus Mode"
            >
              🎯
            </button>
          </div>
        </div>

        <div style={{ 
          paddingTop: '100px', 
          paddingBottom: '120px', 
          padding: '24px 20px', 
          maxWidth: '680px', 
          margin: '0 auto',
          background: 'transparent'
        }}>
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
              {/* Chapter Heading */}
              <h2 style={{
                color: '#D4A843',
                fontSize: '14px',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: '16px',
                textAlign: 'center'
              }}>
                {selectedBook?.name} {selectedChapter?.number}
              </h2>

              {/* Start Guided Study Button */}
              <button
                type="button"
                onClick={() => setShowGuidedStudy(true)}
                style={{
                  display: 'block',
                  margin: '0 auto 24px',
                  background: 'rgba(212,168,67,0.15)',
                  border: '1px solid rgba(212,168,67,0.4)',
                  borderRadius: '50px',
                  color: '#D4A843',
                  fontWeight: 700,
                  padding: '12px 24px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(212,168,67,0.25)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(212,168,67,0.15)'
                }}
              >
                ✦ Start Guided Study
              </button>
              
              {/* Clean Flowing Text */}
              <div style={{
                fontFamily: 'Georgia, serif',
                lineHeight: '2.0',
                fontSize: `${fontSize + (focusMode ? 2 : 0)}px`,
                color: '#FFFFFF',
                fontWeight: 400
              }}>
                {chapterContent.content && chapterContent.content.map((verse) => (
                  <span
                    key={verse.number}
                    onClick={() => !focusMode && setActiveVerse((prev) => (prev === verse.number ? null : verse.number))}
                    style={{
                      background: highlightMap[verse.number] ? 'rgba(212,168,67,0.15)' : 'transparent',
                      padding: highlightMap[verse.number] ? '4px 8px' : '0',
                      borderRadius: '4px',
                      cursor: focusMode ? 'default' : 'pointer',
                      transition: 'background 0.2s ease'
                    }}
                  >
                    <sup style={{
                      color: '#D4A843',
                      fontSize: '11px',
                      fontWeight: 700,
                      verticalAlign: 'super',
                      marginRight: '4px',
                      fontFamily: 'Arial, sans-serif'
                    }}>
                      {verse.number}
                    </sup>
                    {verse.text}{' '}
                  </span>
                ))}
              </div>

              {/* Floating Action Bar */}
              {activeVerse && !focusMode && (
                <div style={{
                  position: 'fixed',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  background: 'rgba(8,20,50,0.95)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  borderRadius: '12px',
                  padding: '12px 20px',
                  border: '1px solid rgba(212,168,67,0.3)',
                  display: 'flex',
                  gap: '20px',
                  zIndex: 300,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
                }}>
                  <button
                    type="button"
                    onClick={() => {
                      const verse = chapterContent.content.find(v => v.number === activeVerse)
                      if (verse) handleHighlight(verse)
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#D4A843',
                      fontSize: '13px',
                      cursor: 'pointer',
                      padding: 0,
                      fontWeight: 600
                    }}
                  >
                    ✦ Highlight
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const verse = chapterContent.content.find(v => v.number === activeVerse)
                      if (verse) handleCopyVerse(verse)
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#D4A843',
                      fontSize: '13px',
                      cursor: 'pointer',
                      padding: 0,
                      fontWeight: 600
                    }}
                  >
                    📋 Copy
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const verse = chapterContent.content.find(v => v.number === activeVerse)
                      if (verse) handleSaveVerse(verse)
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#D4A843',
                      fontSize: '13px',
                      cursor: 'pointer',
                      padding: 0,
                      fontWeight: 600
                    }}
                  >
                    📖 Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const verse = chapterContent.content.find(v => v.number === activeVerse)
                      if (verse) handleShareVerse(verse)
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#D4A843',
                      fontSize: '13px',
                      cursor: 'pointer',
                      padding: 0,
                      fontWeight: 600
                    }}
                  >
                    🔗 Share
                  </button>
                </div>
              )}

              {/* Copyright Footer */}
              <div style={{
                color: 'rgba(255,255,255,0.25)',
                fontSize: '11px',
                textAlign: 'center',
                padding: '16px',
                marginTop: '24px',
                fontFamily: 'Arial, sans-serif'
              }}>
                Scripture from {currentBible.abbr} via <a href="https://api.bible" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'underline' }}>API.Bible</a>
              </div>

              {/* Font Size Controls - Floating Button */}
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
                  onClick={() => setFontSize((f) => Math.max(14, f - 2))}
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
                  onClick={() => setFontSize((f) => Math.min(28, f + 2))}
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
                bottom: '80px',
                left: 0,
                right: 0,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 20px',
                zIndex: 150
              }}>
                <button
                  type="button"
                  onClick={() => {
                    const currentIndex = chapters.findIndex(c => c.id === selectedChapter?.id)
                    if (currentIndex > 0) {
                      setSelectedChapter(chapters[currentIndex - 1])
                    }
                  }}
                  disabled={!selectedChapter || chapters.findIndex(c => c.id === selectedChapter?.id) === 0}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: '14px',
                    cursor: 'pointer',
                    padding: 0,
                    opacity: selectedChapter && chapters.findIndex(c => c.id === selectedChapter?.id) === 0 ? 0.3 : 1
                  }}
                >
                  ← Previous Chapter
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const currentIndex = chapters.findIndex(c => c.id === selectedChapter?.id)
                    if (currentIndex < chapters.length - 1) {
                      setSelectedChapter(chapters[currentIndex + 1])
                    }
                  }}
                  disabled={!selectedChapter || chapters.findIndex(c => c.id === selectedChapter?.id) === chapters.length - 1}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: '14px',
                    cursor: 'pointer',
                    padding: 0,
                    opacity: selectedChapter && chapters.findIndex(c => c.id === selectedChapter?.id) === chapters.length - 1 ? 0.3 : 1
                  }}
                >
                  Next Chapter →
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
            {/* Bible Cover */}
            <div style={{
              height: '200px',
              borderRadius: '16px',
              border: '1px solid rgba(212,168,67,0.4)',
              background: 'linear-gradient(135deg, #0a1a3e 0%, #1a3a6e 100%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '24px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <img 
                src="/images/GoldCross.png" 
                alt="Cross" 
                style={{
                  width: '150px',
                  height: '150px',
                  objectFit: 'contain',
                  marginBottom: '12px',
                  opacity: 0.9,
                  mixBlendMode: 'screen',
                  filter: 'drop-shadow(0 0 30px rgba(212,168,67,0.9))'
                }}
              />
              <h1 style={{
                color: '#D4A843',
                fontSize: '28px',
                fontWeight: 700,
                fontFamily: 'Georgia, serif',
                margin: 0,
                marginBottom: '4px',
                textShadow: '0 2px 8px rgba(0,0,0,0.3)'
              }}>
                Holy Bible
              </h1>
              <p style={{
                color: 'rgba(255,255,255,0.6)',
                fontSize: '14px',
                margin: 0,
                fontWeight: 400
              }}>
                {currentBible.name}
              </p>
            </div>

            {/* Search Bar */}
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
                marginBottom: '20px',
                fontSize: '16px',
                outline: 'none'
              }}
            />

            {/* Continue Reading Card */}
            {profile?.last_book && (
              <button
                type="button"
                onClick={() => {
                  const lastBook = profile?.last_book || 'GEN'
                  const lastChapter = profile?.last_chapter || 'GEN.1'
                  const book = books.find(b => b.name === lastBook)
                  if (book) {
                    setSelectedBook(book)
                    setChapters([])
                    setSelectedChapter(lastChapter)
                    loadChapters(book.apiName)
                  }
                }}
                style={{
                  background: 'rgba(8,20,50,0.72)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '16px',
                  padding: '16px',
                  width: '100%',
                  textAlign: 'left',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: 'rgba(212,168,67,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px'
                  }}>
                    �
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{
                      color: '#FFFFFF',
                      fontSize: '14px',
                      fontWeight: 600,
                      margin: 0,
                      marginBottom: '4px'
                    }}>
                      Continue Reading
                    </p>
                    <p style={{
                      color: 'rgba(255,255,255,0.6)',
                      fontSize: '13px',
                      margin: 0
                    }}>
                      {profile?.last_book || 'GEN'} {profile?.last_chapter ? `• Chapter ${profile.last_chapter}` : ''} • {currentBible.abbr}
                    </p>
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '18px' }}>
                    →
                  </div>
                </div>
              </button>
            )}

            {/* Testament Tabs */}
            <div style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '20px',
              borderBottom: '1px solid rgba(255,255,255,0.1)'
            }}>
              <button
                type="button"
                onClick={() => setTestamentFilter('old')}
                style={{
                  flex: 1,
                  background: 'none',
                  border: 'none',
                  color: testamentFilter === 'old' ? '#D4A843' : 'rgba(255,255,255,0.45)',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '12px 8px',
                  borderBottom: testamentFilter === 'old' ? '2px solid #D4A843' : '2px solid transparent',
                  transition: 'all 0.2s ease'
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
                  color: testamentFilter === 'new' ? '#D4A843' : 'rgba(255,255,255,0.45)',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '12px 8px',
                  borderBottom: testamentFilter === 'new' ? '2px solid #D4A843' : '2px solid transparent',
                  transition: 'all 0.2s ease'
                }}
              >
                New Testament
              </button>
            </div>

            {/* Clean Book List */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {testamentFilteredBooks.map((book) => (
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
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
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
                  <span>{book.name}</span>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', fontWeight: 400 }}>
                    {book.chapters ? `${book.chapters} ${book.chapters === 1 ? 'chapter' : 'chapters'}` : ''}
                  </span>
                </button>
              ))}
            </div>

            {/* Close Button */}
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
                {chapters.map((chapter) => {
                  const isSelected = selectedChapter?.id === chapter.id
                  const dotStyle = isSelected
                    ? { background: '#D4A843', color: '#0a1a3e', fontWeight: 700 }
                    : { background: 'rgba(255,255,255,0.08)', color: '#FFFFFF', fontWeight: 400 }
                  return (
                    <button
                      key={chapter.id}
                      type="button"
                      onClick={() => handleChapterSelect(chapter)}
                      style={{
                        background: dotStyle.background,
                        color: dotStyle.color,
                        borderRadius: '50%',
                        width: '48px',
                        height: '48px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '15px',
                        fontWeight: dotStyle.fontWeight,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.12)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
                        }
                      }}
                    >
                      {chapter.number}
                    </button>
                  )
                })}
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

      <SaveToast trigger={toastTrigger} />
      {shareVerse ? <ShareVerse text={shareVerse.text} reference={shareVerse.reference} onClose={() => setShareVerse(null)} /> : null}

      {/* Guided Study Overlay */}
      {showGuidedStudy && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(5, 12, 35, 0.98)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Progress Bar */}
          <div style={{
            padding: '20px',
            borderBottom: '1px solid rgba(212,168,67,0.2)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              maxWidth: '680px',
              margin: '0 auto',
              marginBottom: '16px'
            }}>
              <button
                type="button"
                onClick={() => setShowGuidedStudy(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: '16px',
                  cursor: 'pointer',
                  padding: '4px 8px'
                }}
              >
                ← Exit
              </button>
              <p style={{
                color: '#D4A843',
                fontSize: '14px',
                fontWeight: 700,
                margin: 0,
                letterSpacing: '0.08em',
                textTransform: 'uppercase'
              }}>
                Guided Study
              </p>
              <div style={{ width: '60px' }} />
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              maxWidth: '680px',
              margin: '0 auto',
              gap: '8px'
            }}>
              {['READ', 'UNDERSTAND', 'APPLY', 'REFLECT'].map((step, index) => {
                const stepNum = index + 1
                const isActive = guidedStudyStep === stepNum
                const isCompleted = guidedStudyStep > stepNum
                return (
                  <div
                    key={step}
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      fontSize: '11px',
                      fontWeight: isActive ? 700 : 400,
                      color: isActive || isCompleted ? '#D4A843' : 'rgba(255,255,255,0.4)',
                      letterSpacing: '0.05em',
                      paddingBottom: '8px',
                      borderBottom: isActive || isCompleted ? '2px solid #D4A843' : '2px solid transparent'
                    }}
                  >
                    Step {stepNum}: {step}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Step Content */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
            maxWidth: '680px',
            margin: '0 auto',
            width: '100%'
          }}>
            {guidedStudyStep === 1 && (
              <div>
                <h3 style={{
                  color: '#FFFFFF',
                  fontSize: '24px',
                  fontWeight: 700,
                  marginBottom: '16px',
                  textAlign: 'center'
                }}>
                  {selectedBook?.name} {selectedChapter?.number}
                </h3>
                <div style={{
                  fontFamily: 'Georgia, serif',
                  lineHeight: '2.0',
                  fontSize: '18px',
                  color: '#FFFFFF',
                  marginBottom: '32px'
                }}>
                  {chapterContent?.content?.map((verse) => (
                    <span key={verse.number}>
                      <sup style={{
                        color: '#D4A843',
                        fontSize: '11px',
                        fontWeight: 700,
                        verticalAlign: 'super',
                        marginRight: '4px',
                        fontFamily: 'Arial, sans-serif'
                      }}>
                        {verse.number}
                      </sup>
                      {verse.text}{' '}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setGuidedStudyStep(2)
                    loadUnderstandContent()
                  }}
                  style={{
                    width: '100%',
                    background: '#D4A843',
                    color: '#0a1a3e',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '16px',
                    fontSize: '16px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  I've read this →
                </button>
              </div>
            )}

            {guidedStudyStep === 2 && (
              <div>
                {guidedStudyLoading ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <div style={{ fontSize: '24px', marginBottom: '16px' }}>✝</div>
                    <p style={{ color: 'rgba(255,255,255,0.6)' }}>Loading insights...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div style={{
                      background: 'rgba(8,20,50,0.72)',
                      border: '1px solid rgba(212,168,67,0.25)',
                      borderRadius: '16px',
                      padding: '20px'
                    }}>
                      <h4 style={{
                        color: '#D4A843',
                        fontSize: '14px',
                        fontWeight: 700,
                        marginBottom: '12px',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase'
                      }}>
                        The Big Picture
                      </h4>
                      <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '15px', lineHeight: '1.6' }}>
                        {guidedStudyData.bigPicture || 'Loading...'}
                      </p>
                    </div>

                    <div style={{
                      background: 'rgba(8,20,50,0.72)',
                      border: '1px solid rgba(212,168,67,0.25)',
                      borderRadius: '16px',
                      padding: '20px'
                    }}>
                      <h4 style={{
                        color: '#D4A843',
                        fontSize: '14px',
                        fontWeight: 700,
                        marginBottom: '12px',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase'
                      }}>
                        Historical Context
                      </h4>
                      <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '15px', lineHeight: '1.6' }}>
                        {guidedStudyData.historicalContext || 'Loading...'}
                      </p>
                    </div>

                    <div style={{
                      background: 'rgba(8,20,50,0.72)',
                      border: '1px solid rgba(212,168,67,0.25)',
                      borderRadius: '16px',
                      padding: '20px'
                    }}>
                      <h4 style={{
                        color: '#D4A843',
                        fontSize: '14px',
                        fontWeight: 700,
                        marginBottom: '12px',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase'
                      }}>
                        Key Verse
                      </h4>
                      <p style={{ 
                        color: '#D4A843', 
                        fontSize: '16px', 
                        fontWeight: 700,
                        marginBottom: '8px',
                        fontFamily: 'Georgia, serif'
                      }}>
                        {guidedStudyData.keyVerse || 'Loading...'}
                      </p>
                      <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', lineHeight: '1.6' }}>
                        {guidedStudyData.keyVerseExplanation || 'Loading...'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setGuidedStudyStep(3)
                        loadApplyContent()
                      }}
                      style={{
                        width: '100%',
                        background: '#D4A843',
                        color: '#0a1a3e',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '16px',
                        fontSize: '16px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        marginTop: '16px'
                      }}
                    >
                      Continue to Apply →
                    </button>
                  </div>
                )}
              </div>
            )}

            {guidedStudyStep === 3 && (
              <div>
                {guidedStudyLoading ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <div style={{ fontSize: '24px', marginBottom: '16px' }}>✝</div>
                    <p style={{ color: 'rgba(255,255,255,0.6)' }}>Loading action steps...</p>
                  </div>
                ) : (
                  <div>
                    <h3 style={{
                      color: '#D4A843',
                      fontSize: '14px',
                      fontWeight: 700,
                      marginBottom: '24px',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      textAlign: 'center'
                    }}>
                      Apply This To Your Life
                    </h3>

                    {guidedStudyData.actionSteps?.map((step, index) => (
                      <div
                        key={index}
                        style={{
                          background: 'rgba(8,20,50,0.72)',
                          border: '1px solid rgba(212,168,67,0.25)',
                          borderRadius: '16px',
                          padding: '16px',
                          marginBottom: '16px',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '12px'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={step.completed || false}
                          onChange={() => toggleActionStep(index)}
                          style={{
                            marginTop: '4px',
                            width: '20px',
                            height: '20px',
                            accentColor: '#D4A843'
                          }}
                        />
                        <div>
                          <p style={{
                            color: '#FFFFFF',
                            fontSize: '16px',
                            fontWeight: 700,
                            marginBottom: '4px'
                          }}>
                            {step.step}
                          </p>
                          <p style={{
                            color: 'rgba(255,255,255,0.7)',
                            fontSize: '14px',
                            lineHeight: '1.5'
                          }}>
                            {step.description}
                          </p>
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => {
                        setGuidedStudyStep(4)
                        loadReflectContent()
                      }}
                      style={{
                        width: '100%',
                        background: '#D4A843',
                        color: '#0a1a3e',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '16px',
                        fontSize: '16px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        marginTop: '16px'
                      }}
                    >
                      Continue to Reflect →
                    </button>
                  </div>
                )}
              </div>
            )}

            {guidedStudyStep === 4 && (
              <div>
                {guidedStudyLoading ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <div style={{ fontSize: '24px', marginBottom: '16px' }}>✝</div>
                    <p style={{ color: 'rgba(255,255,255,0.6)' }}>Loading reflection question...</p>
                  </div>
                ) : (
                  <div>
                    <h3 style={{
                      color: '#D4A843',
                      fontSize: '14px',
                      fontWeight: 700,
                      marginBottom: '24px',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      textAlign: 'center'
                    }}>
                      Reflect
                    </h3>

                    <div style={{
                      background: 'rgba(212,168,67,0.1)',
                      border: '1px solid rgba(212,168,67,0.3)',
                      borderRadius: '16px',
                      padding: '20px',
                      marginBottom: '24px'
                    }}>
                      <p style={{
                        color: '#FFFFFF',
                        fontSize: '17px',
                        fontFamily: 'Georgia, serif',
                        lineHeight: '1.8',
                        fontStyle: 'italic',
                        margin: 0
                      }}>
                        {guidedStudyData.reflectionQuestion || 'Loading...'}
                      </p>
                    </div>

                    <textarea
                      placeholder="Write your thoughts here..."
                      value={guidedStudyData.reflectionAnswer || ''}
                      onChange={(e) => setGuidedStudyData(prev => ({ ...prev, reflectionAnswer: e.target.value }))}
                      style={{
                        width: '100%',
                        minHeight: '150px',
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(212,168,67,0.3)',
                        borderRadius: '12px',
                        color: '#FFFFFF',
                        padding: '12px',
                        fontSize: '15px',
                        fontFamily: 'Georgia, serif',
                        lineHeight: '1.6',
                        resize: 'vertical',
                        marginBottom: '16px'
                      }}
                    />

                    <button
                      type="button"
                      onClick={handleCompleteStudy}
                      style={{
                        width: '100%',
                        background: '#D4A843',
                        color: '#0a1a3e',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '16px',
                        fontSize: '16px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Save to Journal & Complete
                    </button>
                  </div>
                )}
              </div>
            )}

            {guidedStudyStep === 5 && (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: '64px', marginBottom: '24px' }}>🎉</div>
                <h3 style={{
                  color: '#D4A843',
                  fontSize: '28px',
                  fontWeight: 700,
                  marginBottom: '12px'
                }}>
                  Study Complete!
                </h3>
                <p style={{
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: '18px',
                  marginBottom: '32px'
                }}>
                  You studied {selectedBook?.name} {selectedChapter?.number}
                </p>
                
                <div style={{
                  background: 'rgba(212,168,67,0.15)',
                  border: '1px solid rgba(212,168,67,0.3)',
                  borderRadius: '16px',
                  padding: '24px',
                  marginBottom: '32px'
                }}>
                  <p style={{
                    color: '#D4A843',
                    fontSize: '32px',
                    fontWeight: 700,
                    margin: '0 0 8px 0'
                  }}>
                    +50 XP
                  </p>
                  <p style={{
                    color: 'rgba(255,255,255,0.6)',
                    fontSize: '14px',
                    margin: 0
                  }}>
                    Reading streak updated
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowGuidedStudy(false)
                      setGuidedStudyStep(1)
                      setGuidedStudyData({})
                    }}
                    style={{
                      width: '100%',
                      background: '#D4A843',
                      color: '#0a1a3e',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '16px',
                      fontSize: '16px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Study Next Chapter
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowGuidedStudy(false)
                      setGuidedStudyStep(1)
                      setGuidedStudyData({})
                    }}
                    style={{
                      width: '100%',
                      background: 'rgba(255,255,255,0.1)',
                      color: '#FFFFFF',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '12px',
                      padding: '16px',
                      fontSize: '16px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Share This Achievement
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
