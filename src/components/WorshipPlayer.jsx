import { useEffect, useMemo, useState } from 'react'
import { WORSHIP_TRACKS } from '../data/worshipTracks'
import {
  useWorshipPlaybackState,
  worshipLoadAndPlay,
  worshipNext,
  worshipPrev,
  worshipSetVolume,
  worshipStartPlaybackFromOverlay,
  worshipTransportToggle,
} from '../lib/worshipGlobalAudio'

const tracks = WORSHIP_TRACKS

export default function WorshipPlayer({ visible, onClose, autoPlayToken = 0 }) {
  const wp = useWorshipPlaybackState()
  const { isPlaying, currentIndex, volume } = wp
  const [isMinimized, setIsMinimized] = useState(true)
  const [isVisible, setIsVisible] = useState(visible)

  const current = useMemo(() => tracks[currentIndex], [currentIndex])

  useEffect(() => {
    setIsVisible(visible)
  }, [visible])

  useEffect(() => {
    if (!autoPlayToken) return
    setIsVisible(true)
    worshipStartPlaybackFromOverlay()
  }, [autoPlayToken])

  const togglePlay = () => {
    worshipTransportToggle()
  }

  const nextTrack = () => worshipNext()
  const prevTrack = () => worshipPrev()

  /** Hide overlay only — does not stop playback */
  const closePlayer = () => {
    setIsVisible(false)
    onClose?.()
  }

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value)
    if (Number.isFinite(newVolume)) worshipSetVolume(newVolume)
  }

  if (!isVisible) return null

  return (
    <>
      <style>
        {`
          @keyframes worship-pulse {
            0%, 100% { box-shadow: 0 0 8px #D4A843; }
            50% { box-shadow: 0 0 20px #D4A843, 0 0 40px #D4A84360; }
          }
        `}
      </style>

      <div style={{ position: 'fixed', bottom: '90px', left: '16px', zIndex: 500 }}>
        {isMinimized ? (
          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            className="glass-panel flex items-center gap-2 rounded-full px-3 py-2 text-sm text-white"
            style={{
              borderColor: isPlaying ? '#facc15' : 'rgba(255,255,255,0.2)',
              animation: isPlaying ? 'worship-pulse 1.8s ease-in-out infinite' : 'none',
            }}
          >
            <span>🎵</span>
            <span>Worship</span>
          </button>
        ) : (
          <article
            className="glass-panel"
            style={{
              width: '260px',
              borderRadius: '16px',
              padding: '12px',
              border: '1px solid rgba(212,168,67,0.25)',
              color: 'white',
            }}
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold">🎵 Worship Mode</p>
              <button type="button" onClick={() => setIsMinimized(true)} className="text-white/70">
                —
              </button>
            </div>
            <p className="truncate text-sm font-semibold" style={{ color: '#D4A843' }}>
              {current?.name}
            </p>

            <div className="mt-3 flex items-center justify-center gap-3">
              <button type="button" onClick={prevTrack} className="text-white/70">
                ⏮
              </button>
              <button
                type="button"
                onClick={togglePlay}
                className="rounded-full px-3 py-1 text-lg font-semibold text-[#1a1a1a]"
                style={{ background: '#D4A843' }}
              >
                {isPlaying ? '⏸' : '▶'}
              </button>
              <button type="button" onClick={nextTrack} className="text-white/70">
                ⏭
              </button>
            </div>

            <div className="mt-3 flex items-center gap-2 text-xs">
              <span>🔈</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={handleVolumeChange}
                className="w-full accent-yellow-400"
              />
              <span>🔊</span>
            </div>

            <div className="mt-3 max-h-28 space-y-1 overflow-y-auto pr-1 text-xs">
              {tracks.map((track, index) => (
                <button
                  key={track.file}
                  type="button"
                  onClick={() => void worshipLoadAndPlay(index)}
                  className="block w-full truncate rounded px-2 py-1 text-left"
                  style={{
                    color: currentIndex === index ? '#D4A843' : 'rgba(255,255,255,0.8)',
                    background: currentIndex === index ? 'rgba(212,168,67,0.12)' : 'transparent',
                  }}
                >
                  {track.name}
                </button>
              ))}
            </div>

            <button type="button" onClick={closePlayer} className="mt-3 w-full text-center text-xs text-white/50">
              ✕ Close Player
            </button>
          </article>
        )}
      </div>
    </>
  )
}
