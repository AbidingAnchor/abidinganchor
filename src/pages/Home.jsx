import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getDailyEncounter } from '../utils/dailyEncounter'
import DailyEncounterCard from '../components/DailyEncounterCard'
import { getJournalEntries, saveToJournal } from '../utils/journal'
import SaveToast from '../components/SaveToast'
import { useAuth } from '../context/AuthContext'

const PROFILE_STREAK_FETCH_MS = 5000

function Home({ onOpenWorship, worshipStatus }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [dailyEncounter, setDailyEncounter] = useState(() => getDailyEncounter())
  const [streak, setStreak] = useState({ currentStreak: 0 })
  const [toastTrigger, setToastTrigger] = useState(0)
  const [journalCount, setJournalCount] = useState(0)
  const [suppressPersonalWelcome, setSuppressPersonalWelcome] = useState(false)
  const [profileFetchLoading, setProfileFetchLoading] = useState(false)
  const profileRef = useRef(profile)
  profileRef.current = profile

  useEffect(() => {
    if (!user?.id) {
      setProfileFetchLoading(false)
      return
    }
    setProfileFetchLoading(true)
    let cancelled = false
    ;(async () => {
      try {
        let data, error
        try {
          const result = await Promise.race([
            supabase.from('profiles').select('reading_streak, streak_start_date, last_active_date, longest_streak').eq('id', user.id).single(),
            new Promise((_, reject) => {
              setTimeout(() => reject(new Error('profile-streak-timeout')), PROFILE_STREAK_FETCH_MS)
            }),
          ])
          data = result.data
          error = result.error
          if (error) {
            console.error('Profile query error:', error)
            data = null
            error = null
          }
        } catch (err) {
          console.log('Profile fetch skipped:', err)
          data = null
          error = null
        }
        if (cancelled) return
        if (error) throw error

        console.log('Streak data:', data)

        const today = new Date()
        const todayStr = today.toISOString().slice(0, 10)
        let streakStartDate = data?.streak_start_date
        let lastActiveDate = data?.last_active_date
        let currentStreak = Number(data?.reading_streak) || 0
        let longestStreak = Number(data?.longest_streak) || 0
        let needsDbUpdate = false

        // Initialize streak for new users
        if (!streakStartDate) {
          streakStartDate = todayStr
          currentStreak = 0
          longestStreak = 0
          needsDbUpdate = true
        } else if (lastActiveDate !== todayStr) {
          // Update streak data if last active date is different from today
          // Check if streak should continue (consecutive days)
          if (lastActiveDate) {
            const lastActive = new Date(lastActiveDate)
            const daysDiff = Math.floor((today - lastActive) / (1000 * 60 * 60 * 24))
            if (daysDiff === 1) {
              currentStreak += 1
              needsDbUpdate = true
            } else if (daysDiff > 1) {
              currentStreak = 0
              streakStartDate = todayStr
              needsDbUpdate = true
            }
          } else {
            currentStreak = 0
            streakStartDate = todayStr
            needsDbUpdate = true
          }

          // Update longest streak
          if (currentStreak > longestStreak) {
            longestStreak = currentStreak
          }

        }

        // Write streak updates to database if needed
        if (needsDbUpdate) {
          await supabase.from('profiles').update({
            reading_streak: currentStreak,
            streak_start_date: streakStartDate,
            longest_streak: longestStreak,
          }).eq('id', user.id)
        }

        console.log('Final streak:', currentStreak)
        setStreak({ currentStreak: currentStreak })
      } catch {
        console.log('Catch block hit')
        if (!cancelled && !profileRef.current) {
          setStreak({ currentStreak: 0 })
          setSuppressPersonalWelcome(true)
        }
      } finally {
        if (!cancelled) setProfileFetchLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user?.id])

  useEffect(() => {
    if (profile) setSuppressPersonalWelcome(false)
  }, [profile])

  useEffect(() => {
    if (user?.id && profile && !profileFetchLoading) {
      const isComplete = profile.onboarding_complete === true || localStorage.getItem('onboarding_complete') === 'true'
      if (!isComplete) {
        navigate('/onboarding')
      }
    }
  }, [user?.id, profile, profileFetchLoading, navigate])

  useEffect(() => {
    let timeoutId
    const scheduleNextMidnight = () => {
      setDailyEncounter(getDailyEncounter())
      setStreak({ currentStreak: Number(profile?.reading_streak ?? 0) })
      const now = new Date()
      const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0)
      const ms = Math.max(1000, nextMidnight - now)
      timeoutId = setTimeout(scheduleNextMidnight, ms)
    }
    scheduleNextMidnight()
    return () => clearTimeout(timeoutId)
  }, [profile?.reading_streak])

  const handleSaveDailyVerse = useCallback(async () => {
    await saveToJournal({
      verse: dailyEncounter.text,
      reference: dailyEncounter.reference,
      tags: [t('home.journalTagDaily')],
    })
    setToastTrigger((x) => x + 1)
  }, [dailyEncounter, t])

  const handleSaveVerseOfWeek = useCallback(async () => {
    await saveToJournal({
      verse: t('home.verseWeekText'),
      reference: t('home.verseWeekRef'),
      tags: [t('home.journalTagDaily')],
    })
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
  }, [navigate, dailyEncounter])

  const handleEncounterPray = useCallback(() => {
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
  }, [navigate, dailyEncounter])

  const handleEncounterAskAi = useCallback(() => {
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
  }, [navigate, dailyEncounter])

  const today = new Date()
  const days = [
    t('home.weekdayMon'),
    t('home.weekdayTue'),
    t('home.weekdayWed'),
    t('home.weekdayThu'),
    t('home.weekdayFri'),
    t('home.weekdaySat'),
    t('home.weekdaySun'),
  ]
  const dayToMonFirstIndex = [6, 0, 1, 2, 3, 4, 5]
  const todayIndex = dayToMonFirstIndex[today.getDay()]
  
  useEffect(() => {
    let active = true
    const loadCount = async () => {
      if (!user?.id) return
      const entries = await getJournalEntries(user.id)
      if (!active) return
      setJournalCount(entries.length)
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

  const currentStreak = Number(streak?.currentStreak || 0)
  const friendFallback = t('home.friendFallback')
  const firstName = suppressPersonalWelcome
    ? friendFallback
    : (profile?.full_name?.split(' ')[0] || user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || friendFallback)

  const streakMessage =
    currentStreak >= 1 && currentStreak <= 5
      ? t(`home.streak${currentStreak}`)
      : t('home.streakDay', { n: currentStreak })

  return (
    <>
      <style>{`
        @keyframes flamePulse {
          0%, 100% {
            filter: drop-shadow(0 0 8px rgba(212,168,67,0.8));
            transform: scale(1);
          }
          50% {
            filter: drop-shadow(0 0 20px rgba(212,168,67,1.0));
            transform: scale(1.15);
          }
        }
      `}</style>
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
            />

            <div style={{ marginBottom: '28px' }}>
              <div
                className="glass-panel"
                style={{
                borderRadius: '20px',
                padding: '20px',
                boxShadow: currentStreak >= 7 ? '0 0 0 1px rgba(212,168,67,0.45), 0 0 20px rgba(212,168,67,0.2)' : undefined,
                animation: 'fadeInUp 0.6s ease forwards',
                animationDelay: '0.2s'
              }}
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 style={{ 
                  color: 'var(--section-title)', 
                  fontSize: '13px', 
                  letterSpacing: '0.12em', 
                  fontWeight: 500,
                  textTransform: 'uppercase'
                }}>{t('home.readingStreak')}</h2>
                <p style={{ fontSize: '14px', color: 'var(--section-title)', fontWeight: 700 }}>{t('home.dayStreak', { n: currentStreak })}</p>
              </div>
              <p style={{ marginBottom: '16px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{streakMessage}</p>
              <div className="flex items-center justify-between gap-2" style={{ overflowX: 'auto' }}>
                {days.map((day, index) => {
                  const isToday = index === todayIndex
                  const isPast = index < todayIndex && index >= todayIndex - (currentStreak - 1)
                  const hasStreak = currentStreak >= 1
                  const flameStyle = isToday && hasStreak
                    ? { fontSize: '36px', color: '#D4A843', filter: 'drop-shadow(0 0 8px rgba(212,168,67,0.8))', animation: 'flamePulse 2s ease-in-out infinite' }
                    : isPast && hasStreak
                      ? { fontSize: '28px', color: '#D4A843', filter: 'drop-shadow(0 0 8px rgba(212,168,67,0.8))' }
                      : { width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(150,150,150,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }
                  const isLit = (isToday && hasStreak) || (isPast && hasStreak)
                  return (
                    <div
                      key={day}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <span style={{
                        color: 'var(--label-text)',
                        fontSize: '11px',
                        fontWeight: 600
                      }}>
                        {day}
                      </span>
                      <div
                        style={flameStyle}
                      >
                        {isLit ? '🔥' : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            </div>

            <div style={{ marginBottom: '28px', animation: 'fadeInUp 0.6s ease forwards', animationDelay: '0.3s' }}>
              <h2 style={{ color: 'var(--section-title)', fontSize: '13px', letterSpacing: '0.12em', fontWeight: 500, textTransform: 'uppercase' }}>{t('home.toolsHeading')}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              <Link
                to="/scripture-art"
                className="glass-panel"
                style={{
                  minWidth: '140px',
                  minHeight: '100px',
                  textDecoration: 'none',
                  border: '1px solid #D4A843',
                  borderRadius: '16px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.border = '1px solid #D4A843'
                  e.currentTarget.style.background = 'rgba(212,168,67,0.08)'
                  e.currentTarget.style.boxShadow = '0 0 8px rgba(212,168,67,0.2)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.removeProperty('background')
                  e.currentTarget.style.border = '1px solid #D4A843'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <p style={{ fontSize: '28px', marginBottom: '12px', color: 'var(--gold)' }}>🎨</p>
                <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>{t('home.toolScriptureArt')}</p>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{t('home.toolScriptureArtSub')}</p>
              </Link>
              <Link
                to="/reading-plans"
                className="glass-panel"
                style={{
                  minWidth: '140px',
                  minHeight: '100px',
                  textDecoration: 'none',
                  border: '1px solid #D4A843',
                  borderRadius: '16px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.border = '1px solid #D4A843'
                  e.currentTarget.style.background = 'rgba(212,168,67,0.08)'
                  e.currentTarget.style.boxShadow = '0 0 8px rgba(212,168,67,0.2)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.removeProperty('background')
                  e.currentTarget.style.border = '1px solid #D4A843'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <p style={{ fontSize: '28px', marginBottom: '12px', color: 'var(--gold)' }}>📅</p>
                <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>{t('home.toolReadingPlans')}</p>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{t('home.toolReadingPlansSub')}</p>
              </Link>
              <Link
                to="/fasting"
                className="glass-panel"
                style={{
                  minWidth: '140px',
                  minHeight: '100px',
                  textDecoration: 'none',
                  border: '1px solid #D4A843',
                  borderRadius: '16px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.border = '1px solid #D4A843'
                  e.currentTarget.style.background = 'rgba(212,168,67,0.08)'
                  e.currentTarget.style.boxShadow = '0 0 8px rgba(212,168,67,0.2)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.removeProperty('background')
                  e.currentTarget.style.border = '1px solid #D4A843'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <p style={{ fontSize: '28px', marginBottom: '12px', color: 'var(--gold)' }}>🕐</p>
                <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>{t('home.toolFasting')}</p>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{t('home.toolFastingSub')}</p>
              </Link>
              <Link
                to="/support"
                className="glass-panel"
                style={{
                  minWidth: '140px',
                  minHeight: '100px',
                  textDecoration: 'none',
                  border: '1px solid #D4A843',
                  borderRadius: '16px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.border = '1px solid #D4A843'
                  e.currentTarget.style.background = 'rgba(212,168,67,0.08)'
                  e.currentTarget.style.boxShadow = '0 0 8px rgba(212,168,67,0.2)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.removeProperty('background')
                  e.currentTarget.style.border = '1px solid #D4A843'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <p style={{ fontSize: '28px', marginBottom: '12px', color: 'var(--gold)' }}>🤝</p>
                <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>{t('home.toolSupport')}</p>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{t('home.toolSupportSub')}</p>
              </Link>
              <div
                className="glass-panel"
                style={{
                  minWidth: '140px',
                  minHeight: '100px',
                  border: '1px solid #D4A843',
                  borderRadius: '16px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.border = '1px solid #D4A843'
                  e.currentTarget.style.background = 'rgba(212,168,67,0.08)'
                  e.currentTarget.style.boxShadow = '0 0 8px rgba(212,168,67,0.2)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.removeProperty('background')
                  e.currentTarget.style.border = '1px solid #D4A843'
                  e.currentTarget.style.boxShadow = 'none'
                }}
                onClick={() => window.open('https://discord.gg/nZcZRkUMJh', '_blank')}
              >
                <p style={{ fontSize: '28px', marginBottom: '12px', color: 'var(--gold)' }}>💬</p>
                <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>{t('home.toolCommunity')}</p>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{t('home.toolCommunitySub')}</p>
              </div>
              <Link
                to="/worship"
                className="glass-panel"
                style={{
                  minWidth: '140px',
                  minHeight: '100px',
                  textDecoration: 'none',
                  border: '1px solid #D4A843',
                  borderRadius: '16px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.border = '1px solid #D4A843'
                  e.currentTarget.style.background = 'rgba(212,168,67,0.08)'
                  e.currentTarget.style.boxShadow = '0 0 8px rgba(212,168,67,0.2)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.removeProperty('background')
                  e.currentTarget.style.border = '1px solid #D4A843'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <p style={{ fontSize: '28px', marginBottom: '12px', color: 'var(--gold)' }}>🎵</p>
                <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>{t('home.toolWorship')}</p>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{t('home.toolWorshipSub')}</p>
              </Link>
            </div>
          </div>

          <div
            className="glass-panel rounded-2xl p-6"
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
      </div>
    </div>
    </>
  )
}

export default Home
