import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { getDailyEncounter } from '../utils/dailyEncounter'
import { fetchVerse } from '../utils/bibleTranslation'
import { getLocalCalendarDateKey } from '../utils/localCalendarDate'
import {
  alignPresenceLocalWithProfile,
  getPresenceViewModel,
  profileLastActiveDateKey,
  syncPresenceState,
  isCompletedToday,
} from '../lib/presenceStreak'
import { applyDailyStreakOnAppOpen } from '../lib/dailyAppStreak'
import { useStreakTracker, syncWeeklyActiveDays, WEEK_DAY_SHORT } from '../hooks/useStreakTracker'
import DailyEncounterCard from '../components/DailyEncounterCard'
import DailyStreakCard from '../components/DailyStreakCard'
import { getJournalEntries, saveToJournal, getJournalWeekActiveDayShortNames } from '../utils/journal'
import SaveToast from '../components/SaveToast'
import FirstJournalEntryCelebration from '../components/FirstJournalEntryCelebration'
import { useAuth } from '../context/AuthContext'
import { useThemeBackgroundType } from '../hooks/useThemeBackgroundType'
import { useNameStyle, SHIMMER_KEYFRAMES } from '../hooks/useNameStyle'
import { supabase } from '../lib/supabase'
import Footer from '../components/Footer'
import WeeklyRecap, { weekKeyForDate } from '../components/WeeklyRecap'
import GuestPreviewBanner from '../components/GuestPreviewBanner'
import { useIsGuestSession } from '../hooks/useIsGuestSession'
import { useGuestSignupModal } from '../context/GuestSignupModalContext'

/** Race a promise against a timeout so streak sync cannot hang indefinitely on stalled requests. */
const STREAK_SYNC_TIMEOUT_MS = 45_000

function withAsyncTimeout(promise, ms, label) {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    Promise.resolve(promise)
      .then((v) => {
        clearTimeout(id)
        resolve(v)
      })
      .catch((e) => {
        clearTimeout(id)
        reject(e)
      })
  })
}

function parseVerseReference(reference) {
  const match = reference.match(/(\d?\s*\w+)\s+(\d+):(\d+)/)
  if (!match) return [null, null, null]
  const bookName = match[1]
  const chapter = parseInt(match[2], 10)
  const verseNum = parseInt(match[3], 10)
  const bookMap = {
    'John': 43,
    '1 Corinthians': 46,
    'Romans': 45,
    'Hebrews': 58,
    '2 Corinthians': 47,
    'Mark': 41,
    'Jeremiah': 24,
    'Psalm': 19,
    'Philippians': 50,
    'Isaiah': 23,
    'Ephesians': 49,
    '1 Thessalonians': 52,
    '1 John': 62,
    'Colossians': 51,
    'Proverbs': 20,
    'Joshua': 6,
    '2 Timothy': 55,
  }
  const book = bookMap[bookName] || 19
  return [book, chapter, verseNum]
}

function localizeReference(reference, t) {
  const match = reference.match(/(\d?\s*\w+)\s+(\d+):(\d+)/)
  if (!match) return reference
  const bookName = match[1].trim()
  const chapter = match[2]
  const verseNum = match[3]
  const bookKeyMap = {
    'John': 'bible.books.john',
    '1 Corinthians': 'bible.books.1corinthians',
    'Romans': 'bible.books.romans',
    'Hebrews': 'bible.books.hebrews',
    '2 Corinthians': 'bible.books.2corinthians',
    'Mark': 'bible.books.mark',
    'Jeremiah': 'bible.books.jeremiah',
    'Psalm': 'bible.books.psalms',
    'Philippians': 'bible.books.philippians',
    'Isaiah': 'bible.books.isaiah',
    'Ephesians': 'bible.books.ephesians',
    '1 Thessalonians': 'bible.books.1thessalonians',
    '1 John': 'bible.books.1john',
    'Colossians': 'bible.books.colossians',
    'Proverbs': 'bible.books.proverbs',
    'Joshua': 'bible.books.joshua',
    '2 Timothy': 'bible.books.2timothy',
  }
  const bookKey = bookKeyMap[bookName]
  const localizedBook = bookKey ? t(bookKey) : bookName
  return `${localizedBook} ${chapter}:${verseNum}`
}

function Home() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { user, profile, loading, refreshProfile } = useAuth()
  const isGuestSession = useIsGuestSession()
  const { openGuestSignupModal } = useGuestSignupModal()
  const skyPeriod = useThemeBackgroundType()
  const { activeDays: profileWeekActiveDays } = useStreakTracker(user?.id)
  const nameStyle = useNameStyle(profile?.supporter_tier)
  const [journalWeekActiveDays, setJournalWeekActiveDays] = useState([])
  const [dailyEncounter, setDailyEncounter] = useState(() => getDailyEncounter())
  const [dailyVerseText, setDailyVerseText] = useState('')
  const [dailyVerseLoading, setDailyVerseLoading] = useState(true)
  const [toastTrigger, setToastTrigger] = useState(0)
  const [verseOfWeekText, setVerseOfWeekText] = useState('')
  const [verseOfWeekLoading, setVerseOfWeekLoading] = useState(true)
  const [showFirstJournalCelebration, setShowFirstJournalCelebration] = useState(false)
  const [journalCount, setJournalCount] = useState(0)
  const [suppressPersonalWelcome, setSuppressPersonalWelcome] = useState(false)
  const [presenceJustCompleted, setPresenceJustCompleted] = useState(false)
  /** True while a check-in is in flight so the CTA shows the completed state immediately. */
  const [presenceOptimisticDone, setPresenceOptimisticDone] = useState(false)
  const [presenceCtaSyncing, setPresenceCtaSyncing] = useState(false)
  const [presenceSaveError, setPresenceSaveError] = useState(null)
  const presenceGlowTimerRef = useRef(null)
  /** Reuse one in-flight sync promise so concurrent callers await the same work (no silent `null`). */
  const streakSyncPromiseRef = useRef(null)
  const presenceCtaBusyRef = useRef(false)
  const legacyStreakRepairKeyRef = useRef('')

  const presenceVm = useMemo(() => {
    if (!user?.id) return { completedToday: false, currentStreak: 0 }
    if (profile?.id === user.id) {
      const today = getLocalCalendarDateKey()
      const last = profileLastActiveDateKey(profile.last_active_date)
      let streak = Number(profile.reading_streak) || 0
      if (last === today) streak = Math.max(streak, 1)
      if (presenceOptimisticDone && last !== today) streak = Math.max(streak, 1)
      return {
        completedToday: last === today || presenceOptimisticDone,
        currentStreak: streak,
      }
    }
    return getPresenceViewModel(syncPresenceState(user.id))
  }, [user?.id, profile?.id, profile?.last_active_date, profile?.reading_streak, presenceOptimisticDone])

  const mergedWeekActiveDays = useMemo(() => {
    const set = new Set([...profileWeekActiveDays, ...journalWeekActiveDays])
    return WEEK_DAY_SHORT.filter((d) => set.has(d))
  }, [profileWeekActiveDays, journalWeekActiveDays])

  /** Consecutive-day streak from profile; if `last_active_date` is today (or optimistic check-in), show at least 1. */
  const dailyStreakCount = useMemo(() => {
    const today = getLocalCalendarDateKey()
    const last = profileLastActiveDateKey(profile?.last_active_date)
    let n = Number(profile?.reading_streak) || 0
    console.log('[Home] Streak from profile:', {
      reading_streak: profile?.reading_streak,
      last_active_date: profile?.last_active_date,
      last,
      today,
      computedStreak: n,
      presenceOptimisticDone,
    })
    if (last === today) n = Math.max(n, 1)
    if (presenceOptimisticDone && profile?.id === user?.id && last !== today) n = Math.max(n, 1)
    return n
  }, [profile?.reading_streak, profile?.last_active_date, profile?.id, user?.id, presenceOptimisticDone])

  const syncStreakToSupabase = useCallback(async () => {
    const uid = user?.id
    if (!uid) {
      console.log('[presence-check-in] syncStreakToSupabase: abort — user id is null/undefined')
      return { ok: false, code: 'no_user', message: 'Not signed in' }
    }
    if (streakSyncPromiseRef.current) {
      console.log('[presence-check-in] syncStreakToSupabase: awaiting in-flight sync for user', uid)
      return streakSyncPromiseRef.current
    }

    const run = async () => {
      console.log('[presence-check-in] ========== streak sync START ==========', {
        userId: uid,
        table: 'public.profiles',
        ops: 'SELECT/UPDATE (RLS: own row only)',
      })
      try {
        console.log('[presence-check-in] step 1: syncWeeklyActiveDays', { userId: uid })
        const w = await withAsyncTimeout(syncWeeklyActiveDays(uid), STREAK_SYNC_TIMEOUT_MS, 'syncWeeklyActiveDays')
        console.log('[presence-check-in] step 1 response:', w)

        console.log('[presence-check-in] step 2: applyDailyStreakOnAppOpen (profiles SELECT + conditional UPDATE)', {
          userId: uid,
        })
        const streakResult = await withAsyncTimeout(
          applyDailyStreakOnAppOpen(uid),
          STREAK_SYNC_TIMEOUT_MS,
          'applyDailyStreakOnAppOpen',
        )
        console.log('[presence-check-in] step 2 response (data from function, not raw PostgREST):', streakResult)

        console.log('[presence-check-in] step 3: Supabase query', {
          description: "from('profiles').select('*').eq('id', userId).maybeSingle()",
          userId: uid,
        })
        const { data: row, error: selectError } = await withAsyncTimeout(
          supabase.from('profiles').select('*').eq('id', uid).maybeSingle(),
          STREAK_SYNC_TIMEOUT_MS,
          'profiles.select merge read',
        )
        console.log('[presence-check-in] step 3 PostgREST response:', { 
          data: row, 
          error: selectError,
          reading_streak: row?.reading_streak,
          last_active_date: row?.last_active_date,
        })

        if (selectError) {
          console.error('[presence-check-in] step 3 select error (full)', JSON.stringify(selectError, null, 2), selectError)
          console.warn('[presence-check-in] step 3 select error — calling refreshProfile()', selectError)
          await withAsyncTimeout(refreshProfile(), STREAK_SYNC_TIMEOUT_MS, 'refreshProfile after select error')
          return {
            ok: false,
            code: 'select_error',
            message: selectError.message || String(selectError),
            streakResult,
            merged: null,
          }
        }

        if (!row) {
          console.warn('[presence-check-in] step 3: no profile row returned for user', uid)
          await withAsyncTimeout(refreshProfile(), STREAK_SYNC_TIMEOUT_MS, 'refreshProfile no row')
          return { ok: false, code: 'no_profile_row', message: 'Profile row not found' }
        }

        if (streakResult && streakResult.ok === false) {
          console.warn(
            '[presence-check-in] applyDailyStreakOnAppOpen reported ok:false (RLS, network, or UPDATE rejected)',
            streakResult,
          )
        }

        const today = getLocalCalendarDateKey()
        const last = profileLastActiveDateKey(row.last_active_date)

        if (streakResult?.ok === false && last !== today) {
          console.warn('[presence-check-in] streak apply failed and last_active_date is not today — treating as failure', {
            last,
            today,
          })
          return {
            ok: false,
            code: 'streak_apply_failed',
            message: 'Could not update your streak in the database.',
            streakResult,
          }
        }

        let rs = Number(row.reading_streak) || 0
        console.log('[presence-check-in] step 4: calculating merged streak', {
          rowReadingStreak: row.reading_streak,
          streakResultCurrentStreak: streakResult?.currentStreak,
          last,
          today,
          calculatedRs: rs,
        })
        if (streakResult?.ok) {
          rs = Math.max(rs, Number(streakResult.currentStreak) || 0)
        }
        if (last === today) {
          rs = Math.max(rs, 1)
        }
        const merged = { ...row, reading_streak: rs }

        console.log('[presence-check-in] step 4: refreshProfile(merged) — updating React state without second network round-trip', {
          reading_streak: merged.reading_streak,
          last_active_date: merged.last_active_date,
        })
        await refreshProfile(merged)
        alignPresenceLocalWithProfile(uid, merged)

        console.log('[presence-check-in] ========== streak sync DONE (ok) ==========')
        return { ok: true, streakResult, merged }
      } catch (e) {
        console.error('[presence-check-in] ========== streak sync FAILED ==========', e)
        try {
          await refreshProfile()
        } catch (refreshErr) {
          console.warn('[presence-check-in] refreshProfile after failure also failed', refreshErr)
        }
        return {
          ok: false,
          code: 'exception',
          message: e?.message || String(e),
          error: e,
        }
      }
    }

    const p = run().finally(() => {
      streakSyncPromiseRef.current = null
    })
    streakSyncPromiseRef.current = p
    return p
  }, [user?.id, refreshProfile])

  const finishPresenceGlow = useCallback(() => {
    if (presenceGlowTimerRef.current) clearTimeout(presenceGlowTimerRef.current)
    presenceGlowTimerRef.current = setTimeout(() => setPresenceJustCompleted(false), 4200)
  }, [])

  const handlePresenceComplete = useCallback(async () => {
    if (isGuestSession) {
      openGuestSignupModal()
      return
    }
    console.log('[presence-check-in] handlePresenceComplete (I showed up today) invoked', {
      userId: user?.id ?? null,
      profileLastActive: profile?.last_active_date ?? null,
    })
    if (!user?.id) {
      console.warn('[presence-check-in] handlePresenceComplete: no user id — abort')
      setPresenceSaveError(t('home.presenceSaveFailed'))
      return
    }
    const today = getLocalCalendarDateKey()
    const lastDb = profileLastActiveDateKey(profile?.last_active_date)
    if (lastDb === today) {
      console.log('[presence-check-in] handlePresenceComplete: already checked in today (last_active_date) — no-op', {
        lastDb,
        today,
      })
      return
    }
    if (presenceCtaBusyRef.current) {
      console.log('[presence-check-in] handlePresenceComplete: busy ref set — ignoring duplicate click')
      return
    }
    presenceCtaBusyRef.current = true
    setPresenceSaveError(null)
    setPresenceOptimisticDone(true)
    setPresenceCtaSyncing(true)
    try {
      const result = await syncStreakToSupabase()
      console.log('[presence-check-in] handlePresenceComplete: sync result', result)
      if (!result?.ok) {
        setPresenceOptimisticDone(false)
        const msg =
          result?.code === 'streak_apply_failed'
            ? t('home.presenceSaveFailedDetail')
            : result?.message || t('home.presenceSaveFailed')
        setPresenceSaveError(msg)
        return
      }
      setPresenceJustCompleted(true)
      finishPresenceGlow()
    } catch (err) {
      setPresenceOptimisticDone(false)
      console.error('[presence-check-in] handlePresenceComplete unexpected throw', err)
      setPresenceSaveError(err?.message || t('home.presenceSaveFailed'))
    } finally {
      presenceCtaBusyRef.current = false
      setPresenceCtaSyncing(false)
    }
  }, [
    isGuestSession,
    openGuestSignupModal,
    user?.id,
    profile?.last_active_date,
    syncStreakToSupabase,
    finishPresenceGlow,
    t,
  ])

  useEffect(() => {
    setPresenceOptimisticDone(false)
  }, [user?.id])

  useEffect(() => {
    const today = getLocalCalendarDateKey()
    const last = profileLastActiveDateKey(profile?.last_active_date)
    if (last === today) setPresenceOptimisticDone(false)
  }, [profile?.last_active_date])

  /** Repair legacy rows where last_active_date is today but reading_streak was never incremented. */
  useEffect(() => {
    if (!user?.id || !profile || profile.id !== user.id) return
    const today = getLocalCalendarDateKey()
    const last = profileLastActiveDateKey(profile.last_active_date)
    const rs = Number(profile.reading_streak) || 0
    if (last !== today || rs !== 0) return
    const key = `${user.id}:${today}`
    if (legacyStreakRepairKeyRef.current === key) return
    legacyStreakRepairKeyRef.current = key
    void syncStreakToSupabase()
  }, [user?.id, profile, syncStreakToSupabase])

  const markPresenceFromEngagement = useCallback(async () => {
    if (!user?.id) return
    const today = getLocalCalendarDateKey()
    const lastDb = profileLastActiveDateKey(profile?.last_active_date)
    if (lastDb === today || isCompletedToday(syncPresenceState(user.id))) return
    try {
      const result = await syncStreakToSupabase()
      if (!result?.ok) return
      setPresenceJustCompleted(true)
      finishPresenceGlow()
    } catch (err) {
      console.warn('[presence-check-in] markPresenceFromEngagement:', err)
    }
  }, [user?.id, profile?.last_active_date, syncStreakToSupabase, finishPresenceGlow])

  useEffect(() => {
    if (profile) setSuppressPersonalWelcome(false)
  }, [profile])

  useEffect(() => {
    let timeoutId
    const scheduleNextMidnight = () => {
      setDailyEncounter(getDailyEncounter())
      refreshProfile()
      const now = new Date()
      const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0)
      const ms = Math.max(1000, nextMidnight - now)
      timeoutId = setTimeout(scheduleNextMidnight, ms)
    }
    scheduleNextMidnight()
    return () => clearTimeout(timeoutId)
  }, [refreshProfile])

  useEffect(() => {
    const loadDailyVerse = async () => {
      setDailyVerseLoading(true)
      const lang = (i18n.resolvedLanguage || i18n.language || 'en').toLowerCase().split(/[-_]/)[0]
      const verse = dailyEncounter.reference
      const [book, chapter, verseNum] = parseVerseReference(verse)
      const cacheKey = `verse-cache-${lang}-${book}-${chapter}-${verseNum}`
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        console.log('[Home] using cached daily verse')
        setDailyVerseText(cached)
        setDailyVerseLoading(false)
        return
      }
      try {
        const text = await fetchVerse(book, chapter, verseNum, lang)
        console.log('[Home] daily verse result:', text)
        localStorage.setItem(cacheKey, text)
        setDailyVerseText(text)
      } catch (err) {
        console.error('[Home] daily verse fetch failed:', err)
        setDailyVerseText('')
      } finally {
        setDailyVerseLoading(false)
      }
    }

    loadDailyVerse()
  }, [dailyEncounter.reference, i18n.resolvedLanguage, i18n.language])


  // Refresh profile on mount to ensure reading_streak is up to date
  useEffect(() => {
    if (user?.id && !loading) {
      refreshProfile()
    }
  }, [user?.id, loading, refreshProfile])


  useEffect(() => {
    return () => {
      if (presenceGlowTimerRef.current) clearTimeout(presenceGlowTimerRef.current)
    }
  }, [])

  useEffect(() => {
    const loadVerseOfWeek = async () => {
      setVerseOfWeekLoading(true)
      const lang = (i18n.resolvedLanguage || i18n.language || 'en').toLowerCase().split(/[-_]/)[0]
      console.log('[Home] fetching verse for lang:', lang)
      const cacheKey = `verse-cache-${lang}-19-23-1`
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        console.log('[Home] using cached verse')
        setVerseOfWeekText(cached)
        setVerseOfWeekLoading(false)
        return
      }
      try {
        const text = await fetchVerse(19, 23, 1, lang)
        console.log('[Home] verse result:', text)
        localStorage.setItem(cacheKey, text)
        setVerseOfWeekText(text)
      } catch (err) {
        console.error('[Home] verse fetch failed:', err)
        setVerseOfWeekText(t('home.verseWeekText'))
      } finally {
        setVerseOfWeekLoading(false)
      }
    }

    loadVerseOfWeek()
  }, [i18n.resolvedLanguage, i18n.language, t])

  const handleSaveDailyVerse = useCallback(async () => {
    if (isGuestSession) {
      openGuestSignupModal()
      return
    }
    const result = await saveToJournal({
      verse: dailyVerseLoading ? '' : dailyVerseText,
      reference: dailyEncounter.reference,
      tags: [t('home.journalTagDaily')],
    })
    if (result?.isFirstJournalEntry) setShowFirstJournalCelebration(true)
    setToastTrigger((x) => x + 1)
  }, [dailyEncounter, dailyVerseText, dailyVerseLoading, t, isGuestSession, openGuestSignupModal])

  const handleSaveVerseOfWeek = useCallback(async () => {
    if (isGuestSession) {
      openGuestSignupModal()
      return
    }
    const result = await saveToJournal({
      verse: verseOfWeekLoading ? t('home.verseWeekText') : verseOfWeekText,
      reference: verseOfWeekLoading ? t('home.verseWeekRef') : `${t('bible.books.psalms')} 23:1`,
      tags: [t('home.journalTagDaily')],
    })
    if (result?.isFirstJournalEntry) setShowFirstJournalCelebration(true)
    setToastTrigger((x) => x + 1)
  }, [t, isGuestSession, openGuestSignupModal])

  const handleShareDailyVerse = useCallback(async () => {
    const verse = dailyEncounter?.text ?? ''
    const reference = dailyEncounter?.reference ?? ''
    if (!verse || !reference) return

    if (navigator.share) {
      try {
        await navigator.share({
          title: t('home.shareTitle'),
          text: `${verse} — ${reference}`,
          url: t('home.shareUrl'),
        })
        return
      } catch {
        // Fall through to PNG download.
      }
    }

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvas.width = 1080
    canvas.height = 1080

    const gradient = ctx.createLinearGradient(0, 0, 1080, 1080)
    gradient.addColorStop(0, '#0d1f4e')
    gradient.addColorStop(1, '#D4A843')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 1080, 1080)

    ctx.fillStyle = 'rgba(255,255,255,0.06)'
    ctx.fillRect(80, 90, 920, 900)
    ctx.strokeStyle = 'rgba(255,230,170,0.55)'
    ctx.lineWidth = 3
    ctx.strokeRect(80, 90, 920, 900)

    ctx.fillStyle = '#F7E7B5'
    ctx.font = '700 46px Georgia'
    ctx.textAlign = 'center'
    ctx.fillText(t('home.canvasBrand'), 540, 170)

    const wrapText = (text, maxWidth) => {
      const words = text.split(' ')
      const lines = []
      let line = ''
      for (const word of words) {
        const candidate = line ? `${line} ${word}` : word
        if (ctx.measureText(candidate).width <= maxWidth) line = candidate
        else {
          if (line) lines.push(line)
          line = word
        }
      }
      if (line) lines.push(line)
      return lines
    }

    ctx.fillStyle = '#FFFFFF'
    ctx.font = 'italic 56px Georgia'
    const lines = wrapText(`"${verse}"`, 780)
    const startY = 420 - (lines.length * 70) / 2
    lines.forEach((line, index) => ctx.fillText(line, 540, startY + index * 70))

    ctx.fillStyle = '#F7E7B5'
    ctx.font = '700 38px Arial'
    ctx.fillText(reference, 540, startY + lines.length * 70 + 70)
    ctx.fillStyle = 'rgba(255,255,255,0.78)'
    ctx.font = '28px Arial'
    ctx.fillText(t('home.canvasFooter'), 540, 930)

    const link = document.createElement('a')
    link.href = canvas.toDataURL('image/png')
    link.download = t('home.pngDownloadName')
    link.click()
  }, [dailyVerseText, dailyVerseLoading, dailyEncounter, t])

  const handleEncounterWrite = useCallback(() => {
    markPresenceFromEngagement()
    navigate('/journal', {
      state: {
        dailyEncounter: {
          verseText: dailyVerseLoading ? '' : dailyVerseText,
          reference: dailyEncounter.reference,
          reflection: t(dailyEncounter.reflectionKey),
          prompt: t(dailyEncounter.promptKey),
        },
      },
    })
  }, [markPresenceFromEngagement, navigate, dailyEncounter, dailyVerseText, dailyVerseLoading, t])

  const handleEncounterPray = useCallback(() => {
    markPresenceFromEngagement()
    const seed = [
      `${dailyEncounter.reference}`,
      '',
      dailyVerseLoading ? '' : dailyVerseText,
      '',
      t(dailyEncounter.reflectionKey),
      '',
      t(dailyEncounter.promptKey),
    ].join('\n')
    navigate('/prayer', {
      state: {
        dailyPrayerSeed: { text: seed },
      },
    })
  }, [markPresenceFromEngagement, navigate, dailyEncounter, dailyVerseText, dailyVerseLoading, t])

  const handleEncounterAskAi = useCallback(() => {
    if (isGuestSession) {
      openGuestSignupModal()
      return
    }
    markPresenceFromEngagement()
    navigate('/ai-companion', {
      state: {
        aiCompanionContext: {
          verse: dailyVerseLoading ? '' : dailyVerseText,
          reference: dailyEncounter.reference,
          reflection: t(dailyEncounter.reflectionKey),
          prompt: t(dailyEncounter.promptKey),
        },
      },
    })
  }, [isGuestSession, markPresenceFromEngagement, navigate, dailyEncounter, dailyVerseText, dailyVerseLoading, t, openGuestSignupModal])

  useEffect(() => {
    let active = true
    const loadCount = async () => {
      if (!user?.id) {
        setJournalWeekActiveDays([])
        return
      }
      const entries = await getJournalEntries(user.id)
      const weekDays = await getJournalWeekActiveDayShortNames(user.id)
      if (!active) return
      setJournalCount(entries.length)
      setJournalWeekActiveDays(weekDays)
    }
    loadCount()
    return () => { active = false }
  }, [user?.id, toastTrigger])

  // Presence streak + last_active_date use getLocalCalendarDateKey() — same local Date as this (not UTC).
  const hour = new Date().getHours()
  let timeGreeting = ''
  let timeEmoji = ''
  if (skyPeriod === 'night') {
    timeGreeting = t('home.greetEvening')
    timeEmoji = '🌙'
  } else if (skyPeriod === 'sunset') {
    timeGreeting = t('home.greetEvening')
    timeEmoji = '🌇'
  } else if (hour >= 5 && hour < 12) {
    timeGreeting = t('home.greetMorning')
    timeEmoji = '🌅'
  } else if (hour >= 12 && hour < 18) {
    timeGreeting = t('home.greetAfternoon')
    timeEmoji = '☀️'
  } else {
    timeGreeting = t('home.greetEvening')
    timeEmoji = '🌇'
  }

  const friendFallback = t('home.friendFallback')
  const firstName = suppressPersonalWelcome
    ? friendFallback
    : (profile?.display_name?.trim()?.split(/\s+/)[0]
      || profile?.full_name?.split(' ')[0]
      || friendFallback)

  return (
    <>
      <style>{SHIMMER_KEYFRAMES}</style>
      <div
        className="content-scroll home-page home-page-premium-enter"
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 'calc(100dvh - 56px - 80px)',
          padding: '60px 16px 0',
          maxWidth: '680px',
          margin: '0 auto',
          width: '100%',
        boxSizing: 'border-box',
        background: 'transparent',
      }}
    >
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <GuestPreviewBanner />
          <section style={{ marginBottom: 0 }}>
            <div style={{ marginBottom: '20px' }}>
              <p style={{
                color: 'var(--heading-text)',
                fontSize: '28px',
                fontWeight: 800,
                marginBottom: '4px',
                letterSpacing: '-0.02em',
                lineHeight: 1.22,
              }}>
                {timeGreeting}, <span style={nameStyle}>{firstName}</span> {timeEmoji}
              </p>
              <p style={{
                color: 'var(--text-secondary)',
                fontSize: '15px',
                fontWeight: 400,
                marginBottom: '32px',
                opacity: 0.6,
                letterSpacing: '0.02em',
                lineHeight: 1.5,
              }}>
                {t('home.enc2')}
              </p>
            </div>
            <DailyEncounterCard
              encounter={{
                ...dailyEncounter,
                text: dailyVerseText,
                reference: localizeReference(dailyEncounter.reference, t),
                reflection: t(dailyEncounter.reflectionKey),
                prompt: t(dailyEncounter.promptKey),
              }}
              onWrite={handleEncounterWrite}
              onPray={handleEncounterPray}
              onAskAi={handleEncounterAskAi}
              onShareImage={handleShareDailyVerse}
              onQuickSave={handleSaveDailyVerse}
              presence={{
                completedToday: presenceVm.completedToday,
                currentStreak: presenceVm.currentStreak,
                justCompleted: presenceJustCompleted,
                ctaSyncing: presenceCtaSyncing,
                saveError: presenceSaveError,
              }}
              onPresenceComplete={handlePresenceComplete}
            />

            <DailyStreakCard
              activeDays={mergedWeekActiveDays}
              consecutiveStreak={dailyStreakCount}
            />

            {user?.id && (mergedWeekActiveDays.length > 0 || journalCount > 0 || dailyStreakCount > 0) ? (
              <WeeklyRecap
                userId={user.id}
                profile={profile}
                weekStorageKey={weekKeyForDate()}
                autoGenerate={false}
              />
            ) : null}

            <div style={{ marginBottom: '28px', animation: 'fadeInUp 0.6s ease forwards', animationDelay: '0.3s' }}>
              <h2 style={{ color: 'var(--section-title)', fontSize: '13px', letterSpacing: '0.12em', fontWeight: 500, textTransform: 'uppercase' }}>{t('home.toolsHeading')}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              <Link
                to="/bible-videos"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(212,168,67,0.15)',
                  borderRadius: '16px',
                  backdropFilter: 'blur(8px)',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'rgba(212,168,67,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  marginBottom: '8px',
                }}>🎬</div>
                <p style={{ fontSize: '14px', fontWeight: 700, color: 'white', margin: 0 }}>{t('home.toolBibleVideos')}</p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', margin: '4px 0 0 0' }}>{t('home.toolBibleVideosSub')}</p>
              </Link>
              <Link
                to="/worship"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(212,168,67,0.15)',
                  borderRadius: '16px',
                  backdropFilter: 'blur(8px)',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'rgba(212,168,67,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  marginBottom: '8px',
                }}>🎵</div>
                <p style={{ fontSize: '14px', fontWeight: 700, color: 'white', margin: 0 }}>{t('home.worshipMode')}</p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', margin: '4px 0 0 0' }}>{t('home.worshipSubtitle')}</p>
              </Link>
              <Link
                to="/reading-plans"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(212,168,67,0.15)',
                  borderRadius: '16px',
                  backdropFilter: 'blur(8px)',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'rgba(212,168,67,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  marginBottom: '8px',
                }}>📅</div>
                <p style={{ fontSize: '14px', fontWeight: 700, color: 'white', margin: 0 }}>{t('home.toolReadingPlans')}</p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', margin: '4px 0 0 0' }}>{t('home.toolReadingPlansSub')}</p>
              </Link>
              <Link
                to="/fasting"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(212,168,67,0.15)',
                  borderRadius: '16px',
                  backdropFilter: 'blur(8px)',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'rgba(212,168,67,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  marginBottom: '8px',
                }}>🕐</div>
                <p style={{ fontSize: '14px', fontWeight: 700, color: 'white', margin: 0 }}>{t('home.toolFasting')}</p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', margin: '4px 0 0 0' }}>{t('home.toolFastingSub')}</p>
              </Link>
              <Link
                to="/support"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(212,168,67,0.15)',
                  borderRadius: '16px',
                  backdropFilter: 'blur(8px)',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'rgba(212,168,67,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  marginBottom: '8px',
                }}>🤝</div>
                <p style={{ fontSize: '14px', fontWeight: 700, color: 'white', margin: 0 }}>{t('home.toolSupport')}</p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', margin: '4px 0 0 0' }}>{t('home.toolSupportSub')}</p>
              </Link>
              <Link
                to="/testimony-wall"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(212,168,67,0.15)',
                  borderRadius: '16px',
                  backdropFilter: 'blur(8px)',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'rgba(212,168,67,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  marginBottom: '8px',
                }}>📜</div>
                <p style={{ fontSize: '14px', fontWeight: 700, color: 'white', margin: 0 }}>{t('home.toolCommunity')}</p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', margin: '4px 0 0 0' }}>{t('home.toolCommunitySub')}</p>
              </Link>
            </div>
          </div>

          <div
            className="home-gold-glass rounded-2xl p-6"
            style={{
              borderRadius: '16px',
              animation: 'fadeInUp 0.6s ease forwards',
              animationDelay: '0.4s'
            }}
          >
            <div className="relative" style={{ borderLeft: '3px solid #D4A843', paddingLeft: '16px' }}>
              <span style={{ 
                position: 'absolute', 
                top: '-20px', 
                left: 0, 
                fontSize: '60px', 
                lineHeight: 1, 
                color: 'rgba(212,168,67,0.3)',
                fontFamily: 'Georgia, serif'
              }}>"</span>
              <p style={{ 
                fontSize: '12px', 
                fontWeight: 500, 
                letterSpacing: '0.12em',
                color: 'var(--section-title)',
                textTransform: 'uppercase',
                marginBottom: '16px'
              }}>{t('home.verseOfWeek')}</p>
              <p style={{ 
                marginTop: '16px', 
                fontSize: '17px', 
                lineHeight: 1.6,
                color: 'white',
                fontStyle: 'italic',
                fontFamily: 'Georgia, serif',
              }}>
                "{verseOfWeekLoading ? t('home.verseWeekText') : verseOfWeekText}"
              </p>
            </div>
            <p style={{ 
              marginTop: '8px', 
              fontSize: '13px', 
              fontWeight: 700, 
              letterSpacing: '0.1em',
              color: '#D4A843'
            }}>{verseOfWeekLoading ? t('home.verseWeekRef') : `${t('bible.books.psalms')} 23:1`}</p>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={handleSaveVerseOfWeek}
                style={{
                  background: 'var(--btn-primary-bg)',
                  color: 'var(--btn-primary-text)',
                  border: 'none',
                  borderRadius: '50px',
                  padding: '8px 14px',
                  fontWeight: 600,
                  fontSize: '13px',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 15px rgba(212,168,67,0.3)'
                }}
              >
                {t('home.saveToJournal')}
              </button>
            </div>
          </div>
        </section>
        </div>
        <Footer compact />
        <SaveToast trigger={toastTrigger} />
        <FirstJournalEntryCelebration
          open={showFirstJournalCelebration}
          onClose={() => setShowFirstJournalCelebration(false)}
        />
      </div>
    </>
  )
}

export default Home
