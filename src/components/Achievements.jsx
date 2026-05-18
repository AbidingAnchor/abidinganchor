import { useTranslation } from 'react-i18next'
import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { JOURNEY_MAP_GEOMETRY } from '../data/journeyMapGeometry'
import { userStorageKey } from '../utils/userStorage'

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

function computeSnapshot(userId, profile) {
  if (!userId) {
    return {
      gamesCompleted: 0,
      bestScore: 0,
      psalmsCorrect: 0,
      triviaStreak: 0,
      appDays: 1,
      memorizedTotal: 0,
      memorizedNT: 0,
      memorizedHope: 0,
      memorizedPeace: 0,
      memorizedLove: 0,
      devotionalsCompleted: 0,
      journalEntries: 0,
      communityPrayers: 0,
      verseCardShared: false,
      mapFullyVisited: false,
      profileComplete: false,
      readingStreak: 0,
      devotionalReadingStreak: 0,
    }
  }
  const triviaStats = readJson(userStorageKey(userId, 'trivia-stats'), { gamesCompleted: 0, bestScore: 0, psalmsCorrect: 0 })
  const streak = readJson(userStorageKey(userId, 'trivia-streak'), { count: 0 })
  const verseProgress = readJson(userStorageKey(userId, 'verse-progress'), {})
  const devotionalProgress = readJson(userStorageKey(userId, 'devotional-progress'), { completedDates: [] })
  const devotionalStreakObj = readJson(userStorageKey(userId, 'devotional-streak'), { count: 0 })
  const mapState = readJson(userStorageKey(userId, 'journey-map'), { seenFacts: {} })
  const startDateRaw = localStorage.getItem(userStorageKey(userId, 'app-start-date'))
  const start = startDateRaw ? new Date(startDateRaw) : new Date()
  const appDays = Math.max(1, Math.floor((Date.now() - start.getTime()) / 86400000) + 1)

  console.log('verseProgress raw:', verseProgress)
  const memorized = Object.values(verseProgress).filter((p) => p?.memorized)
  console.log('memorized array:', memorized)
  const memorizedTotal = memorized.length

  const memorizedNT = memorized.filter((p) => {
    const r = String(p.ref || '')
    return /(Matthew|Mark|Luke|John|Acts|Romans|Corinthians|Galatians|Ephesians|Philippians|Colossians|Thessalonians|Timothy|Titus|Philemon|Hebrews|James|Peter|Jude|Revelation)/i.test(
      r,
    )
  }).length
  console.log('memorizedNT:', memorizedNT)

  const memorizedHope = memorized.filter((p) => String(p.category || '').toLowerCase() === 'hope').length
  const memorizedPeace = memorized.filter((p) => String(p.category || '').toLowerCase() === 'peace').length
  const memorizedLove = memorized.filter((p) => String(p.category || '').toLowerCase() === 'love').length
  const devotionalsCompleted = Array.isArray(devotionalProgress.completedDates) ? devotionalProgress.completedDates.length : 0

  const journalEntries = parseInt(localStorage.getItem(userStorageKey(userId, 'journal-entry-count')) || '0', 10)
  const communityPrayers = parseInt(localStorage.getItem(userStorageKey(userId, 'community-prayer-submissions')) || '0', 10)
  const verseCardShared = localStorage.getItem(userStorageKey(userId, 'verse-card-shared')) === '1'
  const mapFullyVisited = JOURNEY_MAP_GEOMETRY.every((stop) => mapState.seenFacts?.[stop.id])
  const profileComplete = profile?.onboarding_complete === true
  const readingStreak = Number(profile?.reading_streak) || 0

  return {
    ...triviaStats,
    triviaStreak: streak.count || 0,
    appDays,
    memorizedTotal,
    memorizedNT,
    memorizedHope,
    memorizedPeace,
    memorizedLove,
    devotionalsCompleted,
    journalEntries,
    communityPrayers,
    verseCardShared,
    mapFullyVisited,
    profileComplete,
    readingStreak,
    devotionalReadingStreak: devotionalStreakObj.count || 0,
  }
}

export default function Achievements({ onExit, fillVertical = false }) {
  const { t } = useTranslation()
  const location = useLocation()
  const { profile, user } = useAuth()
  const achievementKey = user?.id ? userStorageKey(user.id, 'achievements') : null
  const [store, setStore] = useState({})
  const [tick, setTick] = useState(0)

  useEffect(() => {
    setTick(t => t + 1)
  }, [location])

  const BADGES = useMemo(() => [
    { id: 'first-steps', icon: '🌟', name: t('achievements.firstSteps'), desc: t('achievements.firstStepsDesc'), check: (s) => (s.gamesCompleted || 0) >= 1 },
    { id: 'on-fire', icon: '🔥', name: t('achievements.onFire'), desc: t('achievements.onFireDesc'), check: (s) => (s.triviaStreak || 0) >= 7 },
    { id: 'word-keeper', icon: '📖', name: t('achievements.wordKeeper'), desc: t('achievements.wordKeeperDesc'), check: (s) => (s.memorizedTotal || 0) >= 10 },
    { id: 'gospel-reader', icon: '✝️', name: t('achievements.gospelReader'), desc: t('achievements.gospelReaderDesc'), check: (s) => (s.memorizedNT || 0) >= 5 },
    { id: 'prayer-warrior', icon: '🙏', name: t('achievements.prayerWarrior'), desc: t('achievements.prayerWarriorDesc'), check: (s) => (s.appDays || 0) >= 7 },
    { id: 'psalm-master', icon: '👑', name: t('achievements.psalmMaster'), desc: t('achievements.psalmMasterDesc'), check: (s) => (s.psalmsCorrect || 0) >= 10 },
    { id: 'steady-student', icon: '🧠', name: t('achievements.steadyStudent'), desc: t('achievements.steadyStudentDesc'), check: (s) => (s.memorizedTotal || 0) >= 5 },
    { id: 'trivia-champion', icon: '🏆', name: t('achievements.triviaChampion'), desc: t('achievements.triviaChampionDesc'), check: (s) => (s.bestScore || 0) >= 8 },
    { id: 'quiet-time', icon: '🕯️', name: t('achievements.quietTime'), desc: t('achievements.quietTimeDesc'), check: (s) => (s.devotionalsCompleted || 0) >= 1 },
    { id: 'anchor-of-hope', icon: '⚓', name: t('achievements.anchorOfHope'), desc: t('achievements.anchorOfHopeDesc'), check: (s) => (s.memorizedHope || 0) >= 1 },
    { id: 'peacemaker', icon: '🕊️', name: t('achievements.peacemaker'), desc: t('achievements.peacemakerDesc'), check: (s) => (s.memorizedPeace || 0) >= 1 },
    { id: 'love-walk', icon: '💛', name: t('achievements.walkInLove'), desc: t('achievements.walkInLoveDesc'), check: (s) => (s.memorizedLove || 0) >= 1 },
    { id: 'faithful-scribe', icon: '✍️', name: t('achievements.faithfulScribe'), desc: t('achievements.faithfulScribeDesc'), check: (s) => (s.journalEntries || 0) >= 10 },
    { id: 'daily-bread', icon: '🍞', name: t('achievements.dailyBread'), desc: t('achievements.dailyBreadDesc'), check: (s) => (s.devotionalReadingStreak || 0) >= 7 },
    { id: 'intercessor', icon: '🤲', name: t('achievements.intercessor'), desc: t('achievements.intercessorDesc'), check: (s) => (s.communityPrayers || 0) >= 5 },
    { id: 'lamp-lighter', icon: '🧭', name: t('achievements.lampLighter'), desc: t('achievements.lampLighterDesc'), check: (s) => s.mapFullyVisited === true },
    { id: 'shield-faith', icon: '🛡️', name: t('achievements.shieldOfFaith'), desc: t('achievements.shieldOfFaithDesc'), check: (s) => (s.memorizedTotal || 0) >= 25 },
    { id: 'new-creation', icon: '🌱', name: t('achievements.newCreation'), desc: t('achievements.newCreationDesc'), check: (s) => s.profileComplete === true },
    { id: 'salt-light', icon: '✨', name: t('achievements.saltAndLight'), desc: t('achievements.saltAndLightDesc'), check: (s) => s.verseCardShared === true },
    { id: 'overcomer', icon: '👑', name: t('achievements.overcomer'), desc: t('achievements.overcomerDesc'), check: (s) => (s.readingStreak || 0) >= 30 },
  ], [t])

  useEffect(() => {
    if (!achievementKey) {
      setStore({})
      return
    }
    setStore(readJson(achievementKey, {}))
  }, [achievementKey])

  const snapshot = useMemo(() => computeSnapshot(user?.id, profile), [tick, profile, user?.id])

  const computed = useMemo(() => {
    if (!achievementKey) return BADGES.map((b) => ({ ...b, unlockedAt: null }))
    const nextStore = { ...store }
    const list = BADGES.map((b) => ({
      ...b,
      unlockedAt: nextStore[b.id]?.unlockedAt || null
    }))
    return list
  }, [snapshot, store, achievementKey, BADGES])

  useEffect(() => {
    if (!achievementKey) return
    const now = new Date().toISOString()
    const nextStore = { ...store }
    let changed = false
    console.log('Checking achievements, snapshot:', snapshot)
    console.log('memorized count:', snapshot?.memorizedTotal)
    console.log('memorizedNT count:', snapshot?.memorizedNT)
    BADGES.forEach((b) => {
      const unlocked = b.check(snapshot)
      if (unlocked && !nextStore[b.id]?.unlockedAt) {
        nextStore[b.id] = { unlockedAt: now }
        changed = true
      }
    })
    if (changed) {
      setStore(nextStore)
      writeJson(achievementKey, nextStore)
    }
  }, [snapshot, achievementKey, BADGES])

  const earned = computed.filter((b) => b.unlockedAt).length

  return (
    <div
      className={`home-gold-glass ${fillVertical ? 'flex min-h-0 flex-1 flex-col' : ''}`}
      style={{ borderRadius: '20px', padding: '16px', ...(fillVertical ? { minHeight: '100%' } : {}) }}
    >
      <style>
        {`
          @keyframes badge-unlock {
            0% { transform: scale(0.9); opacity: 0.2; }
            70% { transform: scale(1.06); opacity: 1; }
            100% { transform: scale(1); opacity: 1; }
          }
        `}
      </style>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexShrink: 0 }}>
        <p style={{ color: '#fbbf24', fontSize: '13px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', margin: 0 }}>
          {t('achievements.title')}
        </p>
        <button type="button" onClick={onExit}
          style={{ fontSize: '12px', color: 'rgba(212,175,55,0.7)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, transition: 'color 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.color = '#D4AF37'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(212,175,55,0.7)'}>
          ← {t('common.back')}
        </button>
      </div>

      <div className="home-gold-glass" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(212,175,55,0.4)', borderRadius: '999px', padding: '10px 20px', marginBottom: '14px', flexShrink: 0, boxShadow: '0 0 16px rgba(212,175,55,0.1)', width: '100%', boxSizing: 'border-box' }}>
        <span style={{ color: 'rgba(212,175,55,0.9)', fontSize: '14px', fontWeight: 600 }}>
          <span style={{ color: '#FFD700', fontWeight: 700 }}>{earned}</span>
          {' of '}
          <span style={{ color: '#FFD700', fontWeight: 700 }}>{computed.length}</span>
          {' badges earned'}
        </span>
      </div>

      <div className={`grid grid-cols-2 sm:grid-cols-3 ${fillVertical ? 'min-h-0 flex-1 content-start overflow-y-auto pb-1' : ''}`} style={{ gap: '12px', alignItems: 'stretch' }}>
        {computed.map((b) => {
          const unlocked = !!b.unlockedAt
          return (
            <div
              key={b.id}
              className="home-gold-glass"
              style={{
                borderRadius: '16px',
                padding: '14px',
                position: 'relative',
                borderTop: unlocked ? '1px solid rgba(212,175,55,0.45)' : '1px solid rgba(255,255,255,0.06)',
                borderRight: unlocked ? '1px solid rgba(212,175,55,0.45)' : '1px solid rgba(255,255,255,0.06)',
                borderBottom: unlocked ? '1px solid rgba(212,175,55,0.45)' : '1px solid rgba(255,255,255,0.06)',
                borderLeft: unlocked ? '4px solid rgba(212,175,55,0.7)' : '4px solid rgba(255,255,255,0.08)',
                boxShadow: unlocked
                  ? '0 0 16px rgba(212,175,55,0.12), 0 4px 20px rgba(0,0,0,0.4)'
                  : '0 4px 16px rgba(0,0,0,0.3)',
                animation: unlocked ? 'badge-unlock 520ms ease' : 'none',
                opacity: unlocked ? 1 : 0.75,
              }}
            >
              {/* Icon square */}
              <div style={{
                width: '40px', height: '40px', borderRadius: '14px', marginBottom: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
                background: unlocked
                  ? 'linear-gradient(135deg, rgba(212,175,55,0.3), rgba(180,120,0,0.2))'
                  : 'rgba(255,255,255,0.05)',
                padding: '10px',
                position: 'relative',
              }}>
                {b.icon}
                {!unlocked && (
                  <span style={{ position: 'absolute', bottom: '-2px', right: '-2px', fontSize: '10px', opacity: 0.6 }} aria-hidden>🔒</span>
                )}
              </div>
              <p style={{ fontSize: '15px', fontWeight: unlocked ? 700 : 600, margin: '0 0 4px 0', color: unlocked ? '#D4AF37' : 'rgba(255,255,255,0.5)' }}>
                {b.name}
              </p>
              <p style={{ fontSize: '12px', color: unlocked ? 'rgba(220,200,150,0.8)' : 'rgba(255,255,255,0.3)', margin: '0 0 6px 0', lineHeight: 1.4 }}>{b.desc}</p>
              {unlocked ? (
                <p style={{ fontSize: '11px', color: 'rgba(212,175,55,0.55)', margin: 0, fontStyle: 'italic' }}>{t('achievements.unlocked', { date: new Date(b.unlockedAt).toLocaleDateString() })}</p>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
