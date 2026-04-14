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
/** Padding between the bottom of the node dot and the top of the figure. */
const PROGRESS_MARKER_GAP = 8
/** Extra offset below the dot so figures clear the label and the path to the next stop. */
const PROGRESS_MARKER_NUDGE_DOWN = 12
/** Padding below the progress figure (and map content) so the card doesn’t feel cramped. */
const MAP_VIEWBOX_BOTTOM_PAD = 16
/** Space below the lowest node for labels (path ends at Bethlehem). */
const MAP_LABEL_BOTTOM_CLEARANCE = 12
/** Lowest point on the path (largest y). */
const MAP_LOWEST_Y = Math.max(...JOURNEY_MAP_GEOMETRY.map((s) => s.y))
/** Bottom edge of static map content (nodes, path, labels) — independent of progress marker position. */
const MAP_CONTENT_BOTTOM = MAP_LOWEST_Y + NODE_DOT_R + MAP_LABEL_BOTTOM_CLEARANCE

function mapViewBoxHeight(progressStop) {
  const markerBottom = progressStop
    ? progressStop.y +
      NODE_DOT_R +
      PROGRESS_MARKER_GAP +
      PROGRESS_MARKER_NUDGE_DOWN +
      PROGRESS_MARKER_HEIGHT
    : 0
  return Math.max(MAP_CONTENT_BOTTOM, markerBottom) + MAP_VIEWBOX_BOTTOM_PAD
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

  const stops = useMemo(
    () =>
      JOURNEY_MAP_GEOMETRY.map((g) => ({
        id: g.id,
        x: g.x,
        y: g.y,
        scripture: g.scripture,
        label: t(`journeyMap.stops.${g.id}.label`),
        description: t(`journeyMap.stops.${g.id}.description`),
        jesusVoice: t(`journeyMap.stops.${g.id}.jesusVoice`),
      })),
    [t, i18n.language],
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

  const mapViewBoxH = useMemo(() => mapViewBoxHeight(currentProgressStop), [currentProgressStop])

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
        <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: '#D4A843' }}>
          {t('journeyMap.ui.mapTitle')}
        </p>
        <button type="button" onClick={onExit} className="text-xs text-white/70">
          {t('journeyMap.ui.back')}
        </button>
      </div>

      <div className="mb-3 shrink-0 glass-panel rounded-xl p-3 text-xs text-white/80">
        {t('journeyMap.ui.unlocksHelp')} <br />
        <span style={{ color: '#D4A843', fontWeight: 700 }}>
          {t('journeyMap.ui.unlockedLabel', { current: unlockedCount, total: stops.length })}
        </span>
      </div>

      <div className={`glass-panel min-h-0 rounded-2xl p-3 ${fillVertical ? 'flex flex-1 flex-col' : ''}`}>
        <svg
          width="100%"
          viewBox={`0 0 ${MAP_VIEWBOX_W} ${mapViewBoxH}`}
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
                  {unlocked ? stop.label : `${t('journeyMap.ui.lockedPrefix')}${stop.label}`}
                </text>
                {seen && unlocked ? <circle cx={stop.x} cy={stop.y} r="3" fill="#fff" opacity="0.85" /> : null}
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
