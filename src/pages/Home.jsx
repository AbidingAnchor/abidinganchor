import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getDailyVerse } from '../utils/dailyVerse'
import { getJournalEntries, saveToJournal } from '../utils/journal'
import SaveToast from '../components/SaveToast'
import { useAuth } from '../context/AuthContext'

const PROFILE_STREAK_FETCH_MS = 5000

function getTodaysVerse() {
  return getDailyVerse()
}

function Home({ onOpenWorship, worshipStatus }) {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [todaysVerse, setTodaysVerse] = useState(() => getTodaysVerse())
  const [streak, setStreak] = useState({ currentStreak: 1 })
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

        const today = new Date()
        const todayStr = today.toISOString().slice(0, 10)
        let streakStartDate = data?.streak_start_date
        let lastActiveDate = data?.last_active_date
        let currentStreak = Number(data?.reading_streak) || 1
        let longestStreak = Number(data?.longest_streak) || 1

        // Initialize streak for new users
        if (!streakStartDate) {
          streakStartDate = todayStr
          currentStreak = 1
          longestStreak = 1
        } else if (lastActiveDate !== todayStr) {
          // Update streak data if last active date is different from today
          // Check if streak should continue (consecutive days)
          if (lastActiveDate) {
            const lastActive = new Date(lastActiveDate)
            const daysDiff = Math.floor((today - lastActive) / (1000 * 60 * 60 * 24))
            if (daysDiff === 1) {
              currentStreak += 1
            } else if (daysDiff > 1) {
              currentStreak = 1
            }
          } else {
            currentStreak = 1
          }

          // Update longest streak
          if (currentStreak > longestStreak) {
            longestStreak = currentStreak
          }

        }

        setStreak({ currentStreak: currentStreak })
      } catch {
        if (!cancelled && !profileRef.current) {
          setStreak({ currentStreak: 1 })
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
      setTodaysVerse(getTodaysVerse())
      setStreak({ currentStreak: profile?.reading_streak || 1 })
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
      verse: todaysVerse.text,
      reference: todaysVerse.reference,
      tags: ['Daily Verse'],
    })
    setToastTrigger((t) => t + 1)
  }, [todaysVerse])

  const handleSaveVerseOfWeek = useCallback(async () => {
    await saveToJournal({
      verse: 'The Lord is my shepherd; I shall not want.',
      reference: 'Psalm 23:1',
      tags: ['Daily Verse'],
    })
    setToastTrigger((t) => t + 1)
  }, [])

  const handleShareDailyVerse = useCallback(async () => {
    const verse = todaysVerse?.text ?? ''
    const reference = todaysVerse?.reference ?? ''
    if (!verse || !reference) return

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Daily Verse — AbidingAnchor',
          text: `${verse} — ${reference}`,
          url: 'https://abidinganchor.netlify.app',
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
    ctx.fillText('AbidingAnchor', 540, 170)

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
    ctx.fillText('abidinganchor.netlify.app', 540, 930)

    const link = document.createElement('a')
    link.href = canvas.toDataURL('image/png')
    link.download = 'abidinganchor-daily-verse.png'
    link.click()
  }, [todaysVerse])

  const today = new Date()
  const formattedDate = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
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

  const streakMessages = {
    1: 'Welcome! Your journey begins today. 🙏',
    2: "You're building a habit! Keep going. 🔥",
    3: "You're building a habit! Keep going. 🔥",
    4: 'Halfway through the week! Stay strong. ✝️',
    5: 'Halfway through the week! Stay strong. ✝️',
  }
  
  const hour = new Date().getHours()
  let timeGreeting = ''
  let timeEmoji = ''
  if (hour >= 5 && hour < 12) {
    timeGreeting = 'Good morning'
    timeEmoji = '🌅'
  } else if (hour >= 12 && hour < 18) {
    timeGreeting = 'Good afternoon'
    timeEmoji = '☀️'
  } else {
    timeGreeting = 'Good evening'
    timeEmoji = '🌇'
  }
  
  const encouragements = [
    'His mercies are new every morning.',
    'Walk in faith today.',
    'You are loved beyond measure.',
    'Be still and know that He is God.',
    'Cast all your anxiety on Him.',
    'The Lord is your strength and shield.',
    'Nothing can separate you from His love.'
  ]
  const encouragement = encouragements[new Date().getDay()]
  
  const currentStreak = Math.max(1, Number(streak?.currentStreak || 1))
  const firstName = suppressPersonalWelcome
    ? 'Friend'
    : (profile?.full_name?.split(' ')[0] || user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Friend')
  
  const streakMessage = streakMessages[currentStreak] || `Day ${currentStreak} — Keep seeking Him with all your heart. 🙏`

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
      <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden', background: 'transparent', paddingBottom: '80px', paddingTop: '60px' }}>
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
                color: 'white', 
                fontSize: '22px', 
                fontWeight: 700, 
                marginBottom: '4px' 
              }}>
                {timeGreeting}, {firstName} {timeEmoji}
              </p>
              <p style={{
                color: 'rgba(255,255,255,0.6)',
                fontSize: '13px',
                marginBottom: '32px'
              }}>
                {encouragement}
              </p>
            </div>
            <article
              className="text-white"
              style={{
                background: 'rgba(8, 20, 50, 0.72)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(212,168,67,0.25)',
                borderRadius: '24px',
                padding: '28px',
                position: 'relative',
                animation: 'fadeInUp 0.6s ease forwards',
                animationDelay: '0.1s'
              }}
            >
              <div style={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                right: 0, 
                height: '3px', 
                background: '#D4A843',
                borderRadius: '24px 24px 0 0'
              }} />
              
              <div className="relative" style={{ marginBottom: '24px' }}>
                <span style={{ 
                  position: 'absolute', 
                  top: '-8px', 
                  left: 0, 
                  fontSize: '60px', 
                  lineHeight: 1, 
                  opacity: 0.3,
                  color: '#D4A843',
                  fontFamily: 'Georgia, serif'
                }}>"</span>
                <p style={{ 
                  paddingLeft: '32px', 
                  paddingRight: '8px', 
                  paddingTop: '8px', 
                  fontSize: '18px', 
                  lineHeight: 1.8, 
                  color: 'rgba(255,255,255,0.95)', 
                  fontStyle: 'italic',
                  fontFamily: 'Georgia, serif'
                }}>
                  {todaysVerse.text}
                </p>
              </div>

              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                marginBottom: '24px',
                paddingBottom: '24px',
                borderBottom: '1px solid rgba(255,255,255,0.1)'
              }}>
                <p style={{ 
                  color: '#D4A843', 
                  fontSize: '14px', 
                  fontWeight: 500, 
                  letterSpacing: '0.1em'
                }}>
                  {todaysVerse.reference}
                </p>
                <p style={{ 
                  fontSize: '12px', 
                  fontWeight: 500, 
                  letterSpacing: '0.15em',
                  color: 'rgba(255,255,255,0.6)'
                }}>
                  Today&apos;s Verse
                </p>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                <button
                  type="button"
                  onClick={handleSaveDailyVerse}
                  style={{ 
                    minWidth: '120px', 
                    flex: 1,
                    background: 'linear-gradient(135deg, #D4A843 0%, #F4D03F 100%)',
                    color: '#0d1f4e',
                    border: 'none',
                    borderRadius: '50px',
                    padding: '10px 16px',
                    fontWeight: 600,
                    fontSize: '13px',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 15px rgba(212,168,67,0.3)'
                  }}
                >
                  Save to Journal
                </button>
                <button
                  type="button"
                  onClick={handleShareDailyVerse}
                  style={{ 
                    minWidth: '140px', 
                    flex: 1,
                    background: 'rgba(255, 255, 255, 0.08)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#D4A843',
                    borderRadius: '50px',
                    padding: '12px 24px',
                    fontWeight: 600,
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                  }}
                >
                  Share as Image
                </button>
              </div>
            </article>

            <div style={{ marginBottom: '28px' }}>
              <div
              style={{
                background: 'rgba(8, 20, 50, 0.72)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(212,168,67,0.25)',
                borderRadius: '20px',
                padding: '20px',
                boxShadow: currentStreak >= 7 ? '0 0 0 1px rgba(212,168,67,0.8), 0 0 20px rgba(212,168,67,0.35)' : undefined,
                animation: 'fadeInUp 0.6s ease forwards',
                animationDelay: '0.2s'
              }}
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 style={{ 
                  color: '#D4A843', 
                  fontSize: '13px', 
                  letterSpacing: '0.12em', 
                  fontWeight: 500,
                  textTransform: 'uppercase'
                }}>Reading Streak</h2>
                <p style={{ fontSize: '14px', color: '#D4A843', fontWeight: 700 }}>🔥 {currentStreak} Day Streak</p>
              </div>
              <p style={{ marginBottom: '16px', fontSize: '13px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>{streakMessage}</p>
              <div className="flex items-center justify-between gap-2" style={{ overflowX: 'auto' }}>
                {days.map((day, index) => {
                  const isToday = index === todayIndex
                  const isPast = index < todayIndex
                  const flameStyle = isToday
                    ? { fontSize: '36px', color: '#D4A843', filter: 'drop-shadow(0 0 8px rgba(212,168,67,0.8))', animation: 'flamePulse 2s ease-in-out infinite' }
                    : isPast
                      ? { fontSize: '28px', color: '#D4A843', filter: 'drop-shadow(0 0 8px rgba(212,168,67,0.8))' }
                      : { fontSize: '28px', color: 'rgba(255,255,255,0.2)', filter: 'none' }
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
                        color: 'rgba(255,255,255,0.5)',
                        fontSize: '11px',
                        fontWeight: 600
                      }}>
                        {day}
                      </span>
                      <div
                        style={flameStyle}
                      >
                        🔥
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            </div>

            <div style={{ marginBottom: '28px', animation: 'fadeInUp 0.6s ease forwards', animationDelay: '0.3s' }}>
              <h2 style={{ color: '#D4A843', fontSize: '13px', letterSpacing: '0.12em', fontWeight: 500, textTransform: 'uppercase' }}>TOOLS</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              <Link
                to="/scripture-art"
                style={{
                  minWidth: '140px',
                  minHeight: '100px',
                  textDecoration: 'none',
                  background: 'rgba(8, 20, 50, 0.72)',
                  border: '1px solid rgba(212, 168, 67, 0.25)',
                  borderRadius: '16px',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(212,168,67,0.4)'
                  e.currentTarget.style.background = 'rgba(212,168,67,0.08)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(212, 168, 67, 0.25)'
                  e.currentTarget.style.background = 'rgba(8, 20, 50, 0.72)'
                }}
              >
                <p style={{ fontSize: '28px', marginBottom: '12px', color: '#D4A843' }}>🎨</p>
                <p style={{ fontSize: '13px', fontWeight: 500, color: '#FFFFFF', marginBottom: '4px' }}>Scripture Art</p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>Create shareable verse images</p>
              </Link>
              <Link
                to="/reading-plans"
                style={{
                  minWidth: '140px',
                  minHeight: '100px',
                  textDecoration: 'none',
                  background: 'rgba(8, 20, 50, 0.72)',
                  border: '1px solid rgba(212, 168, 67, 0.25)',
                  borderRadius: '16px',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(212,168,67,0.4)'
                  e.currentTarget.style.background = 'rgba(212,168,67,0.08)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(212, 168, 67, 0.25)'
                  e.currentTarget.style.background = 'rgba(8, 20, 50, 0.72)'
                }}
              >
                <p style={{ fontSize: '28px', marginBottom: '12px', color: '#D4A843' }}>📅</p>
                <p style={{ fontSize: '13px', fontWeight: 500, color: '#FFFFFF', marginBottom: '4px' }}>Reading Plans</p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>Follow structured daily journeys</p>
              </Link>
              <Link
                to="/fasting"
                style={{
                  minWidth: '140px',
                  minHeight: '100px',
                  textDecoration: 'none',
                  background: 'rgba(8, 20, 50, 0.72)',
                  border: '1px solid rgba(212, 168, 67, 0.25)',
                  borderRadius: '16px',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(212,168,67,0.4)'
                  e.currentTarget.style.background = 'rgba(212,168,67,0.08)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(212, 168, 67, 0.25)'
                  e.currentTarget.style.background = 'rgba(8, 20, 50, 0.72)'
                }}
              >
                <p style={{ fontSize: '28px', marginBottom: '12px', color: '#D4A843' }}>🕐</p>
                <p style={{ fontSize: '13px', fontWeight: 500, color: '#FFFFFF', marginBottom: '4px' }}>Fasting Tracker</p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>Track fasts and prayer notes</p>
              </Link>
              <Link
                to="/support"
                style={{
                  minWidth: '140px',
                  minHeight: '100px',
                  textDecoration: 'none',
                  background: 'rgba(8, 20, 50, 0.72)',
                  border: '1px solid rgba(212, 168, 67, 0.25)',
                  borderRadius: '16px',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(212,168,67,0.4)'
                  e.currentTarget.style.background = 'rgba(212,168,67,0.08)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(212, 168, 67, 0.25)'
                  e.currentTarget.style.background = 'rgba(8, 20, 50, 0.72)'
                }}
              >
                <p style={{ fontSize: '28px', marginBottom: '12px', color: '#D4A843' }}>🤝</p>
                <p style={{ fontSize: '13px', fontWeight: 500, color: '#FFFFFF', marginBottom: '4px' }}>Support</p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>Help sustain the ministry</p>
              </Link>
              <div
                style={{
                  minWidth: '140px',
                  minHeight: '100px',
                  background: 'rgba(8, 20, 50, 0.72)',
                  border: '1px solid rgba(212, 168, 67, 0.25)',
                  borderRadius: '16px',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(212, 168, 67, 0.25)'
                  e.currentTarget.style.background = 'rgba(8, 20, 50, 0.72)'
                }}
                onClick={() => window.open('https://discord.gg/nZcZRkUMJh', '_blank')}
              >
                <p style={{ fontSize: '28px', marginBottom: '12px', color: '#D4A843' }}>💬</p>
                <p style={{ fontSize: '13px', fontWeight: 500, color: '#FFFFFF', marginBottom: '4px' }}>Community</p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>Join our Discord</p>
              </div>
              <Link
                to="/worship"
                style={{
                  minWidth: '140px',
                  minHeight: '100px',
                  textDecoration: 'none',
                  background: 'rgba(8, 20, 50, 0.72)',
                  border: '1px solid rgba(212, 168, 67, 0.25)',
                  borderRadius: '16px',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(212,168,67,0.4)'
                  e.currentTarget.style.background = 'rgba(212,168,67,0.08)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(212, 168, 67, 0.25)'
                  e.currentTarget.style.background = 'rgba(8, 20, 50, 0.72)'
                }}
              >
                <p style={{ fontSize: '28px', marginBottom: '12px', color: '#D4A843' }}>🎵</p>
                <p style={{ fontSize: '13px', fontWeight: 500, color: '#FFFFFF', marginBottom: '4px' }}>Worship Mode</p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>Music & meditation</p>
              </Link>
            </div>
          </div>

          <div
            className="rounded-2xl p-6"
            style={{
              background: 'rgba(8, 20, 50, 0.72)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(212,168,67,0.25)',
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
                color: '#D4A843',
                textTransform: 'uppercase',
                marginBottom: '16px'
              }}>Verse of the Week</p>
              <p style={{ 
                marginTop: '16px', 
                fontSize: '16px', 
                lineHeight: 1.9,
                color: 'rgba(255,255,255,0.95)',
                fontStyle: 'italic',
                fontFamily: 'Georgia, serif',
                paddingLeft: '24px'
              }}>
                "The Lord is my shepherd; I shall not want."
              </p>
            </div>
            <p style={{ 
              marginTop: '16px', 
              fontSize: '13px', 
              fontWeight: 500, 
              letterSpacing: '0.1em',
              color: '#D4A843'
            }}>Psalm 23:1</p>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={handleSaveVerseOfWeek}
                style={{
                  background: 'linear-gradient(135deg, #D4A843 0%, #F4D03F 100%)',
                  color: '#0d1f4e',
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
                Save to Journal
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
