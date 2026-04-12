import { useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { JOURNEY_MAP_GEOMETRY } from '../data/journeyMapGeometry'

const KEY = 'abidinganchor-achievements'
const TRIVIA_STATS_KEY = 'abidinganchor-trivia-stats'
const STREAK_KEY = 'abidinganchor-trivia-streak'
const VERSE_PROGRESS_KEY = 'abidinganchor-verse-progress'
const DEVOTIONAL_PROGRESS_KEY = 'abidinganchor-devotional-progress'
const DEVOTIONAL_STREAK_KEY = 'abidinganchor-devotional-streak'

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

const BADGES = [
  { id: 'first-steps', icon: '🌟', name: 'First Steps', desc: 'Complete your first trivia game', check: (s) => (s.gamesCompleted || 0) >= 1 },
  { id: 'on-fire', icon: '🔥', name: 'On Fire', desc: 'Reach a 7 day trivia streak', check: (s) => (s.triviaStreak || 0) >= 7 },
  { id: 'word-keeper', icon: '📖', name: 'Word Keeper', desc: 'Memorize 10 verses', check: (s) => (s.memorizedTotal || 0) >= 10 },
  { id: 'gospel-reader', icon: '✝️', name: 'Gospel Reader', desc: 'Memorize 5 New Testament verses', check: (s) => (s.memorizedNT || 0) >= 5 },
  { id: 'prayer-warrior', icon: '🙏', name: 'Prayer Warrior', desc: 'Open the app 7 days in a row', check: (s) => (s.appDays || 0) >= 7 },
  { id: 'psalm-master', icon: '👑', name: 'Psalm Master', desc: 'Answer 10 Psalm questions correctly', check: (s) => (s.psalmsCorrect || 0) >= 10 },
  { id: 'steady-student', icon: '🧠', name: 'Steady Student', desc: 'Memorize 5 verses', check: (s) => (s.memorizedTotal || 0) >= 5 },
  { id: 'trivia-champion', icon: '🏆', name: 'Trivia Champion', desc: 'Score 8+ in a round', check: (s) => (s.bestScore || 0) >= 8 },
  { id: 'quiet-time', icon: '🕯️', name: 'Quiet Time', desc: 'Complete your first devotional', check: (s) => (s.devotionalsCompleted || 0) >= 1 },
  { id: 'anchor-of-hope', icon: '⚓', name: 'Anchor of Hope', desc: 'Memorize a Hope verse', check: (s) => (s.memorizedHope || 0) >= 1 },
  { id: 'peacemaker', icon: '🕊️', name: 'Peacemaker', desc: 'Memorize a Peace verse', check: (s) => (s.memorizedPeace || 0) >= 1 },
  { id: 'love-walk', icon: '💛', name: 'Walk in Love', desc: 'Memorize a Love verse', check: (s) => (s.memorizedLove || 0) >= 1 },
  { id: 'faithful-scribe', icon: '✍️', name: 'Faithful Scribe', desc: 'Write 10 journal entries', check: (s) => (s.journalEntries || 0) >= 10 },
  { id: 'daily-bread', icon: '🍞', name: 'Daily Bread', desc: 'Read a devotional 7 days in a row', check: (s) => (s.devotionalReadingStreak || 0) >= 7 },
  { id: 'intercessor', icon: '🤲', name: 'Intercessor', desc: 'Submit 5 community prayers', check: (s) => (s.communityPrayers || 0) >= 5 },
  { id: 'lamp-lighter', icon: '🧭', name: 'Lamp Lighter', desc: 'Complete the Journey Map', check: (s) => s.mapFullyVisited === true },
  { id: 'shield-faith', icon: '🛡️', name: 'Shield of Faith', desc: 'Memorize 25 verses', check: (s) => (s.memorizedTotal || 0) >= 25 },
  { id: 'new-creation', icon: '🌱', name: 'New Creation', desc: 'Complete your profile', check: (s) => s.profileComplete === true },
  { id: 'salt-light', icon: '✨', name: 'Salt & Light', desc: 'Share a verse card', check: (s) => s.verseCardShared === true },
  { id: 'overcomer', icon: '👑', name: 'Overcomer', desc: 'Maintain a 30-day streak', check: (s) => (s.readingStreak || 0) >= 30 },
]

function computeSnapshot(profile) {
  const triviaStats = readJson(TRIVIA_STATS_KEY, { gamesCompleted: 0, bestScore: 0, psalmsCorrect: 0 })
  const streak = readJson(STREAK_KEY, { count: 0 })
  const verseProgress = readJson(VERSE_PROGRESS_KEY, {})
  const devotionalProgress = readJson(DEVOTIONAL_PROGRESS_KEY, { completedDates: [] })
  const devotionalStreakObj = readJson(DEVOTIONAL_STREAK_KEY, { count: 0 })
  const mapState = readJson('abidinganchor-journey-map', { seenFacts: {} })
  const startDateRaw = localStorage.getItem('abidinganchor-start-date')
  const start = startDateRaw ? new Date(startDateRaw) : new Date()
  const appDays = Math.max(1, Math.floor((Date.now() - start.getTime()) / 86400000) + 1)

  const memorized = Object.values(verseProgress).filter((p) => p?.memorized)
  const memorizedTotal = memorized.length

  const memorizedNT = memorized.filter((p) => {
    const r = String(p.ref || '')
    return /(Matthew|Mark|Luke|John|Acts|Romans|Corinthians|Galatians|Ephesians|Philippians|Colossians|Thessalonians|Timothy|Titus|Philemon|Hebrews|James|Peter|Jude|Revelation)/i.test(
      r,
    )
  }).length

  const memorizedHope = memorized.filter((p) => String(p.category || '').toLowerCase() === 'hope').length
  const memorizedPeace = memorized.filter((p) => String(p.category || '').toLowerCase() === 'peace').length
  const memorizedLove = memorized.filter((p) => String(p.category || '').toLowerCase() === 'love').length
  const devotionalsCompleted = Array.isArray(devotionalProgress.completedDates) ? devotionalProgress.completedDates.length : 0

  const journalEntries = parseInt(localStorage.getItem('abidinganchor-journal-entry-count') || '0', 10)
  const communityPrayers = parseInt(localStorage.getItem('abidinganchor-community-prayer-submissions') || '0', 10)
  const verseCardShared = localStorage.getItem('abidinganchor-verse-card-shared') === '1'
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
  const { profile } = useAuth()
  const [store, setStore] = useState(() => readJson(KEY, {}))
  const snapshot = useMemo(() => computeSnapshot(profile), [profile])

  const computed = useMemo(() => {
    const now = new Date().toISOString()
    const nextStore = { ...store }
    let changed = false
    const list = BADGES.map((b) => {
      const unlocked = !!nextStore[b.id]?.unlockedAt || b.check(snapshot)
      if (unlocked && !nextStore[b.id]?.unlockedAt) {
        nextStore[b.id] = { unlockedAt: now }
        changed = true
      }
      return { ...b, unlockedAt: nextStore[b.id]?.unlockedAt || null }
    })
    if (changed) {
      setStore(nextStore)
      writeJson(KEY, nextStore)
    }
    return list
  }, [snapshot, store])

  const earned = computed.filter((b) => b.unlockedAt).length

  return (
    <div
      className={`glass-panel rounded-2xl p-4 text-white ${fillVertical ? 'flex min-h-0 flex-1 flex-col' : ''}`}
      style={fillVertical ? { minHeight: '100%' } : undefined}
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

      <div className="mb-3 flex shrink-0 items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: '#D4A843' }}>
          🏆 Achievements
        </p>
        <button type="button" onClick={onExit} className="text-xs text-white/70">
          ← Back
        </button>
      </div>

      <div className="mb-3 shrink-0 glass-panel rounded-xl p-3 text-xs text-white/80">
        Badges Earned:{' '}
        <span style={{ color: '#D4A843', fontWeight: 800 }}>
          {earned}/{computed.length}
        </span>
      </div>

      <div className={`grid grid-cols-2 gap-2 sm:grid-cols-3 ${fillVertical ? 'min-h-0 flex-1 content-start overflow-y-auto pb-1' : ''}`}>
        {computed.map((b) => {
          const unlocked = !!b.unlockedAt
          return (
            <div
              key={b.id}
              className="relative glass-panel rounded-2xl p-3"
              style={{
                filter: unlocked ? 'none' : 'grayscale(1)',
                opacity: unlocked ? 1 : 0.55,
                boxShadow: unlocked ? '0 0 0 1px rgba(212,168,67,0.6), 0 0 20px rgba(212,168,67,0.18)' : 'none',
                animation: unlocked ? 'badge-unlock 520ms ease' : 'none',
              }}
            >
              {!unlocked ? (
                <div
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    fontSize: '12px',
                    color: 'rgba(255,255,255,0.8)',
                  }}
                  aria-hidden="true"
                >
                  🔒
                </div>
              ) : null}
              <p className="text-2xl">{b.icon}</p>
              <p className="mt-1 text-sm font-semibold" style={{ color: unlocked ? '#D4A843' : 'rgba(255,255,255,0.85)' }}>
                {b.name}
              </p>
              <p className="mt-1 text-xs text-white/75">{b.desc}</p>
              {unlocked ? (
                <p className="mt-2 text-[10px] text-white/60">Unlocked: {new Date(b.unlockedAt).toLocaleDateString()}</p>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
