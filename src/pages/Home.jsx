import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
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
  const { user, profile } = useAuth()
  const [todaysVerse, setTodaysVerse] = useState(() => getTodaysVerse())
  const [streak, setStreak] = useState({ currentStreak: 0 })
  const [toastTrigger, setToastTrigger] = useState(0)
  const [journalCount, setJournalCount] = useState(0)
  const [suppressPersonalWelcome, setSuppressPersonalWelcome] = useState(false)
  const [, setProfileFetchLoading] = useState(false)
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
            supabase.from('profiles').select('reading_streak').eq('id', user.id).single(),
            new Promise((_, reject) => {
              setTimeout(() => reject(new Error('profile-streak-timeout')), PROFILE_STREAK_FETCH_MS)
            }),
          ])
          data = result.data
          error = result.error
        } catch (err) {
          console.log('Profile fetch skipped:', err)
          data = null
          error = null
        }
        if (cancelled) return
        if (error) throw error
        setStreak({ currentStreak: Number(data?.reading_streak) || 0 })
      } catch {
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
    let timeoutId
    const scheduleNextMidnight = () => {
      setTodaysVerse(getTodaysVerse())
      setStreak({ currentStreak: profile?.reading_streak || 0 })
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
  const streakLength = 3
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
    1: 'Welcome! Every journey begins with one step. 🌱',
    2: 'Two days strong! His Word is a lamp to your feet. 🕯️',
    3: 'Three days! You are building something beautiful. ✨',
    5: "Five days! 'Blessed is the one who reads...' Rev 1:3 📖",
    7: 'One week! His mercies are new every morning. 🌅',
    14: 'Two weeks! You are becoming rooted in His Word. 🌳',
    21: '21 days! A habit is being formed for eternity. 🔥',
    30: "30 days! 'I have hidden your word in my heart.' Ps 119:11 💛",
    60: '60 days! You are an inspiration to the Kingdom. 👑',
    100: "100 days! A mighty warrior in God's Word! ⚔️",
  }
  const currentStreak = Math.max(0, Number(streak?.currentStreak || 0))
  const firstName = suppressPersonalWelcome
    ? ''
    : (profile?.full_name?.split(' ')[0] || user?.user_metadata?.full_name?.split(' ')[0] || '')
  const welcomeCopy = firstName ? `Welcome back, ${firstName} 🙏` : 'Welcome back 🙏'
  const streakMessage = streakMessages[currentStreak] || `Day ${currentStreak} — Keep seeking Him with all your heart. 🙏`

  return (
    <>
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
            <article
              className="text-white"
              style={{
                background: 'rgba(5, 15, 40, 0.35)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: '1px solid rgba(212,168,67,0.15)',
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
                background: 'rgba(5, 15, 40, 0.35)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: '1px solid rgba(212,168,67,0.15)',
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
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>{currentStreak} Days</p>
              </div>
              <p style={{ marginBottom: '16px', fontSize: '13px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>{streakMessage}</p>
              <div className="flex items-center justify-between gap-2" style={{ overflowX: 'auto' }}>
                {days.map((day, index) => {
                  const isToday = index === todayIndex
                  const isCompleted = index < todayIndex && index >= todayIndex - streakLength
                  const dotStyle = isToday
                    ? { background: '#D4A843', boxShadow: '0 0 8px rgba(212,168,67,0.6)', borderColor: '#D4A843' }
                    : isCompleted
                      ? { background: '#D4A843', borderColor: '#D4A843' }
                      : { background: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.2)' }
                  return (
                    <div 
                      key={day} 
                      className="w-8 h-8 rounded-full border-2" 
                      style={dotStyle}
                    />
                  )
                })}
              </div>
            </div>
            </div>

            <div style={{ marginBottom: '28px', animation: 'fadeInUp 0.6s ease forwards', animationDelay: '0.3s' }}>
              <h2 style={{ color: '#D4A843', fontSize: '13px', letterSpacing: '0.12em', fontWeight: 500, textTransform: 'uppercase' }}>Tools</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              <Link
                to="/scripture-art"
                style={{
                  minWidth: '140px',
                  minHeight: '100px',
                  textDecoration: 'none',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(212,168,67,0.15)',
                  borderRadius: '20px',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
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
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                }}
              >
                <p style={{ fontSize: '28px', marginBottom: '12px', color: '#D4A843' }}>🎨</p>
                <p style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.9)', marginBottom: '4px' }}>Scripture Art</p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>Create shareable verse images</p>
              </Link>
              <Link
                to="/reading-plans"
                style={{
                  minWidth: '140px',
                  minHeight: '100px',
                  textDecoration: 'none',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(212,168,67,0.15)',
                  borderRadius: '20px',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
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
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                }}
              >
                <p style={{ fontSize: '28px', marginBottom: '12px', color: '#D4A843' }}>📅</p>
                <p style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.9)', marginBottom: '4px' }}>Reading Plans</p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>Follow structured daily journeys</p>
              </Link>
              <Link
                to="/fasting"
                style={{
                  minWidth: '140px',
                  minHeight: '100px',
                  textDecoration: 'none',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(212,168,67,0.15)',
                  borderRadius: '20px',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
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
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                }}
              >
                <p style={{ fontSize: '28px', marginBottom: '12px', color: '#D4A843' }}>🕐</p>
                <p style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.9)', marginBottom: '4px' }}>Fasting Tracker</p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>Track fasts and prayer notes</p>
              </Link>
              <Link
                to="/support"
                style={{
                  minWidth: '140px',
                  minHeight: '100px',
                  textDecoration: 'none',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(212,168,67,0.15)',
                  borderRadius: '20px',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
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
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                }}
              >
                <p style={{ fontSize: '28px', marginBottom: '12px', color: '#D4A843' }}>🤝</p>
                <p style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.9)', marginBottom: '4px' }}>Support</p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>Help sustain the ministry</p>
              </Link>
              <div
                style={{
                  minWidth: '140px',
                  minHeight: '100px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(212,168,67,0.15)',
                  borderRadius: '20px',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(212,168,67,0.4)'
                  e.currentTarget.style.background = 'rgba(212,168,67,0.08)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                }}
                onClick={() => window.open('https://discord.gg/nZcZRkUMJh', '_blank')}
              >
                <p style={{ fontSize: '28px', marginBottom: '12px', color: '#D4A843' }}>💬</p>
                <p style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.9)', marginBottom: '4px' }}>Community</p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>Join our Discord</p>
              </div>
              <Link
                to="/worship"
                style={{
                  minWidth: '140px',
                  minHeight: '100px',
                  textDecoration: 'none',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(212,168,67,0.15)',
                  borderRadius: '20px',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
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
                  e.currentTarget.style.borderColor = 'rgba(212,168,67,0.15)'
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                }}
              >
                <p style={{ fontSize: '28px', marginBottom: '12px', color: '#D4A843' }}>🎵</p>
                <p style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.9)', marginBottom: '4px' }}>Worship Mode</p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>Music & meditation</p>
              </Link>
            </div>
          </div>

          <div
            className="rounded-2xl p-6"
            style={{
              background: 'rgba(5, 15, 40, 0.35)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: '1px solid rgba(212,168,67,0.15)',
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
      
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  )
}

export default Home
