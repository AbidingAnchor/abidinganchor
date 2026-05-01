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

const MOOD_OPTIONS = [
  { id: 'grateful', emoji: '🙏', label: 'Grateful', color: '#D4A843' },
  { id: 'hopeful', emoji: '✨', label: 'Hopeful', color: '#5DCAA5' },
  { id: 'faithful', emoji: '💪', label: 'Faithful', color: '#378ADD' },
  { id: 'struggling', emoji: '😔', label: 'Struggling', color: '#D85A30' },
  { id: 'loved', emoji: '❤️', label: 'Loved', color: '#EC4899' },
  { id: 'inspired', emoji: '🔥', label: 'Inspired', color: '#F97316' },
  { id: 'peaceful', emoji: '😌', label: 'Peaceful', color: '#10B981' },
  { id: 'seeking', emoji: '🤔', label: 'Seeking', color: '#8B5CF6' },
]

function getMoodDisplay(moodId) {
  const mood = MOOD_OPTIONS.find(m => m.id === moodId)
  return mood || { emoji: '✍️', label: 'Reflection', color: '#D4A843' }
}

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
  const [showReaderModal, setShowReaderModal] = useState(null)
  const [showSimpleComposeModal, setShowSimpleComposeModal] = useState(false)
  const [showMoodPicker, setShowMoodPicker] = useState(false)
  const [selectedMoodForNew, setSelectedMoodForNew] = useState(null)
  const [editingEntry, setEditingEntry] = useState(null)
  const [simpleComposeDraft, setSimpleComposeDraft] = useState('')
  const [simpleComposeSaving, setSimpleComposeSaving] = useState(false)

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
    setShowMoodPicker(true)
    setSelectedMoodForNew(null)
    setSimpleComposeDraft('')
  }

  const handleMoodSelect = (mood) => {
    setSelectedMoodForNew(mood)
    setShowMoodPicker(false)
    setShowSimpleComposeModal(true)
  }

  const handleEditEntry = (entry) => {
    setEditingEntry(entry)
    setSimpleComposeDraft(entry.note || '')
    setSelectedMoodForNew(entry.mood ? getMoodDisplay(entry.mood) : null)
    setShowReaderModal(null)
    setShowSimpleComposeModal(true)
  }

  const handleOpenGuidedModal = () => {
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

  const handleSimpleComposeSave = async () => {
    const text = simpleComposeDraft.trim()
    if (!text || !user?.id) {
      if (isGuestSession) openGuestSignupModal()
      return
    }

    setSimpleComposeSaving(true)
    try {
      if (editingEntry) {
        // Update existing entry
        const { error } = await supabase
          .from('journal_entries')
          .update({
            note: text,
            mood: selectedMoodForNew?.id || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingEntry.id)
        
        if (!error) {
          setEntries(prev => prev.map(e => e.id === editingEntry.id ? { ...e, note: text, mood: selectedMoodForNew?.id || null } : e))
        }
      } else {
        // Create new entry
        const saved = await saveToJournal({
          verse: null,
          reference: null,
          note: text,
          prayer: null,
          gratitude: null,
          tags: ['reflection'],
          userId: user.id,
          mood: selectedMoodForNew?.id || null,
          entry_type: 'reflection',
        })
        
        if (saved) {
          const { isFirstJournalEntry, ...savedRow } = saved
          if (isFirstJournalEntry) setShowFirstEntryCelebration(true)
          setEntries((prev) => [normalizeEntry(savedRow), ...prev])
          const full = await getJournalEntries(user?.id)
          setJournalWeekLocalDates(await fetchJournalWeekEntryLocalDates(user?.id))
          setWritingStreak(computeWritingStreakFromActivityDates(await fetchJournalActivityLocalYmds(user?.id)))
          setTotalEntries((full || []).length)
        }
      }
      
      setSimpleComposeDraft('')
      setSelectedMoodForNew(null)
      setEditingEntry(null)
      setShowSimpleComposeModal(false)
    } catch (error) {
      console.error('Error saving journal entry:', error)
    } finally {
      setSimpleComposeSaving(false)
    }
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
    <div style={{ background: 'transparent', minHeight: '100vh', animation: 'fadeIn 0.6s ease-out' }}>
      <div className="content-scroll" style={{ padding: '60px 16px 100px', maxWidth: '680px', margin: '0 auto' }}>
        <GuestPreviewBanner />
        
        {/* Header */}
        {!showReaderModal && (
          <div style={{ marginBottom: '24px', animation: 'fadeIn 0.6s ease-out' }}>
            <h1 style={{
              color: '#ffffff',
              fontSize: '32px',
              fontWeight: 800,
              marginBottom: '8px',
              margin: '0 0 8px 0',
            }}>
              {t('journal.pageTitle')}
            </h1>
            <p style={{
              color: 'rgba(255, 255, 255, 0.5)',
              fontSize: '15px',
              margin: 0,
            }}>
              {t('journal.pageSubtitle')}
            </p>
          </div>
        )}

        {/* Stats Bar */}
        {showReaderModal ? null : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            marginBottom: '32px',
            padding: '20px',
            background: 'rgba(255, 255, 255, 0.06)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(212, 168, 67, 0.2)',
            borderRadius: '16px',
            animation: 'fadeIn 0.6s ease-out 0.1s both',
          }}>
            <div style={{ textAlign: 'center', minWidth: '60px' }}>
              <p style={{ color: '#D4A843', fontSize: '28px', fontWeight: 800, margin: '0 0 4px 0', lineHeight: 1 }}>{totalEntries}</p>
              <p style={{ color: 'rgba(255, 255, 255, 0.45)', fontSize: '11px', letterSpacing: '1.5px', margin: 0, fontWeight: 600, textTransform: 'uppercase' }}>{totalEntries === 1 ? t('journal.entrySingular') : t('journal.entryPlural')}</p>
            </div>
            <div style={{ width: '1px', height: '32px', background: 'rgba(255, 255, 255, 0.1)' }} />
            <div style={{ textAlign: 'center', minWidth: '60px' }}>
              <p style={{ color: '#D4A843', fontSize: '28px', fontWeight: 800, margin: '0 0 4px 0', lineHeight: 1 }}>{writingStreak}</p>
              <p style={{ color: 'rgba(255, 255, 255, 0.45)', fontSize: '11px', letterSpacing: '1.5px', margin: 0, fontWeight: 600, textTransform: 'uppercase' }}>{writingStreak === 1 ? t('journal.day') : t('journal.days')}</p>
            </div>
            <div style={{ width: '1px', height: '32px', background: 'rgba(255, 255, 255, 0.1)' }} />
            <div style={{ textAlign: 'center', minWidth: '60px' }}>
              <p style={{ color: '#D4A843', fontSize: '28px', fontWeight: 800, margin: '0 0 4px 0', lineHeight: 1 }}>{entries.length > 0 ? new Date(entries[entries.length - 1].created_at).toLocaleDateString(i18n.language, { month: 'short', year: 'numeric' }) : '—'}</p>
              <p style={{ color: 'rgba(255, 255, 255, 0.45)', fontSize: '11px', letterSpacing: '1.5px', margin: 0, fontWeight: 600, textTransform: 'uppercase' }}>{t('journal.dayStreakLabel', { n: writingStreak })}</p>
            </div>
          </div>
        )}

        {!showReaderModal ? (
          <>
            {loading ? (
              <div style={{
                textAlign: 'center',
                padding: '48px 24px',
                color: 'rgba(255, 255, 255, 0.5)',
                animation: 'fadeIn 0.6s ease-out 0.2s both',
              }}>
                {t('common.loading')}
              </div>
            ) : entries.length > 0 ? (
          <div style={{ animation: 'fadeIn 0.6s ease-out 0.2s both' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
            }}>
              <p style={{
                margin: 0,
                fontSize: '11px',
                letterSpacing: '1.5px',
                color: 'rgba(212, 168, 67, 0.7)',
                textTransform: 'uppercase',
                fontWeight: 600,
              }}>
                {t('journal.entriesLabel').toUpperCase()}
              </p>
              <button
                type="button"
                onClick={() => setSearchOpen((o) => !o)}
                aria-label={t('journal.searchAria')}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '8px',
                  cursor: 'pointer',
                  color: '#D4A843',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
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
                  marginBottom: '16px',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1px solid rgba(212, 168, 67, 0.2)',
                  background: 'rgba(255, 255, 255, 0.04)',
                  color: '#ffffff',
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
              marginBottom: '20px',
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
                      padding: '8px 16px',
                      borderRadius: '50px',
                      border: '1px solid rgba(212,168,67,0.3)',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: active ? 700 : 500,
                      background: active
                        ? '#D4A843'
                        : '#F0E8D4',
                      color: '#1A1A1A',
                      transition: 'all 0.2s ease',
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
                color: 'rgba(255,255,255,0.5)',
                fontSize: '14px',
                padding: '48px 24px',
                margin: 0,
              }}>
                {t('journal.noMatch')}
              </p>
            ) : (
              <>
                {visibleEntries.map((entry, index) => {
                  const date = new Date(entry.created_at || Date.now())
                  const dayName = date.toLocaleDateString(i18n.language, { weekday: 'long' }).toUpperCase()
                  const monthDay = date.toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' })
                  const wordCount = (entry.note || '').split(/\s+/).filter(w => w).length
                  const readTime = Math.max(1, Math.ceil(wordCount / 200))
                  const moodDisplay = getMoodDisplay(entry.mood)
                  return (
                    <div
                      key={entry.id}
                      onClick={() => setShowReaderModal(entry)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.06)',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        border: '1px solid rgba(212, 168, 67, 0.15)',
                        borderRadius: '16px',
                        padding: '16px 20px',
                        marginBottom: '16px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        animation: `fadeIn 0.6s ease-out ${0.3 + index * 0.05}s both`,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                        <div>
                          <p style={{
                            color: '#ffffff',
                            fontSize: '22px',
                            fontWeight: 800,
                            marginBottom: '4px',
                            lineHeight: 1,
                          }}>
                            {monthDay}
                          </p>
                          <p style={{
                            color: '#D4A843',
                            fontSize: '11px',
                            fontWeight: 700,
                            letterSpacing: '1.5px',
                            textTransform: 'uppercase',
                          }}>
                            {dayName}
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span
                            style={{
                              padding: '6px 12px',
                              borderRadius: '20px',
                              background: `${moodDisplay.color}25`,
                              border: `1px solid ${moodDisplay.color}50`,
                              color: moodDisplay.color,
                              fontSize: '13px',
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            {moodDisplay.emoji} {moodDisplay.label}
                          </span>
                          {entry.entry_type === 'prayer' && entry.answered && (
                            <div style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#ffffff',
                              fontSize: '16px',
                              fontWeight: 600,
                            }}>
                              ✓
                            </div>
                          )}
                        </div>
                      </div>
                      <p style={{
                        color: 'rgba(255, 255, 255, 0.7)',
                        fontSize: '14px',
                        lineHeight: 1.6,
                        marginTop: '8px',
                        marginBottom: '16px',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}>
                        {entry.note || getEntryBodyPreview(entry)}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'rgba(255, 255, 255, 0.4)', fontSize: '12px' }}>
                        <span>{wordCount} {t('journal.wordsLabel', { count: wordCount })}</span>
                        <span>•</span>
                        <span>{readTime} {t('journal.minReadLabel')}</span>
                      </div>
                    </div>
                  )
                })}
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
                      color: '#D4A843',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: '12px 0',
                    }}
                  >
                    {entriesExpanded ? t('journal.showFewer') : t('journal.seeAll')}
                  </button>
                )}
              </>
            )}
          </div>
        ) : (
          <div style={{
            background: 'linear-gradient(145deg, rgba(15, 22, 55, 0.92), rgba(10, 15, 40, 0.97))',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(212, 168, 67, 0.2)',
            borderRadius: '20px',
            padding: '48px 32px',
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(212, 168, 67, 0.08)',
            animation: 'fadeIn 0.6s ease-out 0.3s both',
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '24px',
              filter: 'drop-shadow(0 0 20px rgba(212, 168, 67, 0.3))',
            }}>
              📓
            </div>
            <h3 style={{
              color: '#ffffff',
              fontSize: '20px',
              fontWeight: 600,
              marginBottom: '8px',
            }}>
              Your story is worth writing
            </h3>
            <p style={{
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '14px',
              marginBottom: '24px',
            }}>
              Every entry is a letter to your future self
            </p>
            <button
              type="button"
              onClick={handleOpenModal}
              style={{
                padding: '14px 28px',
                borderRadius: '99px',
                border: 'none',
                background: 'linear-gradient(135deg, #D4A843 0%, #B8860B 100%)',
                color: '#0a0f28',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 20px rgba(212, 168, 67, 0.4)',
              }}
            >
              Write Your First Entry
            </button>
          </div>
        )}
        </>
        ) : null}

        {/* Reader View (inline, not overlay) */}
        {showReaderModal && (
          <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
            {/* Top buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <button onClick={() => setShowReaderModal(null)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: '15px', cursor: 'pointer', padding: '8px 0' }}>← Back</button>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => handleEditEntry(showReaderModal)} style={{ background: 'transparent', borderWidth: '1px', borderStyle: 'solid', borderColor: '#D4A843', color: '#D4A843', borderRadius: '8px', padding: '6px 16px', fontSize: '13px', cursor: 'pointer' }}>{t('common.edit')}</button>
                <button onClick={() => handleDeleteEntry(showReaderModal)} style={{ background: 'rgba(239,68,68,0.15)', borderWidth: '1px', borderStyle: 'solid', borderColor: 'rgba(239,68,68,0.4)', color: '#ef4444', borderRadius: '8px', padding: '6px 16px', fontSize: '13px', cursor: 'pointer' }}>{t('common.delete')}</button>
              </div>
            </div>

            {/* Date + mood */}
            <div style={{ marginBottom: '24px' }}>
              <h1 style={{ fontSize: '36px', fontWeight: '700', color: '#ffffff', marginTop: '0', marginBottom: '4px', fontFamily: 'Georgia, serif' }}>{new Date(showReaderModal.created_at || Date.now()).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' })}</h1>
              <p style={{ fontSize: '11px', color: '#D4A843', marginTop: '0', marginBottom: '12px', letterSpacing: '0.15em', textTransform: 'uppercase' }}>{new Date(showReaderModal.created_at || Date.now()).toLocaleDateString(i18n.language, { weekday: 'long' }).toUpperCase()}</p>
              {showReaderModal.mood && (() => {
                const moodDisplay = getMoodDisplay(showReaderModal.mood)
                return (
                  <div style={{ display: 'inline-block', background: moodDisplay.color + '22', borderRadius: '20px', paddingTop: '4px', paddingBottom: '4px', paddingLeft: '12px', paddingRight: '12px', borderWidth: '1px', borderStyle: 'solid', borderColor: moodDisplay.color + '44' }}>
                    <span style={{ fontSize: '13px', color: moodDisplay.color, fontWeight: '500' }}>{moodDisplay.emoji} {moodDisplay.label}</span>
                  </div>
                )
              })()}
            </div>

            {/* Entry text card */}
            <div style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', borderWidth: '1px', borderStyle: 'solid', borderColor: 'rgba(255,255,255,0.2)', borderRadius: '16px', padding: '24px' }}>
              <p style={{ fontSize: '17px', color: 'rgba(255,255,255,0.9)', lineHeight: '1.8', marginTop: '0', marginBottom: '20px', fontFamily: 'Georgia, serif', whiteSpace: 'pre-wrap' }}>{showReaderModal.note || getEntryBodyPreview(showReaderModal)}</p>
              {showReaderModal.reference && (
                <p style={{ fontSize: '14px', color: '#D4A843', fontWeight: '600', marginTop: '16px', marginBottom: '20px', fontFamily: 'Georgia, serif' }}>{showReaderModal.reference}</p>
              )}
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginTop: '0', marginBottom: '0' }}>{(showReaderModal.note || '').split(/\s+/).filter(w => w).length} {t('journal.wordsLabel', { count: (showReaderModal.note || '').split(/\s+/).filter(w => w).length })} · {Math.max(1, Math.ceil((showReaderModal.note || '').split(/\s+/).filter(w => w).length / 200))} {t('journal.minReadLabel')}</p>
            </div>
          </div>
        )}
      </div>

      {/* Floating Compose Button */}
      {!showReaderModal && (
        <button
          type="button"
          onClick={handleOpenModal}
          style={{
            position: 'fixed',
            bottom: '90px',
            right: '20px',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            border: 'none',
            background: '#D4A843',
            color: '#0a1428',
            fontSize: '28px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(212, 168, 67, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            zIndex: 100,
            animation: 'fadeIn 0.6s ease-out 0.4s both',
          }}
        >
          +
        </button>
      )}

      {/* Mood Picker Modal */}
      {showMoodPicker && typeof document !== 'undefined' ? createPortal(
        <>
          <div
            aria-hidden="true"
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.6)',
              zIndex: 10050,
            }}
            onClick={() => setShowMoodPicker(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              width: '100%',
              maxWidth: '390px',
              margin: '0 auto',
              maxHeight: '85vh',
              overflowY: 'auto',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(212, 168, 67, 0.25)',
              borderTop: '1px solid rgba(212, 168, 67, 0.4)',
              borderRadius: '24px 24px 0 0',
              padding: '24px',
              zIndex: 10051,
              animation: 'slideUp 0.3s ease-out',
            }}
          >
            <h2 style={{
              color: '#D4A843',
              fontSize: '20px',
              fontWeight: 600,
              marginBottom: '8px',
            }}>
              How are you feeling?
            </h2>
            <p style={{
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '13px',
              marginBottom: '20px',
            }}>
              Choose a mood to tag your entry
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
            }}>
              {MOOD_OPTIONS.map((mood) => (
                <button
                  key={mood.id}
                  type="button"
                  onClick={() => handleMoodSelect(mood)}
                  style={{
                    padding: '16px',
                    borderRadius: '16px',
                    border: `1px solid ${mood.color}40`,
                    background: `${mood.color}15`,
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = `${mood.color}25`
                    e.currentTarget.style.borderColor = `${mood.color}60`
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = `${mood.color}15`
                    e.currentTarget.style.borderColor = `${mood.color}40`
                  }}
                >
                  <span style={{ fontSize: '20px' }}>{mood.emoji}</span>
                  <span>{mood.label}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowMoodPicker(false)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'transparent',
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                marginTop: '16px',
              }}
            >
              Cancel
            </button>
          </div>
        </>,
        document.body,
      ) : null}

      {/* Simple Compose Modal */}
      {showSimpleComposeModal && typeof document !== 'undefined' ? createPortal(
        <>
          <div
            aria-hidden="true"
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.6)',
              zIndex: 10050,
            }}
            onClick={() => setShowSimpleComposeModal(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              width: '100%',
              maxWidth: '390px',
              margin: '0 auto',
              maxHeight: '85vh',
              overflowY: 'auto',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(212, 168, 67, 0.25)',
              borderTop: '1px solid rgba(212, 168, 67, 0.4)',
              borderRadius: '24px 24px 0 0',
              padding: '24px',
              zIndex: 10051,
              animation: 'slideUp 0.3s ease-out',
            }}
          >
            <h2 style={{
              color: '#D4A843',
              fontSize: '20px',
              fontWeight: 600,
              marginBottom: '8px',
            }}>
              {editingEntry ? 'Edit Entry' : 'New Entry'}
            </h2>
            <p style={{
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '13px',
              marginBottom: '8px',
            }}>
              {new Date().toLocaleDateString(i18n.language, { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <textarea
              value={simpleComposeDraft}
              onChange={(e) => setSimpleComposeDraft(e.target.value)}
              style={{
                width: '100%',
                minHeight: '200px',
                borderRadius: '16px',
                border: '1px solid rgba(212, 168, 67, 0.2)',
                background: 'rgba(255, 255, 255, 0.04)',
                color: '#ffffff',
                padding: '16px',
                fontSize: '16px',
                lineHeight: 1.6,
                outline: 'none',
                resize: 'none',
                marginBottom: '12px',
              }}
              placeholder="Write your thoughts, prayers, or reflections..."
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'rgba(212, 168, 67, 0.8)'
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(212, 168, 67, 0.1)'
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(212, 168, 67, 0.2)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
            }}>
              <p style={{
                color: '#D4A843',
                fontSize: '13px',
                fontWeight: 500,
              }}>
                {simpleComposeDraft.trim().split(/\s+/).filter(w => w).length} {t('journal.wordsLabel', { count: simpleComposeDraft.trim().split(/\s+/).filter(w => w).length })}
              </p>
              <p style={{
                color: 'rgba(255, 255, 255, 0.4)',
                fontSize: '12px',
              }}>
                ~{Math.max(1, Math.ceil(simpleComposeDraft.trim().split(/\s+/).filter(w => w).length / 200))} {t('journal.minReadLabel')}
              </p>
            </div>
            <button
              type="button"
              onClick={handleSimpleComposeSave}
              disabled={simpleComposeSaving || !simpleComposeDraft.trim()}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '16px',
                border: 'none',
                background: simpleComposeSaving || !simpleComposeDraft.trim()
                  ? 'rgba(212, 168, 67, 0.3)'
                  : 'linear-gradient(135deg, #D4A843 0%, #B8860B 100%)',
                color: '#0a0f28',
                fontSize: '15px',
                fontWeight: 600,
                cursor: simpleComposeSaving || !simpleComposeDraft.trim() ? 'not-allowed' : 'pointer',
                opacity: simpleComposeSaving || !simpleComposeDraft.trim() ? 0.6 : 1,
                marginBottom: '12px',
                transition: 'all 0.2s ease',
              }}
            >
              {simpleComposeSaving ? t('common.saving') : t('journal.saveEntry')}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowSimpleComposeModal(false)
                setSimpleComposeDraft('')
                setSelectedMoodForNew(null)
                setEditingEntry(null)
              }}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'transparent',
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {t('common.cancel')}
            </button>
          </div>
        </>,
        document.body,
      ) : null}

      {showModal && typeof document !== 'undefined' ? createPortal(
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
                  {t('common.next')} →
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
      ) : null}

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
