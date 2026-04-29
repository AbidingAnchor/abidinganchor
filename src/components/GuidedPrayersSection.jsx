import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { GUIDED_PRAYERS } from '../data/guidedPrayers'

const CATEGORY_STYLES = {
  peace: {
    gradient: 'linear-gradient(135deg, #1a3a4a, #0d2233, #1a4a3a)',
    animation: 'breathing-circle',
  },
  worship: {
    gradient: 'linear-gradient(135deg, #2a1a00, #3d2800, #1a1200)',
    animation: 'gold-glow-pulse',
  },
  praise: {
    gradient: 'linear-gradient(135deg, #2a1a00, #3d2800, #1a1200)',
    animation: 'gold-glow-pulse',
  },
  protection: {
    gradient: 'linear-gradient(135deg, #0a1628, #0d1f3c, #0a0f1e)',
    animation: 'rotating-ring',
  },
  strength: {
    gradient: 'linear-gradient(135deg, #0a1628, #0d1f3c, #0a0f1e)',
    animation: 'rotating-ring',
  },
  healing: {
    gradient: 'linear-gradient(135deg, #0a2a1a, #0d3320, #0a1f15)',
    animation: 'ripple-wave',
  },
  gratitude: {
    gradient: 'linear-gradient(135deg, #2a1800, #3d2400, #1f1000)',
    animation: 'floating-particle',
  },
  thanksgiving: {
    gradient: 'linear-gradient(135deg, #2a1800, #3d2400, #1f1000)',
    animation: 'floating-particle',
  },
  morning: {
    gradient: 'linear-gradient(135deg, #1a2a3a, #0d1a2a, #1a3a4a)',
    animation: 'breathing-circle',
  },
  evening: {
    gradient: 'linear-gradient(135deg, #0a1a2a, #0d0f1a, #0a0f1e)',
    animation: 'breathing-circle',
  },
  guidance: {
    gradient: 'linear-gradient(135deg, #1a1a3a, #0d1a2a, #1a2a4a)',
    animation: 'breathing-circle',
  },
  family: {
    gradient: 'linear-gradient(135deg, #1a2a3a, #0d1a2a, #1a3a4a)',
    animation: 'breathing-circle',
  },
}

const getDefaultStyle = () => ({
  gradient: 'linear-gradient(135deg, #1a1a2a, #0d0d1a, #1a1a3a)',
  animation: 'breathing-circle',
})

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function GuidedPrayersSection() {
  const { t } = useTranslation()
  const [modalPrayer, setModalPrayer] = useState(null)
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef(null)

  const openPlayer = useCallback((prayer) => {
    setModalPrayer(prayer)
  }, [])

  const closePlayer = useCallback(() => {
    const el = audioRef.current
    if (el) {
      el.pause()
      el.removeAttribute('src')
      el.load()
    }
    setModalPrayer(null)
    setPlaying(false)
    setLoading(false)
    setCurrentTime(0)
    setDuration(0)
  }, [])

  const goPrev = useCallback(() => {
    if (!modalPrayer || GUIDED_PRAYERS.length === 0) return
    let idx = GUIDED_PRAYERS.findIndex((p) => p.id === modalPrayer.id)
    if (idx < 0) idx = 0
    const prev = GUIDED_PRAYERS[(idx - 1 + GUIDED_PRAYERS.length) % GUIDED_PRAYERS.length]
    setModalPrayer(prev)
  }, [modalPrayer])

  const goNext = useCallback(() => {
    if (!modalPrayer || GUIDED_PRAYERS.length === 0) return
    let idx = GUIDED_PRAYERS.findIndex((p) => p.id === modalPrayer.id)
    if (idx < 0) idx = 0
    const next = GUIDED_PRAYERS[(idx + 1) % GUIDED_PRAYERS.length]
    setModalPrayer(next)
  }, [modalPrayer])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onTime = () => setCurrentTime(audio.currentTime)
    const onMeta = () => {
      const d = audio.duration
      setDuration(Number.isFinite(d) ? d : 0)
    }
    const onEnded = () => setPlaying(false)
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onWaiting = () => setLoading(true)
    const onPlaying = () => setLoading(false)
    const onCanPlay = () => setLoading(false)
    const onError = () => setLoading(false)

    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('loadedmetadata', onMeta)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('waiting', onWaiting)
    audio.addEventListener('playing', onPlaying)
    audio.addEventListener('canplay', onCanPlay)
    audio.addEventListener('error', onError)

    return () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('loadedmetadata', onMeta)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('waiting', onWaiting)
      audio.removeEventListener('playing', onPlaying)
      audio.removeEventListener('canplay', onCanPlay)
      audio.removeEventListener('error', onError)
    }
  }, [])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !modalPrayer) return

    setLoading(true)
    setCurrentTime(0)
    setDuration(0)
    audio.pause()
    audio.src = modalPrayer.url
    audio.load()

    const onReady = () => {
      setLoading(false)
      audio.play().catch(() => {
        setPlaying(false)
      })
    }
    const onErr = () => setLoading(false)

    audio.addEventListener('canplay', onReady, { once: true })
    audio.addEventListener('error', onErr, { once: true })

    return () => {
      audio.removeEventListener('canplay', onReady)
      audio.removeEventListener('error', onErr)
    }
  }, [modalPrayer])

  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current
    if (!audio || !modalPrayer) return
    if (playing) {
      audio.pause()
    } else {
      setLoading(true)
      audio.play().catch(() => setLoading(false))
    }
  }, [modalPrayer, playing])

  const seek = useCallback(
    (e) => {
      const audio = audioRef.current
      if (!audio || !Number.isFinite(duration) || duration <= 0) return
      const v = parseFloat(e.target.value)
      if (!Number.isFinite(v)) return
      audio.currentTime = v
      setCurrentTime(v)
    },
    [duration],
  )

  useEffect(() => {
    if (!modalPrayer) return
    const onKey = (e) => {
      if (e.key === 'Escape') closePlayer()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modalPrayer, closePlayer])

  return (
    <section className="mb-8" aria-labelledby="guided-prayers-heading">
      <style>{`
        @keyframes breathing-circle {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.08); opacity: 0.5; }
        }
        @keyframes gold-glow-pulse {
          0%, 100% { transform: scale(1); opacity: 0.4; box-shadow: 0 0 20px rgba(212, 168, 67, 0.3); }
          50% { transform: scale(1.05); opacity: 0.7; box-shadow: 0 0 40px rgba(212, 168, 67, 0.5); }
        }
        @keyframes rotating-ring {
          0% { transform: rotate(0deg); opacity: 0.3; }
          100% { transform: rotate(360deg); opacity: 0.3; }
        }
        @keyframes ripple-wave {
          0% { transform: scale(0.8); opacity: 0.2; }
          50% { transform: scale(1.2); opacity: 0.4; }
          100% { transform: scale(0.8); opacity: 0.2; }
        }
        @keyframes floating-particle {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.3; }
          50% { transform: translateY(-10px) scale(1.1); opacity: 0.6; }
        }
      `}</style>
      <audio ref={audioRef} preload="metadata" playsInline hidden />

      <h2
        id="guided-prayers-heading"
        className="text-center font-semibold text-lg mb-1"
        style={{ color: 'var(--section-title)' }}
      >
        {t('prayer.guided.title')}
      </h2>
      <p
        className="text-center text-sm mb-4"
        style={{ color: 'var(--guided-prayer-card-muted)' }}
      >
        {t('prayer.guided.subtitle')}
      </p>

      <div style={{
        display: 'flex',
        flexDirection: 'row',
        gap: '16px',
        overflowX: 'auto',
        paddingBottom: '12px',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        width: '100%',
      }}>
        {GUIDED_PRAYERS.map((prayer) => (
          <div
            key={prayer.id}
            style={{
              minWidth: '160px',
              width: '160px',
              height: '200px',
              borderRadius: '20px',
              background: prayer.gradient,
              border: `1px solid ${prayer.border}`,
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              flexShrink: 0,
            }}
            onClick={() => openPlayer(prayer)}
          >
            <div>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>{prayer.emoji}</div>
              <h3 style={{ color: '#ffffff', fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>{t(prayer.title)}</h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px' }}>
                {t('prayer.guided.durationMinutes', { count: prayer.duration, n: prayer.duration })}
              </p>
            </div>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #D4A843 0%, #B8860B 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0a0f28',
              fontSize: '18px',
            }}>▶</div>
          </div>
        ))}
      </div>

      {modalPrayer && typeof document !== 'undefined'
        ? createPortal(
            <>
              <div
                className="fixed inset-0 glass-scrim backdrop-blur-md z-[10060]"
                style={{
                  paddingTop: 'var(--sat)',
                  paddingBottom: 'var(--sab)',
                }}
                aria-hidden
                onClick={closePlayer}
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="guided-player-title"
                className="fixed inset-0 z-[10061] flex flex-col pointer-events-none"
                style={{
                  paddingTop: 'var(--sat)',
                  paddingBottom: 'var(--sab)',
                }}
              >
                <div className="flex-1 flex items-stretch justify-center p-4 pointer-events-auto min-h-0">
                  <div className="guided-prayer-player-panel w-full max-w-md flex flex-col p-6 shadow-2xl max-h-full min-h-0 relative overflow-hidden">
                    <div className="flex justify-end mb-2 shrink-0">
                      <button
                        type="button"
                        className="rounded-full px-3 py-1.5 text-sm font-medium guided-prayer-nav-btn"
                        onClick={closePlayer}
                        aria-label={t('prayer.guided.closePlayer')}
                      >
                        {t('common.close')}
                      </button>
                    </div>

                    <div className="text-center mb-6 shrink-0">
                      <p id="guided-player-title" className="text-xl font-bold leading-tight px-2">
                        {t(modalPrayer.title)}
                      </p>
                      <p className="text-sm mt-2">
                        {t(`prayer.guided.${modalPrayer.category}`)}
                      </p>
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-center min-h-[120px] mb-6">
                      <div className="text-center px-4 mb-6">
                        {modalPrayer.content || t(modalPrayer.title)}
                      </div>
                      <div className="relative">
                        <button
                          type="button"
                          className="guided-prayer-play-main"
                          onClick={togglePlayPause}
                          aria-label={playing ? t('prayer.guided.pause') : t('prayer.guided.play')}
                          aria-busy={loading && !playing}
                        >
                          {loading && !playing ? (
                            <span
                              className="inline-block h-8 w-8 rounded-full border-2 border-current border-t-transparent animate-spin"
                              aria-hidden
                            />
                          ) : playing ? (
                            <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                            </svg>
                          ) : (
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" aria-hidden className="ml-1">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="mb-6 shrink-0">
                      <input
                        type="range"
                        className="guided-prayer-progress"
                        min={0}
                        max={duration > 0 ? duration : 1}
                        step={0.1}
                        value={Number.isFinite(currentTime) ? Math.min(currentTime, duration || 1) : 0}
                        onChange={seek}
                        aria-valuemin={0}
                        aria-valuemax={duration}
                        aria-valuenow={currentTime}
                        aria-label={t('prayer.guided.progressAria')}
                      />
                      <div className="flex justify-between text-xs mt-2 tabular-nums">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                      </div>
                    </div>

                    <div className="flex justify-between gap-3 mt-auto shrink-0">
                      <button
                        type="button"
                        className="guided-prayer-nav-btn flex-1"
                        onClick={goPrev}
                      >
                        {t('prayer.guided.prev')}
                      </button>
                      <button
                        type="button"
                        className="guided-prayer-nav-btn flex-1"
                        onClick={goNext}
                      >
                        {t('prayer.guided.next')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>,
            document.body,
          )
        : null}
    </section>
  )
}
