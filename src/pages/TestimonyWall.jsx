import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const CONTENT_MAX = 300

const REACTIONS = [
  { key: 'amen', icon: '\uD83D\uDE4F', label: 'Amen' },
  { key: 'love', icon: '\u2764\uFE0F', label: 'Love' },
  { key: 'fire', icon: '\uD83D\uDD25', label: 'Fire' },
  { key: 'cross', icon: '\u271D\uFE0F', label: 'Cross' },
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
        maxWidth: '680px',
        margin: '0 auto',
        width: '100%',
        color: 'var(--text-primary)',
      }}
    >
      <header style={{ marginBottom: '20px' }}>
        <h1 className="text-page-title" style={{ marginBottom: '8px' }}>
          Testimony Wall
        </h1>
        <p className="text-body" style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.5 }}>
          They overcame by the word of their testimony — Revelation 12:11
        </p>
      </header>

      <section className="glass-panel" style={{ ...cardStyle, padding: '16px', marginBottom: '20px' }}>
        <label htmlFor="testimony-input" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
          Share your testimony
        </label>
        <textarea
          id="testimony-input"
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, CONTENT_MAX))}
          rows={4}
          className="glass-input-field"
          placeholder="What has God done in your life?"
          style={{
            width: '100%',
            borderRadius: '12px',
            padding: '12px',
            resize: 'vertical',
            color: 'var(--text-primary)',
            background: 'var(--input-bg, rgba(0,0,0,0.2))',
            border: '1px solid rgba(212,168,67,0.3)',
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
              background: '#D4AF37',
              color: '#1a1a1a',
              border: 'none',
              borderRadius: '12px',
              padding: '10px 20px',
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
        <h2 className="text-section-header" style={{ marginBottom: '12px' }}>
          Testimonies
        </h2>
        {loading ? (
          <p style={{ color: 'var(--text-secondary)' }}>Loading…</p>
        ) : rows.length === 0 ? (
          <article className="app-card" style={{ ...cardStyle, padding: '16px' }}>
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Be the first to share what God has done.</p>
          </article>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {rows.map((t) => {
              const isAnon = Boolean(t.is_anonymous)
              const name = isAnon ? ANONYMOUS_LABEL : displayAuthorName(t.author_profile)
              const avatarUrl = isAnon ? null : t.author_profile?.avatar_url
              const counts = countsByTestimony[t.id] || { amen: 0, love: 0, fire: 0, cross: 0 }
              const my = myReactionByTestimony[t.id]
              return (
                <article key={t.id} className="app-card" style={{ ...cardStyle, padding: '16px' }}>
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
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                borderRadius: '999px',
                                padding: '6px 10px',
                                fontSize: '13px',
                                border: active ? '2px solid #D4AF37' : '1px solid rgba(212,168,67,0.35)',
                                background: active ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.06)',
                                color: 'var(--text-primary)',
                                cursor: user?.id ? 'pointer' : 'not-allowed',
                              }}
                            >
                              <span aria-hidden>{r.icon}</span>
                              <span>{r.label}</span>
                              <span style={{ fontWeight: 700, opacity: 0.9 }}>{n}</span>
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

      <p style={{ marginTop: '24px', textAlign: 'center' }}>
        <Link to="/" style={{ color: '#D4AF37', fontWeight: 600 }}>
          ← Home
        </Link>
      </p>
    </div>
  )
}
