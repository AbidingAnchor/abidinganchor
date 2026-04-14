import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { WORSHIP_TRACKS } from '../data/worshipTracks'
import { getActiveStorageUserId, userStorageKey } from '../utils/userStorage'

export const INITIAL_AUDIO_URL = '/music/soaking-worship.mp3'
const DEFAULT_WORSHIP_VOLUME = 0.7

function worshipVolumeStorageKey() {
  return userStorageKey(getActiveStorageUserId(), 'worship-volume')
}

/** Single HTMLAudioElement — module scope; persists across route changes and remounts */
export const globalAudio = new Audio()
/** Back-compat alias used elsewhere */
export const globalWorshipAudio = globalAudio

if ('playsInline' in globalAudio) {
  try {
    globalAudio.playsInline = true
  } catch {
    /* ignore */
  }
}
globalAudio.preload = 'metadata'

function defaultIndex() {
  const i = WORSHIP_TRACKS.findIndex((t) => t.file === INITIAL_AUDIO_URL)
  return i >= 0 ? i : 0
}

export function readStoredVolume() {
  try {
    const raw = localStorage.getItem(worshipVolumeStorageKey())
    if (raw == null) return DEFAULT_WORSHIP_VOLUME
    const n = parseFloat(raw)
    if (!Number.isFinite(n)) return DEFAULT_WORSHIP_VOLUME
    return Math.min(1, Math.max(0, n))
  } catch {
    return DEFAULT_WORSHIP_VOLUME
  }
}

function formatAudioError(audio) {
  const err = audio?.error
  if (!err) return 'Could not load or play this track. Check that the file exists under public/music/.'
  const codes = {
    1: 'Playback aborted',
    2: 'Network error',
    3: 'Decode error',
    4: 'Format not supported or file missing',
  }
  return `${codes[err.code] || 'Error'} (${err.code}): ${err.message || 'unknown'}`
}

function formatPlayError(e) {
  if (e?.name === 'NotAllowedError') {
    return 'Tap Play to start — your browser requires a tap to play audio.'
  }
  return e?.message || 'Playback failed'
}

const defaultIdx = defaultIndex()

let worshipState = {
  currentIndex: defaultIdx,
  volume: readStoredVolume(),
  isPlaying: false,
  isLoading: false,
  audioError: null,
}

const listeners = new Set()
let listenersAttached = false

export function getWorshipState() {
  const track = WORSHIP_TRACKS[worshipState.currentIndex]
  return {
    ...worshipState,
    trackName: track?.name ?? '',
    currentFile: track?.file ?? '',
  }
}

function notify() {
  const snapshot = getWorshipState()
  listeners.forEach((cb) => {
    try {
      cb(snapshot)
    } catch {
      /* ignore subscriber errors */
    }
  })
}

export function subscribeWorshipPlayback(cb) {
  ensureAudioListeners()
  listeners.add(cb)
  cb(getWorshipState())
  return () => {
    listeners.delete(cb)
  }
}

export function useWorshipPlaybackState() {
  const [state, setState] = useState(getWorshipState)
  useEffect(() => subscribeWorshipPlayback(setState), [])
  return state
}

function applySrc(url) {
  const audio = globalAudio
  audio.pause()
  audio.src = url
  audio.load()
}

function ensureInitialSrc() {
  const audio = globalAudio
  const url = WORSHIP_TRACKS[worshipState.currentIndex]?.file
  if (!url) return
  const needsSet = !audio.src || audio.src === '' || !audio.currentSrc
  if (needsSet) {
    audio.src = url
    audio.load()
  }
}

function pathnameFromAudioSrc(audio) {
  const u = audio.currentSrc || audio.src
  if (!u) return null
  try {
    return new URL(u, window.location.href).pathname
  } catch {
    return null
  }
}

function indexForTrackPathname(pathname) {
  if (!pathname) return null
  const idx = WORSHIP_TRACKS.findIndex((t) => t.file === pathname)
  return idx >= 0 ? idx : null
}

function audioSourceMatchesCurrentTrack(audio, index) {
  const file = WORSHIP_TRACKS[index]?.file
  if (!file || !audio.src) return false
  try {
    const expected = new URL(file, window.location.href).href
    return audio.currentSrc === expected || audio.src === expected
  } catch {
    return audio.src.includes(file)
  }
}

function ensureAudioListeners() {
  if (listenersAttached) return
  listenersAttached = true

  const audio = globalAudio
  ensureInitialSrc()
  audio.volume = worshipState.volume

  audio.addEventListener('play', () => {
    worshipState = { ...worshipState, isPlaying: true, audioError: null }
    notify()
  })
  audio.addEventListener('pause', () => {
    worshipState = { ...worshipState, isPlaying: false }
    notify()
  })
  audio.addEventListener('loadstart', () => {
    worshipState = { ...worshipState, isLoading: true }
    notify()
  })
  audio.addEventListener('canplay', () => {
    worshipState = { ...worshipState, isLoading: false }
    notify()
  })
  audio.addEventListener('playing', () => {
    worshipState = { ...worshipState, isLoading: false }
    notify()
  })
  audio.addEventListener('error', () => {
    worshipState = {
      ...worshipState,
      audioError: formatAudioError(audio),
      isPlaying: false,
      isLoading: false,
    }
    notify()
  })

  audio.addEventListener('ended', () => {
    const next = (worshipState.currentIndex + 1) % WORSHIP_TRACKS.length
    worshipState = { ...worshipState, currentIndex: next, isLoading: true, audioError: null }
    notify()
    const url = WORSHIP_TRACKS[next]?.file
    if (!url) return
    applySrc(url)
    audio.play().catch((e) => {
      worshipState = {
        ...worshipState,
        audioError:
          e?.name === 'NotAllowedError'
            ? 'Tap Play to continue — playback after a track ends may need a tap on some devices.'
            : e?.message || 'Could not play next track',
        isPlaying: false,
        isLoading: false,
      }
      notify()
    })
  })
}

/** Align module state with the real element when returning to Worship Mode */
export function resyncWorshipStateFromAudio() {
  ensureAudioListeners()
  const audio = globalAudio
  const pathname = pathnameFromAudioSrc(audio)
  const idx = indexForTrackPathname(pathname) ?? worshipState.currentIndex
  worshipState = {
    ...worshipState,
    currentIndex: idx,
    isPlaying: !audio.paused,
    volume: audio.volume,
  }
  notify()
}

export async function worshipLoadAndPlay(index) {
  ensureAudioListeners()
  const url = WORSHIP_TRACKS[index]?.file
  if (!url) return
  worshipState = {
    ...worshipState,
    currentIndex: index,
    audioError: null,
    isLoading: true,
  }
  notify()
  applySrc(url)
  try {
    await globalAudio.play()
  } catch (e) {
    worshipState = {
      ...worshipState,
      audioError: formatPlayError(e),
      isPlaying: false,
      isLoading: false,
    }
    notify()
  }
}

export function worshipTransportToggle() {
  ensureAudioListeners()
  const audio = globalAudio
  if (!audio.paused) {
    audio.pause()
    return
  }
  const index = worshipState.currentIndex
  if (audioSourceMatchesCurrentTrack(audio, index)) {
    audio.play().catch((e) => {
      worshipState = {
        ...worshipState,
        audioError: formatPlayError(e),
        isPlaying: false,
        isLoading: false,
      }
      notify()
    })
    return
  }
  void worshipLoadAndPlay(index)
}

export function worshipPause() {
  ensureAudioListeners()
  globalAudio.pause()
}

export function worshipSetVolume(v) {
  ensureAudioListeners()
  const vol = Math.min(1, Math.max(0, v))
  worshipState = { ...worshipState, volume: vol }
  globalAudio.volume = vol
  try {
    localStorage.setItem(worshipVolumeStorageKey(), String(vol))
  } catch {
    /* ignore */
  }
  notify()
}

/** After sign-in / user switch, load volume for the active account’s storage key. */
export function reloadWorshipVolumeForActiveUser() {
  ensureAudioListeners()
  const vol = readStoredVolume()
  worshipState = { ...worshipState, volume: vol }
  globalAudio.volume = vol
  notify()
}

export function worshipPrev() {
  const next = (worshipState.currentIndex - 1 + WORSHIP_TRACKS.length) % WORSHIP_TRACKS.length
  void worshipLoadAndPlay(next)
}

export function worshipNext() {
  const next = (worshipState.currentIndex + 1) % WORSHIP_TRACKS.length
  void worshipLoadAndPlay(next)
}

/** Used when opening the floating player from Home with “start playing” */
export function worshipStartPlaybackFromOverlay() {
  ensureAudioListeners()
  void worshipLoadAndPlay(worshipState.currentIndex)
}

const SKY_STAR_COUNT = 92

export default function WorshipMode() {
  const { user } = useAuth()
  const tracks = WORSHIP_TRACKS
  const wp = useWorshipPlaybackState()
  const { currentIndex, isPlaying, isLoading, audioError, volume } = wp

  useEffect(() => {
    resyncWorshipStateFromAudio()
  }, [])

  useEffect(() => {
    reloadWorshipVolumeForActiveUser()
  }, [user?.id])

  const handleVolumeInput = (e) => {
    const v = parseFloat(e.target.value)
    if (Number.isFinite(v)) worshipSetVolume(Math.min(1, Math.max(0, v)))
  }

  const handleTransportPlayPause = () => {
    worshipTransportToggle()
  }

  const handlePrev = () => {
    worshipPrev()
  }

  const handleNext = () => {
    worshipNext()
  }

  const handleSelectTrack = (index) => {
    void worshipLoadAndPlay(index)
  }

  const current = tracks[currentIndex] ?? tracks[0]
  const gold = '#D4A843'
  const goldMuted = 'rgba(212, 168, 67, 0.35)'

  const skyStars = useMemo(
    () =>
      Array.from({ length: SKY_STAR_COUNT }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: 1 + Math.random() * 2.2,
        duration: 5 + Math.random() * 7,
        delay: Math.random() * 14,
      })),
    [],
  )

  return (
    <>
    <div
      className="content-scroll worship-mode-page"
      style={{
        position: 'relative',
        minHeight: '100dvh',
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
      }}
    >
      <div className="worship-sky" aria-hidden>
        <div className="worship-sky-gradient" />
        <div className="worship-nebula worship-nebula--a" />
        <div className="worship-nebula worship-nebula--b" />
        <div className="worship-nebula worship-nebula--c" />
        {skyStars.map((s) => (
          <span
            key={s.id}
            className="worship-star"
            style={{
              '--star-left': `${s.left}%`,
              '--star-top': `${s.top}%`,
              '--star-size': `${s.size}px`,
              '--tw-dur': `${s.duration}s`,
              '--tw-delay': `${s.delay}s`,
            }}
          />
        ))}
        <span className="worship-shooting worship-shooting--1" />
        <span className="worship-shooting worship-shooting--2" />
        <span className="worship-shooting worship-shooting--3" />
        <span className="worship-shooting worship-shooting--4" />
        <span className="worship-shooting worship-shooting--5" />
      </div>

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          flex: '0 0 auto',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          padding: '0 16px',
          paddingTop: '88px',
          /* Scroll clearance above fixed transport + bottom nav */
          paddingBottom: 'calc(150px + 72px + env(safe-area-inset-bottom, 0px))',
        }}
      >
      {audioError ? (
        <div
          role="alert"
          style={{
            marginBottom: '12px',
            padding: '12px 14px',
            borderRadius: '12px',
            border: '1px solid rgba(248, 113, 113, 0.5)',
            background: 'rgba(127, 29, 29, 0.35)',
            color: '#fecaca',
            fontSize: '13px',
            lineHeight: 1.5,
          }}
        >
          {audioError}
        </div>
      ) : null}

      <header
        style={{
          flex: '0 0 auto',
          textAlign: 'center',
          paddingBottom: '14px',
          marginBottom: '12px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div style={{ fontSize: '36px', lineHeight: 1 }} aria-hidden>
          🎵
        </div>
        <p
          style={{
            margin: '12px 0 0',
            color: gold,
            fontSize: 'clamp(1.25rem, 4.5vw, 1.5rem)',
            fontWeight: 700,
            lineHeight: 1.25,
            letterSpacing: '0.02em',
          }}
        >
          {current.name}
        </p>
        <p
          style={{
            margin: '8px 0 0',
            fontSize: '14px',
            fontWeight: 500,
            color: 'rgba(255,255,255,0.5)',
            letterSpacing: '0.04em',
          }}
        >
          Worship Mode
        </p>
        {isLoading ? (
          <p style={{ margin: '8px 0 0', color: gold, fontSize: '12px', fontWeight: 600 }} aria-live="polite">
            Loading…
          </p>
        ) : null}
      </header>

      <section style={{ flex: '0 0 auto', width: '100%', margin: 0, padding: 0 }}>
        <p
          style={{
            color: 'rgba(255,255,255,0.45)',
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: '10px',
          }}
        >
          Playlist
        </p>
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            marginBottom: 0,
          }}
        >
          {tracks.map((track, index) => {
            const active = index === currentIndex
            return (
              <li key={track.file}>
                <button
                  type="button"
                  onClick={() => handleSelectTrack(index)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '14px 16px',
                    borderRadius: '12px',
                    border: active ? `2px solid ${gold}` : '1px solid rgba(255,255,255,0.08)',
                    background: active ? 'rgba(212, 168, 67, 0.18)' : 'rgba(255,255,255,0.04)',
                    color: active ? gold : 'rgba(255,255,255,0.88)',
                    fontSize: '15px',
                    fontWeight: active ? 700 : 500,
                    cursor: 'pointer',
                    boxShadow: active ? `0 0 20px ${goldMuted}` : 'none',
                  }}
                >
                  {active ? '♪ ' : ''}
                  {track.name}
                </button>
              </li>
            )
          })}
        </ul>
      </section>
      </div>
    </div>

    {/* Outside worship-mode-page so overflow:hidden does not clip fixed descendants */}
    <div
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 'calc(72px + env(safe-area-inset-bottom, 0px))',
        transform: 'translateX(-50%)',
        width: 'min(680px, calc(100% - 32px))',
        maxWidth: '100%',
        zIndex: 9500,
        padding: '10px 14px 12px',
        boxSizing: 'border-box',
        background: 'rgba(8, 10, 26, 0.55)',
        border: `1px solid ${goldMuted}`,
        borderRadius: '18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.35)',
        pointerEvents: 'auto',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          width: '100%',
          minHeight: 32,
          padding: '0 2px',
          boxSizing: 'border-box',
        }}
      >
        <span style={{ fontSize: '16px', lineHeight: 1, opacity: 0.9, flexShrink: 0 }} aria-hidden>
          🔈
        </span>
        <input
          type="range"
          className="worship-volume-slider"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onInput={handleVolumeInput}
          onChange={handleVolumeInput}
          aria-label="Volume"
          style={{
            flex: 1,
            minWidth: 120,
            width: '100%',
            height: 4,
            minHeight: 28,
            accentColor: '#D4A843',
          }}
        />
        <span style={{ fontSize: '16px', lineHeight: 1, opacity: 0.9, flexShrink: 0 }} aria-hidden>
          🔊
        </span>
      </div>
      <div
        role="toolbar"
        aria-label="Playback controls"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '28px',
        }}
      >
        <button
          type="button"
          onClick={handlePrev}
          aria-label="Previous track"
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            border: `1px solid ${goldMuted}`,
            background: 'rgba(255,255,255,0.08)',
            color: gold,
            fontSize: '22px',
            cursor: 'pointer',
          }}
        >
          ⏮
        </button>
        <button
          type="button"
          onClick={handleTransportPlayPause}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            border: 'none',
            background: `linear-gradient(135deg, ${gold} 0%, #c9a035 100%)`,
            color: '#0a1a3e',
            fontSize: '28px',
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(212, 168, 67, 0.4)',
          }}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button
          type="button"
          onClick={handleNext}
          aria-label="Next track"
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            border: `1px solid ${goldMuted}`,
            background: 'rgba(255,255,255,0.08)',
            color: gold,
            fontSize: '22px',
            cursor: 'pointer',
          }}
        >
          ⏭
        </button>
      </div>
    </div>
    </>
  )
}
