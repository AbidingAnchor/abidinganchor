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
    x: 150,
    y: 382,
    description: 'Here the Savior was born, the promise of God made flesh.',
    scripture: 'Micah 5:2; Luke 2:7',
    jesusVoice:
      'I came to you small and humble, laid in a manger, so you would never doubt how near I am to the lowly place. I did not begin in power the world recognizes—I began in love you could draw near to. You can come to Me just as you are; My arms were open before you ever asked.',
  },
  {
    id: 'nazareth',
    label: 'Nazareth',
    x: 182,
    y: 364,
    description: 'Jesus grew in wisdom and stature in this quiet Galilean town.',
    scripture: 'Luke 2:51-52',
    jesusVoice:
      'I grew up in the ordinary days—learning, working, obeying—so you would know I understand the rhythm of your life. Holiness is not only for mountaintops; I sanctify your kitchen table and your quiet errands too. Walk with Me in the simple places; I am forming your heart there.',
  },
  {
    id: 'jordan',
    label: 'Jordan River',
    x: 210,
    y: 346,
    description: 'Jesus was baptized and the Father spoke joy over His Son.',
    scripture: 'Matthew 3:16-17',
    jesusVoice:
      'When I entered those waters, I joined you in repentance’s path so you would never walk alone. The Father’s voice over Me is the same love He speaks over you when you turn toward home. You are beloved; let that settle deeper than your shame.',
  },
  {
    id: 'wilderness',
    label: 'Wilderness',
    x: 231,
    y: 328,
    description: 'After baptism He was led into the wilderness and overcame the tempter.',
    scripture: 'Matthew 4:1-11',
    jesusVoice:
      'I faced hunger and noise in the wild so I could meet you in yours with mercy that has already won. The enemy’s whispers lose their power when you cling to My Father’s words as I did. I am with you in the empty stretch; I will not leave you to fight alone.',
  },
  {
    id: 'capernaum',
    label: 'Capernaum',
    x: 241,
    y: 309,
    description: 'A home base for His teaching and miracles beside the sea.',
    scripture: 'Matthew 4:13',
    jesusVoice:
      'Beside restless waters I made a home among neighbors, teaching and healing hands outstretched. I still draw near to the places where your life feels crowded yet lonely. Bring Me your burdens at the shoreline of your worry; My rest is real.',
  },
  {
    id: 'galilee',
    label: 'Galilee',
    x: 240,
    y: 291,
    description: 'He preached the kingdom and called disciples to follow Him.',
    scripture: 'Matthew 4:23',
    jesusVoice:
      'I walked those hills calling ordinary people to follow—not because they were finished, but because I would finish the work in them. The kingdom is near you still; say yes again today. I will teach your feet the next step and give your heart courage.',
  },
  {
    id: 'beatitudes',
    label: 'Mount of Beatitudes',
    x: 228,
    y: 273,
    description: 'On these slopes He opened the kingdom to the humble and merciful.',
    scripture: 'Matthew 5:1-12',
    jesusVoice:
      'On the slope I blessed the gentle, the grieving, the merciful—blessings this world often overlooks. If you feel small, you are not invisible to Me; My kingdom is shaped for souls like yours. Let My comfort be the strength you lean on when life feels upside down.',
  },
  {
    id: 'caesarea-philippi',
    label: 'Caesarea Philippi',
    x: 206,
    y: 255,
    description: 'Peter confessed Jesus as the Christ, the Son of the living God.',
    scripture: 'Matthew 16:13-16',
    jesusVoice:
      'I asked what people said about Me—and I still listen for what you say in your heart. When you confess Me as Lord, I build something eternal on that honest stone. Do not fear your doubts; bring them to Me, and I will meet you with truth that holds.',
  },
  {
    id: 'jerusalem',
    label: 'Jerusalem',
    x: 177,
    y: 237,
    description: 'He wept over the city and entered as King, humble on a donkey.',
    scripture: 'Luke 19:41-44',
    jesusVoice:
      'I wept over Jerusalem because I love her—and I weep with you over the places you love that still hurt. I entered gently, on a donkey, because My kingdom comes in humility before it comes in glory. Trust My pace; I am working peace deeper than you see.',
  },
  {
    id: 'gethsemane',
    label: 'Garden of Gethsemane',
    x: 145,
    y: 219,
    description: 'He prayed in deep sorrow, yielding fully to the Father’s cup.',
    scripture: 'Matthew 26:36-39',
    jesusVoice:
      'In the garden I asked if the cup could pass—then I surrendered to love that chose you. When your soul is overwhelmed, you are not failing Me; you are in the very place I understand. Pour out your heart to the Father; I am praying for you still.',
  },
  {
    id: 'golgotha',
    label: 'Golgotha',
    x: 113,
    y: 200,
    description: 'The cross stood here, where love bore the sin of the world.',
    scripture: 'John 19:17-18',
    jesusVoice:
      'I stretched out My arms between heaven and earth to carry what would crush you—so you would never have to carry it alone. My love is stronger than your worst moment. Look to Me here whenever guilt whispers; it is finished, and you are held.',
  },
  {
    id: 'empty-tomb',
    label: 'Empty Tomb',
    x: 86,
    y: 182,
    description: 'The stone was rolled away—He is not here; He has risen indeed.',
    scripture: 'Luke 24:2-6',
    jesusVoice:
      'The grave could not hold Me—and what I began that morning I continue in you. Death does not get the last word over your story in Me. Rise today in hope; I am alive, and My life is a quiet strength waking in your spirit.',
  },
  {
    id: 'damascus',
    label: 'Damascus',
    x: 67,
    y: 164,
    description: 'On the road, Saul met the risen Lord and was forever changed.',
    scripture: 'Acts 9:3-6',
    jesusVoice:
      'On the road to Damascus I stopped a violent heart with light—because no one is too far for mercy to reach. If you fear you have wandered too long, know I still intercept with grace. Surrender is not defeat; it is the moment I remake you.',
  },
  {
    id: 'antioch',
    label: 'Antioch',
    x: 58,
    y: 146,
    description: 'The church sent Paul and Barnabas to carry the gospel to the nations.',
    scripture: 'Acts 13:2-3',
    jesusVoice:
      'My Spirit set apart workers and sent them—My church was never meant to stay small or silent. You too are called and gifted for such a time as this, wherever your road leads. Step forward when I prompt you; I go with the ones I send.',
  },
  {
    id: 'philippi',
    label: 'Philippi',
    x: 61,
    y: 128,
    description: 'A jailer’s family believed after prayer and praise broke prison doors.',
    scripture: 'Acts 16:30-34',
    jesusVoice:
      'When My people prayed and sang in chains, I shook the prison—because worship in the dark moves My heart. Your praise does not depend on ease; it invites My presence into the cell. I can open doors no enemy locks forever.',
  },
  {
    id: 'thessalonica',
    label: 'Thessalonica',
    x: 75,
    y: 110,
    description: 'The Word sounded forth from here with faith, hope, and endurance.',
    scripture: '1 Thessalonians 1:8',
    jesusVoice:
      'I love when My word echoes from humble homes into streets and regions beyond. Your faithful endurance in ordinary days becomes a sound of hope others overhear. Keep sounding forth love and truth; I am glorified in your steady witness.',
  },
  {
    id: 'corinth',
    label: 'Corinth',
    x: 98,
    y: 91,
    description: 'Paul planted a church and taught Christ crucified in power.',
    scripture: 'Acts 18:1-8',
    jesusVoice:
      'In messy, gifted, struggling communities I build My body—because My power rests on the humble, not the polished. You do not need to pretend you have it all together; bring your fractures to Me. I am enough, and My grace is sufficient for you.',
  },
  {
    id: 'athens',
    label: 'Athens',
    x: 128,
    y: 73,
    description: 'He proclaimed the unknown God to seekers on Mars Hill.',
    scripture: 'Acts 17:22-31',
    jesusVoice:
      'I am the God your searching pointed toward—the one your altars to “the unknown” were reaching for. I am not far from any who seek; I give life and breath and purpose. Keep seeking honestly, and you will find Me nearer than your next breath.',
  },
  {
    id: 'ephesus',
    label: 'Ephesus',
    x: 161,
    y: 55,
    description: 'The word of the Lord grew mightily as truth overcame darkness.',
    scripture: 'Acts 19:20',
    jesusVoice:
      'Where truth is spoken in My name, darkness must yield—slowly sometimes, surely always. Let My word grow mightily in you: not as pride, but as healing light. I am building My church, and you are part of its strength.',
  },
  {
    id: 'rome',
    label: 'Rome',
    x: 192,
    y: 37,
    description: 'Paul preached the gospel openly, unashamed, to the heart of the empire.',
    scripture: 'Acts 28:30-31',
    jesusVoice:
      'Even bound, My gospel went forth boldly—because no chain can silence what I have spoken. Where you feel small or confined, I can still speak through you. I am not ashamed of the good news, and I am not ashamed of you. Preach with your life; I am with you to the ends of the earth.',
  },
]

function buildPathD(stops) {
  if (!stops.length) return ''
  const [first, ...rest] = stops
  return `M ${first.x} ${first.y}` + rest.map((s) => ` L ${s.x} ${s.y}`).join('')
}

const NODE_DOT_R = 10
/** Extra canvas height below the original 400-tall map so figures fit under the bottom node (Bethlehem). */
const MAP_VIEWBOX_W = 320
/** Bethlehem dot bottom ~392; gap + figure + nudge — keep margin at bottom. */
const MAP_VIEWBOX_H = 456
/** Natural pixels of /jesus-and-person.png — used only for aspect ratio. */
const PROGRESS_IMG_W = 1024
const PROGRESS_IMG_H = 1536
/** Height in SVG user units (~40px on screen when viewBox maps ~1:1). */
const PROGRESS_MARKER_HEIGHT = 40
/** Padding between the bottom of the node dot and the top of the figure. */
const PROGRESS_MARKER_GAP = 8
/** Extra offset below the dot so figures clear the label and the path to the next stop. */
const PROGRESS_MARKER_NUDGE_DOWN = 12

/** Labels on the left of the dot when the node is on the right; avoids clipping long names. */
function labelAnchor(stop) {
  if (stop.x >= 168) {
    return { textAnchor: 'end', x: stop.x - 14 }
  }
  return { textAnchor: 'start', x: stop.x + 14 }
}

/** Centered under the active node, in the space below the dot (works well at Bethlehem with extra viewBox height). */
function progressMarkerLayout(stop) {
  const h = PROGRESS_MARKER_HEIGHT
  const w = (PROGRESS_IMG_W / PROGRESS_IMG_H) * h
  const { x, y } = stop
  const top = y + NODE_DOT_R + PROGRESS_MARKER_GAP + PROGRESS_MARKER_NUDGE_DOWN
  let left = x - w / 2
  const margin = 4
  left = Math.max(margin, Math.min(left, MAP_VIEWBOX_W - w - margin))
  const maxTop = MAP_VIEWBOX_H - margin - h
  const yClamped = Math.min(top, maxTop)
  return { x: left, y: yClamped, w, h }
}

function JourneyProgressMarker({ stop }) {
  if (!stop) return null
  const { x, y, w, h } = progressMarkerLayout(stop)
  return (
    <g pointerEvents="none" aria-hidden="true">
      <foreignObject x={x} y={y} width={w} height={h}>
        <div xmlns="http://www.w3.org/1999/xhtml" style={{ margin: 0, padding: 0, lineHeight: 0, width: '100%', height: '100%' }}>
          <img
            src="/jesus-and-person.png"
            alt=""
            style={{
              display: 'block',
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              pointerEvents: 'none',
            }}
          />
        </div>
      </foreignObject>
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
            0%, 100% { filter: drop-shadow(0 0 6px rgba(212,168,67,0.35)); transform: scale(1); }
            50% { filter: drop-shadow(0 0 10px rgba(212,168,67,0.5)); transform: scale(1.08); }
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
          viewBox={`0 0 ${MAP_VIEWBOX_W} ${MAP_VIEWBOX_H}`}
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
          </defs>

          <path
            d={pathD}
            fill="none"
            stroke="url(#goldPath)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {JOURNEY_MAP_STOPS.map((stop, i) => {
            const unlocked = i < unlockedCount
            const seen = !!state?.seenFacts?.[stop.id]
            const la = labelAnchor(stop)
            const isCurrentProgress = currentProgressStop?.id === stop.id
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
                  style={
                    unlocked && isCurrentProgress
                      ? {
                          animation: 'map-pulse 3s ease-in-out infinite',
                          transformOrigin: 'center',
                          transformBox: 'fill-box',
                        }
                      : undefined
                  }
                />
                <text
                  x={la.x}
                  y={stop.y + 4}
                  fontSize="8.5"
                  textAnchor={la.textAnchor}
                  fill={unlocked ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.45)'}
                >
                  {unlocked ? stop.label : `🔒 ${stop.label}`}
                </text>
                {seen && unlocked ? <circle cx={stop.x} cy={stop.y} r="3" fill="#fff" opacity="0.85" /> : null}
              </g>
            )
          })}

          {currentProgressStop ? <JourneyProgressMarker stop={currentProgressStop} /> : null}
        </svg>
      </div>

      {activeStop ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="journey-map-modal-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/55"
            aria-label="Close"
            onClick={() => setActiveStop(null)}
          />
          <div
            className="relative z-10 w-full max-w-lg rounded-2xl border border-[#D4A843]/35 bg-[#1e1b3a] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActiveStop(null)}
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-lg text-lg text-white/70 transition hover:bg-white/10 hover:text-white"
              aria-label="Close"
            >
              ✕
            </button>
            <h2 id="journey-map-modal-title" className="pr-10 text-lg font-bold text-[#D4A843]">
              {activeStop.label}
            </h2>
            <div className="mt-4 flex gap-4">
              <img
                src="/jesus-and-person.png"
                alt=""
                className="h-[112px] w-auto shrink-0 object-contain"
              />
              <div className="relative min-w-0 flex-1">
                <div
                  className="absolute left-0 top-5 z-0 h-0 w-0 border-y-[7px] border-l-0 border-r-[9px] border-y-transparent border-r-[#2a2648]"
                  aria-hidden
                />
                <div
                  className="relative z-[1] rounded-xl border border-amber-500/25 bg-[#252244] px-3.5 py-3 text-sm leading-relaxed text-white/90 shadow-inner"
                  style={{ marginLeft: '1px' }}
                >
                  <p className="m-0">{activeStop.jesusVoice}</p>
                </div>
              </div>
            </div>
            <p className="mt-4 text-center text-xs font-semibold text-amber-400">{activeStop.scripture}</p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
