import { useMemo, useState } from 'react'

const playlists = [
  { name: 'Peaceful Worship', videoId: 'sR4AT0LMJ5c' },
  { name: 'Soaking Worship', videoId: 'DXDGE_lRI0E' },
  { name: 'Hymns', videoId: 'U8jM6hNf6fA' },
  { name: 'Nature & Worship', videoId: 'odADwWzHR24' },
]

export default function WorshipPlayer({ isPlaying, setIsPlaying, currentPlaylist, setCurrentPlaylist, volume, setVolume, open, setOpen }) {
  const [minimized, setMinimized] = useState(false)
  const current = playlists[currentPlaylist]

  const src = useMemo(() => {
    const auto = isPlaying ? 1 : 0
    return `https://www.youtube-nocookie.com/embed/${current.videoId}?autoplay=${auto}&loop=1&playlist=${current.videoId}&controls=0&modestbranding=1&rel=0&iv_load_policy=3&enablejsapi=1`
  }, [current.videoId, isPlaying])

  if (!open) return null

  return (
    <>
      <iframe title="Worship Audio" src={src} style={{ position: 'absolute', width: 0, height: 0, border: 0 }} allow="autoplay; encrypted-media" />
      <div style={{ position: 'fixed', left: '12px', bottom: '90px', zIndex: 8800 }}>
        {minimized ? (
          <button
            type="button"
            onClick={() => setMinimized(false)}
            className="h-12 w-12 rounded-full text-xl"
            style={{ background: '#D4A843', color: '#1a1a1a', boxShadow: isPlaying ? '0 0 18px rgba(212,168,67,0.7)' : 'none' }}
          >
            🎵
          </button>
        ) : (
          <article className="rounded-full border border-white/20 bg-white/10 px-3 py-2 backdrop-blur-md">
            <div className="flex items-center gap-2 text-xs text-white">
              <span>🎵</span>
              <span className="font-semibold">{current.name}</span>
              <button type="button" onClick={() => setIsPlaying((p) => !p)} className="rounded-full border border-[#D4A843] px-2 py-0.5 text-[10px]" style={{ color: '#D4A843' }}>
                {isPlaying ? 'Pause' : 'Play'}
              </button>
              <button type="button" onClick={() => setCurrentPlaylist((i) => (i + 1) % playlists.length)} className="rounded-full border border-white/30 px-2 py-0.5 text-[10px] text-white">
                Next
              </button>
              <input type="range" min="0" max="100" value={volume} onChange={(e) => setVolume(Number(e.target.value))} />
              <button type="button" onClick={() => setMinimized(true)} className="text-white/70">—</button>
              <button type="button" onClick={() => setOpen(false)} className="text-white/70">✕</button>
            </div>
          </article>
        )}
      </div>
    </>
  )
}
