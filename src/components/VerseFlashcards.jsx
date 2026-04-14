import { useEffect, useMemo, useState } from 'react'
import { VERSE_FLASHCARDS, FLASHCARD_FILTER_OPTIONS } from '../data/verseFlashcards'
import { useAuth } from '../context/AuthContext'
import { userStorageKey } from '../utils/userStorage'

function readProgress(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeProgress(storageKey, obj) {
  localStorage.setItem(storageKey, JSON.stringify(obj))
}

function matchesFilter(verse, filter) {
  if (filter === 'All') return true
  if (filter === 'Old Testament') return verse.bookGroup === 'Old Testament'
  if (filter === 'New Testament') return verse.bookGroup === 'New Testament'
  if (filter === 'Psalms') return verse.bookGroup === 'Psalms'
  if (filter === 'Proverbs') return verse.bookGroup === 'Proverbs'
  if (filter === 'Faith') return verse.theme === 'Faith'
  if (filter === 'Hope') return verse.theme === 'Hope'
  if (filter === 'Love') return verse.theme === 'Love'
  if (filter === 'Strength') return verse.theme === 'Strength'
  return true
}

function ProgressRing({ percent }) {
  const r = 18
  const c = 2 * Math.PI * r
  const dash = (percent / 100) * c
  return (
    <svg width="44" height="44" viewBox="0 0 44 44">
      <circle cx="22" cy="22" r={r} stroke="rgba(255,255,255,0.18)" strokeWidth="4" fill="none" />
      <circle
        cx="22"
        cy="22"
        r={r}
        stroke="#D4A843"
        strokeWidth="4"
        fill="none"
        strokeDasharray={`${dash} ${c - dash}`}
        strokeLinecap="round"
        transform="rotate(-90 22 22)"
      />
      <text x="22" y="26" textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.85)" fontWeight="700">
        {Math.round(percent)}%
      </text>
    </svg>
  )
}

export default function VerseFlashcards({ onExit, onMemorizedChange, fillVertical = false }) {
  const { user } = useAuth()
  const progressKey = useMemo(() => userStorageKey(user?.id, 'verse-progress'), [user?.id])
  const [progress, setProgress] = useState({})
  const [category, setCategory] = useState('All')
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [checkFlash, setCheckFlash] = useState(false)

  useEffect(() => {
    setProgress(readProgress(progressKey))
  }, [progressKey])

  const filtered = useMemo(
    () => VERSE_FLASHCARDS.filter((v) => matchesFilter(v, category)),
    [category],
  )

  const memorizedCount = useMemo(
    () => Object.values(progress).filter((p) => p?.memorized).length,
    [progress],
  )
  const percent = (memorizedCount / VERSE_FLASHCARDS.length) * 100

  const safeLen = filtered.length || 1
  const current = filtered[idx % safeLen]
  const currentProg = current ? progress[current.id]?.memorized : false

  if (!current) {
    return (
      <div className="glass-panel rounded-2xl p-4 text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: '#D4A843' }}>
          📖 Verse Flashcards
        </p>
        <p className="mt-4 text-sm text-white/80">No verses match this filter.</p>
        <button type="button" onClick={onExit} className="mt-4 text-xs text-white/70">
          ← Back
        </button>
      </div>
    )
  }

  const mark = (memorized) => {
    const next = {
      ...progress,
      [current.id]: {
        memorized,
        updatedAt: new Date().toISOString(),
        ref: current.ref,
        category: current.theme,
        bookGroup: current.bookGroup,
      },
    }
    setProgress(next)
    writeProgress(progressKey, next)
    if (memorized) {
      setCheckFlash(true)
      setTimeout(() => setCheckFlash(false), 600)
    }
    onMemorizedChange?.(next)
    setFlipped(false)
    setIdx((i) => i + 1)
  }

  return (
    <div
      className={`glass-panel rounded-2xl p-4 text-white ${fillVertical ? 'flex min-h-0 w-full max-w-full flex-col' : ''}`}
    >
      <style>
        {`
          .flip-wrap { perspective: 1200px; }
          .verse-flip-card {
            transform-style: preserve-3d;
            transition: transform 520ms ease;
            display: block;
            width: 100%;
            height: 100%;
            min-height: 0;
          }
          .verse-flip-card.flipped { transform: rotateY(180deg); }
          .verse-flip-card .flip-face {
            position: absolute;
            inset: 0;
            backface-visibility: hidden;
            -webkit-backface-visibility: hidden;
            border-radius: 1rem;
          }
          .verse-flip-card .flip-back { transform: rotateY(180deg); }
          @keyframes check-pop { 0%{transform:scale(0.6);opacity:0} 60%{transform:scale(1.08);opacity:1} 100%{transform:scale(1);opacity:1} }
        `}
      </style>

      <div className="mb-3 flex shrink-0 items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: '#D4A843' }}>
          📖 Verse Flashcards
        </p>
        <button type="button" onClick={onExit} className="text-xs text-white/70">
          ← Back
        </button>
      </div>

      <div className="mb-3 flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between glass-panel rounded-xl p-3">
        <div className="flex items-center gap-2">
          <ProgressRing percent={percent} />
          <div>
            <p className="text-sm font-semibold text-white">Progress</p>
            <p className="text-xs text-white/70">
              {memorizedCount} memorized • {VERSE_FLASHCARDS.length} total
            </p>
          </div>
        </div>
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value)
            setIdx(0)
            setFlipped(false)
          }}
          className="glass-input-field w-full rounded-lg px-2 py-2 text-xs text-white sm:max-w-[200px]"
        >
          {FLASHCARD_FILTER_OPTIONS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="flip-wrap relative w-full shrink-0">
        {checkFlash ? (
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              zIndex: 5,
              background: 'rgba(212,168,67,0.18)',
              border: '1px solid rgba(212,168,67,0.55)',
              borderRadius: '999px',
              padding: '8px 10px',
              color: '#D4A843',
              fontWeight: 800,
              animation: 'check-pop 600ms ease',
            }}
          >
            ✓ Memorized
          </div>
        ) : null}

        {/* Compact card (max 280px); glass-panel picks up day / evening / night from body + index.css */}
        <div className="relative h-[260px] w-full max-h-[280px]">
          <button
            type="button"
            onClick={() => setFlipped((f) => !f)}
            className={`verse-flip-card glass-panel h-full w-full rounded-2xl p-0 text-left ${flipped ? 'flipped' : ''}`}
          >
            <div className="flip-face flex flex-col justify-between overflow-y-auto p-5 md:p-6">
              <div className="min-h-0">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/70">Tap to flip</p>
                <p className="mt-2 text-lg font-bold leading-snug md:text-xl" style={{ color: '#D4A843' }}>
                  {current.ref}
                </p>
                <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/55">Category</p>
                <p className="mt-0.5 text-sm text-white/90">{current.bookGroup}</p>
                <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/55">Theme</p>
                <p className="mt-0.5 text-sm text-white/85">{current.theme}</p>
              </div>
              <p className="mt-3 shrink-0 text-xs text-white/60">
                {currentProg ? 'Status: Memorized' : 'Status: Still Learning'}
              </p>
            </div>
            <div className="flip-face flip-back flex flex-col overflow-hidden p-5 text-center md:p-6">
              <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2">
                <p className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">
                  Tap to flip back
                </p>
                <p className="min-h-0 w-full max-w-full flex-1 overflow-y-auto text-base leading-relaxed text-white [font-family:'Lora',serif] italic md:text-lg md:leading-relaxed">
                  {current.text}
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>

      <div className="mt-3 grid shrink-0 grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => mark(false)}
          className="glass-panel rounded-xl px-4 py-3 text-sm font-semibold text-white"
        >
          Still Learning
        </button>
        <button
          type="button"
          onClick={() => mark(true)}
          className="rounded-xl px-4 py-3 text-sm font-semibold text-[#1a1a1a]"
          style={{ background: '#D4A843' }}
        >
          Memorized ✓
        </button>
      </div>

      <div className="mt-2 flex shrink-0 items-center justify-between text-xs text-white/70">
        <button
          type="button"
          onClick={() => {
            setIdx((i) => (i - 1 + safeLen) % safeLen)
            setFlipped(false)
          }}
        >
          ← Prev
        </button>
        <span>
          Card {((idx % safeLen) + 1)} / {safeLen}
        </span>
        <button
          type="button"
          onClick={() => {
            setIdx((i) => (i + 1) % safeLen)
            setFlipped(false)
          }}
        >
          Next →
        </button>
      </div>
    </div>
  )
}
