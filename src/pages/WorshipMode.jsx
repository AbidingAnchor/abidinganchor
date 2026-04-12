import { useCallback, useEffect, useRef, useState } from 'react'
import { WORSHIP_TRACKS } from '../data/worshipTracks'

const INITIAL_AUDIO_URL = '/music/soaking-worship.mp3'

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
  /** Matches INITIAL_AUDIO_URL (Soaking Worship = index 4) */
  const [currentIndex, setCurrentIndex] = useState(() => {
    const i = tracks.findIndex((t) => t.file === INITIAL_AUDIO_URL)
    return i >= 0 ? i : 0
  })
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [audioError, setAudioError] = useState(null)

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

  /** User gesture: load URL and play (playlist / next / prev). */
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

  /** Hero control: pause in same gesture, or audio.play() on tap (required on mobile). */
  const handleCenterPlay = async () => {
    const audio = audioRef.current
    if (!audio) return
    if (!audio.paused) {
      audio.pause()
      return
    }
    try {
      setAudioError(null)
      setIsLoading(true)
      await audio.play()
    } catch (e) {
      const msg =
        e?.name === 'NotAllowedError'
          ? 'Tap Play again — audio must start from a tap on mobile.'
          : e?.message || 'Playback failed'
      setAudioError(msg)
      setIsPlaying(false)
      setIsLoading(false)
    }
  }

  const handleBottomPlayPause = async () => {
    const audio = audioRef.current
    if (!audio) return
    if (!audio.paused) {
      audio.pause()
      return
    }
    await handleCenterPlay()
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

  return (
    <div
      className="content-scroll worship-mode-page"
      style={{
        minHeight: 'auto',
        position: 'relative',
        isolation: 'isolate',
        padding: '0 16px',
        paddingTop: '88px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'stretch',
        background: 'linear-gradient(180deg, rgba(10, 20, 50, 0.95) 0%, rgba(13, 31, 78, 0.88) 50%, rgba(10, 15, 30, 0.98) 100%)',
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

      {/* First focal: large Play — explicit audio.play() on tap */}
      <div
        style={{
          flex: '0 0 auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 0 16px',
          minHeight: 'min(32vh, 260px)',
        }}
      >
        <button
          type="button"
          onClick={handleCenterPlay}
          aria-label={isPlaying ? 'Pause worship audio' : 'Play worship audio'}
          style={{
            width: 'min(88vw, 280px)',
            height: 'min(88vw, 280px)',
            maxWidth: '280px',
            maxHeight: '280px',
            borderRadius: '50%',
            border: `4px solid ${gold}`,
            background: isPlaying
              ? 'linear-gradient(145deg, rgba(212, 168, 67, 0.35) 0%, rgba(212, 168, 67, 0.12) 100%)'
              : 'linear-gradient(145deg, rgba(212, 168, 67, 0.55) 0%, rgba(201, 160, 53, 0.35) 100%)',
            boxShadow: '0 4px 24px rgba(212, 168, 67, 0.28), inset 0 0 48px rgba(255, 255, 255, 0.05)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
          }}
        >
          <span
            aria-hidden
            style={{
              fontSize: 'min(22vw, 72px)',
              lineHeight: 1,
              color: '#0a1a3e',
              marginLeft: isPlaying ? 0 : '8px',
            }}
          >
            {isPlaying ? '⏸' : '▶'}
          </span>
        </button>
        <p style={{ marginTop: '20px', color: '#FFFFFF', fontSize: '17px', fontWeight: 600, textAlign: 'center' }}>
          {current.name}
        </p>
        {isLoading ? (
          <p style={{ marginTop: '8px', color: gold, fontSize: '14px', fontWeight: 600 }} aria-live="polite">
            Loading…
          </p>
        ) : null}
        <h1
          style={{
            marginTop: '16px',
            marginBottom: 0,
            fontSize: '18px',
            fontWeight: 600,
            color: 'rgba(255,255,255,0.75)',
            letterSpacing: '0.02em',
            textAlign: 'center',
          }}
        >
          Worship Mode
        </h1>
        <p style={{ margin: '8px 0 0', color: 'rgba(255,255,255,0.45)', fontSize: '12px', lineHeight: 1.4, textAlign: 'center', maxWidth: '320px' }}>
          Tap Play above to start — no autoplay on this page.
        </p>
      </div>

      {/* Playlist — size to content only (no flex-grow gap below last track) */}
      <section style={{ flex: '0 0 auto', width: '100%' }}>
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
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
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

      {/* Bottom transport: above app BottomNav, width matches main column (no full-bleed under nav) */}
      <div
        style={{
          position: 'fixed',
          left: '50%',
          bottom: 'calc(72px + env(safe-area-inset-bottom, 0px))',
          transform: 'translateX(-50%)',
          width: 'min(680px, calc(100% - 32px))',
          maxWidth: '100%',
          padding: '12px 16px',
          boxSizing: 'border-box',
          background: 'linear-gradient(180deg, transparent 0%, rgba(10, 15, 30, 0.96) 35%)',
          borderTop: '1px solid rgba(212, 168, 67, 0.2)',
          borderRadius: '16px 16px 0 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '28px',
          zIndex: 100,
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
            background: 'rgba(255,255,255,0.06)',
            color: gold,
            fontSize: '22px',
            cursor: 'pointer',
          }}
        >
          ⏮
        </button>
        <button
          type="button"
          onClick={handleBottomPlayPause}
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
            background: 'rgba(255,255,255,0.06)',
            color: gold,
            fontSize: '22px',
            cursor: 'pointer',
          }}
        >
          ⏭
        </button>
      </div>
    </div>
  )
}
