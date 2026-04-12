import { useEffect, useMemo, useRef, useState } from 'react'
import { WORSHIP_TRACKS } from '../data/worshipTracks'

const tracks = WORSHIP_TRACKS

export default function WorshipPlayer({ visible, onClose, autoPlayToken = 0, onStatusChange }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTrack, setCurrentTrack] = useState(0)
  const [volume, setVolume] = useState(0.5)
  const [isMinimized, setIsMinimized] = useState(true)
  const [isVisible, setIsVisible] = useState(visible)
  const audioRef = useRef(new Audio(tracks[0].file))

  const current = useMemo(() => tracks[currentTrack], [currentTrack])

  useEffect(() => {
    setIsVisible(visible)
  }, [visible])

  useEffect(() => {
    if (!onStatusChange) return
    onStatusChange({ isPlaying, currentTrack: current.name, isVisible })
  }, [isPlaying, current.name, isVisible, onStatusChange])

  useEffect(() => {
    audioRef.current.src = tracks[currentTrack].file
    if (isPlaying) audioRef.current.play().catch(() => setIsPlaying(false))
  }, [currentTrack])

  useEffect(() => {
    const audio = audioRef.current
    if (isPlaying) {
      audio.play().catch(() => setIsPlaying(false))
    } else {
      audio.pause()
    }
  }, [isPlaying])

  useEffect(() => {
    const audio = audioRef.current
    audio.volume = 0.5
    const handleEnded = () => {
      setCurrentTrack((prev) => (prev + 1) % tracks.length)
    }
    audio.addEventListener('ended', handleEnded)
    return () => {
      audio.pause()
      audio.removeEventListener('ended', handleEnded)
    }
  }, [])

  useEffect(() => {
    if (!autoPlayToken) return
    setIsVisible(true)
    setIsPlaying(true)
    audioRef.current.play().catch(() => setIsPlaying(false))
  }, [autoPlayToken])

  const togglePlay = () => {
    setIsPlaying((prev) => !prev)
  }

  const nextTrack = () => setCurrentTrack((prev) => (prev + 1) % tracks.length)
  const prevTrack = () => setCurrentTrack((prev) => (prev - 1 + tracks.length) % tracks.length)

  const closePlayer = () => {
    setIsPlaying(false)
    setIsVisible(false)
    onClose?.()
  }

  // Volume change handler - ONLY change volume, never touch src
  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    audioRef.current.volume = newVolume
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
          <article className="glass-panel" style={{
            width: '260px',
            borderRadius: '16px',
            padding: '12px',
            border: '1px solid rgba(212,168,67,0.25)',
            color: 'white'
          }}>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold">🎵 Worship Mode</p>
              <button type="button" onClick={() => setIsMinimized(true)} className="text-white/70">—</button>
            </div>
            <p className="truncate text-sm font-semibold" style={{ color: '#D4A843' }}>{current.name}</p>

            <div className="mt-3 flex items-center justify-center gap-3">
              <button type="button" onClick={prevTrack} className="text-white/70">⏮</button>
              <button type="button" onClick={togglePlay} className="rounded-full px-3 py-1 text-lg font-semibold text-[#1a1a1a]" style={{ background: '#D4A843' }}>
                {isPlaying ? '⏸' : '▶'}
              </button>
              <button type="button" onClick={nextTrack} className="text-white/70">⏭</button>
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
                  onClick={() => setCurrentTrack(index)}
                  className="block w-full truncate rounded px-2 py-1 text-left"
                  style={{ color: currentTrack === index ? '#D4A843' : 'rgba(255,255,255,0.8)', background: currentTrack === index ? 'rgba(212,168,67,0.12)' : 'transparent' }}
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
