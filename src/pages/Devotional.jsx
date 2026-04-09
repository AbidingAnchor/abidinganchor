import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import DevotionalReader from '../components/DevotionalReader'
import { devotionalTopics, devotionals } from '../data/devotionals'

const PROGRESS_KEY = 'abidinganchor-devotional-progress'
const STREAK_KEY = 'abidinganchor-devotional-streak'
const FAVORITES_KEY = 'abidinganchor-favorites'

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

function getTodayKey() {
  return new Date().toISOString().slice(0, 10)
}

function getDayOfYear() {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  return Math.floor((now - start) / 86400000)
}

function getYesterdayKey() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

function getTodayDevotional() {
  return devotionals[getDayOfYear() % devotionals.length]
}

export default function Devotional() {
  const [activeTopic, setActiveTopic] = useState('All')
  const [selectedId, setSelectedId] = useState(null)
  const [progress, setProgress] = useState(() => readJson(PROGRESS_KEY, { items: {}, completedDates: [] }))
  const [streak, setStreak] = useState(() => readJson(STREAK_KEY, { count: 0, lastDate: null, missedRecently: false }))
  const [favorites, setFavorites] = useState(() => readJson(FAVORITES_KEY, []))
  const [loading, setLoading] = useState(true)

  const today = getTodayDevotional()
  const nextDay = devotionals[(today.day % devotionals.length)]
  const isTodayStarted = !!progress.items?.[today.id]?.startedAt
  const isTodayCompleted = !!progress.items?.[today.id]?.completedAt
  const totalCompleted = progress.completedDates?.length || 0

  const filtered = useMemo(() => {
    if (activeTopic === 'All') return devotionals
    return devotionals.filter((d) => d.topic === activeTopic)
  }, [activeTopic])

  const selectedDevotional = selectedId ? devotionals.find((d) => d.id === selectedId) : null
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 220)
    return () => clearTimeout(t)
  }, [])

  const openReader = (devotional) => {
    const next = {
      ...progress,
      items: {
        ...(progress.items || {}),
        [devotional.id]: {
          ...(progress.items?.[devotional.id] || {}),
          startedAt: progress.items?.[devotional.id]?.startedAt || new Date().toISOString(),
          lastReadAt: new Date().toISOString(),
        },
      },
    }
    setProgress(next)
    writeJson(PROGRESS_KEY, next)
    setSelectedId(devotional.id)
  }

  const toggleFavorite = (id) => {
    const set = new Set(favorites)
    if (set.has(id)) set.delete(id)
    else set.add(id)
    const next = Array.from(set)
    setFavorites(next)
    writeJson(FAVORITES_KEY, next)
  }

  const markComplete = (id) => {
    const todayKey = getTodayKey()
    const yesterdayKey = getYesterdayKey()
    const alreadyCompletedToday = streak.lastDate === todayKey
    let nextStreak = { ...streak }

    if (!alreadyCompletedToday) {
      if (!streak.lastDate) {
        nextStreak = { count: 1, lastDate: todayKey, missedRecently: false }
      } else if (streak.lastDate === yesterdayKey) {
        nextStreak = { count: (streak.count || 0) + 1, lastDate: todayKey, missedRecently: false }
      } else {
        nextStreak = { count: 1, lastDate: todayKey, missedRecently: true }
      }
      setStreak(nextStreak)
      writeJson(STREAK_KEY, nextStreak)
    }

    const completedDates = Array.from(new Set([...(progress.completedDates || []), todayKey]))
    const nextProgress = {
      ...progress,
      completedDates,
      items: {
        ...(progress.items || {}),
        [id]: {
          ...(progress.items?.[id] || {}),
          startedAt: progress.items?.[id]?.startedAt || new Date().toISOString(),
          completedAt: progress.items?.[id]?.completedAt || new Date().toISOString(),
          completedDate: progress.items?.[id]?.completedDate || todayKey,
        },
      },
    }
    setProgress(nextProgress)
    writeJson(PROGRESS_KEY, nextProgress)
  }

  if (selectedDevotional) {
    return (
      <DevotionalReader
        devotional={selectedDevotional}
        isFavorite={favorites.includes(selectedDevotional.id)}
        isCompleted={!!progress.items?.[selectedDevotional.id]?.completedAt}
        onToggleFavorite={() => toggleFavorite(selectedDevotional.id)}
        onComplete={() => markComplete(selectedDevotional.id)}
        onBack={() => setSelectedId(null)}
      />
    )
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1,
          pointerEvents: 'none',
          background: 'linear-gradient(180deg, rgba(13,31,78,0.9) 0%, rgba(13,31,78,0.74) 55%, rgba(13,31,78,0.92) 100%)',
        }}
      />
      <div className="content-scroll" style={{ padding: '0 16px', paddingTop: '220px', paddingBottom: '110px', maxWidth: '680px', margin: '0 auto', width: '100%', zIndex: 2 }}>
        <section className="space-y-4">
          <div className="rounded-3xl border border-white/30 p-5 text-white backdrop-blur-md" style={{ background: 'rgba(8, 20, 50, 0.72)', boxShadow: '0 0 28px rgba(212,168,67,0.22)' }}>
            <p className="text-xs uppercase tracking-[0.2em] text-white/80">Today&apos;s Devotional</p>
            <h1 className="mt-2 text-3xl font-bold" style={{ color: '#D4A843' }}>{today.title}</h1>
            <p className="mt-1 text-xs uppercase tracking-[0.14em] text-white/75">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            <p className="mt-3 text-sm text-white/85">{today.scripture}</p>
            <p className="mt-3 text-sm italic leading-relaxed [font-family:'Lora',serif] text-white/92">
              "{today.verse}"
            </p>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => openReader(today)} className="rounded-xl px-4 py-2 text-sm font-semibold text-[#1a1a1a]" style={{ background: '#D4A843' }}>
                {isTodayStarted ? 'Continue Reading' : 'Start Today'}
              </button>
              <Link to="/faith-journey" className="rounded-xl border border-white/35 px-4 py-2 text-sm text-white/90">Journey</Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-white/20 bg-white/10 p-3 text-white backdrop-blur-md">
              <p className="text-xs uppercase tracking-[0.12em] text-white/75">Streak</p>
              <p className={`mt-1 text-xl font-bold ${streak.count ? 'streak-shimmer' : ''}`} style={{ color: '#D4A843' }}>🔥 {streak.count || 0}</p>
            </div>
            <div className="rounded-xl border border-white/20 bg-white/10 p-3 text-white backdrop-blur-md">
              <p className="text-xs uppercase tracking-[0.12em] text-white/75">Completed</p>
              <p className="mt-1 text-xl font-bold" style={{ color: '#D4A843' }}>{totalCompleted}</p>
            </div>
          </div>

          {streak.missedRecently ? (
            <p className="rounded-xl border border-white/15 bg-black/15 p-3 text-sm text-white/85">
              Grace for today. If you missed a day, begin again - God&apos;s mercies are new every morning.
            </p>
          ) : null}

          <div className="flex gap-2 overflow-x-auto pb-1">
            {devotionalTopics.map((topic) => (
              <button
                key={topic}
                type="button"
                onClick={() => setActiveTopic(topic)}
                className="whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold"
                style={{
                  borderColor: activeTopic === topic ? '#D4A843' : 'rgba(255,255,255,0.3)',
                  color: activeTopic === topic ? '#D4A843' : 'rgba(255,255,255,0.85)',
                  background: activeTopic === topic ? 'rgba(212,168,67,0.13)' : 'rgba(8, 20, 50, 0.72)',
                }}
              >
                {topic}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map((d) => (
              <article key={d.id} className="rounded-2xl border border-white/20 bg-white/10 p-4 text-white backdrop-blur-md">
                <span className="rounded-full border border-[#D4A843]/60 px-2 py-1 text-[10px] uppercase tracking-[0.1em] text-[#D4A843]">{d.topic}</span>
                <h2 className="mt-2 text-lg font-semibold">{d.title}</h2>
                <p className="mt-1 text-xs uppercase tracking-[0.14em] text-white/70">{d.scripture}</p>
                <button type="button" onClick={() => openReader(d)} className="mt-3 rounded-lg px-3 py-1.5 text-xs font-semibold text-[#1a1a1a]" style={{ background: '#D4A843' }}>
                  Read
                </button>
              </article>
            ))}
          </div>

          <div className="rounded-2xl border border-white/20 bg-white/10 p-4 text-white backdrop-blur-md">
            <p className="text-xs uppercase tracking-[0.14em] text-white/75">Tomorrow</p>
            {isTodayCompleted ? (
              <>
                <p className="mt-2 text-sm text-[#D4A843]">Unlocked preview</p>
                <p className="mt-1 font-semibold">{nextDay.title}</p>
                <p className="text-xs text-white/70">{nextDay.scripture}</p>
              </>
            ) : (
              <p className="mt-2 text-sm text-white/85">Complete today&apos;s devotional to unlock tomorrow&apos;s preview.</p>
            )}
          </div>

          <div className="rounded-2xl border border-white/20 bg-white/10 p-4 text-white backdrop-blur-md">
            <p className="text-sm font-semibold" style={{ color: '#D4A843' }}>Favorites</p>
            {loading ? (
              <div className="mt-2 space-y-2">
                <div className="gold-skeleton" />
                <div className="gold-skeleton" style={{ width: '70%' }} />
              </div>
            ) : favorites.length ? (
              <div className="mt-2 grid gap-2">
                {devotionals
                  .filter((d) => favorites.includes(d.id))
                  .slice(0, 8)
                  .map((d) => (
                    <button key={d.id} type="button" onClick={() => openReader(d)} className="rounded-xl border border-white/15 bg-black/15 p-3 text-left text-sm text-white/90">
                      {d.title} <span className="text-white/65">- {d.scripture}</span>
                    </button>
                  ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-white/75">💛 Nothing saved yet.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
