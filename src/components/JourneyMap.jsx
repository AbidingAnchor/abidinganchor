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

/** Biblical path: Jesus’s life and Paul’s journeys — used by Achievements for “Lamp Lighter”. */
export const JOURNEY_MAP_STOPS = [
  {
    id: 'bethlehem',
    label: 'Bethlehem',
    x: 42,
    y: 382,
    description: 'Here the Savior was born, the promise of God made flesh.',
    scripture: 'Micah 5:2; Luke 2:7',
  },
  {
    id: 'nazareth',
    label: 'Nazareth',
    x: 80,
    y: 346,
    description: 'Jesus grew in wisdom and stature in this quiet Galilean town.',
    scripture: 'Luke 2:51-52',
  },
  {
    id: 'jordan',
    label: 'Jordan River',
    x: 120,
    y: 310,
    description: 'Jesus was baptized and the Father spoke joy over His Son.',
    scripture: 'Matthew 3:16-17',
  },
  {
    id: 'wilderness',
    label: 'Wilderness',
    x: 92,
    y: 270,
    description: 'After baptism He was led into the wilderness and overcame the tempter.',
    scripture: 'Matthew 4:1-11',
  },
  {
    id: 'capernaum',
    label: 'Capernaum',
    x: 150,
    y: 246,
    description: 'A home base for His teaching and miracles beside the sea.',
    scripture: 'Matthew 4:13',
  },
  {
    id: 'galilee',
    label: 'Galilee',
    x: 184,
    y: 226,
    description: 'He preached the kingdom and called disciples to follow Him.',
    scripture: 'Matthew 4:23',
  },
  {
    id: 'beatitudes',
    label: 'Mount of Beatitudes',
    x: 206,
    y: 204,
    description: 'On these slopes He opened the kingdom to the humble and merciful.',
    scripture: 'Matthew 5:1-12',
  },
  {
    id: 'caesarea-philippi',
    label: 'Caesarea Philippi',
    x: 228,
    y: 178,
    description: 'Peter confessed Jesus as the Christ, the Son of the living God.',
    scripture: 'Matthew 16:13-16',
  },
  {
    id: 'jerusalem',
    label: 'Jerusalem',
    x: 200,
    y: 140,
    description: 'He wept over the city and entered as King, humble on a donkey.',
    scripture: 'Luke 19:41-44',
  },
  {
    id: 'gethsemane',
    label: 'Garden of Gethsemane',
    x: 192,
    y: 118,
    description: 'He prayed in deep sorrow, yielding fully to the Father’s cup.',
    scripture: 'Matthew 26:36-39',
  },
  {
    id: 'golgotha',
    label: 'Golgotha',
    x: 204,
    y: 98,
    description: 'The cross stood here, where love bore the sin of the world.',
    scripture: 'John 19:17-18',
  },
  {
    id: 'empty-tomb',
    label: 'Empty Tomb',
    x: 214,
    y: 80,
    description: 'The stone was rolled away—He is not here; He has risen indeed.',
    scripture: 'Luke 24:2-6',
  },
  {
    id: 'damascus',
    label: 'Damascus',
    x: 236,
    y: 62,
    description: 'On the road, Saul met the risen Lord and was forever changed.',
    scripture: 'Acts 9:3-6',
  },
  {
    id: 'antioch',
    label: 'Antioch',
    x: 258,
    y: 86,
    description: 'The church sent Paul and Barnabas to carry the gospel to the nations.',
    scripture: 'Acts 13:2-3',
  },
  {
    id: 'philippi',
    label: 'Philippi',
    x: 276,
    y: 114,
    description: 'A jailer’s family believed after prayer and praise broke prison doors.',
    scripture: 'Acts 16:30-34',
  },
  {
    id: 'thessalonica',
    label: 'Thessalonica',
    x: 282,
    y: 144,
    description: 'The Word sounded forth from here with faith, hope, and endurance.',
    scripture: '1 Thessalonians 1:8',
  },
  {
    id: 'corinth',
    label: 'Corinth',
    x: 268,
    y: 184,
    description: 'Paul planted a church and taught Christ crucified in power.',
    scripture: 'Acts 18:1-8',
  },
  {
    id: 'athens',
    label: 'Athens',
    x: 246,
    y: 218,
    description: 'He proclaimed the unknown God to seekers on Mars Hill.',
    scripture: 'Acts 17:22-31',
  },
  {
    id: 'ephesus',
    label: 'Ephesus',
    x: 228,
    y: 254,
    description: 'The word of the Lord grew mightily as truth overcame darkness.',
    scripture: 'Acts 19:20',
  },
  {
    id: 'rome',
    label: 'Rome',
    x: 218,
    y: 38,
    description: 'Paul preached the gospel openly, unashamed, to the heart of the empire.',
    scripture: 'Acts 28:30-31',
  },
]

function buildPathD(stops) {
  if (!stops.length) return ''
  const [first, ...rest] = stops
  return `M ${first.x} ${first.y}` + rest.map((s) => ` L ${s.x} ${s.y}`).join('')
}

/** Minimal standing silhouette: head + simple robe/torso, feet at local y=0 (reverent, not cartoon). */
function SilhouetteFigure({ variant }) {
  const isJesus = variant === 'jesus'
  const fill = isJesus ? '#FFF8ED' : 'rgba(255,252,248,0.96)'
  const stroke = isJesus ? 'rgba(212,168,67,0.5)' : 'rgba(212,168,67,0.72)'
  const glowFill = isJesus ? 'rgba(232,184,107,0.18)' : 'none'
  const body = (
    <>
      <ellipse cx="0" cy="-12.2" rx="2.5" ry="2.75" fill={fill} stroke={stroke} strokeWidth="0.28" />
      <path
        d="M -2.15,-8.8 C -2.8,-6.2 -3.05,-2.8 -2.4,0 L 2.4,0 C 3.05,-2.8 2.8,-6.2 2.15,-8.8 C 0.9,-8 -0.9,-8 -2.15,-8.8 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="0.28"
        strokeLinejoin="round"
      />
    </>
  )
  if (!isJesus) {
    return <g>{body}</g>
  }
  return (
    <g>
      <ellipse cx="0" cy="-7" rx="6.5" ry="13" fill={glowFill} style={{ filter: 'url(#journeyJesusAura)' }} />
      <g style={{ filter: 'url(#journeyJesusFigure)' }}>{body}</g>
    </g>
  )
}

function JourneyWalkingFigures({ stop }) {
  if (!stop) return null
  const { x, y } = stop
  const spread = 7.5
  return (
    <g pointerEvents="none" aria-hidden="true" transform={`translate(${x}, ${y})`}>
      <g transform={`translate(${-spread}, 9)`}>
        <SilhouetteFigure variant="user" />
      </g>
      <g transform={`translate(${spread}, 9)`}>
        <SilhouetteFigure variant="jesus" />
      </g>
    </g>
  )
}

export default function JourneyMap({ onExit, fillVertical = false }) {
  const [state, setState] = useState(() => readJson(KEY, { seenFacts: {}, updatedAt: '' }))
  const [activeStop, setActiveStop] = useState(null)

  const triviaStats = useMemo(() => readJson(TRIVIA_STATS_KEY, { gamesCompleted: 0 }), [])
  const verseProgress = useMemo(() => readJson(VERSE_PROGRESS_KEY, {}), [])
  const memorizedCount = useMemo(() => Object.values(verseProgress).filter((p) => p?.memorized).length, [verseProgress])

  const unlockedCount = Math.min(
    JOURNEY_MAP_STOPS.length,
    1 + Math.floor(((triviaStats.gamesCompleted || 0) + memorizedCount) / 2),
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

  const pathD = useMemo(() => buildPathD(JOURNEY_MAP_STOPS), [])

  const currentProgressStop = useMemo(() => {
    if (unlockedCount < 1) return null
    const idx = Math.min(unlockedCount - 1, JOURNEY_MAP_STOPS.length - 1)
    return JOURNEY_MAP_STOPS[idx]
  }, [unlockedCount])

  return (
    <div
      className={`glass-panel rounded-2xl p-4 text-white ${fillVertical ? 'flex min-h-0 flex-1 flex-col' : ''}`}
      style={fillVertical ? { minHeight: '100%' } : undefined}
    >
      <style>
        {`
          @keyframes map-pulse {
            0%, 100% { box-shadow: 0 0 10px rgba(212,168,67,0.35); transform: scale(1); }
            50% { box-shadow: 0 0 22px rgba(212,168,67,0.65); transform: scale(1.05); }
          }
        `}
      </style>

      <div className="mb-3 flex shrink-0 items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: '#D4A843' }}>
          🗺️ Journey Map
        </p>
        <button type="button" onClick={onExit} className="text-xs text-white/70">
          ← Back
        </button>
      </div>

      <div className="mb-3 shrink-0 glass-panel rounded-xl p-3 text-xs text-white/80">
        Unlocks scale with trivia games and memorized verses (each activity moves you forward). <br />
        <span style={{ color: '#D4A843', fontWeight: 700 }}>
          Unlocked: {unlockedCount}/{JOURNEY_MAP_STOPS.length}
        </span>
      </div>

      <div className={`glass-panel min-h-0 rounded-2xl p-3 ${fillVertical ? 'flex flex-1 flex-col' : ''}`}>
        <svg
          width="100%"
          viewBox="0 0 320 400"
          preserveAspectRatio="xMidYMid meet"
          className={fillVertical ? 'min-h-[240px] flex-1' : ''}
          style={{ display: 'block' }}
        >
          <defs>
            <linearGradient id="goldPath" x1="0" x2="1">
              <stop offset="0%" stopColor="#D4A843" stopOpacity="0.15" />
              <stop offset="60%" stopColor="#D4A843" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#D4A843" stopOpacity="0.25" />
            </linearGradient>
            {/* Soft warm aura behind Jesus figure — subtle amber/gold, not loud */}
            <filter id="journeyJesusAura" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3.2" result="blur" />
              <feColorMatrix
                in="blur"
                type="matrix"
                values="1 0 0 0 0  0 1 0 0 0  0 0 0.85 0 0  0 0 0 0.9 0"
                result="warm"
              />
            </filter>
            <filter id="journeyJesusFigure" x="-35%" y="-35%" width="170%" height="170%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="0.6" result="s" />
              <feFlood floodColor="#E8B86B" floodOpacity="0.35" result="f" />
              <feComposite in="f" in2="s" operator="in" result="g" />
              <feMerge>
                <feMergeNode in="g" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <path
            d={pathD}
            fill="none"
            stroke="url(#goldPath)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {JOURNEY_MAP_STOPS.map((stop, i) => {
            const unlocked = i < unlockedCount
            const seen = !!state?.seenFacts?.[stop.id]
            return (
              <g
                key={stop.id}
                role="button"
                tabIndex={unlocked ? 0 : -1}
                onClick={() => openStop(stop, unlocked)}
                onKeyDown={(e) => {
                  if (!unlocked) return
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    openStop(stop, unlocked)
                  }
                }}
                style={{ cursor: unlocked ? 'pointer' : 'not-allowed' }}
              >
                <circle
                  cx={stop.x}
                  cy={stop.y}
                  r="10"
                  fill={unlocked ? '#D4A843' : 'rgba(255,255,255,0.22)'}
                  stroke={unlocked ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.22)'}
                  strokeWidth="2"
                  style={unlocked ? { animation: 'map-pulse 2s ease-in-out infinite' } : undefined}
                />
                <text
                  x={stop.x + 14}
                  y={stop.y + 4}
                  fontSize="9"
                  fill={unlocked ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.45)'}
                >
                  {unlocked ? stop.label : `🔒 ${stop.label}`}
                </text>
                {seen && unlocked ? <circle cx={stop.x} cy={stop.y} r="3" fill="#fff" opacity="0.85" /> : null}
              </g>
            )
          })}

          {currentProgressStop ? <JourneyWalkingFigures stop={currentProgressStop} /> : null}
        </svg>
      </div>

      {activeStop ? (
        <div className="mt-3 shrink-0 glass-panel rounded-2xl border border-[#D4A843]/50 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold" style={{ color: '#D4A843' }}>
                {activeStop.label}
              </p>
              <p className="mt-2 text-sm text-white/85">{activeStop.description}</p>
              <p className="mt-3 text-xs font-semibold text-white/70">
                Scripture: <span style={{ color: '#D4A843' }}>{activeStop.scripture}</span>
              </p>
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
