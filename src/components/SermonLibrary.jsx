import { useState, useEffect, useCallback, useRef } from 'react'
import {
  searchSermons,
  getSermonsByTopic,
  getSermonsByBook,
  getFeaturedSermons,
} from '../services/sermonAudioApi'

export default function SermonLibrary() {
  const [activeTab, setActiveTab] = useState('featured')
  const [searchQuery, setSearchQuery] = useState('')
  const [sermons, setSermons] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedSermon, setSelectedSermon] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [topicInput, setTopicInput] = useState('')
  const [bookInput, setBookInput] = useState('')
  const [page, setPage] = useState(1)

  const audioRef = useRef(null)

  const loadSermons = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      let data
      switch (activeTab) {
        case 'featured':
          data = await getFeaturedSermons(page)
          break
        case 'topic':
          if (topicInput) {
            data = await getSermonsByTopic(topicInput, page)
          } else {
            data = []
          }
          break
        case 'book':
          if (bookInput) {
            data = await getSermonsByBook(bookInput, page)
          } else {
            data = []
          }
          break
        default:
          data = []
      }
      setSermons(data)
    } catch (err) {
      setError('Failed to load sermons. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [activeTab, page, topicInput, bookInput])

  useEffect(() => {
    loadSermons()
  }, [activeTab, page, loadSermons])

  useEffect(() => {
    const audio = audioRef.current
    if (audio) {
      const handleTimeUpdate = () => setCurrentTime(audio.currentTime)
      const handleLoadedMetadata = () => setDuration(audio.duration)
      const handleEnded = () => {
        setIsPlaying(false)
        setCurrentTime(0)
      }
      audio.addEventListener('timeupdate', handleTimeUpdate)
      audio.addEventListener('loadedmetadata', handleLoadedMetadata)
      audio.addEventListener('ended', handleEnded)
      return () => {
        audio.removeEventListener('timeupdate', handleTimeUpdate)
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
        audio.removeEventListener('ended', handleEnded)
      }
    }
  }, [selectedSermon])


  const handleSearch = async (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    setLoading(true)
    setError(null)
    try {
      const data = await searchSermons(searchQuery, 1)
      setSermons(data)
      setActiveTab('search')
    } catch (err) {
      setError('Search failed. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSermonClick = (sermon) => {
    setSelectedSermon(sermon)
    setIsPlaying(false)
    setCurrentTime(0)
  }

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleSeek = (e) => {
    const time = parseFloat(e.target.value)
    if (audioRef.current) {
      audioRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatDuration = (durationStr) => {
    if (!durationStr) return 'Unknown'
    return durationStr
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  return (
    <div className="min-h-screen p-4 pb-32" style={{ background: 'var(--app-bg)' }}>
      <style>
        {`
          @keyframes sermon-pulse {
            0%, 100% { box-shadow: 0 0 8px var(--accent-gold); }
            50% { box-shadow: 0 0 20px var(--accent-gold), 0 0 40px var(--accent-gold60); }
          }
        `}
      </style>

      <h1 className="mb-4 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Sermon Library</h1>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="mb-4">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search sermons by keyword..."
            className="w-full rounded-xl border px-4 py-3 backdrop-blur-sm focus:outline-none"
            style={{
              borderColor: 'var(--card-border)',
              background: 'var(--card-bg)',
              color: 'var(--text-primary)',
            }}
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-4 py-1.5 text-sm font-semibold"
            style={{
              background: 'var(--accent-gold)',
              color: 'var(--text-primary)',
            }}
          >
            Search
          </button>
        </div>
      </form>

      {/* Category Tabs */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
        {['Featured', 'By Topic', 'By Bible Book'].map((tab) => {
          const tabKey = tab.toLowerCase().replace(' ', '')
          return (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tabKey)
                setPage(1)
                setSermons([])
              }}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                activeTab === tabKey
                  ? ''
                  : ''
              }`}
              style={{
                background: activeTab === tabKey ? 'var(--accent-gold)' : 'var(--card-bg)',
                color: activeTab === tabKey ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}
            >
              {tab}
            </button>
          )
        })}
      </div>

      {/* Topic Input */}
      {activeTab === 'topic' && (
        <div className="mb-4">
          <input
            type="text"
            value={topicInput}
            onChange={(e) => setTopicInput(e.target.value)}
            placeholder="Enter topic (e.g., Grace, Faith, Love)"
            className="w-full rounded-xl border px-4 py-3 backdrop-blur-sm focus:outline-none"
            style={{
              borderColor: 'var(--card-border)',
              background: 'var(--card-bg)',
              color: 'var(--text-primary)',
            }}
          />
          <button
            onClick={loadSermons}
            className="mt-2 w-full rounded-xl px-4 py-2 font-semibold"
            style={{
              background: 'var(--accent-gold)',
              color: 'var(--text-primary)',
            }}
          >
            Load Sermons
          </button>
        </div>
      )}

      {/* Book Input */}
      {activeTab === 'book' && (
        <div className="mb-4">
          <input
            type="text"
            value={bookInput}
            onChange={(e) => setBookInput(e.target.value)}
            placeholder="Enter Bible book (e.g., John, Genesis, Romans)"
            className="w-full rounded-xl border px-4 py-3 backdrop-blur-sm focus:outline-none"
            style={{
              borderColor: 'var(--card-border)',
              background: 'var(--card-bg)',
              color: 'var(--text-primary)',
            }}
          />
          <button
            onClick={loadSermons}
            className="mt-2 w-full rounded-xl px-4 py-2 font-semibold"
            style={{
              background: 'var(--accent-gold)',
              color: 'var(--text-primary)',
            }}
          >
            Load Sermons
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" style={{ borderColor: 'var(--accent-gold)', borderTopColor: 'transparent' }}></div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="rounded-xl border p-4 text-center" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
          <p style={{ color: 'var(--text-primary)' }}>{error}</p>
          <button
            onClick={loadSermons}
            className="mt-2 rounded-lg px-4 py-2 text-sm"
            style={{
              background: 'var(--accent-gold)',
              color: 'var(--text-primary)',
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Sermon Cards */}
      {!loading && !error && sermons.length > 0 && (
        <div className="space-y-3">
          {sermons.map((sermon) => (
            <article
              key={sermon.id}
              onClick={() => handleSermonClick(sermon)}
              className="cursor-pointer rounded-xl border p-4 backdrop-blur-sm transition-all"
              style={{
                borderColor: 'var(--card-border)',
                background: 'var(--card-bg)',
              }}
            >
              <div className="mb-3 flex gap-3">
                {sermon.thumbnailUrl && (
                  <img
                    src={sermon.thumbnailUrl}
                    alt={sermon.title}
                    className="h-24 w-32 rounded-lg object-cover"
                  />
                )}
                <div className="flex-1">
                  <h3 className="mb-2 text-lg font-semibold line-clamp-2" style={{ color: 'var(--text-primary)' }}>{sermon.title}</h3>
                  <p className="mb-1 text-sm" style={{ color: 'var(--accent-gold)' }}>{sermon.speaker}</p>
                  <p className="mb-1 text-xs" style={{ color: 'var(--text-secondary)' }}>{sermon.church}</p>
                  <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {sermon.date && <span>{formatDate(sermon.date)}</span>}
                    {sermon.duration && <span>• {formatDuration(sermon.duration)}</span>}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {!loading && !error && sermons.length === 0 && (
        <div className="py-12 text-center" style={{ color: 'var(--text-secondary)' }}>
          <p>No sermons found. Try a different search or category.</p>
        </div>
      )}

      {/* Audio Player Modal */}
      {selectedSermon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.9)' }}>
          <div className="relative w-full max-w-4xl">
            <button
              onClick={() => {
                setSelectedSermon(null)
                setIsPlaying(false)
                if (audioRef.current) {
                  audioRef.current.pause()
                }
              }}
              className="absolute -top-12 right-0 text-2xl"
              style={{ color: 'var(--text-primary)' }}
            >
              ✕
            </button>
            <div className="rounded-xl p-6" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
              <audio
                ref={audioRef}
                src={selectedSermon.audioUrl}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
              <div className="mb-4">
                <h3 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>{selectedSermon.title}</h3>
                <p style={{ color: 'var(--accent-gold)' }}>{selectedSermon.speaker}</p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{selectedSermon.church}</p>
                <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {selectedSermon.date && <span>{formatDate(selectedSermon.date)}</span>}
                  {selectedSermon.duration && <span>• {formatDuration(selectedSermon.duration)}</span>}
                </div>
              </div>
              <div className="mb-4">
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full accent-[#D4A843]"
                />
                <div className="mt-1 flex justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => {
                    if (audioRef.current) {
                      audioRef.current.currentTime = Math.max(0, currentTime - 30)
                    }
                  }}
                  className="rounded-full p-2" style={{ color: 'var(--text-secondary)' }}
                >
                  ⏪
                </button>
                <button
                  onClick={togglePlayPause}
                  className="flex h-12 w-12 items-center justify-center rounded-full text-xl font-bold"
                  style={{
                    background: 'var(--accent-gold)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {isPlaying ? '⏸' : '▶'}
                </button>
                <button
                  onClick={() => {
                    if (audioRef.current) {
                      audioRef.current.currentTime = Math.min(duration, currentTime + 30)
                    }
                  }}
                  className="rounded-full p-2" style={{ color: 'var(--text-secondary)' }}
                >
                  ⏩
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
