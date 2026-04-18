import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  deleteJournalEntry,
  getJournalEntries,
  getJournalEntryLocalYmd,
  saveToJournal,
  markPrayerAnswered,
  fetchJournalWeekEntryLocalDates,
  getJournalWritingWeekColumnsMonSun,
  fetchJournalActivityLocalYmds,
  computeWritingStreakFromActivityDates,
} from '../utils/journal'
import { useAuth } from '../context/AuthContext'
import { userStorageKey } from '../utils/userStorage'
import { supabase } from '../lib/supabase'
import { WEEK_DAY_SHORT } from '../hooks/useStreakTracker'
import FirstJournalEntryCelebration from '../components/FirstJournalEntryCelebration'
import GuestPreviewBanner from '../components/GuestPreviewBanner'
import { useIsGuestSession } from '../hooks/useIsGuestSession'
import { useGuestSignupModal } from '../context/GuestSignupModalContext'

const ACCENT_GOLD = '#c9922a'
const JOURNAL_MOUNT_DELAY_MS = 600

function getPromptForEntryDate(iso, prompts) {
  if (!prompts?.length) return { prompt: '', verse: '' }
  const d = iso ? new Date(iso) : new Date()
  const idx = d.getDate() % prompts.length
  return prompts[idx]
}

function getDaysAgo(iso) {
  const entryDate = new Date(iso)
  const today = new Date()
  const diffTime = Math.abs(today - entryDate)
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/** Local calendar YYYY-MM-DD from a Date (for generated dates in streak / week helpers). */
function toLocalYmd(d) {
  if (!d || Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function localTodayYmd() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

/** Monday 00:00 local of this week; uses noon anchor to avoid DST edge cases. */
function getMondayOfWeek(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0)
  const day = x.getDay()
  const diff = day === 0 ? -6 : 1 - day
  x.setDate(x.getDate() + diff)
  x.setHours(0, 0, 0, 0)
  return x
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

function Journal() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const isGuestSession = useIsGuestSession()
  const { openGuestSignupModal } = useGuestSignupModal()
  const navigate = useNavigate()
  const location = useLocation()
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
  const [showFirstEntryCelebration, setShowFirstEntryCelebration] = useState(false)
  /** Local YYYY-MM-DD with ≥1 journal entry this calendar week (Mon–Sun, resets Mon 00:00 local). */
  const [journalWeekLocalDates, setJournalWeekLocalDates] = useState([])

  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [entryFilter, setEntryFilter] = useState('all')
  const [entriesExpanded, setEntriesExpanded] = useState(false)

  const prompts = useMemo(() => {
    const list = t('journal.prompts', { returnObjects: true })
    return Array.isArray(list) ? list : []
  }, [t, i18n.language])

  const localeOpts = useMemo(
    () => ({ month: 'long', day: 'numeric', year: 'numeric' }),
    [],
  )

  const normalizeEntry = useCallback(
    (entry) => {
      const loc = i18n.resolvedLanguage || i18n.language || 'en'
      const savedDate = entry.created_at
        ? new Date(entry.created_at).toLocaleDateString(loc, localeOpts)
        : new Date().toLocaleDateString(loc, localeOpts)
      return {
        id: String(entry.id),
        reference: entry.verse_reference || '',
        note: entry.content || '',
        date: savedDate,
        created_at: entry.created_at || null,
        local_date: getJournalEntryLocalYmd(entry),
        mood: entry.mood || '',
        entry_type: entry.entry_type || 'reflection',
        answered: entry.answered || false,
      }
    },
    [i18n.language, i18n.resolvedLanguage, localeOpts],
  )

  const getEntryTitle = useCallback(
    (entry) => {
      const line = (entry.note || '').split('\n')[0]?.trim()
      return line || t('journal.untitled')
    },
    [t],
  )

  const getEntryBodyPreview = useCallback(
    (entry) => {
      const full = (entry.note || '').trim()
      if (!full) {
        const p = getPromptForEntryDate(entry.created_at, prompts)
        return `${p.prompt} — ${p.verse}`
      }
      if (full.length > 80) return `${full.slice(0, 80).trim()}...`
      return full
    },
    [prompts],
  )

  useEffect(() => {
    setEntriesExpanded(false)
  }, [entryFilter, searchQuery])

  useEffect(() => {
    const de = location.state?.dailyEncounter
    if (!de) return
    setVerseReference(de.reference || '')
    setVerseText(de.verseText || '')
    setReflection([de.reflection, de.prompt].filter(Boolean).join('\n\n'))
    setCurrentStep(2)
    setShowModal(true)
    navigate(location.pathname, { replace: true, state: {} })
  }, [location.state, location.pathname, navigate])

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
      if (!user?.id) {
        setJournalWeekLocalDates([])
        setEntries([])
        setLoading(false)
        return
      }
      await new Promise((resolve) => setTimeout(resolve, JOURNAL_MOUNT_DELAY_MS))
      if (!active) return
      setLoading(true)
      const data = await getJournalEntries(user.id)
      const activityYmds = await fetchJournalActivityLocalYmds(user.id)
      const weekDates = await fetchJournalWeekEntryLocalDates(user.id)
      if (!active) return
      setJournalWeekLocalDates(weekDates)
      setEntries((data || []).map(normalizeEntry))
      setWritingStreak(computeWritingStreakFromActivityDates(activityYmds))
      const entryLen = (data || []).length
      setTotalEntries(entryLen)
      try {
        const jk = userStorageKey(user.id, 'journal-entry-count')
        const prev = parseInt(localStorage.getItem(jk) || '0', 10)
        localStorage.setItem(jk, String(Math.max(prev, entryLen)))
      } catch {
        /* ignore */
      }
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
  }, [user?.id, normalizeEntry])

  const handleDeleteEntry = async (entry) => {
    if (isGuestSession) {
      openGuestSignupModal()
      return
    }
    await deleteJournalEntry(entry.id)
    const nextEntries = await getJournalEntries(user?.id)
    setJournalWeekLocalDates(await fetchJournalWeekEntryLocalDates(user?.id))
    setEntries((nextEntries || []).map(normalizeEntry))
    setWritingStreak(computeWritingStreakFromActivityDates(await fetchJournalActivityLocalYmds(user?.id)))
    setTotalEntries((nextEntries || []).length)
    setPrayerCount((nextEntries || []).filter(e => e.entry_type === 'prayer' && e.answered === true).length)
  }

  const handleMarkAnswered = async (entry) => {
    if (isGuestSession) {
      openGuestSignupModal()
      return
    }
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
    if (isGuestSession) {
      openGuestSignupModal()
      return
    }

    setSaving(true)
    
    const saved = await saveToJournal({
      verse: verseText.trim() || null,
      reference: verseReference.trim() || null,
      note: reflection.trim(),
      prayer: prayer.trim() || null,
      gratitude: gratitude.trim() || null,
      tags: [t('journal.entryTagReflection')],
      userId: user?.id,
      mood: selectedMood || null,
      entry_type: 'guided',
    })
    
    setSaving(false)
    
    if (!saved) return
    const { isFirstJournalEntry, ...savedRow } = saved
    if (isFirstJournalEntry) setShowFirstEntryCelebration(true)
    setEntries((prev) => [normalizeEntry(savedRow), ...prev])
    const full = await getJournalEntries(user?.id)
    setJournalWeekLocalDates(await fetchJournalWeekEntryLocalDates(user?.id))
    setWritingStreak(computeWritingStreakFromActivityDates(await fetchJournalActivityLocalYmds(user?.id)))
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
    if (isGuestSession) {
      openGuestSignupModal()
      return
    }
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
      list = list.filter((e) => isInCurrentCalendarWeek(getJournalEntryLocalYmd(e)))
    } else if (entryFilter === 'month') {
      list = list.filter((e) => isInThisMonth(getJournalEntryLocalYmd(e)))
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
  }, [entries, entryFilter, searchQuery, getEntryTitle, t])

  const weekHeatmapDays = useMemo(() => {
    const activeYmds = new Set(journalWeekLocalDates)
    const todayYmd = localTodayYmd()
    const weekdayKeys = ['weekdayMon', 'weekdayTue', 'weekdayWed', 'weekdayThu', 'weekdayFri', 'weekdaySat', 'weekdaySun']
    const todayShortEn = new Date().toLocaleDateString('en-US', { weekday: 'short' })
    const cols = getJournalWritingWeekColumnsMonSun()
    return cols.map(({ shortEn, ymd }) => {
      const isToday = ymd === todayYmd
      const wi = WEEK_DAY_SHORT.indexOf(shortEn)
      return {
        ymd,
        filled: activeYmds.has(ymd),
        isToday,
        label: isToday ? todayShortEn : t(`journal.${weekdayKeys[wi]}`),
      }
    })
  }, [journalWeekLocalDates, t])

  const dailyPrompt = useMemo(() => getPromptForEntryDate(null, prompts), [prompts])

  const visibleEntries = entriesExpanded ? filteredEntries : filteredEntries.slice(0, 5)

  return (
    <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
      <div
        className="content-scroll"
        style={{ padding: '0 16px', paddingTop: '20px', paddingBottom: '120px', maxWidth: '390px', margin: '0 auto', width: '100%' }}
      >
        <GuestPreviewBanner />
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '20px'
        }}>
          <div
            className="glass-panel min-w-0 flex-1 text-center"
            style={{
              border: '1px solid #D4A843',
              borderRadius: '16px',
              padding: '10px 8px',
            }}
          >
            <p className="mb-1 text-2xl font-bold text-amber-400">
              {totalEntries}
            </p>
            <p className="m-0 text-sm text-white/60">
              {totalEntries === 1 ? t('journal.entrySingular') : t('journal.entryPlural')}
            </p>
          </div>
          <div
            className="glass-panel min-w-0 flex-1 text-center"
            style={{
              border: '1px solid #D4A843',
              borderRadius: '16px',
              padding: '10px 8px',
            }}
          >
            <p className="mb-1 text-2xl font-bold text-amber-400">
              {writingStreak}
            </p>
            <p className="m-0 text-sm text-white/60">
              {t('journal.dayStreakLabel')}
            </p>
          </div>
          <div
            className="glass-panel min-w-0 flex-1 text-center"
            style={{
              border: '1px solid #D4A843',
              borderRadius: '16px',
              padding: '10px 8px',
            }}
          >
            <p className="mb-1 text-2xl font-bold text-amber-400">
              {prayerCount}
            </p>
            <p className="m-0 text-sm text-white/60">
              {t('journal.prayersLabel')}
            </p>
          </div>
        </div>

        <div style={{ marginBottom: '28px' }}>
        <div
          className="glass-panel"
          style={{
            borderRadius: '20px',
            padding: '20px',
            boxShadow:
              writingStreak >= 7
                ? '0 0 0 1px rgba(212,168,67,0.45), 0 0 20px rgba(212,168,67,0.2)'
                : undefined,
          }}
        >
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
          }}>
            <span className="text-sm font-semibold text-white flex items-center gap-1.5">
              <span style={{ fontSize: '20px', lineHeight: 1 }} aria-hidden>
                🔥
              </span>
              <span>{t('journal.writingStreak')}</span>
            </span>
            <span className="text-sm font-bold text-amber-400">
              {writingStreak} {writingStreak === 1 ? t('journal.day') : t('journal.days')}
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
                {day.filled ? (
                  <span
                    title={day.ymd}
                    style={{
                      fontSize: '22px',
                      lineHeight: 1,
                      ...(day.isToday
                        ? { filter: 'drop-shadow(0 0 4px rgba(201,146,42,0.65))' }
                        : {}),
                    }}
                    aria-hidden
                  >
                    🔥
                  </span>
                ) : (
                  <div
                    title={day.ymd}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: 'rgba(150,150,150,0.25)',
                      flexShrink: 0,
                    }}
                  />
                )}
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
        </div>

        <h1 style={{
          color: ACCENT_GOLD,
          fontSize: '20px',
          fontWeight: 700,
          letterSpacing: '0.1em',
          textAlign: 'center',
          marginBottom: '24px',
        }}>
          {t('journal.myJournal')}
        </h1>

        <div
          className="glass-panel rounded-2xl p-6"
          style={{
            borderRadius: '16px',
            marginBottom: '20px',
          }}
        >
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
            {t('journal.tapToWrite')}
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
          <span>{t('journal.newEntry')}</span>
        </button>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.6)' }}>
            {t('journal.loading')}
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
                {t('journal.recentEntries')}
              </p>
              <button
                type="button"
                onClick={() => setSearchOpen((o) => !o)}
                aria-label={t('journal.searchAria')}
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
                placeholder={t('journal.searchPlaceholder')}
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
                const label = key === 'all' ? t('journal.filterAll') : key === 'week' ? t('journal.filterWeek') : t('journal.filterMonth')
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
                {t('journal.noMatch')}
              </p>
            ) : (
              <>
            {visibleEntries.map((entry) => (
              <div
                key={entry.id}
                className="glass-panel mb-3"
                style={{
                  border: '1px solid #D4A843',
                  borderRadius: '16px',
                  padding: '20px',
                }}
              >
                <p className="text-amber-400 text-xs uppercase tracking-widest font-semibold">
                  {entry.date}
                </p>
                <p className="text-white font-bold text-lg leading-snug">
                  {getEntryTitle(entry)}
                </p>
                <p className="text-white/60 text-sm mt-1">
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
                        background: 'rgba(0, 0, 0, 0.45)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#fcd34d',
                        borderRadius: '20px',
                        fontSize: '11px',
                        padding: '3px 10px',
                        fontWeight: 600
                      }}>
                        {entry.mood}
                      </span>
                    )}
                    {entry.reference && (
                      <span className="bg-amber-500/20 text-amber-300 text-xs px-3 py-1 rounded-full border border-amber-500/30">
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
                          {t('journal.answered')}
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
                          {t('journal.godAnswered')}
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
                        color: '#fbbf24',
                        padding: 0
                      }}
                      title={t('journal.shareCardTitle')}
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
                        color: 'rgba(255,255,255,0.45)',
                        padding: 0
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
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
                {entriesExpanded ? t('journal.showFewer') : t('journal.seeAll')}
              </button>
            )}
              </>
            )}
            {randomPastEntry && (
              <div className="glass-panel" style={{
                background: 'var(--card-parchment)',
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
                  {t('journal.fromDaysAgo', { n: getDaysAgo(randomPastEntry.created_at) })}
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
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '28px 20px',
            textAlign: 'center',
            marginTop: '8px',
          }}>
            <p style={{ fontSize: '40px', margin: '0 0 12px 0' }} aria-hidden>📓</p>
            <p style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: 600, margin: '0 0 8px 0' }}>
              {t('journal.emptyTitle')}
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0, lineHeight: 1.5 }}>
              {t('journal.emptySub')}
            </p>
          </div>
        )}
      </div>

      {showModal &&
        createPortal(
          <>
            <div
              aria-hidden="true"
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.5)',
                zIndex: 10050,
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
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="journal-guided-flow-title"
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 10051,
                width: 'min(90vw, 390px)',
                maxWidth: '100%',
                maxHeight: '85vh',
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch',
                boxSizing: 'border-box',
                borderRadius: '20px',
                padding: '24px 20px max(20px, env(safe-area-inset-bottom))',
                background: 'rgba(10, 15, 40, 0.97)',
                border: '1px solid rgba(212, 168, 67, 0.22)',
                boxShadow: '0 20px 56px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(0, 0, 0, 0.2)',
              }}
            >
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
              <p
                id="journal-guided-flow-title"
                style={{
                  color: '#D4A843',
                  fontSize: '12px',
                  fontWeight: 600,
                  textAlign: 'center',
                  margin: 0,
                }}
              >
                {t('journal.stepProgress', { current: currentStep })}
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
                  {t('journal.stepVerse')}
                </h2>
                <p style={{
                  color: 'var(--text-secondary)',
                  fontSize: '14px',
                  textAlign: 'center',
                  marginBottom: '20px'
                }}>
                  {t('journal.stepVerseQ')}
                </p>
                
                <input
                  type="text"
                  value={verseReference}
                  onChange={(e) => setVerseReference(e.target.value)}
                  placeholder={t('journal.refPlaceholder')}
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
                  placeholder={t('journal.pasteVerse')}
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
                  {t('journal.stepReflection')}
                </h2>
                <p style={{
                  color: 'var(--text-secondary)',
                  fontSize: '14px',
                  textAlign: 'center',
                  marginBottom: '20px'
                }}>
                  {t('journal.stepReflectionQ')}
                </p>
                
                <textarea
                  value={reflection}
                  onChange={(e) => setReflection(e.target.value)}
                  placeholder={t('journal.writeFreely')}
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
                  {t('journal.stepPrayer')}
                </h2>
                <p style={{
                  color: 'var(--text-secondary)',
                  fontSize: '14px',
                  textAlign: 'center',
                  marginBottom: '20px'
                }}>
                  {t('journal.stepPrayerQ')}
                </p>
                
                <textarea
                  value={prayer}
                  onChange={(e) => setPrayer(e.target.value)}
                  placeholder={t('journal.talkToGod')}
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
                  {t('journal.stepGratitude')}
                </h2>
                <p style={{
                  color: 'var(--text-secondary)',
                  fontSize: '14px',
                  textAlign: 'center',
                  marginBottom: '20px'
                }}>
                  {t('journal.stepGratitudeQ')}
                </p>
                
                <textarea
                  value={gratitude}
                  onChange={(e) => setGratitude(e.target.value)}
                  placeholder={t('journal.gratitudePlaceholder')}
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
                  {saving ? t('journal.saving') : t('journal.saveEntry')}
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
                  {t('journal.backStep')}
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
              {t('common.cancel')}
            </button>
            </div>
          </>,
          document.body,
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
            {t('journal.celebrationTitle')}
          </h1>
          <p style={{
            fontSize: '18px',
            color: 'rgba(255,255,255,0.8)',
            marginBottom: '24px',
            textAlign: 'center',
            animation: 'fadeIn 0.4s ease 0.3s both'
          }}>
            {t('journal.celebrationSub')}
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
            {t('journal.celebrationRef')}
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
              {t('common.close')}
            </button>
          )}
        </div>
      )}

      {/* Prayer Share Prompt Modal — portal + layered backdrop (matches write modal) */}
      {showPrayerSharePrompt &&
        createPortal(
          <>
            <div
              aria-hidden="true"
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.5)',
                zIndex: 10050,
              }}
              onClick={handleKeepPrivate}
            />
            <div
              role="dialog"
              className="journal-prayer-share-modal"
              aria-modal="true"
              aria-labelledby="journal-prayer-share-title"
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 10051,
                width: 'min(90vw, 360px)',
                maxWidth: '100%',
                maxHeight: '85vh',
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch',
                boxSizing: 'border-box',
                borderRadius: '16px',
                padding: '24px',
                background: 'rgba(10, 15, 40, 0.97)',
                border: '1px solid rgba(212, 168, 67, 0.22)',
                boxShadow: '0 20px 56px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(0, 0, 0, 0.2)',
                color: '#F5EDD6',
                opacity: 1,
              }}
            >
              <div
                style={{
                  textAlign: 'center',
                  marginBottom: '20px',
                  color: '#F5EDD6',
                  opacity: 1,
                }}
              >
                <span
                  className="emoji"
                  style={{ fontSize: '32px', display: 'block', marginBottom: '12px', opacity: 1 }}
                  aria-hidden
                >
                  🙏
                </span>
                <h2
                  id="journal-prayer-share-title"
                  style={{
                    color: '#F5EDD6',
                    opacity: 1,
                    fontSize: '18px',
                    fontWeight: 700,
                    marginBottom: '12px',
                  }}
                >
                  {t('journal.sharePromptTitle')}
                </h2>
                <p
                  style={{
                    color: '#F5EDD6',
                    opacity: 1,
                    fontSize: '14px',
                    lineHeight: '1.5',
                    marginBottom: '8px',
                  }}
                >
                  {t('journal.sharePromptBody')}
                </p>
                <p
                  style={{
                    color: '#F5EDD6',
                    opacity: 1,
                    fontSize: '13px',
                    fontStyle: 'italic',
                  }}
                >
                  {t('journal.sharePromptNote')}
                </p>
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  opacity: 1,
                }}
              >
                <button
                  type="button"
                  className="journal-prayer-share-modal__primary"
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
                    opacity: sharingToPrayerWall ? 0.7 : 1,
                  }}
                >
                  {sharingToPrayerWall ? t('journal.sharing') : t('journal.shareAnon')}
                </button>
                <button
                  type="button"
                  className="journal-prayer-share-modal__secondary"
                  onClick={handleKeepPrivate}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: '1px solid rgba(245, 237, 214, 0.45)',
                    color: '#F5EDD6',
                    opacity: 1,
                    fontWeight: 600,
                    borderRadius: '12px',
                    padding: '12px',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  {t('journal.keepPrivate')}
                </button>
              </div>
            </div>
          </>,
          document.body,
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
              {t('journal.toastPrayer')}
            </p>
          </div>
        </div>
      )}

      <FirstJournalEntryCelebration
        open={showFirstEntryCelebration}
        onClose={() => setShowFirstEntryCelebration(false)}
      />
    </div>
  )
}

export default Journal
