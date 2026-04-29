import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { SHIMMER_KEYFRAMES } from '../hooks/useNameStyle'
import { supabase } from '../lib/supabase'
import { getAvatarBorderStyle, SUPPORTER_BORDER_KEYFRAMES } from '../utils/supporterBorder'

const CONTENT_MAX = 300
const TESTIMONY_CATEGORIES = ['Healing', 'Salvation', 'Answered Prayer', 'Provision', 'Protection', 'All']

const timeAgo = (dateString) => {
  const now = new Date()
  const date = new Date(dateString)
  const seconds = Math.floor((now - date) / 1000)
  
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return `${Math.floor(seconds / 604800)}w ago`
}

function displayAuthorName(p, t) {
  if (!p) return t('testimony.friend')
  return (p.full_name && String(p.full_name).trim()) || p.username || t('testimony.friend')
}

function categorizeTestimony(content = '') {
  const text = String(content).toLowerCase()
  if (text.includes('heal') || text.includes('healing') || text.includes('restor')) return 'Healing'
  if (text.includes('salvation') || text.includes('saved') || text.includes('jesus')) return 'Salvation'
  if (text.includes('answered') || text.includes('prayer')) return 'Answered Prayer'
  if (text.includes('provide') || text.includes('provision') || text.includes('job') || text.includes('financ')) return 'Provision'
  if (text.includes('protect') || text.includes('safe') || text.includes('safety') || text.includes('cover')) return 'Protection'
  return 'All'
}

export default function TestimonyWall() {
  const { t } = useTranslation()
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
  const [activeCategory, setActiveCategory] = useState('All')

  /** testimonyId -> { amen: n, love: n, ... } */
  const [countsByTestimony, setCountsByTestimony] = useState({})
  /** testimonyId -> emoji key or undefined */
  const [myReactionByTestimony, setMyReactionByTestimony] = useState({})

  const reactions = useMemo(
    () => [
      { key: 'amen', icon: '🙏', label: t('testimony.reactionAmen') },
      { key: 'love', icon: '❤️', label: t('testimony.reactionLove') },
      { key: 'fire', icon: '🔥', label: t('testimony.reactionFire') },
      { key: 'cross', icon: '✝️', label: t('testimony.reactionCross') },
    ],
    [t],
  )

  const trimmed = content.trim()
  const filteredRows = useMemo(() => {
    if (activeCategory === 'All') return rows
    return rows.filter((r) => categorizeTestimony(r.content) === activeCategory)
  }, [rows, activeCategory])

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
          .select('id, username, full_name, avatar_url, supporter_tier, profile_border, name_color')
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
      setError(t('testimony.loadError'))
      setRows([])
      setCountsByTestimony({})
      setMyReactionByTestimony({})
    } finally {
      setLoading(false)
    }
  }, [t, user?.id])

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
      setError(t('testimony.postError'))
    } finally {
      setPosting(false)
    }
  }

  const handleDeleteTestimony = async (testimonyId) => {
    if (!user?.id) return
    if (!confirm(t('testimony.deleteConfirm'))) return
    
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
      setToast(t('testimony.deleteSuccess'))
      setTimeout(() => setToast(null), 3000)
    } catch (err) {
      console.error('Error deleting testimony:', err)
      setError(t('testimony.deleteError'))
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
      setError(t('testimony.reactionError'))
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
      className="content-scroll content-scroll--nav-clear testimony-wall-shell"
      style={{
        padding: '16px',
        paddingBottom: '80px',
        maxWidth: '680px',
        margin: '0 auto',
        width: '100%',
        color: 'var(--text-primary)',
        border: '1.5px solid rgba(212,168,67,0.35)',
        borderRadius: '20px',
        background: 'rgba(240,232,212,0.5)',
      }}
    >
      <header style={{ marginBottom: '20px' }}>
        <p style={{ margin: '0 0 8px 0', textAlign: 'center', fontSize: '28px' }}>
          <span style={{ filter: 'sepia(1) saturate(3) hue-rotate(5deg)' }}>⚓</span>
        </p>
        <h1 style={{
          color: '#1A1A1A',
          fontSize: '28px',
          fontWeight: 700,
          marginBottom: '8px',
          margin: '0 0 8px 0',
          textAlign: 'center',
        }}>
          Testimony Wall
        </h1>
        <p style={{
          color: '#8B6200',
          fontSize: '14px',
          fontStyle: 'italic',
          margin: '0 0 4px 0',
          textAlign: 'center',
        }}>
          Let the redeemed of the Lord say so.
        </p>
        <p style={{
          color: '#D4A843',
          fontSize: '14px',
          margin: 0,
          textAlign: 'center',
        }}>
          — Psalm 107:2
        </p>
      </header>

      <section className="testimony-input-section" style={{
        background: '#F0E8D4',
        border: '1.5px solid rgba(212,168,67,0.35)',
        borderRadius: '20px',
        padding: '20px',
        marginBottom: '20px',
      }}>
        <label htmlFor="testimony-input" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
          {t('testimony.shareYourTestimony')}
        </label>
        <textarea
          className="testimony-textarea-day"
          id="testimony-input"
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, CONTENT_MAX))}
          rows={4}
          placeholder={t('testimony.placeholder')}
          style={{
            width: '100%',
            borderRadius: '12px',
            padding: '14px',
            resize: 'vertical',
            color: '#1A1A1A',
            fontSize: '15px',
            background: '#FFFFFF',
            border: '1px solid rgba(212,168,67,0.3)',
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
              color: '#1A1A1A',
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
            <span>{t('testimony.postAnonymously')}</span>
          </label>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
          <span style={{ fontSize: '12px', color: '#6B6B6B' }}>
            {trimmed.length}/{CONTENT_MAX}
          </span>
          <button
            type="button"
            onClick={handlePost}
            disabled={posting || !trimmed}
            style={{
              background: '#D4A843',
              color: '#1A1A1A',
              border: 'none',
              borderRadius: '50px',
              padding: '10px 24px',
              fontWeight: 700,
              cursor: posting || !trimmed ? 'not-allowed' : 'pointer',
              opacity: posting || !trimmed ? 0.65 : 1,
            }}
          >
            {posting ? t('testimony.posting') : t('testimony.post')}
          </button>
        </div>
      </section>
      <style>{`
        .testimony-textarea-day::placeholder {
          color: rgba(0,0,0,0.35);
        }
      `}</style>

      {error ? (
        <p style={{ color: 'rgba(255,160,160,0.95)', fontSize: '14px', marginBottom: '16px' }}>{error}</p>
      ) : null}

      <section>
        <h2
          className="testimony-section-h2"
          style={{
          fontSize: '12px',
          letterSpacing: '0.12em',
          color: '#1A1A1A',
          textTransform: 'uppercase',
          marginBottom: '12px',
          margin: '0 0 12px 0',
          fontWeight: 700,
        }}
        >
          {t('testimony.testimonies')}
        </h2>
        <div
          style={{
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            paddingBottom: '8px',
            marginBottom: '12px',
          }}
        >
          {TESTIMONY_CATEGORIES.map((category) => {
            const active = category === activeCategory
            return (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                style={{
                  background: active ? '#D4A843' : '#F0E8D4',
                  color: '#1A1A1A',
                  border: active ? '1px solid rgba(212,168,67,0.3)' : '1px solid rgba(212,168,67,0.4)',
                  borderRadius: '50px',
                  padding: '6px 16px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {category}
              </button>
            )
          })}
        </div>
        {loading ? (
          <p style={{ color: 'var(--text-secondary)' }}>{t('common.loading')}</p>
        ) : filteredRows.length === 0 ? (
          <article className="testimony-empty-card" style={{
            background: '#F0E8D4',
            border: '1px solid rgba(212,168,67,0.2)',
            borderRadius: '16px',
            padding: '40px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🕊️</div>
            <p style={{
              margin: 0,
              color: '#1A1A1A',
              fontSize: '16px',
              fontWeight: 500,
              textAlign: 'center',
            }}>Be the first to share!</p>
          </article>
        ) : (
          <div className="testimony-list-stack" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <style>{SUPPORTER_BORDER_KEYFRAMES}{SHIMMER_KEYFRAMES}</style>
            {filteredRows.map((t) => {
              const isAnon = Boolean(t.is_anonymous)
              const name = isAnon ? t('testimony.anonymousBeliever') : displayAuthorName(t.author_profile, t)
              const avatarUrl = isAnon ? null : t.author_profile?.avatar_url
              const authorTier = t.author_profile?.supporter_tier
              const authorBorder = t.author_profile?.profile_border
              const authorColor = t.author_profile?.name_color
              const avatarBorderStyle = isAnon ? {} : getAvatarBorderStyle(authorTier, authorBorder)
              const counts = countsByTestimony[t.id] || { amen: 0, love: 0, fire: 0, cross: 0 }
              const my = myReactionByTestimony[t.id]
              const isOwnPost = t.user_id === user?.id

              const getNameStyle = (tier) => {
                const colorToken = String(authorColor || '').toLowerCase()
                if (colorToken === 'shimmer-gold') {
                  return {
                    background: 'linear-gradient(90deg, #b8860b, #ffd700, #ffec8b, #ffd700, #b8860b)',
                    backgroundSize: '200%',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    animation: 'shimmer-gold 2s infinite linear',
                  }
                }
                if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(authorColor || ''))) {
                  return { color: authorColor }
                }
                if (tier === 'lifetime') {
                  return {
                    background: 'linear-gradient(90deg, #b8860b, #ffd700, #ffec8b, #ffd700, #b8860b)',
                    backgroundSize: '200%',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    animation: 'shimmer-gold 2s infinite linear',
                  }
                } else if (tier === 'monthly') {
                  return { color: '#93c5fd' }
                }
                return { color: 'var(--text-primary)' }
              }
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
                        🗑️ {t('testimony.deleteAction')}
                      </button>
                    </div>
                  )}
                  <div className="flex items-start gap-3" style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, ...avatarBorderStyle }} />
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
                          ...avatarBorderStyle,
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
                            ...getNameStyle(authorTier),
                            textAlign: 'left',
                          }}
                        >
                          {name}
                          {authorTier === 'monthly' && <span style={{ marginLeft: '4px', fontSize: '12px' }}>⭐</span>}
                          {authorTier === 'lifetime' && <span style={{ marginLeft: '4px', fontSize: '12px' }}>👑</span>}
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
                        {reactions.map((r) => {
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
