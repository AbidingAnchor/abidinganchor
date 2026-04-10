import { useMemo, useState } from 'react'
import BibleTrivia from '../components/BibleTrivia'
import VerseFlashcards from '../components/VerseFlashcards'
import JourneyMap from '../components/JourneyMap'
import Achievements from '../components/Achievements'
import { useAuth } from '../context/AuthContext'

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

// Generate stars once at module level
const HERO_STARS = Array.from({ length: 40 }).map(() => ({
  width: Math.random() * 2 + 1,
  height: Math.random() * 2 + 1,
  top: Math.random() * 60,
  left: Math.random() * 100,
  opacity: Math.random() * 0.5 + 0.3,
  duration: Math.random() * 3 + 2
}))

const LearningPathCard = ({ icon, title, subtitle, accentColor, iconBg, progress, featured, badge, onStart }) => (
  <article
    onClick={onStart}
    style={{
      background: featured ? 'rgba(212,168,67,0.08)' : 'rgba(255,255,255,0.03)',
      border: featured ? '1px solid rgba(212,168,67,0.2)' : '1px solid rgba(255,255,255,0.06)',
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
    onMouseEnter={(e) => {
      e.currentTarget.style.background = featured ? 'rgba(212,168,67,0.12)' : 'rgba(255,255,255,0.06)'
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = featured ? 'rgba(212,168,67,0.08)' : 'rgba(255,255,255,0.03)'
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
      <p style={{ color: '#FFFFFF', fontSize: '13px', fontWeight: 700, marginBottom: '2px' }}>{title}</p>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px', marginBottom: '6px' }}>{subtitle}</p>
      {/* Progress bar */}
      <div style={{
        height: '3px',
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '2px',
        overflow: 'hidden'
      }}>
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
      <div style={{
        padding: '4px 12px',
        borderRadius: '20px',
        fontSize: '10px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        background: featured ? '#D4A843' : 'rgba(255,255,255,0.1)',
        color: featured ? '#0a1a3e' : 'rgba(255,255,255,0.6)'
      }}>
        {badge}
      </div>
    )}
  </article>
)

export default function FaithJourney() {
  const [view, setView] = useState('hub') // hub | trivia | flashcards | map | achievements
  const { profile } = useAuth()

  const stats = useMemo(() => {
    const verseProgress = readJson(VERSE_PROGRESS_KEY, {})
    const memorized = Object.values(verseProgress).filter((p) => p?.memorized).length
    const triviaStreak = readJson(TRIVIA_STREAK_KEY, { count: 0 }).count || 0
    const achievements = readJson(ACHIEVEMENTS_KEY, {})
    const badges = Object.values(achievements).filter((a) => a?.unlockedAt).length
    return { memorized, triviaStreak, badges }
  }, [])

  // Use Supabase streak if available, otherwise use localStorage
  const streakCount = profile?.prayer_streak || stats.triviaStreak
  const dayIndex = getDayIndexForWeek()
  const days = ['M', 'T', 'W', 'T', 'F']

  return (
    <div style={{ 
      position: 'relative',
      minHeight: '100%',
      height: 'auto',
      overflow: 'hidden',
      paddingBottom: '24px',
      background: '#060f26'
    }}>
      {view === 'hub' ? (
        <div style={{ padding: '0 16px', paddingTop: '110px', paddingBottom: '20px', maxWidth: '680px', margin: '0 auto', width: '100%' }}>
          
          {/* Hero Section */}
          <header style={{ marginBottom: '20px', position: 'relative', borderRadius: '16px', overflow: 'hidden', minHeight: '200px' }}>
            {/* Clear Night Sky Background */}
            <div style={{
              position: 'absolute',
              inset: 0,
              zIndex: 0,
              background: 'linear-gradient(to bottom, #0a1a3e 0%, #060f26 100%)'
            }}>
              {/* Stars */}
              {HERO_STARS.map((star, i) => (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    width: star.width,
                    height: star.height,
                    background: '#fff',
                    borderRadius: '50%',
                    top: `${star.top}%`,
                    left: `${star.left}%`,
                    opacity: star.opacity,
                    animation: `twinkle ${star.duration}s ease-in-out infinite`
                  }}
                />
              ))}
              
              {/* Moon */}
              <div style={{
                position: 'absolute',
                top: '15%',
                right: '10%',
                width: '50px',
                height: '50px',
                background: 'radial-gradient(circle at 30% 30%, #fff9e6 0%, #ffe6b3 50%, #ffd280 100%)',
                borderRadius: '50%',
                boxShadow: '0 0 30px rgba(255, 230, 160, 0.6), 0 0 60px rgba(255, 230, 160, 0.3)',
                opacity: 0.95
              }} />
            </div>
            
            {/* Dark Gradient Overlay for text readability */}
            <div style={{
              position: 'absolute',
              inset: 0,
              zIndex: 1,
              background: 'linear-gradient(to bottom, transparent 40%, #060f26 100%)',
              pointerEvents: 'none'
            }} />
            
            {/* Hero Content */}
            <div style={{ position: 'relative', zIndex: 2, padding: '24px' }}>
              <p style={{ 
                color: '#D4A843', 
                fontSize: '9px', 
                fontWeight: 600, 
                letterSpacing: '0.15em', 
                textTransform: 'uppercase', 
                marginBottom: '8px' 
              }}>
                YOUR FAITH JOURNEY
              </p>
              <h1 style={{ color: '#FFFFFF', fontSize: '26px', fontWeight: 700, marginBottom: '8px', lineHeight: 1.2 }}>
                Walk in the <span style={{ color: '#D4A843' }}>Light</span> of His Word
              </h1>
              <p style={{ 
                color: 'rgba(255,255,255,0.38)', 
                fontSize: '11px', 
                fontStyle: 'italic' 
              }}>
                Thy word is a lamp unto my feet — Psalm 119:105
              </p>
            </div>
            
            {/* Star twinkle animation */}
            <style>{`
              @keyframes twinkle {
                0%, 100% { opacity: 0.3; }
                50% { opacity: 0.8; }
              }
            `}</style>
          </header>

          {/* Gold Divider */}
          <div style={{
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(212,168,67,0.3), transparent)',
            marginBottom: '20px'
          }} />

          {/* Streak Bar */}
          <div style={{
            background: 'rgba(212,168,67,0.07)',
            border: '1px solid rgba(212,168,67,0.18)',
            borderRadius: '16px',
            padding: '12px 14px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span style={{ fontSize: '22px' }}>🔥</span>
            <div style={{ flex: 1 }}>
              <p style={{ color: '#FFFFFF', fontSize: '13px', fontWeight: 600, marginBottom: '2px' }}>
                {streakCount} day streak
              </p>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px' }}>
                {streakCount === 0 ? 'Complete an activity to start your streak' : 'Keep up the great work!'}
              </p>
            </div>
            {/* Day of week dots */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {days.map((day, i) => {
                const isToday = i === dayIndex
                const isCompleted = i < dayIndex && dayIndex !== -1
                return (
                  <div
                    key={day}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      fontWeight: 600,
                      background: isToday 
                        ? '#D4A843' 
                        : isCompleted 
                          ? 'rgba(212,168,67,0.3)' 
                          : 'rgba(255,255,255,0.06)',
                      color: isToday ? '#0a1a3e' : isCompleted ? '#D4A843' : 'rgba(255,255,255,0.3)'
                    }}
                  >
                    {day}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Learning Paths */}
          <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <LearningPathCard
              icon="🎮"
              title="Daily Trivia"
              subtitle="Test your Bible knowledge"
              accentColor="#D4A843"
              iconBg="rgba(212,168,67,0.15)"
              progress={0}
              featured={true}
              badge="Today"
              onStart={() => setView('trivia')}
            />
            <LearningPathCard
              icon="📖"
              title="Verse Flashcards"
              subtitle="Memorize God's Word"
              accentColor="#7F77DD"
              iconBg="rgba(127,119,221,0.15)"
              progress={0}
              featured={false}
              badge="Start"
              onStart={() => setView('flashcards')}
            />
            <LearningPathCard
              icon="🗺️"
              title="Journey Map"
              subtitle="Track your progress"
              accentColor="#1D9E75"
              iconBg="rgba(29,158,117,0.15)"
              progress={0}
              featured={false}
              badge="Start"
              onStart={() => setView('map')}
            />
            <LearningPathCard
              icon="🏆"
              title="Achievements"
              subtitle="Earn faith badges"
              accentColor="#378ADD"
              iconBg="rgba(55,138,221,0.15)"
              progress={0}
              featured={false}
              badge="Start"
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
              <p style={{ color: '#D4A843', fontSize: '22px', fontWeight: 700, marginBottom: '2px' }}>{stats.memorized}</p>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Verses</p>
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
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Streak</p>
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
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Badges</p>
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
              VERSE OF THE DAY
            </p>
            <p style={{ 
              color: 'rgba(255,255,255,0.85)', 
              fontSize: '13px', 
              fontStyle: 'italic',
              lineHeight: 1.6,
              marginBottom: '8px',
              marginLeft: '8px'
            }}>
              Let us run with perseverance the race that is set before us.
            </p>
            <p style={{ 
              color: '#D4A843', 
              fontSize: '11px', 
              fontWeight: 600,
              textAlign: 'right'
            }}>
              — Hebrews 12:1
            </p>
          </div>

        </div>
      ) : view === 'trivia' ? (
        <BibleTrivia onExit={() => setView('hub')} />
      ) : view === 'flashcards' ? (
        <VerseFlashcards onExit={() => setView('hub')} />
      ) : view === 'map' ? (
        <JourneyMap onExit={() => setView('hub')} />
      ) : (
        <Achievements onExit={() => setView('hub')} />
      )}
    </div>
  )
}
