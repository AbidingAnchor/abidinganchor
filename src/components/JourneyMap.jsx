import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { JOURNEY_MAP_GEOMETRY } from '../data/journeyMapGeometry'
import { useAuth } from '../context/AuthContext'
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

function buildPathD(stops) {
  if (!stops.length) return ''
  const [first, ...rest] = stops
  return `M ${first.x} ${first.y}` + rest.map((s) => ` L ${s.x} ${s.y}`).join('')
}

const NODE_DOT_R = 10
const MAP_VIEWBOX_W = 320
/** Natural pixels of /jesus-and-person.png — used only for aspect ratio. */
const PROGRESS_IMG_W = 1024
const PROGRESS_IMG_H = 1536
/** Map marker height in SVG user units (~80px when viewBox maps ~1:1). Popup uses its own fixed size. */
const PROGRESS_MARKER_HEIGHT = 80
/** Space under the dot before the figure box (viewBox units). */
const PROGRESS_MARKER_GAP_BELOW_DOT = 4
/** Shifts art up so visible subjects sit ~20–30 units below the dot (PNG has transparent top padding). */
const PROGRESS_MARKER_IMG_LIFT = 26
/** Lower the figure block on the map (viewBox units ~px at 1:1 scale). */
const PROGRESS_MARKER_OFFSET_DOWN = 65
/** Extra height above the marker box (viewBox units) so PNG translateY lift doesn’t clip halo/head in foreignObject. */
const PROGRESS_MARKER_HALO_PAD = 22
/** Padding below the progress figure (and map content) so the card doesn’t feel cramped. */
const MAP_VIEWBOX_BOTTOM_PAD = 16
/** Extra viewBox height at bottom (~display px when map width matches viewBox 320) so figures + halo aren’t clipped. */
const MAP_VIEWBOX_EXTRA_BOTTOM = 120
const GEO_Y_MIN = Math.min(...JOURNEY_MAP_GEOMETRY.map((s) => s.y))
const GEO_Y_MAX = Math.max(...JOURNEY_MAP_GEOMETRY.map((s) => s.y))
/** Northern end (Rome): center y fraction — extra margin from top edge of parchment. */
const PATH_Y_TOP_FRAC = 0.38
/** Southern end (Bethlehem) — leaves room below for marker + labels. */
const PATH_Y_BOTTOM_FRAC = 0.71

/** Map raw geometry y (north = small, south = large) into viewBox y within the lower “garden” band. */
function remapGeoYToViewBox(yGeo, viewBoxH) {
  const t = (yGeo - GEO_Y_MIN) / (GEO_Y_MAX - GEO_Y_MIN)
  return viewBoxH * (PATH_Y_TOP_FRAC + t * (PATH_Y_BOTTOM_FRAC - PATH_Y_TOP_FRAC))
}

/** ViewBox height so lowest stop + figure + padding fit; trail occupies y ∈ [0.30H, 0.72H]. */
const STAR_FIELD = [
  {x:8,y:5,r:0.8,o:0.5,d:0.0},{x:18,y:12,r:1.2,o:0.7,d:0.6},{x:5,y:22,r:0.6,o:0.4,d:1.1},
  {x:25,y:8,r:1.0,o:0.6,d:0.3},{x:290,y:6,r:0.9,o:0.5,d:1.4},{x:305,y:18,r:1.3,o:0.8,d:0.7},
  {x:315,y:9,r:0.7,o:0.4,d:2.0},{x:298,y:28,r:1.1,o:0.6,d:0.2},{x:280,y:12,r:0.8,o:0.5,d:1.7},
  {x:12,y:38,r:1.0,o:0.6,d:0.9},{x:22,y:52,r:0.6,o:0.3,d:1.5},{x:8,y:65,r:1.2,o:0.7,d:0.4},
  {x:310,y:42,r:0.9,o:0.5,d:2.3},{x:318,y:55,r:1.1,o:0.7,d:1.0},{x:302,y:68,r:0.7,o:0.4,d:0.8},
  {x:15,y:80,r:1.0,o:0.6,d:1.9},{x:6,y:92,r:0.8,o:0.5,d:0.5},{x:20,y:105,r:1.3,o:0.7,d:2.6},
  {x:312,y:82,r:0.6,o:0.4,d:1.3},{x:308,y:96,r:1.0,o:0.6,d:0.1},{x:320,y:110,r:0.8,o:0.5,d:3.0},
  {x:10,y:118,r:1.2,o:0.7,d:0.7},{x:25,y:130,r:0.7,o:0.4,d:1.6},{x:5,y:142,r:1.1,o:0.6,d:2.1},
  {x:315,y:125,r:0.9,o:0.5,d:0.4},{x:305,y:138,r:1.3,o:0.8,d:1.8},{x:298,y:150,r:0.6,o:0.3,d:0.6},
  {x:18,y:155,r:1.0,o:0.6,d:2.4},{x:8,y:168,r:0.8,o:0.5,d:1.2},{x:22,y:180,r:1.2,o:0.7,d:0.0},
  {x:318,y:162,r:0.7,o:0.4,d:2.8},{x:310,y:175,r:1.1,o:0.6,d:0.9},{x:302,y:188,r:0.9,o:0.5,d:1.5},
  {x:12,y:195,r:1.3,o:0.8,d:0.3},{x:6,y:208,r:0.6,o:0.4,d:2.2},{x:20,y:220,r:1.0,o:0.6,d:1.1},
  {x:315,y:200,r:0.8,o:0.5,d:0.7},{x:308,y:214,r:1.2,o:0.7,d:1.9},{x:295,y:225,r:0.7,o:0.4,d:0.5},
  {x:80,y:8,r:0.9,o:0.5,d:1.4},{x:105,y:15,r:1.1,o:0.6,d:2.0},{x:240,y:10,r:0.8,o:0.5,d:0.8},
  {x:265,y:20,r:1.3,o:0.7,d:1.7},{x:88,y:25,r:0.6,o:0.4,d:0.3},{x:258,y:30,r:1.0,o:0.6,d:2.5},
  {x:75,y:35,r:1.2,o:0.7,d:1.0},{x:270,y:38,r:0.7,o:0.4,d:0.2},{x:92,y:48,r:0.9,o:0.5,d:1.6},
  {x:250,y:52,r:1.1,o:0.6,d:0.6},{x:78,y:60,r:0.6,o:0.3,d:2.7},{x:262,y:65,r:1.3,o:0.8,d:1.3},
  {x:110,y:18,r:0.8,o:0.5,d:0.4},{x:235,y:22,r:1.0,o:0.6,d:2.1},{x:82,y:72,r:0.7,o:0.4,d:0.9},
  {x:255,y:75,r:1.2,o:0.7,d:1.8},{x:95,y:35,r:0.9,o:0.5,d:0.1},{x:245,y:42,r:0.6,o:0.3,d:2.9},
  {x:72,y:85,r:1.1,o:0.6,d:0.5},{x:268,y:88,r:0.8,o:0.5,d:1.4},{x:100,y:55,r:1.3,o:0.7,d:2.3},
]

function computeMapViewBoxHeight() {
  const markerStack =
    NODE_DOT_R + PROGRESS_MARKER_GAP_BELOW_DOT + PROGRESS_MARKER_OFFSET_DOWN + PROGRESS_MARKER_HEIGHT
  return (
    Math.max(480, Math.ceil((markerStack + MAP_VIEWBOX_BOTTOM_PAD) / (1 - PATH_Y_BOTTOM_FRAC))) +
    MAP_VIEWBOX_EXTRA_BOTTOM
  )
}

/** Labels on the left of the dot when the node is on the right; avoids clipping long names. */
function labelAnchor(stop) {
  if (stop.x >= 168) {
    return { textAnchor: 'end', x: stop.x - 14 }
  }
  return { textAnchor: 'start', x: stop.x + 14 }
}

/** Centered under the active node, in the space below the dot. */
function progressMarkerLayout(stop, viewBoxH) {
  const h = PROGRESS_MARKER_HEIGHT
  const w = (PROGRESS_IMG_W / PROGRESS_IMG_H) * h
  const { x, y } = stop
  const top = y + NODE_DOT_R + PROGRESS_MARKER_GAP_BELOW_DOT + PROGRESS_MARKER_OFFSET_DOWN
  let left = x - w / 2
  const margin = 4
  left = Math.max(margin, Math.min(left, MAP_VIEWBOX_W - w - margin))
  const maxTop = viewBoxH - MAP_VIEWBOX_BOTTOM_PAD - h
  const yClamped = Math.min(top, maxTop)
  return { x: left, y: yClamped, w, h }
}

function JourneyProgressMarker({ stop, viewBoxH }) {
  if (!stop) return null
  const { x, y, w, h } = progressMarkerLayout(stop, viewBoxH)
  const cx = x + w / 2
  const feetY = y + h - 2
  return (
    <g pointerEvents="none" aria-hidden="true">
      {/* Soft sepia contact shadow only — parchment-toned, no green */}
      <ellipse
        cx={cx}
        cy={feetY + 3}
        rx={Math.min(w * 0.48, MAP_VIEWBOX_W * 0.19)}
        ry={5.5}
        fill="url(#jmpFigureFeetShadow)"
      />
      <ellipse cx={cx} cy={y + h * 0.52} rx={w * 0.42} ry={h * 0.38} fill="rgba(212, 168, 67, 0.2)" filter="url(#jmpFigureWarmGlow)" />
      <foreignObject x={x} y={y - PROGRESS_MARKER_HALO_PAD} width={w} height={h + PROGRESS_MARKER_HALO_PAD}>
        <div
          xmlns="http://www.w3.org/1999/xhtml"
          style={{
            margin: 0,
            padding: 0,
            lineHeight: 0,
            width: '100%',
            height: '100%',
            overflow: 'visible',
          }}
        >
          <img
            src="/jesus-and-person.png"
            alt=""
            style={{
              display: 'block',
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              objectPosition: 'bottom center',
              transform: `translateY(-${PROGRESS_MARKER_IMG_LIFT}px)`,
              pointerEvents: 'none',
            }}
          />
        </div>
      </foreignObject>
    </g>
  )
}

export default function JourneyMap({ onExit, fillVertical = false }) {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const keys = useMemo(
    () => ({
      map: userStorageKey(user?.id, 'journey-map'),
      completionDismissed: userStorageKey(user?.id, 'journey-map-completion-modal-dismissed'),
      triviaStats: userStorageKey(user?.id, 'trivia-stats'),
      verseProgress: userStorageKey(user?.id, 'verse-progress'),
    }),
    [user?.id],
  )

  const mapViewBoxH = useMemo(() => computeMapViewBoxHeight(), [])

  const stops = useMemo(
    () =>
      JOURNEY_MAP_GEOMETRY.map((g) => ({
        id: g.id,
        x: g.x,
        y: remapGeoYToViewBox(g.y, mapViewBoxH),
        scripture: g.scripture,
        label: t(`journeyMap.stops.${g.id}.label`),
        description: t(`journeyMap.stops.${g.id}.description`),
        jesusVoice: t(`journeyMap.stops.${g.id}.jesusVoice`),
      })),
    [t, i18n.language, mapViewBoxH],
  )

  const [state, setState] = useState({ seenFacts: {}, updatedAt: '' })
  const [activeStop, setActiveStop] = useState(null)
  const [showJourneyCompletionModal, setShowJourneyCompletionModal] = useState(false)

  useEffect(() => {
    setState(readJson(keys.map, { seenFacts: {}, updatedAt: '' }))
  }, [keys.map])

  const triviaStats = useMemo(() => readJson(keys.triviaStats, { gamesCompleted: 0 }), [keys.triviaStats])
  const verseProgress = useMemo(() => readJson(keys.verseProgress, {}), [keys.verseProgress])
  const memorizedCount = useMemo(() => Object.values(verseProgress).filter((p) => p?.memorized).length, [verseProgress])

  const unlockedCount = Math.min(
    stops.length,
    1 + Math.floor(((triviaStats.gamesCompleted || 0) + memorizedCount) / 2),
  )

  const journeyFullyUnlocked = unlockedCount >= stops.length

  useEffect(() => {
    if (
      journeyFullyUnlocked &&
      !readJson(keys.completionDismissed, false)
    ) {
      setShowJourneyCompletionModal(true)
    }
  }, [journeyFullyUnlocked, keys.completionDismissed])

  const dismissJourneyCompletionModal = () => {
    writeJson(keys.completionDismissed, true)
    setShowJourneyCompletionModal(false)
  }

  const openStop = (stop, unlocked) => {
    if (!unlocked) return
    setActiveStop(stop)
    const next = {
      ...state,
      seenFacts: { ...(state.seenFacts || {}), [stop.id]: true },
      updatedAt: new Date().toISOString(),
    }
    setState(next)
    writeJson(keys.map, next)
  }

  const pathD = useMemo(() => buildPathD(stops), [stops])

  const currentProgressStop = useMemo(() => {
    if (unlockedCount < 1) return null
    const idx = Math.min(unlockedCount - 1, stops.length - 1)
    return stops[idx]
  }, [unlockedCount, stops])

  const jerusalemStop = useMemo(() => stops.find((s) => s.id === 'jerusalem'), [stops])

  return (
    <div
      className={`home-gold-glass ${fillVertical ? 'flex min-h-0 flex-1 flex-col' : ''}`}
      style={{ borderRadius: '20px', padding: '16px', ...(fillVertical ? { minHeight: '100%' } : {}) }}
    >
      <style>
        {`
          @keyframes journey-map-current-ring {
            0% { transform: scale(1); opacity: 0.8; }
            100% { transform: scale(2); opacity: 0; }
          }
          .journey-map-current-pulse-ring {
            transform-origin: center;
            transform-box: fill-box;
            animation: journey-map-current-ring 2s ease-out infinite;
          }
          @keyframes journey-completion-halo {
            0%, 100% { opacity: 0.65; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.05); }
          }
          @keyframes journey-completion-button-glow {
            0%, 100% { box-shadow: 0 0 14px rgba(212, 168, 67, 0.45), 0 0 28px rgba(212, 168, 67, 0.2); }
            50% { box-shadow: 0 0 22px rgba(212, 168, 67, 0.65), 0 0 40px rgba(212, 168, 67, 0.35); }
          }
          @keyframes map-pulse {
            0%, 100% { box-shadow: 0 0 12px rgba(212,175,55,0.9), 0 0 24px rgba(212,175,55,0.5); }
            50% { box-shadow: 0 0 20px rgba(212,175,55,1), 0 0 40px rgba(212,175,55,0.7); }
          }
          @keyframes star-twinkle {
            0%, 100% { opacity: var(--star-base-opacity, 0.4); }
            50% { opacity: var(--star-peak-opacity, 0.9); }
          }
          @keyframes star-pulse {
            0%, 100% { opacity: 0.15; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(1.15); }
          }
          @keyframes map-pulse-anchor {
            0%, 100% { opacity: 0.55; filter: sepia(1) saturate(0.9) brightness(1) drop-shadow(0 0 4px rgba(212,175,55,0.4)); }
            50% { opacity: 0.7; filter: sepia(1) saturate(1.2) brightness(1.1) drop-shadow(0 0 8px rgba(212,175,55,0.6)); }
          }
          @keyframes map-pulse-opacity {
            0%, 100% { opacity: 0.15; }
            50% { opacity: 0.5; }
          }
          @keyframes map-compass-spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes dove-float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-6px); }
          }
          .jm-compass-spin {
            transform-origin: center;
            transform-box: fill-box;
            animation: map-compass-spin 60s linear infinite;
          }
          .jm-dove-float {
            animation: dove-float 4s ease-in-out infinite;
          }
          .jm-anchor-pulse {
            animation: map-pulse-anchor 3s ease-in-out infinite;
          }
        `}
      </style>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexShrink: 0 }}>
        <p style={{ color: '#fbbf24', fontSize: '12px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', margin: 0 }}>
          {t('journeyMap.ui.mapTitle')}
        </p>
        <button type="button" onClick={onExit}
          style={{ fontSize: '12px', color: 'rgba(212,175,55,0.7)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, transition: 'color 0.2s ease' }}
          onMouseEnter={e => e.currentTarget.style.color = '#fbbf24'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(212,175,55,0.7)'}
        >
          {t('journeyMap.ui.back')}
        </button>
      </div>

      <div className="home-gold-glass" style={{
        borderRadius: '12px', padding: '10px 14px', marginBottom: '10px', flexShrink: 0,
        borderLeft: '4px solid rgba(212,175,55,0.6)',
        borderTop: '1px solid rgba(212,175,55,0.12)',
        borderRight: '1px solid rgba(212,175,55,0.08)',
        borderBottom: '1px solid rgba(212,175,55,0.08)',
      }}>
        <p style={{ color: '#cbd5e1', fontSize: '12px', margin: '0 0 6px 0', lineHeight: 1.6 }}>{t('journeyMap.ui.unlocksHelp')}</p>
        <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ color: '#fbbf24', fontSize: '13px', fontWeight: 700 }}>Unlocked:</span>
          <span style={{ background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: '50px', padding: '1px 10px', color: '#fcd34d', fontSize: '13px', fontWeight: 700 }}>
            {unlockedCount}/{stops.length}
          </span>
        </p>
      </div>

      <div
        className={`relative min-h-0 overflow-hidden rounded-2xl px-2 pb-2 pt-1 sm:px-3 sm:pb-3 sm:pt-1.5 ${fillVertical ? 'flex flex-1 flex-col' : ''}`}
        style={{
          border: '2px solid rgba(212,175,55,0.4)',
          borderRadius: '16px',
          boxShadow: '0 0 30px rgba(212,175,55,0.15), 0 8px 40px rgba(0,0,0,0.5)',
        }}
      >
        {/* Layer 0 — deep space base */}
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0, borderRadius: '14px', pointerEvents: 'none',
          background: 'radial-gradient(ellipse at 40% 30%, rgba(10,18,50,1) 0%, rgba(5,8,28,1) 55%, rgba(2,4,15,1) 100%)',
        }} />
        {/* Layer 1 — grain/noise */}
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0, borderRadius: '14px', pointerEvents: 'none',
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")",
          backgroundSize: '200px 200px', opacity: 0.6, mixBlendMode: 'overlay',
        }} />
        {/* Layer 3 — vignette */}
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0, borderRadius: '14px', pointerEvents: 'none', zIndex: 5,
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(4,8,20,0.8) 100%)',
        }} />
        <svg
          width="100%"
          viewBox={`0 0 ${MAP_VIEWBOX_W} ${mapViewBoxH}`}
          preserveAspectRatio="xMidYMid meet"
          className={`relative z-10 ${fillVertical ? 'min-h-[240px] flex-1' : ''}`}
          style={{ display: 'block' }}
        >
          <defs>
            <radialGradient id="jmpCurrentDotGrad" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#FFE566" />
              <stop offset="100%" stopColor="#C8960C" />
            </radialGradient>
            <radialGradient id="milkyWay" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(180,160,255,0.6)" />
              <stop offset="100%" stopColor="rgba(180,160,255,0)" />
            </radialGradient>
            <radialGradient id="jmpFigureFeetShadow" cx="50%" cy="45%" r="65%">
              <stop offset="0%" stopColor="rgb(120,80,20)" stopOpacity="0.2" />
              <stop offset="55%" stopColor="rgb(120,80,20)" stopOpacity="0.06" />
              <stop offset="100%" stopColor="rgb(120,80,20)" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="jmpFigureGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(212,175,55,0.15)" />
              <stop offset="100%" stopColor="rgba(212,175,55,0)" />
            </radialGradient>
            <filter id="jmpFigureWarmGlow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="9" result="b" />
              <feMerge><feMergeNode in="b" /></feMerge>
            </filter>
          </defs>

          {/* Hardcoded star field */}
          {STAR_FIELD.map((s, i) => (
            <circle
              key={i}
              cx={s.x}
              cy={(s.y / 100) * mapViewBoxH}
              r={s.r}
              fill="white"
              style={{
                opacity: s.o,
                animation: `star-twinkle ${2 + (i % 5) * 0.4}s ease-in-out ${s.d}s infinite`,
                '--star-base-opacity': s.o * 0.5,
                '--star-peak-opacity': Math.min(s.o + 0.2, 1),
              }}
            />
          ))}

          {/* Milky Way band */}
          <ellipse
            cx={MAP_VIEWBOX_W * 0.5}
            cy={mapViewBoxH * 0.35}
            rx={MAP_VIEWBOX_W * 0.45}
            ry={mapViewBoxH * 0.18}
            fill="url(#milkyWay)"
            opacity="0.12"
            transform={`rotate(-15, ${MAP_VIEWBOX_W * 0.5}, ${mapViewBoxH * 0.35})`}
          />

          {/* Constellation connector — outermost ambient */}
          <path d={pathD} fill="none" stroke="rgba(180,160,255,0.06)" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
          {/* Mid glow */}
          <path d={pathD} fill="none" stroke="rgba(212,175,55,0.15)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          {/* Core dashed constellation line */}
          <path d={pathD} fill="none" stroke="rgba(212,175,55,0.7)" strokeWidth="1.5" strokeDasharray="6 3" strokeLinecap="round" strokeLinejoin="round" />

          {/* 8-point compass rose — celestial violet, slow spin */}
          <g transform={`translate(26, ${mapViewBoxH * 0.065})`} className="jm-compass-spin">
            <polygon points="0,-16 3,-4 0,-8 -3,-4" fill="rgba(180,160,255,0.9)" />
            <polygon points="0,16 3,4 0,8 -3,4" fill="rgba(180,160,255,0.7)" />
            <polygon points="-16,0 -4,-3 -8,0 -4,3" fill="rgba(180,160,255,0.7)" />
            <polygon points="16,0 4,-3 8,0 4,3" fill="rgba(180,160,255,0.7)" />
            <g transform="rotate(45)">
              <polygon points="0,-10 2,-4 0,-6 -2,-4" fill="rgba(180,160,255,0.4)" />
              <polygon points="0,10 2,4 0,6 -2,4" fill="rgba(180,160,255,0.4)" />
              <polygon points="-10,0 -4,-2 -6,0 -4,2" fill="rgba(180,160,255,0.4)" />
              <polygon points="10,0 4,-2 6,0 4,2" fill="rgba(180,160,255,0.4)" />
            </g>
            <circle r="3" fill="rgba(180,160,255,0.9)" />
            <circle r="1.5" fill="rgba(220,210,255,1)" />
          </g>

          {/* Dove — celestial violet aura */}
          <image
            href="/dove.svg"
            x={MAP_VIEWBOX_W - 58 - 8}
            y={mapViewBoxH * 0.028}
            width={58}
            height={58}
            pointerEvents="none"
            className="jm-dove-float"
            style={{ filter: 'brightness(1.3) drop-shadow(0 0 6px rgba(200,190,255,0.5)) opacity(0.85)' }}
          />

          {/* Cross near Jerusalem — brightened for dark bg */}
          {jerusalemStop ? (
            <g transform={`translate(${jerusalemStop.x + 12}, ${jerusalemStop.y - 14})`} opacity={0.5}>
              <rect x="-0.9" y="-10" width="1.8" height="12" rx="0.3" fill="rgba(212,175,55,0.7)" />
              <rect x="-6" y="-6" width="12" height="1.8" rx="0.3" fill="rgba(212,175,55,0.7)" />
            </g>
          ) : null}

          {/* Anchor */}
          <image
            href="/anchor.svg"
            x={MAP_VIEWBOX_W / 2 - 26}
            y={mapViewBoxH - 58}
            width={52}
            height={52}
            pointerEvents="none"
            className="jm-anchor-pulse"
            style={{ filter: 'sepia(1) saturate(1.0) brightness(1.2) drop-shadow(0 0 10px rgba(212,175,55,0.4)) opacity(0.45)' }}
          />

          {stops.map((stop, i) => {
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
                {unlocked ? (
                  <circle
                    cx={stop.x}
                    cy={stop.y}
                    r={isCurrentProgress ? 22 : 15}
                    fill="transparent"
                    pointerEvents="all"
                    aria-hidden
                  />
                ) : null}
                {!unlocked ? (
                  /* Locked stop — faint star with crosshairs */
                  <g>
                    <line x1={stop.x - 5} y1={stop.y} x2={stop.x + 5} y2={stop.y} stroke="rgba(180,170,220,0.15)" strokeWidth="1" />
                    <line x1={stop.x} y1={stop.y - 5} x2={stop.x} y2={stop.y + 5} stroke="rgba(180,170,220,0.15)" strokeWidth="1" />
                    <circle cx={stop.x} cy={stop.y} r="2.5" fill="rgba(150,140,200,0.3)" stroke="rgba(180,170,220,0.2)" strokeWidth="1" />
                  </g>
                ) : isCurrentProgress ? (
                  /* Current position — layered star beacon */
                  <g transform={`translate(${stop.x} ${stop.y})`}>
                    <circle r="16" fill="none" stroke="rgba(212,175,55,0.12)" strokeWidth="2"
                      style={{ animation: 'star-pulse 2.5s ease-in-out infinite', transformOrigin: 'center', transformBox: 'fill-box' }} />
                    <circle r="10" fill="none" stroke="rgba(212,175,55,0.35)" strokeWidth="1.5" />
                    {/* 8-point star body */}
                    <g>
                      <rect x="-5" y="-1.5" width="10" height="3" rx="1" fill="url(#jmpCurrentDotGrad)" />
                      <rect x="-5" y="-1.5" width="10" height="3" rx="1" fill="url(#jmpCurrentDotGrad)" transform="rotate(45)" />
                      <rect x="-5" y="-1.5" width="10" height="3" rx="1" fill="url(#jmpCurrentDotGrad)" transform="rotate(90)" />
                      <rect x="-5" y="-1.5" width="10" height="3" rx="1" fill="url(#jmpCurrentDotGrad)" transform="rotate(135)" />
                    </g>
                    <circle r="2.5" fill="rgba(255,240,180,0.95)" />
                  </g>
                ) : (
                  /* Unlocked stop — gold star dot + halo */
                  <g>
                    <circle cx={stop.x} cy={stop.y} r="7" fill="none" stroke="rgba(212,175,55,0.2)" strokeWidth="1" />
                    <circle cx={stop.x} cy={stop.y} r="4" fill="#D4AF37" stroke="rgba(255,220,100,0.5)" strokeWidth="1.5" />
                  </g>
                )}
                {/* Label backing rect for current stop */}
                {isCurrentProgress && (
                  <rect
                    x={la.x - (la.textAnchor === 'middle' ? 18 : la.textAnchor === 'end' ? 36 : 2)}
                    y={stop.y + 4 - 9}
                    width={36} height={13} rx={3}
                    fill="rgba(2,4,15,0.8)"
                  />
                )}
                <text
                  x={la.x}
                  y={stop.y + 4}
                  fontSize={isCurrentProgress ? '10.5' : (unlocked ? '8' : '8')}
                  fontWeight={isCurrentProgress ? '700' : (unlocked ? '600' : '400')}
                  textAnchor={la.textAnchor}
                  fontFamily="Georgia, 'Times New Roman', serif"
                  fill={!unlocked ? 'rgba(150,140,200,0.4)' : (isCurrentProgress ? '#FFD700' : 'rgba(212,175,55,0.8)')}
                  fontStyle={!unlocked ? 'italic' : 'normal'}
                >
                  {unlocked ? stop.label : `${t('journeyMap.ui.lockedPrefix')}${stop.label}`}
                </text>
                {seen && unlocked ? (
                  <circle cx={stop.x + 5} cy={stop.y - 5} r="2" fill="#D4A843" opacity="0.75" />
                ) : null}
              </g>
            )
          })}

          {currentProgressStop ? (
            <JourneyProgressMarker stop={currentProgressStop} viewBoxH={mapViewBoxH} />
          ) : null}
        </svg>
      </div>

      {showJourneyCompletionModal ? (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="journey-completion-title"
        >
          <div
            className="absolute inset-0 bg-black/65 backdrop-blur-[2px]"
            aria-hidden
          />
          <div
            className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border-2 border-[#D4A843] px-6 pb-8 pt-10 text-center shadow-2xl"
            style={{
              background: 'linear-gradient(165deg, #0f1729 0%, #0a0f1c 45%, #0d1528 100%)',
              boxShadow:
                '0 0 0 1px rgba(212, 168, 67, 0.15), 0 25px 50px -12px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(212, 168, 67, 0.12)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative mx-auto mb-8 flex h-[150px] w-full items-center justify-center">
              <div
                className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#D4A843]/25 blur-3xl"
                style={{ animation: 'journey-completion-halo 4s ease-in-out infinite' }}
                aria-hidden
              />
              <div
                className="pointer-events-none absolute left-1/2 top-1/2 h-28 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#c9a227]/30 blur-2xl"
                style={{ animation: 'journey-completion-halo 5s ease-in-out infinite reverse' }}
                aria-hidden
              />
              <img
                src="/jesus-victorious.png"
                alt=""
                className="relative z-10 h-[150px] w-auto max-w-full object-contain"
                style={{
                  filter:
                    'drop-shadow(0 0 24px rgba(212, 168, 67, 0.5)) drop-shadow(0 0 48px rgba(212, 168, 67, 0.25))',
                }}
              />
            </div>
            <h2
              id="journey-completion-title"
              className="font-serif text-2xl font-light leading-snug tracking-wide text-[#e8c86a] sm:text-[1.65rem]"
              style={{ textShadow: '0 0 40px rgba(212, 168, 67, 0.35)' }}
            >
              {t('journeyMap.ui.completionTitle')}
            </h2>
            <p className="mx-auto mt-5 max-w-sm text-sm leading-relaxed text-white/85">
              {t('journeyMap.ui.completionBody')}
            </p>
            <p className="mt-6 text-sm font-medium text-amber-400/95">{t('journeyMap.ui.completionVerse')}</p>
            <button
              type="button"
              onClick={dismissJourneyCompletionModal}
              className="mt-10 inline-flex min-w-[140px] items-center justify-center rounded-xl border-2 border-[#D4A843] bg-[#D4A843]/10 px-8 py-3 text-base font-semibold text-[#f0d78c] transition hover:bg-[#D4A843]/20"
              style={{ animation: 'journey-completion-button-glow 2.8s ease-in-out infinite' }}
            >
              {t('journeyMap.ui.close')}
            </button>
          </div>
        </div>
      ) : null}

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
            aria-label={t('journeyMap.ui.ariaClose')}
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
              aria-label={t('journeyMap.ui.ariaClose')}
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
