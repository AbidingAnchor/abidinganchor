import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { deleteJournalEntry, getJournalEntries, saveToJournal, markPrayerAnswered } from '../utils/journal'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const MOOD_TAGS = ['🙏 Prayer', '💭 Reflection', '🙌 Gratitude', '🔥 Breakthrough']

const ACCENT_GOLD = '#c9922a'

/** At least 10 scripture-based journaling prompts; rotates by day of month */
const PROMPTS = [
  { prompt: 'What blessing can you thank God for today?', verse: 'Psalm 107:1' },
  { prompt: 'Where do you need God\'s peace right now?', verse: 'Philippians 4:6-7' },
  { prompt: 'What burden can you cast on the Lord today?', verse: '1 Peter 5:7' },
  { prompt: 'Where have you seen God\'s faithfulness lately?', verse: 'Lamentations 3:22-23' },
  { prompt: 'How can you walk by the Spirit today?', verse: 'Galatians 5:16' },
  { prompt: 'Who can you show the love of Jesus to today?', verse: 'John 13:34-35' },
  { prompt: 'What are you asking God for in prayer?', verse: 'Psalm 86:7' },
  { prompt: 'How can you trust God with what you cannot see?', verse: 'Hebrews 11:1' },
  { prompt: 'What Scripture is anchoring you this week?', verse: 'Psalm 119:105' },
  { prompt: 'Where is God inviting you to rest?', verse: 'Matthew 11:28' },
  { prompt: 'What does it mean to love the Lord with all your heart today?', verse: 'Deuteronomy 6:5' },
]

function getDailyPrompt() {
  const idx = new Date().getDate() % PROMPTS.length
  return PROMPTS[idx]
}

function getPromptForEntryDate(iso) {
  if (!iso) return PROMPTS[0]
  const idx = new Date(iso).getDate() % PROMPTS.length
  return PROMPTS[idx]
}

function getDaysAgo(dateString) {
  const entryDate = new Date(dateString)
  const today = new Date()
  const diffTime = Math.abs(today - entryDate)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

/** Local calendar YYYY-MM-DD — uses getFullYear/Month/Date only (never toISOString slice). */
function toLocalYmd(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Prefer DB `local_date` (set at save); else derive from created_at (can drift near midnight UTC). */
function entryLocalYmd(entry) {
  if (!entry) return ''
  return entry.local_date || toLocalYmd(entry.created_at)
}

function localTodayYmd() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function addDaysToYmd(ymd, deltaDays) {
  const [y, m, d] = ymd.split('-').map(Number)
  const next = new Date(y, m - 1, d + deltaDays)
  return toLocalYmd(next)
}

/** Consecutive days with ≥1 entry, walking back from today (yesterday counts if today is empty). */
function computeWritingStreak(rows) {
  const dates = new Set((rows || []).map((e) => entryLocalYmd(e)).filter(Boolean))
  if (dates.size === 0) return 0
  let cursor = localTodayYmd()
  if (!dates.has(cursor)) {
    cursor = addDaysToYmd(localTodayYmd(), -1)
    if (!dates.has(cursor)) return 0
  }
  let streak = 0
  while (dates.has(cursor)) {
    streak += 1
    cursor = addDaysToYmd(cursor, -1)
  }
  return streak
}

const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** Monday 00:00 local of this week; uses noon anchor to avoid DST edge cases. */
function getMondayOfWeek(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0)
  const day = x.getDay()
  const diff = day === 0 ? -6 : 1 - day
  x.setDate(x.getDate() + diff)
  x.setHours(0, 0, 0, 0)
  return x
}

function getWeekHeatmapDays(rows) {
  const dateSet = new Set((rows || []).map((e) => entryLocalYmd(e)).filter(Boolean))
  const monday = getMondayOfWeek(new Date())
  const now = new Date()
  const todayYmd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  return Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i, 12, 0, 0, 0)
    const ymd = toLocalYmd(dt)
    const isToday = ymd === todayYmd
    const weekdayIndex = (dt.getDay() + 6) % 7
    return {
      ymd,
      filled: dateSet.has(ymd),
      isToday,
      label: isToday ? 'Today' : WEEKDAY_SHORT[weekdayIndex],
    }
  })
}

function isInCurrentCalendarWeek(ymd) {
  if (!ymd || typeof ymd !== 'string') return false
  const monday = getMondayOfWeek(new Date())
  for (let i = 0; i < 7; i++) {
    const dt = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i, 12, 0, 0, 0)
    if (toLocalYmd(dt) === ymd) return true
  }
  return false
}

function isInThisMonth(ymd) {
  if (!ymd || typeof ymd !== 'string') return false
  const parts = ymd.split('-').map(Number)
  if (parts.length !== 3 || parts.some(Number.isNaN)) return false
  const [y, m] = parts
  const n = new Date()
  return y === n.getFullYear() && m - 1 === n.getMonth()
}

function getEntryTitle(entry) {
  const line = (entry.note || '').split('\n')[0]?.trim()
  return line || 'Untitled'
}

function getEntryBodyPreview(entry) {
  const full = (entry.note || '').trim()
  if (!full) {
    const p = getPromptForEntryDate(entry.created_at)
    return `${p.prompt} — ${p.verse}`
  }
  if (full.length > 80) return `${full.slice(0, 80).trim()}...`
  return full
}

function normalizeEntry(entry) {
  const savedDate = entry.created_at ? new Date(entry.created_at).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }) : new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  return {
    id: String(entry.id),
    reference: entry.verse_reference || '',
    note: entry.content || '',
    date: savedDate,
    created_at: entry.created_at || null,
    local_date: entry.local_date || toLocalYmd(entry.created_at),
    mood: entry.mood || '',
    entry_type: entry.entry_type || 'reflection',
    answered: entry.answered || false,
  }
}

function Journal() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedMood, setSelectedMood] = useState('')
  const [writingStreak, setWritingStreak] = useState(0)
  const [totalEntries, setTotalEntries] = useState(0)
  const [prayerCount, setPrayerCount] = useState(0)
  const [randomPastEntry, setRandomPastEntry] = useState(null)
  const [showCelebration, setShowCelebration] = useState(false)
  const [showCloseButton, setShowCloseButton] = useState(false)
  
  // Prayer share prompt state
  const [showPrayerSharePrompt, setShowPrayerSharePrompt] = useState(false)
  const [pendingPrayerText, setPendingPrayerText] = useState('')
  const [sharingToPrayerWall, setSharingToPrayerWall] = useState(false)
  const [showToast, setShowToast] = useState(false)

  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [entryFilter, setEntryFilter] = useState('all')
  const [entriesExpanded, setEntriesExpanded] = useState(false)

  useEffect(() => {
    setEntriesExpanded(false)
  }, [entryFilter, searchQuery])

  // Guided entry flow state
  const [currentStep, setCurrentStep] = useState(1)
  const [verseReference, setVerseReference] = useState('')
  const [verseText, setVerseText] = useState('')
  const [reflection, setReflection] = useState('')
  const [prayer, setPrayer] = useState('')
  const [gratitude, setGratitude] = useState('')

  useEffect(() => {
    let timer
    if (showCelebration) {
      timer = setTimeout(() => {
        setShowCloseButton(true)
      }, 1500)
    }
    return () => {
      if (timer) clearTimeout(timer)
      if (!showCelebration) setShowCloseButton(false)
    }
  }, [showCelebration])

  useEffect(() => {
    let active = true
    const load = async () => {
      if (!user?.id) return
      setLoading(true)
      const data = await getJournalEntries(user.id)
      if (!active) return
      setEntries((data || []).map(normalizeEntry))
      setWritingStreak(computeWritingStreak(data))
      setTotalEntries((data || []).length)
      setPrayerCount((data || []).filter(e => e.entry_type === 'prayer' && e.answered === true).length)

      // Get entries older than 7 days
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const oldEntries = (data || []).filter(e => new Date(e.created_at) < sevenDaysAgo)
      if (oldEntries.length > 0) {
        const randomEntry = oldEntries[Math.floor(Math.random() * oldEntries.length)]
        if (active) setRandomPastEntry(normalizeEntry(randomEntry))
      }

      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [user?.id])

  const handleDeleteEntry = async (entry) => {
    await deleteJournalEntry(entry.id)
    const nextEntries = await getJournalEntries(user?.id)
    setEntries((nextEntries || []).map(normalizeEntry))
    setWritingStreak(computeWritingStreak(nextEntries))
    setTotalEntries((nextEntries || []).length)
    setPrayerCount((nextEntries || []).filter(e => e.entry_type === 'prayer' && e.answered === true).length)
  }

  const handleMarkAnswered = async (entry) => {
    const updated = await markPrayerAnswered(entry.id)
    if (updated) {
      setEntries(prev => prev.map(e =>
        e.id === entry.id ? { ...e, answered: true } : e
      ))
      const full = await getJournalEntries(user?.id)
      setPrayerCount((full || []).filter(e => e.entry_type === 'prayer' && e.answered === true).length)
      setShowCelebration(true)
    }
  }

  const handleOpenModal = () => {
    setCurrentStep(1)
    setVerseReference('')
    setVerseText('')
    setReflection('')
    setPrayer('')
    setGratitude('')
    setSelectedMood('')
    setShowModal(true)
  }

  const handleNextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSaveGuidedEntry = async () => {
    if (!reflection.trim()) return
    
    setSaving(true)
    
    const newEntry = await saveToJournal({
      verse: verseText.trim() || null,
      reference: verseReference.trim() || null,
      note: reflection.trim(),
      prayer: prayer.trim() || null,
      gratitude: gratitude.trim() || null,
      tags: ['Reflection'],
      userId: user?.id,
      mood: selectedMood || null,
      entry_type: 'guided',
    })
    
    setSaving(false)
    
    if (!newEntry) return
    setEntries((prev) => [normalizeEntry(newEntry), ...prev])
    const full = await getJournalEntries(user?.id)
    setWritingStreak(computeWritingStreak(full))
    setTotalEntries((full || []).length)
    setPrayerCount((full || []).filter(e => e.entry_type === 'prayer' && e.answered === true).length)
    
    // Check if this is a prayer entry and show share prompt
    const prayerText = prayer.trim() || reflection.trim()
    if (prayerText) {
      setPendingPrayerText(prayerText)
      setShowPrayerSharePrompt(true)
    }
    
    // Reset form
    setCurrentStep(1)
    setVerseReference('')
    setVerseText('')
    setReflection('')
    setPrayer('')
    setGratitude('')
    setSelectedMood('')
    setShowModal(false)
  }

  const handleShareToPrayerWall = async () => {
    if (!pendingPrayerText.trim() || !user?.id) return
    
    try {
      setSharingToPrayerWall(true)
      const { error } = await supabase
        .from('prayer_wall')
        .insert({
          content: pendingPrayerText.trim(),
          user_id: user.id,
          is_anonymous: true,
          praying_count: 0,
        })
      
      if (error) throw error
      
      // Show confirmation toast
      setShowPrayerSharePrompt(false)
      setPendingPrayerText('')
      
      // Show toast notification
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
    } catch (error) {
      console.error('Error sharing to prayer wall:', error)
    } finally {
      setSharingToPrayerWall(false)
    }
  }

  const handleKeepPrivate = () => {
    setShowPrayerSharePrompt(false)
    setPendingPrayerText('')
  }

  const handleShareEntry = (entry) => {
    navigate('/share-card', {
      state: {
        verseReference: entry.reference || '',
        verseText: entry.verse || '',
        userReflection: entry.note || ''
      }
    })
  }

  const filteredEntries = useMemo(() => {
    let list = [...entries]
    if (entryFilter === 'week') {
      list = list.filter((e) => isInCurrentCalendarWeek(entryLocalYmd(e)))
    } else if (entryFilter === 'month') {
      list = list.filter((e) => isInThisMonth(entryLocalYmd(e)))
    }
    const q = searchQuery.trim().toLowerCase()
    if (q) {
      list = list.filter((e) => {
        const title = getEntryTitle(e).toLowerCase()
        const body = (e.note || '').toLowerCase()
        const ref = (e.reference || '').toLowerCase()
        return title.includes(q) || body.includes(q) || ref.includes(q)
      })
    }
    return list
  }, [entries, entryFilter, searchQuery])

  const visibleEntries = entriesExpanded ? filteredEntries : filteredEntries.slice(0, 5)
  const weekHeatmapDays = useMemo(() => getWeekHeatmapDays(entries), [entries])
  const dailyPrompt = getDailyPrompt()

  return (
    <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
      <div
        className="content-scroll"
        style={{ padding: '0 16px', paddingTop: '200px', paddingBottom: '120px', maxWidth: '390px', margin: '0 auto', width: '100%' }}
      >
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '20px'
        }}>
          <div style={{
            flex: 1,
            background: 'rgba(255,255,255,0.6)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid var(--glass-border)',
            borderRadius: '14px',
            padding: '10px 8px',
            textAlign: 'center',
            minWidth: 0,
          }}>
            <p style={{
              color: ACCENT_GOLD,
              fontSize: '22px',
              fontWeight: 700,
              margin: '0 0 4px 0'
            }}>
              {totalEntries}
            </p>
            <p style={{
              color: 'var(--text-secondary)',
              fontSize: '11px',
              fontWeight: 500,
              margin: 0
            }}>
              {totalEntries === 1 ? 'Entry' : 'Entries'}
            </p>
          </div>
          <div style={{
            flex: 1,
            background: 'rgba(255,255,255,0.6)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid var(--glass-border)',
            borderRadius: '14px',
            padding: '10px 8px',
            textAlign: 'center',
            minWidth: 0,
          }}>
            <p style={{
              color: ACCENT_GOLD,
              fontSize: '22px',
              fontWeight: 700,
              margin: '0 0 4px 0'
            }}>
              {writingStreak}
            </p>
            <p style={{
              color: 'var(--text-secondary)',
              fontSize: '11px',
              fontWeight: 500,
              margin: 0
            }}>
              Day streak
            </p>
          </div>
          <div style={{
            flex: 1,
            background: 'rgba(255,255,255,0.6)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid var(--glass-border)',
            borderRadius: '14px',
            padding: '10px 8px',
            textAlign: 'center',
            minWidth: 0,
          }}>
            <p style={{
              color: ACCENT_GOLD,
              fontSize: '22px',
              fontWeight: 700,
              margin: '0 0 4px 0'
            }}>
              {prayerCount}
            </p>
            <p style={{
              color: 'var(--text-secondary)',
              fontSize: '11px',
              fontWeight: 500,
              margin: 0
            }}>
              Prayers
            </p>
          </div>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.6)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(212,168,67,0.2)',
          borderRadius: '14px',
          padding: '14px 12px',
          marginBottom: '20px',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
          }}>
            <span style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: 600 }}>
              🔥 Writing streak
            </span>
            <span style={{ color: ACCENT_GOLD, fontSize: '14px', fontWeight: 700 }}>
              {writingStreak} {writingStreak === 1 ? 'day' : 'days'}
            </span>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '4px',
          }}>
            {weekHeatmapDays.map((day) => (
              <div
                key={day.ymd}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  minWidth: 0,
                }}
              >
                <div
                  title={day.ymd}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '6px',
                    background: day.filled ? ACCENT_GOLD : 'rgba(128,128,128,0.3)',
                    opacity: day.filled ? 1 : 0.3,
                    boxSizing: 'border-box',
                    ...(day.isToday && day.filled
                      ? { boxShadow: `0 0 0 2px ${ACCENT_GOLD}, 0 0 0 4px rgba(201,146,42,0.35)` }
                      : {}),
                  }}
                />
                <span style={{
                  fontSize: '9px',
                  color: 'var(--text-secondary)',
                  fontWeight: 500,
                  textAlign: 'center',
                  lineHeight: 1.1,
                }}>
                  {day.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <h1 style={{
          color: ACCENT_GOLD,
          fontSize: '20px',
          fontWeight: 700,
          letterSpacing: '0.1em',
          textAlign: 'center',
          marginBottom: '24px',
        }}>
          MY JOURNAL
        </h1>

        <div style={{
          background: 'rgba(255,255,255,0.6)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderLeft: `4px solid ${ACCENT_GOLD}`,
          borderRadius: '14px',
          padding: '16px',
          marginBottom: '20px',
        }}>
          <p style={{
            color: 'var(--text-primary)',
            fontSize: '15px',
            fontStyle: 'italic',
            margin: '0 0 8px 0',
            lineHeight: '1.5',
          }}>
            {dailyPrompt.prompt}
          </p>
          <p style={{
            color: ACCENT_GOLD,
            fontSize: '12px',
            fontWeight: 600,
            margin: 0,
          }}>
            — {dailyPrompt.verse}
          </p>
          <button
            type="button"
            onClick={() => handleOpenModal()}
            style={{
              marginTop: '10px',
              padding: 0,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: '12px',
              color: 'rgba(255,255,255,0.55)',
              fontWeight: 500,
              textAlign: 'left',
              width: '100%',
            }}
          >
            tap to write →
          </button>
        </div>

        <button
          type="button"
          onClick={() => handleOpenModal()}
          className="gold-glow-pulse"
          style={{
            width: '100%',
            background: ACCENT_GOLD,
            color: '#0a1a3e',
            fontWeight: 700,
            borderRadius: '50px',
            padding: '14px',
            marginBottom: '20px',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontSize: '16px'
          }}
        >
          <span>✏️</span>
          <span>New Entry</span>
        </button>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.6)' }}>
            Loading...
          </div>
        ) : entries.length > 0 ? (
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px',
            }}>
              <p style={{
                margin: 0,
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.12em',
                color: 'var(--text-primary)',
              }}>
                RECENT ENTRIES
              </p>
              <button
                type="button"
                onClick={() => setSearchOpen((o) => !o)}
                aria-label="Search entries"
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '8px',
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-3-3" />
                </svg>
              </button>
            </div>
            {searchOpen && (
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search title or content…"
                style={{
                  width: '100%',
                  marginBottom: '12px',
                  padding: '10px 12px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'var(--input-bg)',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            )}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              marginBottom: '14px',
            }}>
              {(['all', 'week', 'month']).map((key) => {
                const label = key === 'all' ? 'All' : key === 'week' ? 'This week' : 'This month'
                const active = entryFilter === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setEntryFilter(key)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '999px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 600,
                      background: active ? '#1a1a2e' : 'rgba(255,255,255,0.35)',
                      color: active ? '#ffffff' : 'var(--text-primary)',
                    }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
            {filteredEntries.length === 0 ? (
              <p style={{
                textAlign: 'center',
                color: 'rgba(255,255,255,0.65)',
                fontSize: '14px',
                padding: '24px 12px',
                margin: 0,
              }}>
                No entries match your search or filters.
              </p>
            ) : (
              <>
            {visibleEntries.map((entry) => (
              <article
                key={entry.id}
                style={{
                  background: 'rgba(255,255,255,0.6)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  border: entry.entry_type === 'prayer' && entry.answered ? `1px solid ${ACCENT_GOLD}` : '1px solid rgba(212,168,67,0.2)',
                  borderRadius: '14px',
                  padding: '16px',
                  marginBottom: '12px',
                  ...(entry.entry_type === 'prayer' && entry.answered && {
                    boxShadow: `0 0 16px ${ACCENT_GOLD}44`
                  })
                }}
              >
                <p style={{
                  color: ACCENT_GOLD,
                  fontSize: '11px',
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase'
                }}>
                  {entry.date}
                </p>
                <p style={{
                  color: 'var(--text-primary)',
                  fontSize: '17px',
                  fontWeight: 600,
                  marginTop: '4px'
                }}>
                  {getEntryTitle(entry)}
                </p>
                <p style={{
                  color: 'var(--text-secondary)',
                  fontSize: '14px',
                  marginTop: '4px',
                  lineHeight: 1.45,
                }}>
                  {getEntryBodyPreview(entry)}
                </p>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '12px'
                }}>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {entry.mood && (
                      <span style={{
                        background: 'rgba(212,168,67,0.15)',
                        color: '#D4A843',
                        borderRadius: '20px',
                        fontSize: '11px',
                        padding: '3px 10px',
                        fontWeight: 600
                      }}>
                        {entry.mood}
                      </span>
                    )}
                    {entry.reference && (
                      <span style={{
                        background: 'rgba(212,168,67,0.15)',
                        color: '#D4A843',
                        borderRadius: '20px',
                        fontSize: '12px',
                        padding: '3px 10px'
                      }}>
                        {entry.reference}
                      </span>
                    )}
                    {entry.entry_type === 'prayer' && (
                      entry.answered ? (
                        <span style={{
                          background: '#D4A843',
                          color: '#0a1a3e',
                          borderRadius: '20px',
                          fontSize: '11px',
                          padding: '4px 10px',
                          fontWeight: 600
                        }}>
                          🙌 Answered
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleMarkAnswered(entry)}
                          style={{
                            background: 'transparent',
                            border: '1px solid #D4A843',
                            color: '#D4A843',
                            borderRadius: '20px',
                            fontSize: '11px',
                            padding: '4px 10px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          ✅ God answered this
                        </button>
                      )
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => handleShareEntry(entry)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '14px',
                        color: '#D4A843',
                        padding: 0
                      }}
                      title="Share as faith card"
                    >
                      🕊️
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteEntry(entry)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '16px',
                        color: 'var(--text-muted)',
                        padding: 0
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </article>
            ))}
            {filteredEntries.length > 5 && (
              <button
                type="button"
                onClick={() => setEntriesExpanded((e) => !e)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'center',
                  background: 'none',
                  border: 'none',
                  color: ACCENT_GOLD,
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '12px 0 4px',
                }}
              >
                {entriesExpanded ? 'Show fewer entries' : 'See all entries →'}
              </button>
            )}
              </>
            )}
            {randomPastEntry && (
              <div className="glass-panel" style={{
                background: 'var(--glass-bg)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid var(--glass-border)',
                borderRadius: '16px',
                padding: '16px',
                marginTop: '24px',
                boxShadow: '0 0 16px rgba(212,168,67,0.15)'
              }}>
                <p style={{
                  color: '#D4A843',
                  fontSize: '12px',
                  fontWeight: 600,
                  marginBottom: '8px',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase'
                }}>
                  From {getDaysAgo(randomPastEntry.date)} days ago…
                </p>
                <p style={{
                  color: 'var(--text-primary)',
                  fontSize: '15px',
                  fontWeight: 500,
                  marginTop: '0',
                  marginBottom: '8px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  lineHeight: '1.5'
                }}>
                  {randomPastEntry.note}
                </p>
                {randomPastEntry.reference && (
                  <p style={{
                    color: '#D4A843',
                    fontSize: '12px',
                    fontWeight: 600,
                    margin: 0
                  }}>
                    {randomPastEntry.reference}
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div style={{
            background: 'rgba(255,255,255,0.6)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '14px',
            padding: '28px 20px',
            textAlign: 'center',
            marginTop: '8px',
          }}>
            <p style={{ fontSize: '40px', margin: '0 0 12px 0' }} aria-hidden>📓</p>
            <p style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: 600, margin: '0 0 8px 0' }}>
              No entries yet
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0, lineHeight: 1.5 }}>
              Write your first entry above to get started.
            </p>
          </div>
        )}
      </div>

      {showModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center'
        }}>
          <div
            className="glass-scrim"
            style={{
              position: 'fixed',
              inset: 0,
            }}
            onClick={() => {
              setShowModal(false)
              setCurrentStep(1)
              setVerseReference('')
              setVerseText('')
              setReflection('')
              setPrayer('')
              setGratitude('')
              setSelectedMood('')
            }}
          />
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '390px',
            borderRadius: '24px 24px 0 0',
            padding: '24px 20px 40px',
            position: 'relative',
            zIndex: 1001,
            borderTop: '1px solid rgba(255,255,255,0.1)',
          }}>
            {/* Progress Bar */}
            <div style={{
              marginBottom: '24px'
            }}>
              <div style={{
                height: '4px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '2px',
                marginBottom: '8px'
              }}>
                <div style={{
                  height: '100%',
                  background: '#D4A843',
                  borderRadius: '2px',
                  width: `${(currentStep / 4) * 100}%`,
                  transition: 'width 0.3s ease'
                }} />
              </div>
              <p style={{
                color: '#D4A843',
                fontSize: '12px',
                fontWeight: 600,
                textAlign: 'center',
                margin: 0
              }}>
                {currentStep} of 4
              </p>
            </div>

            {/* Step 1 - Verse */}
            {currentStep === 1 && (
              <div>
                <h2 style={{
                  color: '#D4A843',
                  fontSize: '18px',
                  fontWeight: 700,
                  marginBottom: '8px',
                  textAlign: 'center'
                }}>
                  📖 Verse
                </h2>
                <p style={{
                  color: 'var(--text-secondary)',
                  fontSize: '14px',
                  textAlign: 'center',
                  marginBottom: '20px'
                }}>
                  What Scripture is on your heart?
                </p>
                
                <input
                  type="text"
                  value={verseReference}
                  onChange={(e) => setVerseReference(e.target.value)}
                  placeholder="Reference (e.g. John 3:16)"
                  style={{
                    background: 'var(--input-bg)',
                    border: '1px solid var(--gold-border)',
                    borderRadius: '12px',
                    color: 'var(--text-primary)',
                    padding: '12px 16px',
                    width: '100%',
                    marginBottom: '12px',
                    fontSize: '16px',
                    outline: 'none'
                  }}
                />
                
                <textarea
                  value={verseText}
                  onChange={(e) => setVerseText(e.target.value)}
                  placeholder="Paste the verse text here…"
                  style={{
                    background: 'var(--input-bg)',
                    border: '1px solid var(--gold-border)',
                    borderRadius: '12px',
                    color: 'var(--text-primary)',
                    padding: '12px 16px',
                    width: '100%',
                    minHeight: '120px',
                    fontSize: '16px',
                    outline: 'none',
                    resize: 'none'
                  }}
                />
              </div>
            )}

            {/* Step 2 - Reflection */}
            {currentStep === 2 && (
              <div>
                <h2 style={{
                  color: '#D4A843',
                  fontSize: '18px',
                  fontWeight: 700,
                  marginBottom: '8px',
                  textAlign: 'center'
                }}>
                  💭 Reflection
                </h2>
                <p style={{
                  color: 'var(--text-secondary)',
                  fontSize: '14px',
                  textAlign: 'center',
                  marginBottom: '20px'
                }}>
                  What is God saying to you through this?
                </p>
                
                <textarea
                  value={reflection}
                  onChange={(e) => setReflection(e.target.value)}
                  placeholder="Write freely…"
                  style={{
                    background: 'var(--input-bg)',
                    border: '1px solid var(--gold-border)',
                    borderRadius: '12px',
                    color: 'var(--text-primary)',
                    padding: '12px 16px',
                    width: '100%',
                    minHeight: '180px',
                    fontSize: '16px',
                    outline: 'none',
                    resize: 'none'
                  }}
                />
              </div>
            )}

            {/* Step 3 - Prayer */}
            {currentStep === 3 && (
              <div>
                <h2 style={{
                  color: '#D4A843',
                  fontSize: '18px',
                  fontWeight: 700,
                  marginBottom: '8px',
                  textAlign: 'center'
                }}>
                  🙏 Prayer
                </h2>
                <p style={{
                  color: 'var(--text-secondary)',
                  fontSize: '14px',
                  textAlign: 'center',
                  marginBottom: '20px'
                }}>
                  Talk to God about it
                </p>
                
                <textarea
                  value={prayer}
                  onChange={(e) => setPrayer(e.target.value)}
                  placeholder="Talk to God…"
                  style={{
                    background: 'var(--input-bg)',
                    border: '1px solid var(--gold-border)',
                    borderRadius: '12px',
                    color: 'var(--text-primary)',
                    padding: '12px 16px',
                    width: '100%',
                    minHeight: '180px',
                    fontSize: '16px',
                    outline: 'none',
                    resize: 'none',
                    boxShadow: '0 0 12px rgba(212,168,67,0.4)'
                  }}
                />
              </div>
            )}

            {/* Step 4 - Gratitude */}
            {currentStep === 4 && (
              <div>
                <h2 style={{
                  color: '#D4A843',
                  fontSize: '18px',
                  fontWeight: 700,
                  marginBottom: '8px',
                  textAlign: 'center'
                }}>
                  🙌 Gratitude
                </h2>
                <p style={{
                  color: 'var(--text-secondary)',
                  fontSize: '14px',
                  textAlign: 'center',
                  marginBottom: '20px'
                }}>
                  What are you grateful for today?
                </p>
                
                <textarea
                  value={gratitude}
                  onChange={(e) => setGratitude(e.target.value)}
                  placeholder="Even the small things…"
                  style={{
                    background: 'var(--input-bg)',
                    border: '1px solid var(--gold-border)',
                    borderRadius: '12px',
                    color: 'var(--text-primary)',
                    padding: '12px 16px',
                    width: '100%',
                    minHeight: '180px',
                    fontSize: '16px',
                    outline: 'none',
                    resize: 'none'
                  }}
                />

                <button
                  type="button"
                  onClick={handleSaveGuidedEntry}
                  disabled={saving || !reflection.trim()}
                  style={{
                    background: saving || !reflection.trim() ? 'rgba(212,168,67,0.5)' : '#D4A843',
                    color: '#0a1a3e',
                    fontWeight: 700,
                    borderRadius: '50px',
                    padding: '14px',
                    width: '100%',
                    border: 'none',
                    cursor: saving || !reflection.trim() ? 'not-allowed' : 'pointer',
                    fontSize: '16px',
                    marginTop: '16px',
                    opacity: saving || !reflection.trim() ? 0.7 : 1
                  }}
                >
                  {saving ? 'Saving...' : 'Save Entry'}
                </button>
              </div>
            )}

            {/* Navigation Buttons */}
            <div style={{
              display: 'flex',
              gap: '12px',
              marginTop: '20px'
            }}>
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handlePreviousStep}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: '1px solid rgba(212,168,67,0.4)',
                    color: '#D4A843',
                    borderRadius: '50px',
                    padding: '12px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  ← Back
                </button>
              )}
              
              {currentStep < 4 && (
                <button
                  type="button"
                  onClick={handleNextStep}
                  style={{
                    flex: 1,
                    background: '#D4A843',
                    color: '#0a1a3e',
                    borderRadius: '50px',
                    padding: '12px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: 'none'
                  }}
                >
                  Next →
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setShowModal(false)
                setCurrentStep(1)
                setVerseReference('')
                setVerseText('')
                setReflection('')
                setPrayer('')
                setGratitude('')
                setSelectedMood('')
              }}
              style={{
                background: 'none',
                color: 'var(--text-muted)',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                width: '100%',
                padding: '8px',
                marginTop: '12px'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showCelebration && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 2000,
          background: 'rgba(10,15,30,0.97)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'fadeIn 0.4s ease'
        }}>
          <div className="celebration-glow" style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)'
          }} />
          <h1 style={{
            fontFamily: 'Cinzel, serif',
            fontSize: '48px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: '16px',
            textAlign: 'center',
            animation: 'fadeIn 0.4s ease 0.2s both'
          }}>
            God moved. 🙌
          </h1>
          <p style={{
            fontSize: '18px',
            color: 'rgba(255,255,255,0.8)',
            marginBottom: '24px',
            textAlign: 'center',
            animation: 'fadeIn 0.4s ease 0.3s both'
          }}>
            Your faith was not in vain.
          </p>
          <p style={{
            fontFamily: 'Cinzel, serif',
            fontSize: '20px',
            fontStyle: 'italic',
            color: '#D4A843',
            marginBottom: '40px',
            textAlign: 'center',
            animation: 'fadeIn 0.4s ease 0.4s both'
          }}>
            Romans 8:28
          </p>
          {showCloseButton && (
            <button
              type="button"
              onClick={() => setShowCelebration(false)}
              style={{
                background: '#D4A843',
                color: '#0a1a3e',
                fontWeight: 700,
                borderRadius: '50px',
                padding: '14px 40px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '16px',
                animation: 'fadeIn 0.4s ease'
              }}
            >
              Close
            </button>
          )}
        </div>
      )}

      {/* Prayer Share Prompt Modal */}
      {showPrayerSharePrompt && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'fadeIn 0.3s ease'
        }}>
          <div
            className="glass-scrim"
            style={{
              position: 'fixed',
              inset: 0,
            }}
            onClick={handleKeepPrivate}
          />
          <div className="glass relative z-10 w-full max-w-md rounded-2xl p-6 border border-[#D4A843]/30" style={{
            maxWidth: '360px',
            margin: '16px'
          }}>
            <div style={{
              textAlign: 'center',
              marginBottom: '20px'
            }}>
              <span style={{ fontSize: '32px', display: 'block', marginBottom: '12px' }}>🙏</span>
              <h2 style={{
                color: '#D4A843',
                fontSize: '18px',
                fontWeight: 700,
                marginBottom: '12px'
              }}>
                Share with the body of Christ?
              </h2>
              <p style={{
                color: 'rgba(255,255,255,0.8)',
                fontSize: '14px',
                lineHeight: '1.5',
                marginBottom: '8px'
              }}>
                Would you like to share this with the prayer wall anonymously?
              </p>
              <p style={{
                color: 'var(--text-secondary)',
                fontSize: '13px',
                fontStyle: 'italic'
              }}>
                The body of Christ can pray with you. 🙏
              </p>
            </div>
            <div style={{
              display: 'flex',
              gap: '12px'
            }}>
              <button
                onClick={handleShareToPrayerWall}
                disabled={sharingToPrayerWall}
                style={{
                  flex: 1,
                  background: '#D4A843',
                  color: '#0a1a3e',
                  fontWeight: 700,
                  borderRadius: '12px',
                  padding: '12px',
                  border: 'none',
                  cursor: sharingToPrayerWall ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  opacity: sharingToPrayerWall ? 0.7 : 1
                }}
              >
                {sharingToPrayerWall ? 'Sharing…' : 'Share Anonymously'}
              </button>
              <button
                onClick={handleKeepPrivate}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: 'rgba(255,255,255,0.8)',
                  fontWeight: 600,
                  borderRadius: '12px',
                  padding: '12px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Keep Private
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {showToast && (
        <div style={{
          position: 'fixed',
          top: '100px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 2001
        }}>
          <div className="glass px-6 py-3 rounded-full border border-[#D4A843]/50 bg-[#D4A843]/20">
            <p style={{
              color: '#D4A843',
              fontSize: '14px',
              fontWeight: 600,
              margin: 0
            }}>
              Your prayer has been lifted up 🕊️
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default Journal
