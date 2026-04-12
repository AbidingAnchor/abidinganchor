import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { WORSHIP_TRACKS } from '../data/worshipTracks'

const INITIAL_AUDIO_URL = '/music/soaking-worship.mp3'
const SKY_STAR_COUNT = 92
const WORSHIP_VOLUME_KEY = 'abidinganchor-worship-volume'
const DEFAULT_WORSHIP_VOLUME = 0.7

function readStoredVolume() {
  try {
    const raw = localStorage.getItem(WORSHIP_VOLUME_KEY)
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

export default function WorshipMode() {
  const tracks = WORSHIP_TRACKS
  const [currentIndex, setCurrentIndex] = useState(() => {
    const i = tracks.findIndex((t) => t.file === INITIAL_AUDIO_URL)
    return i >= 0 ? i : 0
  })
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [audioError, setAudioError] = useState(null)
  const [volume, setVolume] = useState(readStoredVolume)

  const audioRef = useRef(null)
  const currentIndexRef = useRef(currentIndex)

  useEffect(() => {
    currentIndexRef.current = currentIndex
  }, [currentIndex])

  const applySrc = useCallback((audio, url) => {
    audio.pause()
    audio.src = url
    audio.load()
  }, [])

  useEffect(() => {
    const audio = new Audio(INITIAL_AUDIO_URL)
    audio.preload = 'metadata'
    if ('playsInline' in audio) {
      try {
        audio.playsInline = true
      } catch {
        /* ignore */
      }
    }
    audioRef.current = audio
    audio.volume = readStoredVolume()

    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onLoadStart = () => setIsLoading(true)
    const onCanPlay = () => setIsLoading(false)
    const onPlaying = () => setIsLoading(false)
    const onError = () => {
      setAudioError(formatAudioError(audio))
      setIsPlaying(false)
      setIsLoading(false)
    }

    const onEnded = () => {
      const i = currentIndexRef.current
      const next = (i + 1) % tracks.length
      currentIndexRef.current = next
      setCurrentIndex(next)
      const url = tracks[next].file
      applySrc(audio, url)
      setIsLoading(true)
      audio.play().catch((e) => {
        setAudioError(
          e?.name === 'NotAllowedError'
            ? 'Tap Play to continue — playback after a track ends may need a tap on some devices.'
            : e?.message || 'Could not play next track',
        )
        setIsPlaying(false)
        setIsLoading(false)
      })
    }

    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('loadstart', onLoadStart)
    audio.addEventListener('canplay', onCanPlay)
    audio.addEventListener('playing', onPlaying)
    audio.addEventListener('error', onError)
    audio.addEventListener('ended', onEnded)

    return () => {
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('loadstart', onLoadStart)
      audio.removeEventListener('canplay', onCanPlay)
      audio.removeEventListener('playing', onPlaying)
      audio.removeEventListener('error', onError)
      audio.removeEventListener('ended', onEnded)
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
      audioRef.current = null
    }
  }, [applySrc, tracks])

  useEffect(() => {
    const el = audioRef.current
    if (el) el.volume = volume
    try {
      localStorage.setItem(WORSHIP_VOLUME_KEY, String(volume))
    } catch {
      /* ignore */
    }
  }, [volume])

  const handleVolumeInput = (e) => {
    const v = parseFloat(e.target.value)
    if (Number.isFinite(v)) setVolume(Math.min(1, Math.max(0, v)))
  }

  /** Sets src + play() in one call — use from UI so mobile gets user gesture + correct URL (e.g. soaking-worship.mp3). */
  const loadAndPlay = useCallback(
    async (index) => {
      const audio = audioRef.current
      if (!audio) return
      const url = tracks[index]?.file
      if (!url) return
      try {
        setAudioError(null)
        currentIndexRef.current = index
        setCurrentIndex(index)
        setIsLoading(true)
        applySrc(audio, url)
        await audio.play()
      } catch (e) {
        const msg =
          e?.name === 'NotAllowedError'
            ? 'Tap Play to start — your browser requires a tap to play audio.'
            : e?.message || 'Playback failed'
        setAudioError(msg)
        setIsPlaying(false)
        setIsLoading(false)
      }
    },
    [applySrc, tracks],
  )

  /** Play / pause from transport — play() runs in same tap handler; load current track URL if needed. */
  const handleTransportPlayPause = async () => {
    const audio = audioRef.current
    if (!audio) return
    if (!audio.paused) {
      audio.pause()
      return
    }
    await loadAndPlay(currentIndex)
  }

  const handlePrev = () => {
    const next = (currentIndex - 1 + tracks.length) % tracks.length
    void loadAndPlay(next)
  }

  const handleNext = () => {
    const next = (currentIndex + 1) % tracks.length
    void loadAndPlay(next)
  }

  const handleSelectTrack = (index) => {
    void loadAndPlay(index)
  }

  const current = tracks[currentIndex]
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
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
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
