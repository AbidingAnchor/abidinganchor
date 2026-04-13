import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchBibleProjectVideos } from '../lib/youtubeBibleProject'

/** Decodes HTML entities in API strings (e.g. &#39; → ', &amp; → &). */
function decodeHtmlEntities(text) {
  if (text == null || text === '') return ''
  if (typeof document === 'undefined') return String(text)
  const el = document.createElement('textarea')
  el.innerHTML = String(text)
  return el.value
}

function shortDescription(text, maxLen = 110) {
  const t = (text || '').replace(/\s+/g, ' ').trim()
  if (t.length <= maxLen) return t
  return `${t.slice(0, maxLen).trim()}…`
}

function YouTubeEmbed({ videoId, title, edgeToEdge }) {
  const src = `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?rel=0&modestbranding=1`
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        /* 16:9 from width; on narrow screens ensure at least 300px tall */
        paddingBottom: 'max(56.25%, 300px)',
        height: 0,
        overflow: 'hidden',
        borderRadius: edgeToEdge ? 0 : '14px',
        background: 'rgba(0,0,0,0.45)',
        ...(edgeToEdge
          ? {
              borderTop: '1px solid rgba(212, 168, 67, 0.28)',
              borderBottom: '1px solid rgba(212, 168, 67, 0.28)',
              borderLeft: 'none',
              borderRight: 'none',
            }
          : { border: '1px solid rgba(212,168,67,0.25)' }),
      }}
    >
      <iframe
        title={title}
        src={src}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          border: 'none',
        }}
      />
    </div>
  )
}

export default function BibleVideos() {
  const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY

  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selected, setSelected] = useState(null)

  const load = useCallback(async () => {
    if (!apiKey) {
      setLoading(false)
      setError(null)
      setVideos([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      const list = await fetchBibleProjectVideos(apiKey)
      setVideos(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load videos')
      setVideos([])
    } finally {
      setLoading(false)
    }
  }, [apiKey])

  useEffect(() => {
    load()
  }, [load])

  const decodedVideos = useMemo(
    () =>
      videos.map((v) => ({
        ...v,
        title: decodeHtmlEntities(v.title),
        description: decodeHtmlEntities(v.description),
      })),
    [videos],
  )

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return decodedVideos
    return decodedVideos.filter(
      (v) =>
        v.title.toLowerCase().includes(q) || v.description.toLowerCase().includes(q),
    )
  }, [decodedVideos, searchQuery])

  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100vh',
        overflow: 'hidden',
        background: 'transparent',
        color: 'var(--text-primary)',
      }}
    >
      <div
        className="content-scroll"
        style={{
          padding: '0 16px',
          paddingTop: '12px',
          paddingBottom: '120px',
          maxWidth: '640px',
          margin: '0 auto',
          width: '100%',
          background: 'transparent',
        }}
      >
        <div style={{ marginBottom: '16px' }}>
          <input
            id="bible-videos-search"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by keyword…"
            autoComplete="off"
            aria-label="Search Bible Project videos by keyword"
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '12px 14px',
              borderRadius: '12px',
              border: '1px solid rgba(212,168,67,0.28)',
              background: 'rgba(10,26,62,0.65)',
              color: 'var(--text-primary)',
              fontSize: '15px',
              outline: 'none',
            }}
          />
        </div>

        {!apiKey ? (
          <div
            className="glass-panel"
            style={{
              borderRadius: '14px',
              padding: '20px',
              border: '1px solid rgba(212,168,67,0.2)',
              background: 'rgba(8,20,48,0.6)',
              fontSize: '14px',
              lineHeight: 1.55,
              color: 'rgba(255,255,255,0.85)',
            }}
          >
            Add <code style={{ color: '#D4A843' }}>VITE_YOUTUBE_API_KEY</code> to your{' '}
            <code style={{ color: '#D4A843' }}>.env</code> file and restart the dev server. Use a
            browser-restricted YouTube Data API key in Google Cloud Console.
          </div>
        ) : null}

        {apiKey && loading ? (
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>
            Loading videos…
          </p>
        ) : null}

        {apiKey && error ? (
          <div
            style={{
              borderRadius: '12px',
              padding: '14px',
              background: 'rgba(180,40,40,0.2)',
              border: '1px solid rgba(255,120,120,0.35)',
              color: '#fecaca',
              fontSize: '14px',
              marginBottom: '12px',
            }}
          >
            {error}
          </div>
        ) : null}

        {apiKey && !loading && !error && filtered.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.55)', fontSize: '14px' }}>
            {decodedVideos.length === 0 ? 'No videos returned.' : 'No videos match your search.'}
          </p>
        ) : null}

        {filtered.length > 0 ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: '12px',
            }}
          >
            {filtered.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setSelected(v)}
                className="glass-panel"
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  cursor: 'pointer',
                  borderRadius: '14px',
                  padding: 0,
                  overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(8,20,48,0.55)',
                }}
              >
                <div
                  style={{
                    aspectRatio: '16 / 9',
                    width: '100%',
                    background: 'rgba(0,0,0,0.4)',
                    position: 'relative',
                  }}
                >
                  {v.thumbnailUrl ? (
                    <img
                      src={v.thumbnailUrl}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      loading="lazy"
                    />
                  ) : null}
                </div>
                <div style={{ padding: '10px 10px 12px' }}>
                  <h2
                    style={{
                      margin: '0 0 6px 0',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      lineHeight: 1.3,
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {v.title}
                  </h2>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '11px',
                      color: 'rgba(255,255,255,0.55)',
                      lineHeight: 1.4,
                      display: '-webkit-box',
                      WebkitLineClamp: 4,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {shortDescription(v.description)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {selected ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="bible-video-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10050,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding:
              'max(12px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left))',
            background: 'rgba(2, 6, 18, 0.72)',
          }}
          onClick={() => setSelected(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              boxSizing: 'border-box',
              width: 'min(90vw, 560px)',
              maxWidth: '100%',
              maxHeight: 'min(92vh, calc(100vh - 24px))',
              overflow: 'auto',
              borderRadius: '26px',
              padding: '14px 0 18px',
              border: '1px solid var(--gold-border, rgba(212, 168, 67, 0.42))',
              background:
                'radial-gradient(ellipse 110% 90% at 50% -15%, rgba(212, 168, 67, 0.12) 0%, transparent 52%), radial-gradient(ellipse 80% 55% at 100% 100%, rgba(30, 58, 120, 0.35) 0%, transparent 55%), linear-gradient(168deg, #030712 0%, #0a1228 28%, #0f1c3d 55%, #070f22 100%)',
              boxShadow:
                '0 0 0 1px rgba(212, 168, 67, 0.08), 0 0 48px var(--gold-glow, rgba(212, 168, 67, 0.18)), 0 28px 72px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '12px',
                marginBottom: '12px',
                padding: '0 16px',
              }}
            >
              <h3
                id="bible-video-modal-title"
                style={{
                  margin: 0,
                  fontSize: '16px',
                  fontWeight: 700,
                  color: 'var(--gold, #D4A843)',
                  lineHeight: 1.35,
                  letterSpacing: '0.01em',
                  textShadow: '0 1px 2px rgba(0,0,0,0.45), 0 0 24px var(--gold-glow, rgba(212, 168, 67, 0.2))',
                }}
              >
                {selected.title}
              </h3>
              <button
                type="button"
                onClick={() => setSelected(null)}
                style={{
                  flexShrink: 0,
                  width: '40px',
                  height: '40px',
                  borderRadius: '14px',
                  border: '1px solid var(--gold-border, rgba(212, 168, 67, 0.45))',
                  background:
                    'linear-gradient(165deg, rgba(212, 168, 67, 0.18) 0%, rgba(8, 14, 32, 0.92) 45%, rgba(4, 8, 20, 0.98) 100%)',
                  color: 'var(--gold, #D4A843)',
                  cursor: 'pointer',
                  fontSize: '22px',
                  fontWeight: 300,
                  lineHeight: 1,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08)',
                }}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <YouTubeEmbed videoId={selected.id} title={selected.title} edgeToEdge />
            <p
              style={{
                margin: '12px 0 0 0',
                padding: '0 16px',
                fontSize: '13px',
                color: 'rgba(255,255,255,0.65)',
                lineHeight: 1.5,
              }}
            >
              {shortDescription(selected.description, 400)}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
