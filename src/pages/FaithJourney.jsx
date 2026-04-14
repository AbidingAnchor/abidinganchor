import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import BibleTrivia from '../components/BibleTrivia'
import VerseFlashcards from '../components/VerseFlashcards'
import JourneyMap from '../components/JourneyMap'
import Achievements from '../components/Achievements'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const VERSE_PROGRESS_KEY = 'abidinganchor-verse-progress'
const TRIVIA_STREAK_KEY = 'abidinganchor-trivia-streak'
const ACHIEVEMENTS_KEY = 'abidinganchor-achievements'

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

// Get day of week (0-6, where 0 is Sunday)
function getDayOfWeek() {
  return new Date().getDay()
}

// Get current day index for 5-day week display (M=0, T=1, W=2, T=3, F=4)
function getDayIndexForWeek() {
  const day = getDayOfWeek()
  // Map: Sun(0)->skip, Mon(1)->0, Tue(2)->1, Wed(3)->2, Thu(4)->3, Fri(4), Sat(6)->skip
  if (day === 0 || day === 6) return -1 // Weekend - no dot highlighted
  return day - 1 // Monday=0, Friday=4
}

const LearningPathCard = ({ icon, title, subtitle, accentColor, iconBg, progress, featured, badge, onStart }) => (
  <article
    onClick={onStart}
    className={`faith-journey-learning-card ${featured ? 'faith-journey-learning-card--featured' : ''}`}
    style={{
      borderRadius: '16px',
      padding: '14px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      cursor: 'pointer',
      transition: 'background 0.2s',
      position: 'relative',
      overflow: 'hidden'
    }}
  >
    {/* Left accent bar */}
    <div style={{
      width: '3px',
      height: '100%',
      position: 'absolute',
      left: 0,
      top: 0,
      background: accentColor,
      borderRadius: '16px 0 0 16px'
    }} />
    
    {/* Icon box */}
    <div style={{
      width: '40px',
      height: '40px',
      borderRadius: '12px',
      background: iconBg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '20px',
      marginLeft: '6px'
    }}>
      {icon}
    </div>

    {/* Content */}
    <div style={{ flex: 1, minWidth: 0 }}>
      <p className="faith-journey-learning-card__title" style={{ color: '#FFFFFF', fontSize: '13px', fontWeight: 700, marginBottom: '2px' }}>{title}</p>
      <p className="faith-journey-learning-card__subtitle" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px', marginBottom: '6px' }}>{subtitle}</p>
      {/* Progress bar */}
      <div
        className="faith-journey-learning-card__progress-track"
        style={{
        height: '3px',
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '2px',
        overflow: 'hidden'
      }}
      >
        <div style={{
          height: '100%',
          width: `${progress}%`,
          background: accentColor,
          borderRadius: '2px'
        }} />
      </div>
    </div>

    {/* Badge */}
    {badge && (
      <div
        className={`faith-journey-path-badge ${featured ? 'faith-journey-path-badge--featured' : ''}`}
        style={{
        padding: '4px 12px',
        borderRadius: '20px',
        fontSize: '10px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        background: featured ? '#D4A843' : 'rgba(255,255,255,0.1)',
        color: featured ? '#0a1a3e' : 'rgba(255,255,255,0.6)'
      }}
      >
        {badge}
      </div>
    )}
  </article>
)

export default function FaithJourney() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [view, setView] = useState('hub') // hub | trivia | flashcards | map | achievements
  const { user, profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ versesRead: 0, streak: 0, badges: 0 })
  const [answeredPrayersCount, setAnsweredPrayersCount] = useState(0)

  useEffect(() => {
    if (!user?.id) {
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('reading_streak, verses_read, lessons_completed')
          .eq('id', user.id)
          .single()
        if (error) throw error
        if (cancelled) return
        setStats({
          versesRead: Number(data?.verses_read) || 0,
          streak: Number(data?.reading_streak) || 0,
          badges: Number(data?.lessons_completed) || 0
        })
        const { count: answeredCt } = await supabase
          .from('personal_prayers')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('answered', true)
        if (!cancelled) setAnsweredPrayersCount(typeof answeredCt === 'number' ? answeredCt : 0)
      } catch {
        // Fallback to localStorage on error
        const verseProgress = readJson(VERSE_PROGRESS_KEY, {})
        const memorized = Object.values(verseProgress).filter((p) => p?.memorized).length
        const triviaStreak = readJson(TRIVIA_STREAK_KEY, { count: 0 }).count || 0
        const achievements = readJson(ACHIEVEMENTS_KEY, {})
        const badges = Object.values(achievements).filter((a) => a?.unlockedAt).length
        setStats({
          versesRead: memorized,
          streak: profile?.reading_streak || triviaStreak,
          badges: badges
        })
        setAnsweredPrayersCount(0)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user?.id, profile?.reading_streak])

  const streakCount = loading ? 0 : stats.streak
  const dayIndex = getDayIndexForWeek()
  const days = [
    t('faithJourney.dayLetterMon'),
    t('faithJourney.dayLetterTue'),
    t('faithJourney.dayLetterWed'),
    t('faithJourney.dayLetterThu'),
    t('faithJourney.dayLetterFri'),
  ]

  const subShellStyle = {
    width: '100%',
    maxWidth: '680px',
    margin: '0 auto',
    padding: '0 16px',
    paddingTop: '110px',
    paddingBottom: 'max(24px, env(safe-area-inset-bottom, 0px))',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 'calc(100dvh - 56px - 80px)',
    boxSizing: 'border-box',
  }

  return (
    <div
      style={{
        position: 'relative',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        width: '100%',
        background: 'transparent',
      }}
    >
      {view === 'hub' ? (
        <div style={{ padding: '0 16px', paddingTop: '110px', paddingBottom: '100px', maxWidth: '680px', margin: '0 auto', width: '100%', flex: 1 }}>
          
          {/* Hero Section */}
          <header className="glass-panel" style={{ marginBottom: '20px', position: 'relative', borderRadius: '16px', overflow: 'hidden', minHeight: '160px' }}>
            <div style={{ position: 'relative', zIndex: 2, padding: '24px' }}>
              <p style={{ 
                color: '#D4A843', 
                fontSize: '9px', 
                fontWeight: 600, 
                letterSpacing: '0.15em', 
                textTransform: 'uppercase', 
                marginBottom: '8px' 
              }}>
                {t('faithJourney.heroKicker')}
              </p>
              <h1 style={{ color: '#FFFFFF', fontSize: '26px', fontWeight: 700, marginBottom: '8px', lineHeight: 1.2 }}>
                {t('faithJourney.heroLine1')}<span style={{ color: '#D4A843' }}>{t('faithJourney.heroLine1Accent')}</span>{t('faithJourney.heroLine2')}
              </h1>
              <p style={{ 
                color: 'rgba(255,255,255,0.38)', 
                fontSize: '11px', 
                fontStyle: 'italic' 
              }}>
                {t('faithJourney.heroSubtitle')}
              </p>
            </div>
          </header>

          {/* Gold Divider */}
          <div style={{
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(212,168,67,0.3), transparent)',
            marginBottom: '20px'
          }} />

          {/* Streak Bar */}
          <div
            className="faith-journey-streak"
            style={{
            background: 'rgba(212,168,67,0.07)',
            border: '1px solid rgba(212,168,67,0.18)',
            borderRadius: '16px',
            padding: '12px 14px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
          >
            <span style={{ fontSize: '22px' }}>🔥</span>
            <div style={{ flex: 1 }}>
              <p className="faith-journey-streak__line" style={{ color: '#FFFFFF', fontSize: '13px', fontWeight: 600, marginBottom: '2px' }}>
                {loading ? t('faithJourney.streakLoading') : t('faithJourney.streakLine', { n: streakCount })}
              </p>
              <p className="faith-journey-streak__sub" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px' }}>
                {loading ? t('faithJourney.streakSubLoading') : streakCount === 0 ? t('faithJourney.streakSubZero') : t('faithJourney.streakSubActive')}
              </p>
            </div>
            {/* Day of week dots */}
            <div className="faith-journey-streak-dots" style={{ display: 'flex', gap: '6px' }}>
              {days.map((day, i) => {
                const isToday = i === dayIndex
                const isPast = i < dayIndex && dayIndex !== -1
                const isCompleted = !loading && isPast
                const dotState = loading
                  ? 'loading'
                  : isToday
                    ? 'today'
                    : isCompleted
                      ? 'done'
                      : 'idle'
                return (
                  <div
                    key={day}
                    className={`faith-journey-streak-dot faith-journey-streak-dot--${dotState}`}
                  >
                    {day}
                  </div>
                )
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/prayer')}
            className="faith-journey-prayers-row"
            style={{
              width: '100%',
              marginBottom: '24px',
              padding: '14px 16px',
              borderRadius: '14px',
              border: '1px solid rgba(212,168,67,0.35)',
              background:
                answeredPrayersCount > 0
                  ? 'linear-gradient(125deg, rgba(95,55,145,0.35) 0%, rgba(12,14,32,0.85) 45%, rgba(212,168,67,0.12) 100%)'
                  : 'rgba(255,255,255,0.03)',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              boxShadow: answeredPrayersCount > 0 ? '0 4px 20px rgba(45,28,90,0.35)' : 'none',
            }}
          >
            <span
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'rgba(212,168,67,0.2)',
                border: '1px solid rgba(212,168,67,0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                flexShrink: 0,
              }}
              aria-hidden
            >
              ✓
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: '#D4A843', fontSize: '15px', fontWeight: 700, margin: '0 0 4px', lineHeight: 1.3 }}>
                {t('faithJourney.prayersAnsweredBadge', { count: answeredPrayersCount })}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px', margin: 0, lineHeight: 1.4 }}>
                {t('faithJourney.prayersAnsweredHint')}
              </p>
            </div>
            <span className="faith-journey-prayers-row__arrow" style={{ color: 'rgba(212,168,67,0.8)', fontSize: '18px', flexShrink: 0 }} aria-hidden>
              →
            </span>
          </button>

          {/* Learning Paths */}
          <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <LearningPathCard
              icon="🎮"
              title={t('faithJourney.cardTrivia')}
              subtitle={t('faithJourney.cardTriviaSub')}
              accentColor="#D4A843"
              iconBg="rgba(212,168,67,0.15)"
              progress={0}
              featured={true}
              badge={t('faithJourney.badgeToday')}
              onStart={() => setView('trivia')}
            />
            <LearningPathCard
              icon="📖"
              title={t('faithJourney.cardFlash')}
              subtitle={t('faithJourney.cardFlashSub')}
              accentColor="#7F77DD"
              iconBg="rgba(127,119,221,0.15)"
              progress={0}
              featured={false}
              badge={t('faithJourney.badgeStart')}
              onStart={() => setView('flashcards')}
            />
            <LearningPathCard
              icon="🗺️"
              title={t('faithJourney.cardMap')}
              subtitle={t('faithJourney.cardMapSub')}
              accentColor="#1D9E75"
              iconBg="rgba(29,158,117,0.15)"
              progress={0}
              featured={false}
              badge={t('faithJourney.badgeStart')}
              onStart={() => setView('map')}
            />
            <LearningPathCard
              icon="🏆"
              title={t('faithJourney.cardAchievements')}
              subtitle={t('faithJourney.cardAchievementsSub')}
              accentColor="#378ADD"
              iconBg="rgba(55,138,221,0.15)"
              progress={0}
              featured={false}
              badge={t('faithJourney.badgeStart')}
              onStart={() => setView('achievements')}
            />
          </div>

          {/* Stats Row */}
          <div style={{
            display: 'flex',
            gap: '10px',
            marginBottom: '24px'
          }}>
            <div style={{
              flex: 1,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '12px',
              padding: '14px',
              textAlign: 'center'
            }}>
              <p style={{ color: '#D4A843', fontSize: '22px', fontWeight: 700, marginBottom: '2px' }}>{stats.versesRead}</p>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('faithJourney.statVerses')}</p>
            </div>
            <div style={{
              flex: 1,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '12px',
              padding: '14px',
              textAlign: 'center'
            }}>
              <p style={{ color: '#D4A843', fontSize: '22px', fontWeight: 700, marginBottom: '2px' }}>{streakCount}</p>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('faithJourney.statStreak')}</p>
            </div>
            <div style={{
              flex: 1,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '12px',
              padding: '14px',
              textAlign: 'center'
            }}>
              <p style={{ color: '#D4A843', fontSize: '22px', fontWeight: 700, marginBottom: '2px' }}>{stats.badges}</p>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('faithJourney.statBadges')}</p>
            </div>
          </div>

          {/* Verse of the Day */}
          <div style={{
            background: 'rgba(212,168,67,0.06)',
            border: '1px solid rgba(212,168,67,0.15)',
            borderRadius: '14px',
            padding: '16px',
            position: 'relative',
            overflow: 'hidden',
            marginBottom: '20px'
          }}>
            {/* Left accent */}
            <div style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: '3px',
              background: '#D4A843'
            }} />
            
            <p style={{ 
              color: '#D4A843', 
              fontSize: '9px', 
              fontWeight: 600, 
              letterSpacing: '0.15em', 
              textTransform: 'uppercase', 
              marginBottom: '10px',
              marginLeft: '8px'
            }}>
              {t('faithJourney.vodLabel')}
            </p>
            <p style={{ 
              color: 'rgba(255,255,255,0.85)', 
              fontSize: '13px', 
              fontStyle: 'italic',
              lineHeight: 1.6,
              marginBottom: '8px',
              marginLeft: '8px'
            }}>
              {t('faithJourney.vodQuote')}
            </p>
            <p style={{ 
              color: '#D4A843', 
              fontSize: '11px', 
              fontWeight: 600,
              textAlign: 'right'
            }}>
              {t('faithJourney.vodRef')}
            </p>
          </div>

        </div>
      ) : view === 'trivia' ? (
        <div style={subShellStyle}>
          <BibleTrivia onExit={() => setView('hub')} fillVertical />
        </div>
      ) : view === 'flashcards' ? (
        <div style={subShellStyle}>
          <VerseFlashcards onExit={() => setView('hub')} fillVertical />
        </div>
      ) : view === 'map' ? (
        <div style={subShellStyle}>
          <JourneyMap onExit={() => setView('hub')} fillVertical />
        </div>
      ) : (
        <div style={subShellStyle}>
          <Achievements onExit={() => setView('hub')} fillVertical />
        </div>
      )}
    </div>
  )
}
