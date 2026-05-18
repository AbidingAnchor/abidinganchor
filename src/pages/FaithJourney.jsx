import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import BibleTrivia from '../components/BibleTrivia'
import VerseFlashcards from '../components/VerseFlashcards'
import JourneyMap from '../components/JourneyMap'
import Achievements from '../components/Achievements'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { userStorageKey } from '../utils/userStorage'


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

const FEATURE_ICON_GRADIENTS = {
  trivia:       'linear-gradient(135deg,#4c1d95,#7c3aed)',
  flashcards:   'linear-gradient(135deg,#1e3a6e,#2563eb)',
  map:          'linear-gradient(135deg,#0f4c40,#0d9488)',
  achievements: 'linear-gradient(135deg,#78350f,#D4A843)',
}

const LearningPathCard = ({ icon, title, subtitle, featureKey, badge, onStart }) => (
  <article
    role="button"
    tabIndex={0}
    onClick={onStart}
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onStart() }
    }}
    className="fj-hub-card home-gold-glass"
    style={{
      borderRadius: '16px',
      padding: '14px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      cursor: 'pointer',
      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      position: 'relative',
      overflow: 'hidden',
    }}
  >
    {/* Icon box with unique gradient */}
    <div style={{
      width: '46px',
      height: '46px',
      borderRadius: '12px',
      background: FEATURE_ICON_GRADIENTS[featureKey] ?? FEATURE_ICON_GRADIENTS.achievements,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '22px',
      flexShrink: 0,
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    }}>
      {icon}
    </div>

    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ color: '#ffffff', fontWeight: 700, fontSize: '15px', marginBottom: '3px' }}>{title}</div>
      <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px' }}>{subtitle}</div>
    </div>

    {badge ? (
      <span style={{
        padding: '7px 16px',
        borderRadius: '50px',
        fontSize: '12px',
        fontWeight: 700,
        background: 'linear-gradient(135deg,#D4A843,#F0C040)',
        color: '#1A1200',
        flexShrink: 0,
      }}>
        {badge}
      </span>
    ) : null}
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
        const verseProgress = readJson(userStorageKey(user.id, 'verse-progress'), {})
        const memorized = Object.values(verseProgress).filter((p) => p?.memorized).length
        const triviaStreak = readJson(userStorageKey(user.id, 'trivia-streak'), { count: 0 }).count || 0
        const achievements = readJson(userStorageKey(user.id, 'achievements'), {})
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
        <div style={{ padding: '0 16px', paddingTop: '16px', paddingBottom: '100px', width: '100%', flex: 1, boxSizing: 'border-box' }}>

          {/* ── Header Card ── */}
          <header className="home-gold-glass" style={{ borderRadius: '24px', padding: '24px', marginBottom: '20px', position: 'relative', overflow: 'hidden' }}>
            <div style={{
              position: 'absolute', top: '-24px', right: '-24px',
              width: '140px', height: '140px',
              background: 'radial-gradient(circle, rgba(212,168,67,0.12) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />
            <p style={{ color: '#D4A843', fontSize: '10px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', margin: '0 0 10px 0' }}>
              {t('faithJourney.heroKicker')}
            </p>
            <h1 style={{ color: '#FFFFFF', fontSize: '24px', fontWeight: 800, margin: '0 0 10px 0', lineHeight: 1.25, fontFamily: 'Georgia, serif' }}>
              {t('faithJourney.heroLine1')}<span style={{ color: '#D4A843' }}>{t('faithJourney.heroLine1Accent')}</span>{t('faithJourney.heroLine2')}
            </h1>
            <p style={{ color: 'rgba(251,191,36,0.65)', fontSize: '13px', fontStyle: 'italic', margin: 0 }}>
              {t('faithJourney.heroSubtitle')}
            </p>
          </header>

          {/* ── Streak Card ── */}
          <div className="home-gold-glass fj-hub-streak" style={{ borderRadius: '16px', padding: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
              <span style={{ fontSize: '26px', lineHeight: 1 }}>🔥</span>
              <span style={{ color: '#D4A843', fontSize: '22px', fontWeight: 800, lineHeight: 1 }}>
                {loading ? '—' : streakCount}
              </span>
            </div>
            <div style={{ flex: 1 }}>
              <p className="fj-hub-streak__line" style={{ color: '#ffffff', fontSize: '13px', fontWeight: 600, margin: '0 0 2px 0' }}>
                {loading ? t('faithJourney.streakLoading') : streakCount === 0 ? t('faithJourney.streakSubZero') : t('faithJourney.streakSubActive')}
              </p>
              <p className="fj-hub-streak__sub" style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px', margin: 0 }}>
                {t('faithJourney.statStreak')}
              </p>
            </div>
            <div className="fj-hub-streak-dots" style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
              {days.map((day, i) => {
                const isToday = i === dayIndex
                const isPast = i < dayIndex && dayIndex !== -1
                const isCompleted = !loading && isPast
                const dotState = loading ? 'loading' : isToday ? 'today' : isCompleted ? 'done' : 'idle'
                return (
                  <div key={`${day}-${i}`} className={`fj-hub-streak-dot fj-hub-streak-dot--${dotState}`}>
                    {day}
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Answered Prayers Card ── */}
          <button
            type="button"
            onClick={() => navigate('/prayer')}
            className="fj-hub-prayers home-gold-glass"
            style={{
              width: '100%',
              marginBottom: '20px',
              padding: '16px',
              borderRadius: '16px',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              border: 'none',
            }}
          >
            <span style={{
              width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
              background: 'linear-gradient(135deg,#78350f,#D4A843)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '22px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            }} aria-hidden>✓</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: '#D4A843', fontSize: '15px', fontWeight: 700, margin: '0 0 3px 0' }}>
                {t('faithJourney.prayersAnsweredBadge', { count: answeredPrayersCount })}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', margin: 0 }}>
                {t('faithJourney.prayersAnsweredHint')}
              </p>
            </div>
            <span className="fj-hub-prayers__arrow" style={{ color: '#D4A843', fontSize: '20px', flexShrink: 0 }} aria-hidden>→</span>
          </button>

          {/* ── Feature Cards ── */}
          <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <LearningPathCard
              icon="❓"
              title={t('faithJourney.cardTrivia')}
              subtitle={t('faithJourney.cardTriviaSub')}
              featureKey="trivia"
              badge={t('faithJourney.badgeToday')}
              onStart={() => setView('trivia')}
            />
            <LearningPathCard
              icon="📖"
              title={t('faithJourney.cardFlash')}
              subtitle={t('faithJourney.cardFlashSub')}
              featureKey="flashcards"
              badge={t('faithJourney.badgeStart')}
              onStart={() => setView('flashcards')}
            />
            <LearningPathCard
              icon="🗺️"
              title={t('faithJourney.cardMap')}
              subtitle={t('faithJourney.cardMapSub')}
              featureKey="map"
              badge={t('faithJourney.badgeStart')}
              onStart={() => setView('map')}
            />
            <LearningPathCard
              icon="🏆"
              title={t('faithJourney.cardAchievements')}
              subtitle={t('faithJourney.cardAchievementsSub')}
              featureKey="achievements"
              badge={t('faithJourney.badgeStart')}
              onStart={() => setView('achievements')}
            />
          </div>

          {/* ── Stats Row ── */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            {[
              { value: stats.versesRead, label: t('faithJourney.statVerses') },
              { value: streakCount,      label: t('faithJourney.statStreak') },
              { value: stats.badges,     label: t('faithJourney.statBadges') },
            ].map(({ value, label }) => (
              <div key={label} className="fj-hub-stat-card home-gold-glass" style={{ flex: 1, borderRadius: '16px', padding: '14px', textAlign: 'center' }}>
                <p style={{ color: '#D4A843', fontSize: '28px', fontWeight: 800, margin: '0 0 3px 0' }}>{loading ? '—' : value}</p>
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1.4px', fontWeight: 600, margin: 0 }}>{label}</p>
              </div>
            ))}
          </div>

          {/* ── Verse of the Day ── */}
          <div className="fj-hub-vod-card home-gold-glass" style={{ borderRadius: '16px', padding: '20px', marginBottom: '20px' }}>
            <p style={{ color: '#D4A843', fontSize: '10px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', margin: '0 0 12px 0' }}>
              {t('faithJourney.vodLabel')}
            </p>
            <p style={{ color: '#ffffff', fontSize: '15px', fontStyle: 'italic', lineHeight: 1.7, fontFamily: 'Georgia, serif', margin: '0 0 12px 0' }}>
              {t('faithJourney.vodQuote')}
            </p>
            <p style={{ color: 'rgba(212,168,67,0.75)', fontSize: '12px', fontWeight: 600, textAlign: 'right', margin: 0 }}>
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
        <div style={{ ...subShellStyle, paddingTop: '12px' }}>
          <JourneyMap onExit={() => setView('hub')} fillVertical />
        </div>
      ) : (
        <div style={{ ...subShellStyle, paddingTop: '0px' }}>
          <Achievements onExit={() => setView('hub')} fillVertical />
        </div>
      )}
    </div>
  )
}
