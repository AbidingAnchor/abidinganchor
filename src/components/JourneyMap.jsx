import { useMemo, useState } from 'react'

const KEY = 'abidinganchor-journey-map'
const TRIVIA_STATS_KEY = 'abidinganchor-trivia-stats'
const VERSE_PROGRESS_KEY = 'abidinganchor-verse-progress'

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

const STOPS = [
  { id: 'bethlehem', label: 'Bethlehem', x: 42, y: 210, fact: 'Bethlehem is known as the birthplace of Jesus. (Matthew 2:1)' },
  { id: 'nazareth', label: 'Nazareth', x: 92, y: 168, fact: 'Nazareth is where Jesus grew up. (Luke 2:51-52)' },
  { id: 'jordan', label: 'Jordan River', x: 152, y: 132, fact: 'Jesus was baptized in the Jordan River. (Matthew 3:13-17)' },
  { id: 'jerusalem', label: 'Jerusalem', x: 210, y: 96, fact: 'Jerusalem is central to the Passion and Resurrection of Jesus. (Luke 24:46-47)' },
  { id: 'damascus', label: 'Damascus', x: 168, y: 54, fact: 'Paul’s conversion is connected with the road to Damascus. (Acts 9:1-6)' },
  { id: 'rome', label: 'Rome', x: 232, y: 18, fact: 'The gospel reached Rome as the early church spread. (Romans 1:15-16)' },
]

export default function JourneyMap({ onExit }) {
  const [state, setState] = useState(() => readJson(KEY, { seenFacts: {}, updatedAt: '' }))
  const [activeStop, setActiveStop] = useState(null)

  const triviaStats = useMemo(() => readJson(TRIVIA_STATS_KEY, { gamesCompleted: 0 }), [])
  const verseProgress = useMemo(() => readJson(VERSE_PROGRESS_KEY, {}), [])
  const memorizedCount = useMemo(() => Object.values(verseProgress).filter((p) => p?.memorized).length, [verseProgress])

  const unlockedCount = Math.min(
    STOPS.length,
    1 + Math.floor((triviaStats.gamesCompleted || 0) / 1) + Math.floor(memorizedCount / 5),
  )

  const openStop = (stop, unlocked) => {
    if (!unlocked) return
    setActiveStop(stop)
    const next = {
      ...state,
      seenFacts: { ...(state.seenFacts || {}), [stop.id]: true },
      updatedAt: new Date().toISOString(),
    }
    setState(next)
    writeJson(KEY, next)
  }

  return (
    <div className="glass-panel rounded-2xl p-4 text-white">
      <style>
        {`
          @keyframes map-pulse {
            0%, 100% { box-shadow: 0 0 10px rgba(212,168,67,0.35); transform: scale(1); }
            50% { box-shadow: 0 0 22px rgba(212,168,67,0.65); transform: scale(1.05); }
          }
        `}
      </style>

      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: '#D4A843' }}>
          🗺️ Journey Map
        </p>
        <button type="button" onClick={onExit} className="text-xs text-white/70">
          ← Back
        </button>
      </div>

      <div className="mb-3 glass-panel rounded-xl p-3 text-xs text-white/80">
        Unlocks are earned by completing trivia and memorizing verses. <br />
        <span style={{ color: '#D4A843', fontWeight: 700 }}>
          Unlocked: {unlockedCount}/{STOPS.length}
        </span>
      </div>

      <div className="glass-panel rounded-2xl p-3">
        <svg width="100%" viewBox="0 0 260 240" style={{ display: 'block' }}>
          <defs>
            <linearGradient id="goldPath" x1="0" x2="1">
              <stop offset="0%" stopColor="#D4A843" stopOpacity="0.15" />
              <stop offset="60%" stopColor="#D4A843" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#D4A843" stopOpacity="0.25" />
            </linearGradient>
          </defs>

          <path
            d="M 42 210 C 70 195, 80 182, 92 168 C 118 148, 128 144, 152 132 C 178 118, 192 112, 210 96 C 198 76, 182 62, 168 54 C 196 40, 214 30, 232 18"
            fill="none"
            stroke="url(#goldPath)"
            strokeWidth="6"
            strokeLinecap="round"
          />

          {STOPS.map((stop, i) => {
            const unlocked = i < unlockedCount
            const seen = !!state?.seenFacts?.[stop.id]
            return (
              <g key={stop.id} onClick={() => openStop(stop, unlocked)} style={{ cursor: unlocked ? 'pointer' : 'not-allowed' }}>
                <circle
                  cx={stop.x}
                  cy={stop.y}
                  r="10"
                  fill={unlocked ? '#D4A843' : 'rgba(255,255,255,0.22)'}
                  stroke={unlocked ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.22)'}
                  strokeWidth="2"
                  style={unlocked ? { animation: 'map-pulse 2s ease-in-out infinite' } : undefined}
                />
                <text x={stop.x + 14} y={stop.y + 4} fontSize="10" fill={unlocked ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.45)'}>
                  {unlocked ? stop.label : `🔒 ${stop.label}`}
                </text>
                {seen && unlocked ? (
                  <circle cx={stop.x} cy={stop.y} r="3" fill="#fff" opacity="0.85" />
                ) : null}
              </g>
            )
          })}
        </svg>
      </div>

      {activeStop ? (
        <div className="mt-3 glass-panel rounded-2xl border border-[#D4A843]/50 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold" style={{ color: '#D4A843' }}>
                {activeStop.label}
              </p>
              <p className="mt-2 text-sm text-white/85">{activeStop.fact}</p>
            </div>
            <button type="button" onClick={() => setActiveStop(null)} className="text-xs text-white/70">
              ✕
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

