import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { JOURNEY_MAP_GEOMETRY } from '../data/journeyMapGeometry'
import { useAuth } from '../context/AuthContext'
import { userStorageKey } from '../utils/userStorage'
import JourneyMapParchmentScene from './JourneyMapParchmentScene'

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
/** Padding between the bottom of the node dot and the top of the figure. */
const PROGRESS_MARKER_GAP = 2
/** Small offset so art clears the dot edge; kept tight so figures read “at” the stop (e.g. Bethlehem). */
const PROGRESS_MARKER_NUDGE_DOWN = 3
/** Padding below the progress figure (and map content) so the card doesn’t feel cramped. */
const MAP_VIEWBOX_BOTTOM_PAD = 16
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
function computeMapViewBoxHeight() {
  const markerStack =
    NODE_DOT_R + PROGRESS_MARKER_GAP + PROGRESS_MARKER_NUDGE_DOWN + PROGRESS_MARKER_HEIGHT
  return Math.max(480, Math.ceil((markerStack + MAP_VIEWBOX_BOTTOM_PAD) / (1 - PATH_Y_BOTTOM_FRAC)))
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
  const top = y + NODE_DOT_R + PROGRESS_MARKER_GAP + PROGRESS_MARKER_NUDGE_DOWN
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
              objectPosition: 'bottom center',
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
      className={`glass-panel rounded-2xl p-4 text-white ${fillVertical ? 'flex min-h-0 flex-1 flex-col' : ''}`}
      style={fillVertical ? { minHeight: '100%' } : undefined}
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
        `}
      </style>

      <div className="mb-3 flex shrink-0 items-center justify-between">
        <p
          className="text-xs font-semibold uppercase tracking-[0.14em]"
          style={{ color: '#5c4018', fontFamily: 'Georgia, "Times New Roman", serif' }}
        >
          {t('journeyMap.ui.mapTitle')}
        </p>
        <button
          type="button"
          onClick={onExit}
          className="text-xs underline-offset-2 transition hover:opacity-80"
          style={{ color: '#6b4a18', fontFamily: 'Georgia, "Times New Roman", serif' }}
        >
          {t('journeyMap.ui.back')}
        </button>
      </div>

      <div
        className="mb-3 shrink-0 rounded-lg px-3 py-2.5 text-xs leading-relaxed shadow-sm"
        style={{
          background: 'rgba(232, 213, 163, 0.95)',
          border: '1px solid #8B6914',
          color: '#3d2000',
          fontFamily: 'Georgia, "Times New Roman", serif',
        }}
      >
        {t('journeyMap.ui.unlocksHelp')} <br />
        <span style={{ color: '#6b4a12', fontWeight: 700 }}>{t('journeyMap.ui.unlockedLabel', { current: unlockedCount, total: stops.length })}</span>
      </div>

      <div
        className={`relative min-h-0 overflow-hidden rounded-xl border border-[#8B6914]/55 p-2 shadow-[inset_0_0_40px_rgba(80,45,15,0.12)] sm:p-3 ${fillVertical ? 'flex flex-1 flex-col' : ''}`}
      >
        <JourneyMapParchmentScene />
        <svg
          width="100%"
          viewBox={`0 0 ${MAP_VIEWBOX_W} ${mapViewBoxH}`}
          preserveAspectRatio="xMidYMid meet"
          className={`relative z-10 ${fillVertical ? 'min-h-[240px] flex-1' : ''}`}
          style={{ display: 'block' }}
        >
          <defs>
            <radialGradient id="jmpFigureFeetShadow" cx="50%" cy="45%" r="65%">
              <stop offset="0%" stopColor="rgb(120, 80, 20)" stopOpacity="0.25" />
              <stop offset="55%" stopColor="rgb(120, 80, 20)" stopOpacity="0.08" />
              <stop offset="100%" stopColor="rgb(120, 80, 20)" stopOpacity="0" />
            </radialGradient>
            <filter id="jmpFigureWarmGlow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="9" result="b" />
              <feMerge>
                <feMergeNode in="b" />
              </feMerge>
            </filter>
            <filter id="journeyMapParchmentLabelShadow" x="-25%" y="-25%" width="150%" height="150%">
              <feDropShadow dx="0.35" dy="1.1" stdDeviation="1.15" floodColor="rgba(61, 32, 0, 0.32)" floodOpacity="1" />
            </filter>
          </defs>

          {/* Faint mountain silhouettes — behind ink route */}
          <g opacity={0.22} fill="rgba(90, 60, 35, 0.35)" stroke="none">
            <path
              d={`M-8 ${mapViewBoxH * 0.34} L42 ${mapViewBoxH * 0.2} L88 ${mapViewBoxH * 0.26} L130 ${mapViewBoxH * 0.18} L175 ${mapViewBoxH * 0.24} L220 ${mapViewBoxH * 0.17} L268 ${mapViewBoxH * 0.22} L328 ${mapViewBoxH * 0.28} L328 ${mapViewBoxH * 0.42} L-8 ${mapViewBoxH * 0.42} Z`}
            />
            <path
              d={`M0 ${mapViewBoxH * 0.4} L55 ${mapViewBoxH * 0.3} L100 ${mapViewBoxH * 0.35} L155 ${mapViewBoxH * 0.28} L210 ${mapViewBoxH * 0.32} L280 ${mapViewBoxH * 0.27} L320 ${mapViewBoxH * 0.33} L320 ${mapViewBoxH * 0.48} L0 ${mapViewBoxH * 0.48} Z`}
              opacity={0.65}
            />
          </g>

          {/* Hand-drawn ink route */}
          <path
            d={pathD}
            fill="none"
            stroke="#8B6914"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity={0.72}
            transform="translate(0.25, 0.2)"
          />
          <path
            d={pathD}
            fill="none"
            stroke="#8B6914"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity={0.92}
            transform="translate(-0.15, -0.1)"
          />

          {/* Compass rose — ancient map corner */}
          <g transform={`translate(24, ${mapViewBoxH * 0.06})`} opacity={0.72}>
            <polygon points="0,-14 3,-2 0,14 -3,-2" fill="#D4A843" stroke="#8B6914" strokeWidth="0.6" />
            <polygon points="-14,0 -2,-3 14,0 -2,3" fill="#c9a85c" stroke="#8B6914" strokeWidth="0.6" />
            <circle r="3.2" fill="#e8d5a3" stroke="#8B6914" strokeWidth="0.5" />
          </g>

          {/* Dove — asset tinted to match parchment ink */}
          <image
            href="/dove.svg"
            x={MAP_VIEWBOX_W - 55 - 10}
            y={mapViewBoxH * 0.032}
            width={55}
            height={55}
            pointerEvents="none"
            style={{ filter: 'sepia(0.3) saturate(0.5) opacity(0.75)' }}
          />

          {/* Cross near Jerusalem */}
          {jerusalemStop ? (
            <g transform={`translate(${jerusalemStop.x + 12}, ${jerusalemStop.y - 14})`} opacity={0.65}>
              <rect x="-0.9" y="-10" width="1.8" height="12" rx="0.3" fill="#8B6914" />
              <rect x="-6" y="-6" width="12" height="1.8" rx="0.3" fill="#8B6914" />
            </g>
          ) : null}

          {/* Anchor — bottom center; drawn before figures so it reads as parchment stamp */}
          <image
            href="/anchor.svg"
            x={MAP_VIEWBOX_W / 2 - 22.5}
            y={mapViewBoxH - 52}
            width={45}
            height={45}
            pointerEvents="none"
            style={{ filter: 'sepia(1) saturate(0.3) opacity(0.35)' }}
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
                  <circle cx={stop.x} cy={stop.y} r="4" fill="rgba(100, 70, 20, 0.4)" />
                ) : isCurrentProgress ? (
                  <g transform={`translate(${stop.x} ${stop.y})`}>
                    <circle
                      r="10"
                      fill="none"
                      stroke="#D4A843"
                      strokeWidth="2.25"
                      className="journey-map-current-pulse-ring"
                    />
                    <circle r="10" fill="#D4A843" />
                  </g>
                ) : (
                  <circle cx={stop.x} cy={stop.y} r="7" fill="#D4A843" fillOpacity={0.9} />
                )}
                <text
                  x={la.x}
                  y={stop.y + 4}
                  fontSize="8.5"
                  textAnchor={la.textAnchor}
                  fontFamily="Georgia, 'Times New Roman', serif"
                  fill={unlocked ? '#3d2000' : 'rgba(80, 50, 10, 0.4)'}
                  filter="url(#journeyMapParchmentLabelShadow)"
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
