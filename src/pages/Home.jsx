import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { getDailyEncounter } from '../utils/dailyEncounter'
import {
  getPresenceViewModel,
  markPresenceComplete,
  syncPresenceState,
  isCompletedToday,
} from '../lib/presenceStreak'
import DailyEncounterCard from '../components/DailyEncounterCard'
import DailyStreakCard from '../components/DailyStreakCard'
import { getJournalEntries, saveToJournal, getJournalWeekActiveDayShortNames } from '../utils/journal'
import SaveToast from '../components/SaveToast'
import FirstJournalEntryCelebration from '../components/FirstJournalEntryCelebration'
import { useAuth } from '../context/AuthContext'

function Home({ onOpenWorship, worshipStatus }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { user, profile, loading, refreshProfile } = useAuth()
  const [journalWeekActiveDays, setJournalWeekActiveDays] = useState([])
  const [dailyEncounter, setDailyEncounter] = useState(() => getDailyEncounter())
  const [toastTrigger, setToastTrigger] = useState(0)
  const [showFirstJournalCelebration, setShowFirstJournalCelebration] = useState(false)
  const [journalCount, setJournalCount] = useState(0)
  const [suppressPersonalWelcome, setSuppressPersonalWelcome] = useState(false)
  const [presenceVm, setPresenceVm] = useState(() => getPresenceViewModel(syncPresenceState()))
  const [presenceJustCompleted, setPresenceJustCompleted] = useState(false)
  const presenceGlowTimerRef = useRef(null)

  const refreshPresence = useCallback(() => {
    setPresenceVm(getPresenceViewModel(syncPresenceState()))
  }, [])

  const finishPresenceGlow = useCallback(() => {
    if (presenceGlowTimerRef.current) clearTimeout(presenceGlowTimerRef.current)
    presenceGlowTimerRef.current = setTimeout(() => setPresenceJustCompleted(false), 4200)
  }, [])

  const handlePresenceComplete = useCallback(() => {
    markPresenceComplete()
    refreshPresence()
    setPresenceJustCompleted(true)
    finishPresenceGlow()
  }, [refreshPresence, finishPresenceGlow])

  const markPresenceFromEngagement = useCallback(() => {
    if (isCompletedToday(syncPresenceState())) return
    markPresenceComplete()
    refreshPresence()
    setPresenceJustCompleted(true)
    finishPresenceGlow()
  }, [refreshPresence, finishPresenceGlow])

  useEffect(() => {
    if (profile) setSuppressPersonalWelcome(false)
  }, [profile])

  useEffect(() => {
    if (user?.id && profile && !loading) {
      const isComplete = profile.onboarding_complete === true || localStorage.getItem('onboarding_complete') === 'true'
      if (!isComplete) {
        navigate('/onboarding')
      }
    }
  }, [user?.id, profile, loading, navigate])

  useEffect(() => {
    let timeoutId
    const scheduleNextMidnight = () => {
      setDailyEncounter(getDailyEncounter())
      refreshPresence()
      refreshProfile()
      const now = new Date()
      const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0)
      const ms = Math.max(1000, nextMidnight - now)
      timeoutId = setTimeout(scheduleNextMidnight, ms)
    }
    scheduleNextMidnight()
    return () => clearTimeout(timeoutId)
  }, [refreshPresence, refreshProfile])

  useEffect(() => {
    return () => {
      if (presenceGlowTimerRef.current) clearTimeout(presenceGlowTimerRef.current)
    }
  }, [])

  const handleSaveDailyVerse = useCallback(async () => {
    const result = await saveToJournal({
      verse: dailyEncounter.text,
      reference: dailyEncounter.reference,
      tags: [t('home.journalTagDaily')],
    })
    if (result?.isFirstJournalEntry) setShowFirstJournalCelebration(true)
    setToastTrigger((x) => x + 1)
  }, [dailyEncounter, t])

  const handleSaveVerseOfWeek = useCallback(async () => {
    const result = await saveToJournal({
      verse: t('home.verseWeekText'),
      reference: t('home.verseWeekRef'),
      tags: [t('home.journalTagDaily')],
    })
    if (result?.isFirstJournalEntry) setShowFirstJournalCelebration(true)
    setToastTrigger((x) => x + 1)
  }, [t])

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
  }, [dailyEncounter, t])

  const handleEncounterWrite = useCallback(() => {
    markPresenceFromEngagement()
    navigate('/journal', {
      state: {
        dailyEncounter: {
          verseText: dailyEncounter.text,
          reference: dailyEncounter.reference,
          reflection: dailyEncounter.reflection,
          prompt: dailyEncounter.prompt,
        },
      },
    })
  }, [markPresenceFromEngagement, navigate, dailyEncounter])

  const handleEncounterPray = useCallback(() => {
    markPresenceFromEngagement()
    const seed = [
      `${dailyEncounter.reference}`,
      '',
      dailyEncounter.text,
      '',
      dailyEncounter.reflection,
      '',
      dailyEncounter.prompt,
    ].join('\n')
    navigate('/prayer', {
      state: {
        dailyPrayerSeed: { text: seed },
      },
    })
  }, [markPresenceFromEngagement, navigate, dailyEncounter])

  const handleEncounterAskAi = useCallback(() => {
    markPresenceFromEngagement()
    navigate('/ai-companion', {
      state: {
        aiCompanionContext: {
          verse: dailyEncounter.text,
          reference: dailyEncounter.reference,
          reflection: dailyEncounter.reflection,
          prompt: dailyEncounter.prompt,
        },
      },
    })
  }, [markPresenceFromEngagement, navigate, dailyEncounter])

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

  const hour = new Date().getHours()
  let timeGreeting = ''
  let timeEmoji = ''
  if (hour >= 5 && hour < 12) {
    timeGreeting = t('home.greetMorning')
    timeEmoji = '🌅'
  } else if (hour >= 12 && hour < 18) {
    timeGreeting = t('home.greetAfternoon')
    timeEmoji = '☀️'
  } else {
    timeGreeting = t('home.greetEvening')
    timeEmoji = '🌇'
  }

  const encouragement = t(`home.enc${new Date().getDay()}`)

  const friendFallback = t('home.friendFallback')
  const firstName = suppressPersonalWelcome
    ? friendFallback
    : (profile?.full_name?.split(' ')[0] || user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || friendFallback)

  return (
    <>
      <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden', background: 'transparent', paddingBottom: '120px', paddingTop: '60px' }}>
        <div
          className="content-scroll"
          style={{
            padding: '0 16px',
            maxWidth: '680px',
            margin: '0 auto',
            width: '100%',
            background: 'transparent !important'
          }}
        >
          <section style={{ marginBottom: '28px' }}>
            <div style={{ marginBottom: '20px' }}>
              <p style={{ 
                color: 'var(--heading-text)', 
                fontSize: '22px', 
                fontWeight: 700, 
                marginBottom: '4px' 
              }}>
                {timeGreeting}, {firstName} {timeEmoji}
              </p>
              <p style={{
                color: 'var(--text-secondary)',
                fontSize: '13px',
                marginBottom: '32px'
              }}>
                {encouragement}
              </p>
            </div>
            <DailyEncounterCard
              encounter={dailyEncounter}
              onWrite={handleEncounterWrite}
              onPray={handleEncounterPray}
              onAskAi={handleEncounterAskAi}
              onShareImage={handleShareDailyVerse}
              onQuickSave={handleSaveDailyVerse}
              presence={{
                completedToday: presenceVm.completedToday,
                currentStreak: presenceVm.currentStreak,
                justCompleted: presenceJustCompleted,
              }}
              onPresenceComplete={handlePresenceComplete}
            />

            <DailyStreakCard activeDays={journalWeekActiveDays} />

            <div style={{ marginBottom: '28px', animation: 'fadeInUp 0.6s ease forwards', animationDelay: '0.3s' }}>
              <h2 style={{ color: 'var(--section-title)', fontSize: '13px', letterSpacing: '0.12em', fontWeight: 500, textTransform: 'uppercase' }}>{t('home.toolsHeading')}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              <Link
                to="/bible-videos"
                className="home-gold-glass home-tool-tile"
              >
                <p style={{ fontSize: '28px', marginBottom: '12px', color: 'var(--gold)' }}>🎬</p>
                <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>{t('home.toolBibleVideos')}</p>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{t('home.toolBibleVideosSub')}</p>
              </Link>
              <Link
                to="/scripture-art"
                className="home-gold-glass home-tool-tile"
              >
                <p style={{ fontSize: '28px', marginBottom: '12px', color: 'var(--gold)' }}>🎨</p>
                <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>{t('home.toolScriptureArt')}</p>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{t('home.toolScriptureArtSub')}</p>
              </Link>
              <Link
                to="/reading-plans"
                className="home-gold-glass home-tool-tile"
              >
                <p style={{ fontSize: '28px', marginBottom: '12px', color: 'var(--gold)' }}>📅</p>
                <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>{t('home.toolReadingPlans')}</p>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{t('home.toolReadingPlansSub')}</p>
              </Link>
              <Link
                to="/fasting"
                className="home-gold-glass home-tool-tile"
              >
                <p style={{ fontSize: '28px', marginBottom: '12px', color: 'var(--gold)' }}>🕐</p>
                <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>{t('home.toolFasting')}</p>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{t('home.toolFastingSub')}</p>
              </Link>
              <Link
                to="/support"
                className="home-gold-glass home-tool-tile"
              >
                <p style={{ fontSize: '28px', marginBottom: '12px', color: 'var(--gold)' }}>🤝</p>
                <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>{t('home.toolSupport')}</p>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{t('home.toolSupportSub')}</p>
              </Link>
              <div
                role="button"
                tabIndex={0}
                className="home-gold-glass home-tool-tile"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    window.open('https://discord.gg/nZcZRkUMJh', '_blank')
                  }
                }}
                onClick={() => window.open('https://discord.gg/nZcZRkUMJh', '_blank')}
              >
                <p style={{ fontSize: '28px', marginBottom: '12px', color: 'var(--gold)' }}>💬</p>
                <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>{t('home.toolCommunity')}</p>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{t('home.toolCommunitySub')}</p>
              </div>
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
            <div className="relative">
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
                fontSize: '16px', 
                lineHeight: 1.9,
                color: 'var(--verse-text)',
                fontStyle: 'italic',
                fontFamily: 'Georgia, serif',
                paddingLeft: '24px'
              }}>
                "{t('home.verseWeekText')}"
              </p>
            </div>
            <p style={{ 
              marginTop: '16px', 
              fontSize: '13px', 
              fontWeight: 500, 
              letterSpacing: '0.1em',
              color: 'var(--text-secondary)'
            }}>{t('home.verseWeekRef')}</p>
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
        <SaveToast trigger={toastTrigger} />
        <FirstJournalEntryCelebration
          open={showFirstJournalCelebration}
          onClose={() => setShowFirstJournalCelebration(false)}
        />
      </div>
    </div>
    </>
  )
}

export default Home
