import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const CONTENT_MAX = 300

const REACTIONS = [
  { key: 'amen', icon: '🙏', label: 'Amen' },
  { key: 'love', icon: '❤️', label: 'Love' },
  { key: 'fire', icon: '🔥', label: 'Fire' },
  { key: 'cross', icon: '✝️', label: 'Cross' },
]

function timeAgo(iso) {
  if (!iso) return ''
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (sec < 45) return 'just now'
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`
  if (sec < 604800) return `${Math.floor(sec / 86400)}d ago`
  return new Date(iso).toLocaleDateString()
}

function displayAuthorName(p) {
  if (!p) return 'Friend'
  return (p.full_name && String(p.full_name).trim()) || p.username || 'Friend'
}

const ANONYMOUS_LABEL = 'Anonymous Believer'

export default function TestimonyWall() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [content, setContent] = useState('')
  const [postAnonymous, setPostAnonymous] = useState(false)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState('')
  const [reactionBusy, setReactionBusy] = useState(null)
  const [menuOpen, setMenuOpen] = useState(null)
  const [toast, setToast] = useState(null)

  /** testimonyId -> { amen: n, love: n, ... } */
  const [countsByTestimony, setCountsByTestimony] = useState({})
  /** testimonyId -> emoji key or undefined */
  const [myReactionByTestimony, setMyReactionByTestimony] = useState({})

  const trimmed = content.trim()

  const loadFeed = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    setError('')
    try {
      const { data: testimonies, error: e1 } = await supabase
        .from('testimonies')
        .select('id, user_id, content, is_anonymous, created_at')
        .order('created_at', { ascending: false })
        .limit(100)
      if (e1) throw e1
      const list = testimonies || []
      const authorIds = [
        ...new Set(list.filter((t) => !t.is_anonymous).map((t) => t.user_id).filter(Boolean)),
      ]
      let profilesById = {}
      if (authorIds.length > 0) {
        const { data: profs, error: e2 } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .in('id', authorIds)
        if (e2) throw e2
        profilesById = (profs || []).reduce((acc, row) => {
          acc[row.id] = row
          return acc
        }, {})
      }
      setRows(
        list.map((t) => ({
          ...t,
          author_profile: profilesById[t.user_id] || null,
        })),
      )

      const ids = list.map((t) => t.id)
      if (ids.length === 0) {
        setCountsByTestimony({})
        setMyReactionByTestimony({})
        return
      }
      const { data: rx, error: e3 } = await supabase
        .from('testimony_reactions')
        .select('testimony_id, emoji, user_id')
        .in('testimony_id', ids)
      if (e3) throw e3

      const counts = {}
      const mine = {}
      for (const id of ids) {
        counts[id] = { amen: 0, love: 0, fire: 0, cross: 0 }
      }
      for (const r of rx || []) {
        if (!counts[r.testimony_id]) counts[r.testimony_id] = { amen: 0, love: 0, fire: 0, cross: 0 }
        if (counts[r.testimony_id][r.emoji] != null) {
          counts[r.testimony_id][r.emoji] += 1
        }
        if (r.user_id === user.id) {
          mine[r.testimony_id] = r.emoji
        }
      }
      setCountsByTestimony(counts)
      setMyReactionByTestimony(mine)
    } catch (err) {
      console.error('TestimonyWall load:', err)
      setError('Could not load testimonies. Try again later.')
      setRows([])
      setCountsByTestimony({})
      setMyReactionByTestimony({})
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    void loadFeed()
  }, [loadFeed])

  const handlePost = async () => {
    if (!user?.id || posting || !trimmed) return
    setPosting(true)
    setError('')
    try {
      const { error: e } = await supabase.from('testimonies').insert({
        user_id: user.id,
        content: trimmed.slice(0, CONTENT_MAX),
        is_anonymous: postAnonymous,
      })
      if (e) throw e
      setContent('')
      setPostAnonymous(false)
      await loadFeed()
    } catch (err) {
      console.error('TestimonyWall post:', err)
      setError('Could not post your testimony. Please try again.')
    } finally {
      setPosting(false)
    }
  }

  const handleDeleteTestimony = async (testimonyId) => {
    if (!user?.id) return
    if (!confirm('Are you sure you want to delete this testimony?')) return
    
    try {
      // Delete reactions first
      await supabase
        .from('testimony_reactions')
        .delete()
        .eq('testimony_id', testimonyId)
      
      // Delete testimony
      const { error: deleteError } = await supabase
        .from('testimonies')
        .delete()
        .eq('id', testimonyId)
      
      if (deleteError) throw deleteError
      
      // Remove from UI
      setRows(prev => prev.filter(t => t.id !== testimonyId))
      setMenuOpen(null)
      
      // Show toast
      setToast('Testimony removed')
      setTimeout(() => setToast(null), 3000)
    } catch (err) {
      console.error('Error deleting testimony:', err)
      setError('Could not delete testimony. Please try again.')
    }
  }

  const toggleReaction = async (testimonyId, emojiKey) => {
    if (!user?.id || reactionBusy) return
    const current = myReactionByTestimony[testimonyId]
    setReactionBusy(testimonyId)
    try {
      if (current === emojiKey) {
        const { error: dErr } = await supabase
          .from('testimony_reactions')
          .delete()
          .eq('testimony_id', testimonyId)
          .eq('user_id', user.id)
        if (dErr) throw dErr
      } else if (current) {
        const { error: uErr } = await supabase
          .from('testimony_reactions')
          .update({ emoji: emojiKey })
          .eq('testimony_id', testimonyId)
          .eq('user_id', user.id)
        if (uErr) throw uErr
      } else {
        const { error: iErr } = await supabase.from('testimony_reactions').insert({
          user_id: user.id,
          testimony_id: testimonyId,
          emoji: emojiKey,
        })
        if (iErr) throw iErr
      }
      await loadFeed()
    } catch (err) {
      console.error('TestimonyWall reaction:', err)
      setError('Could not update reaction.')
    } finally {
      setReactionBusy(null)
    }
  }

  const cardStyle = useMemo(
    () => ({
      background: 'var(--card-bg, rgba(255,255,255,0.08))',
      border: '1px solid var(--glass-border, rgba(212,168,67,0.25))',
      borderRadius: '16px',
    }),
    [],
  )

  return (
    <div
      className="content-scroll content-scroll--nav-clear"
      style={{
        padding: '16px',
        paddingBottom: '80px',
        maxWidth: '680px',
        margin: '0 auto',
        width: '100%',
        color: 'var(--text-primary)',
      }}
    >
      <header style={{ marginBottom: '20px' }}>
        <h1 style={{
          color: '#ffffff',
          fontSize: '32px',
          fontWeight: 800,
          marginBottom: '8px',
          margin: '0 0 8px 0',
        }}>
          TESTIMONY WALL
        </h1>
        <p style={{
          color: 'rgba(255, 255, 255, 0.5)',
          fontSize: '14px',
          fontStyle: 'italic',
          margin: 0,
        }}>
          They overcame by the word of their testimony — Revelation 12:11
        </p>
      </header>

      <section style={{
        background: 'rgba(255, 255, 255, 0.06)',
        border: '1px solid rgba(212, 168, 67, 0.2)',
        borderRadius: '16px',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        padding: '16px',
        marginBottom: '20px',
      }}>
        <label htmlFor="testimony-input" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
          Share your testimony
        </label>
        <textarea
          id="testimony-input"
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, CONTENT_MAX))}
          rows={4}
          placeholder="What has God done in your life?"
          style={{
            width: '100%',
            borderRadius: '12px',
            padding: '14px',
            resize: 'vertical',
            color: '#ffffff',
            fontSize: '15px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            outline: 'none',
            boxSizing: 'border-box',
            fontFamily: 'inherit',
          }}
        />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            marginTop: '12px',
            flexWrap: 'wrap',
          }}
        >
          <label
            htmlFor="testimony-anonymous"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              fontSize: '13px',
              color: 'var(--text-primary)',
              userSelect: 'none',
            }}
          >
            <button
              id="testimony-anonymous"
              type="button"
              role="switch"
              aria-checked={postAnonymous}
              onClick={() => setPostAnonymous((v) => !v)}
              style={{
                width: '44px',
                height: '26px',
                borderRadius: '999px',
                border: '1px solid rgba(212,168,67,0.45)',
                background: postAnonymous ? 'rgba(212,175,55,0.45)' : 'rgba(255,255,255,0.08)',
                padding: '3px',
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'background 0.15s ease',
              }}
            >
              <span
                style={{
                  display: 'block',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: postAnonymous ? '#D4AF37' : 'var(--text-secondary)',
                  marginLeft: postAnonymous ? '18px' : '0',
                  transition: 'margin-left 0.15s ease, background 0.15s ease',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                }}
              />
            </button>
            <span>Post Anonymously</span>
          </label>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {trimmed.length}/{CONTENT_MAX}
          </span>
          <button
            type="button"
            onClick={handlePost}
            disabled={posting || !trimmed}
            style={{
              background: '#D4A843',
              color: '#0a1428',
              border: 'none',
              borderRadius: '50px',
              padding: '10px 24px',
              fontWeight: 700,
              cursor: posting || !trimmed ? 'not-allowed' : 'pointer',
              opacity: posting || !trimmed ? 0.65 : 1,
            }}
          >
            {posting ? 'Posting…' : 'Post'}
          </button>
        </div>
      </section>

      {error ? (
        <p style={{ color: 'rgba(255,160,160,0.95)', fontSize: '14px', marginBottom: '16px' }}>{error}</p>
      ) : null}

      <section>
        <h2 style={{
          fontSize: '11px',
          letterSpacing: '1.5px',
          color: 'rgba(212, 168, 67, 0.7)',
          textTransform: 'uppercase',
          marginBottom: '12px',
          margin: '0 0 12px 0',
          fontWeight: 600,
        }}>
          Testimonies
        </h2>
        {loading ? (
          <p style={{ color: 'var(--text-secondary)' }}>Loading…</p>
        ) : rows.length === 0 ? (
          <article style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(212, 168, 67, 0.15)',
            borderRadius: '16px',
            padding: '32px 20px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🕊️</div>
            <p style={{
              margin: 0,
              color: 'rgba(255, 255, 255, 0.5)',
              fontSize: '15px',
            }}>Be the first to share what God has done.</p>
          </article>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {rows.map((t) => {
              const isAnon = Boolean(t.is_anonymous)
              const name = isAnon ? ANONYMOUS_LABEL : displayAuthorName(t.author_profile)
              const avatarUrl = isAnon ? null : t.author_profile?.avatar_url
              const counts = countsByTestimony[t.id] || { amen: 0, love: 0, fire: 0, cross: 0 }
              const my = myReactionByTestimony[t.id]
              const isOwnPost = t.user_id === user?.id
              return (
                <article key={t.id} className="app-card" style={{ ...cardStyle, padding: '16px', position: 'relative' }}>
                  {isOwnPost && (
                    <button
                      type="button"
                      onClick={() => setMenuOpen(menuOpen === t.id ? null : t.id)}
                      style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        background: 'transparent',
                        color: 'rgba(255,255,255,0.4)',
                        fontSize: '20px',
                        cursor: 'pointer',
                        padding: '4px 8px',
                        borderRadius: '8px',
                        border: 'none',
                      }}
                    >
                      ⋯
                    </button>
                  )}
                  {menuOpen === t.id && (
                    <div style={{
                      position: 'absolute',
                      top: '36px',
                      right: '12px',
                      background: 'rgba(10,20,50,0.98)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      padding: '8px 0',
                      zIndex: 100,
                      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                    }}>
                      <button
                        type="button"
                        onClick={() => handleDeleteTestimony(t.id)}
                        style={{
                          padding: '10px 16px',
                          color: '#ff6b6b',
                          fontSize: '14px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          background: 'transparent',
                          border: 'none',
                          width: '100%',
                        }}
                      >
                        🗑️ Delete Testimony
                      </button>
                    </div>
                  )}
                  <div className="flex items-start gap-3" style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <span
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '50%',
                          background: 'rgba(212,175,55,0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          color: '#D4AF37',
                          flexShrink: 0,
                          fontSize: isAnon ? '18px' : undefined,
                        }}
                        aria-hidden={isAnon}
                      >
                        {isAnon ? '\u271D\uFE0F' : (name[0] || 'A').toUpperCase()}
                      </span>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {isAnon ? (
                        <p
                          style={{
                            margin: 0,
                            fontWeight: 700,
                            fontSize: '15px',
                            color: 'var(--text-primary)',
                          }}
                        >
                          {name}
                        </p>
                      ) : (
                        <button
                          type="button"
                          onClick={() => t.user_id && navigate(`/profile/${t.user_id}`)}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            cursor: t.user_id ? 'pointer' : 'default',
                            fontWeight: 700,
                            fontSize: '15px',
                            color: 'var(--text-primary)',
                            textAlign: 'left',
                          }}
                        >
                          {name}
                        </button>
                      )}
                      <p style={{ margin: '6px 0 0', fontSize: '14px', lineHeight: 1.55, color: 'var(--text-primary)' }}>{t.content}</p>
                      <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>{timeAgo(t.created_at)}</p>
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '8px',
                          marginTop: '12px',
                          alignItems: 'center',
                        }}
                      >
                        {REACTIONS.map((r) => {
                          const active = my === r.key
                          const n = counts[r.key] ?? 0
                          return (
                            <button
                              key={r.key}
                              type="button"
                              disabled={!user?.id || reactionBusy === t.id}
                              onClick={() => toggleReaction(t.id, r.key)}
                              title={r.label}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                borderRadius: '50px',
                                padding: '4px 10px',
                                fontSize: '16px',
                                border: active ? '1px solid rgba(212,168,67,0.3)' : '1px solid rgba(255,255,255,0.1)',
                                background: active ? 'rgba(212,168,67,0.15)' : 'rgba(255,255,255,0.06)',
                                color: active ? '#D4A843' : 'var(--text-primary)',
                                cursor: user?.id ? 'pointer' : 'not-allowed',
                              }}
                            >
                              <span aria-hidden>{r.icon}</span>
                              {n > 0 && (
                                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>{n}</span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '100px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(212, 168, 67, 0.95)',
          color: '#0a1428',
          padding: '12px 24px',
          borderRadius: '50px',
          fontSize: '14px',
          fontWeight: 600,
          zIndex: 1000,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}>
          {toast}
        </div>
      )}

    </div>
  )
}
