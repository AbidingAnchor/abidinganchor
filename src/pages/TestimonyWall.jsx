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
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editContent, setEditContent] = useState('')
  const [saving, setSaving] = useState(false)
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
      
      // Remove from UI (optimistic)
      setRows(prev => prev.filter(t => t.id !== testimonyId))
      setMenuOpen(null)
      setDeleteConfirmOpen(null)
      
      // Show toast
      setToast(t('testimony.deleteSuccess'))
      setTimeout(() => setToast(null), 3000)
    } catch (err) {
      console.error('Error deleting testimony:', err)
      setError(t('testimony.deleteError'))
    }
  }

  const handleEditSave = async (testimonyId) => {
    if (!user?.id) return
    const trimmed = editContent.trim()
    if (!trimmed) return
    
    setSaving(true)
    try {
      const { error: updateError } = await supabase
        .from('testimonies')
        .update({ content: trimmed.slice(0, CONTENT_MAX) })
        .eq('id', testimonyId)
      
      if (updateError) throw updateError
      
      // Update local state (optimistic)
      setRows(prev => prev.map(t => 
        t.id === testimonyId ? { ...t, content: trimmed.slice(0, CONTENT_MAX) } : t
      ))
      
      // Reset edit state
      setEditingId(null)
      setEditContent('')
      setMenuOpen(null)
      
      // Show toast
      setToast(t('testimony.editSuccess'))
      setTimeout(() => setToast(null), 3000)
    } catch (err) {
      console.error('Error editing testimony:', err)
      setError(t('testimony.editError'))
    } finally {
      setSaving(false)
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


  return (
    <div
      className="content-scroll content-scroll--nav-clear testimony-wall-shell"
      onClick={() => {
        if (menuOpen) {
          setMenuOpen(null)
          setDeleteConfirmOpen(null)
        }
      }}
      style={{
        padding: '16px',
        paddingBottom: '80px',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <style>{`
        .tw-input:focus { border-color: rgba(251,191,36,0.5) !important; box-shadow: 0 0 12px rgba(251,191,36,0.2) !important; }
        .tw-pill-btn { transition: all 0.15s ease; }
        .tw-card { transition: transform 0.15s ease; }
        .tw-card:hover { transform: translateY(-1px); }
      `}</style>

      {/* ── Header ── */}
      <header style={{ marginBottom: '24px', textAlign: 'center', position: 'relative' }}>
        <div style={{
          position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)',
          width: '200px', height: '80px',
          background: 'radial-gradient(ellipse, rgba(212,168,67,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <p style={{
          fontSize: '32px', margin: '0 0 8px 0',
          filter: 'drop-shadow(0 0 8px rgba(212,168,67,0.6))',
        }}>⚓</p>
        <h1 style={{
          color: '#ffffff', fontSize: '28px', fontWeight: 800,
          margin: '0 0 8px 0', fontFamily: 'Georgia, serif', letterSpacing: '-0.3px',
        }}>
          {t('testimony.title') || 'Testimony Wall'}
        </h1>
        <p style={{ color: 'rgba(251,191,36,0.7)', fontSize: '14px', fontStyle: 'italic', margin: '0 0 4px 0' }}>
          Let the redeemed of the Lord say so.
        </p>
        <p style={{ color: 'rgba(212,168,67,0.55)', fontSize: '13px', margin: 0 }}>— Psalm 107:2</p>
      </header>

      {/* ── Share Your Testimony ── */}
      <section className="testimony-input-section home-gold-glass" style={{ borderRadius: '24px', padding: '20px', marginBottom: '20px' }}>
        <p style={{ color: '#D4A843', fontSize: '10px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', margin: '0 0 14px 0' }}>
          {t('testimony.shareYourTestimony')}
        </p>
        <textarea
          className="tw-input"
          id="testimony-input"
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, CONTENT_MAX))}
          rows={4}
          placeholder={t('testimony.placeholder')}
          style={{
            width: '100%',
            borderRadius: '16px',
            padding: '14px 16px',
            resize: 'none',
            color: '#ffffff',
            fontSize: '15px',
            background: 'rgba(255,255,255,0.05)',
            border: '1.5px solid rgba(255,255,255,0.1)',
            outline: 'none',
            boxSizing: 'border-box',
            fontFamily: 'inherit',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          }}
        />
        <style>{`.tw-input::placeholder { color: rgba(255,255,255,0.3); }`}</style>

        {/* Anonymous toggle */}
        <label
          htmlFor="testimony-anonymous"
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', color: 'rgba(255,255,255,0.7)', userSelect: 'none', marginTop: '12px' }}
        >
          <button
            id="testimony-anonymous"
            type="button"
            role="switch"
            aria-checked={postAnonymous}
            onClick={() => setPostAnonymous((v) => !v)}
            style={{
              width: '44px', height: '26px', borderRadius: '999px',
              border: '1px solid rgba(212,168,67,0.45)',
              background: postAnonymous ? 'rgba(212,175,55,0.45)' : 'rgba(255,255,255,0.08)',
              padding: '3px', cursor: 'pointer', flexShrink: 0,
              transition: 'background 0.15s ease',
            }}
          >
            <span style={{
              display: 'block', width: '20px', height: '20px', borderRadius: '50%',
              background: postAnonymous ? '#D4AF37' : 'rgba(255,255,255,0.4)',
              marginLeft: postAnonymous ? '18px' : '0',
              transition: 'margin-left 0.15s ease, background 0.15s ease',
              boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
            }} />
          </button>
          <span>{t('testimony.postAnonymously')}</span>
        </label>

        {/* Char count + post button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
          <span style={{ fontSize: '12px', color: 'rgba(212,168,67,0.6)' }}>
            {trimmed.length}/{CONTENT_MAX}
          </span>
          <button
            type="button"
            onClick={handlePost}
            disabled={posting || !trimmed}
            style={{
              background: 'linear-gradient(135deg,#D4A843,#F0C040)',
              color: '#1A1200',
              border: 'none',
              borderRadius: '50px',
              padding: '10px 28px',
              fontWeight: 700,
              fontSize: '14px',
              cursor: posting || !trimmed ? 'not-allowed' : 'pointer',
              opacity: posting || !trimmed ? 0.55 : 1,
            }}
          >
            {posting ? t('testimony.posting') : t('testimony.post')}
          </button>
        </div>
      </section>

      {error ? (
        <p style={{ color: 'rgba(255,160,160,0.95)', fontSize: '14px', marginBottom: '16px' }}>{error}</p>
      ) : null}

      <section>
        <h2 className="testimony-section-h2" style={{
          fontSize: '10px', letterSpacing: '0.18em', color: '#D4A843',
          textTransform: 'uppercase', margin: '0 0 12px 0', fontWeight: 700,
        }}>
          {t('testimony.testimonies')}
        </h2>

        {/* Filter pills */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '16px' }}>
          {TESTIMONY_CATEGORIES.map((category) => {
            const active = category === activeCategory
            return (
              <button
                key={category}
                type="button"
                className="tw-pill-btn"
                onClick={() => setActiveCategory(category)}
                style={{
                  background: active ? 'linear-gradient(135deg,#D4A843,#F0C040)' : 'rgba(255,255,255,0.05)',
                  color: active ? '#1A1200' : 'rgba(255,255,255,0.6)',
                  border: active ? 'none' : '1px solid rgba(255,255,255,0.1)',
                  boxShadow: active ? '0 0 10px rgba(212,168,67,0.3)' : 'none',
                  borderRadius: '50px',
                  padding: '7px 16px',
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
          <p style={{ color: 'rgba(255,255,255,0.45)', padding: '20px 0' }}>{t('common.loading')}</p>
        ) : filteredRows.length === 0 ? (
          <div className="home-gold-glass" style={{ borderRadius: '16px', padding: '48px 20px', textAlign: 'center' }}>
            <p style={{ fontSize: '40px', margin: '0 0 12px 0', filter: 'drop-shadow(0 0 10px rgba(212,168,67,0.5))' }}>⚓</p>
            <p style={{ color: '#ffffff', fontSize: '16px', fontWeight: 600, margin: '0 0 6px 0' }}>
              Be the first to share
            </p>
            <p style={{ color: 'rgba(251,191,36,0.6)', fontSize: '13px', margin: 0 }}>
              Your testimony encourages others
            </p>
          </div>
        ) : (
          <div className="testimony-list-stack" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <style>{SUPPORTER_BORDER_KEYFRAMES}{SHIMMER_KEYFRAMES}</style>
            {filteredRows.map((testimony) => {
              const isAnon = Boolean(testimony.is_anonymous)
              const name = isAnon ? t('testimony.anonymousBeliever') : displayAuthorName(testimony.author_profile, t)
              const avatarUrl = isAnon ? null : testimony.author_profile?.avatar_url
              const authorTier = testimony.author_profile?.supporter_tier
              const authorBorder = testimony.author_profile?.profile_border
              const authorColor = testimony.author_profile?.name_color
              const avatarBorderStyle = isAnon ? {} : getAvatarBorderStyle(authorTier, authorBorder)
              const counts = countsByTestimony[testimony.id] || { amen: 0, love: 0, fire: 0, cross: 0 }
              const my = myReactionByTestimony[testimony.id]
              const isOwnPost = testimony.user_id === user?.id

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
                <article key={testimony.id} className="tw-card home-gold-glass" style={{ borderRadius: '16px', padding: '16px', position: 'relative' }}>
                  {isOwnPost && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setMenuOpen(menuOpen === testimony.id ? null : testimony.id)
                        setDeleteConfirmOpen(null)
                      }}
                      style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        background: 'transparent',
                        color: 'rgba(255,255,255,0.5)',
                        fontSize: '18px',
                        cursor: 'pointer',
                        padding: '4px 8px',
                        borderRadius: '8px',
                        border: 'none',
                        transition: 'color 0.15s ease',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.9)'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
                    >
                      ⋮
                    </button>
                  )}
                  {menuOpen === testimony.id && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        position: 'absolute',
                        top: '36px',
                        right: '12px',
                        background: 'rgba(10,20,50,0.98)',
                        border: '1px solid rgba(212,168,67,0.2)',
                        borderRadius: '12px',
                        padding: deleteConfirmOpen === testimony.id ? '8px' : '8px 0',
                        zIndex: 100,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                        minWidth: '160px',
                      }}
                    >
                      {deleteConfirmOpen === testimony.id ? (
                        <div style={{ padding: '8px 12px' }}>
                          <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#ffffff', opacity: 1, WebkitTextFillColor: '#ffffff' }}>
                            {t('testimony.deleteConfirm')}
                          </p>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              type="button"
                              onClick={() => handleDeleteTestimony(testimony.id)}
                              style={{
                                flex: 1,
                                padding: '6px 12px',
                                background: 'rgba(255,107,107,0.2)',
                                color: '#ff6b6b',
                                border: '1px solid rgba(255,107,107,0.3)',
                                borderRadius: '6px',
                                fontSize: '12px',
                                cursor: 'pointer',
                              }}
                            >
                              Delete
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmOpen(null)}
                              style={{
                                flex: 1,
                                padding: '6px 12px',
                                background: 'rgba(255,255,255,0.1)',
                                color: 'rgba(255,255,255,0.8)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '6px',
                                fontSize: '12px',
                                cursor: 'pointer',
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(testimony.id)
                              setEditContent(testimony.content)
                              setMenuOpen(null)
                            }}
                            style={{
                              padding: '10px 16px',
                              color: 'rgba(255,255,255,0.9)',
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
                            ✏️ Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmOpen(testimony.id)}
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
                    </div>
                  )}
                  <div className="flex items-start gap-3" style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, ...avatarBorderStyle }} />
                    ) : (
                      <span style={{
                        width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0,
                        background: 'linear-gradient(135deg,#78350f,#D4A843)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, color: '#ffffff', fontSize: isAnon ? '18px' : '17px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                        ...avatarBorderStyle,
                      }} aria-hidden={isAnon}>
                        {isAnon ? '✝️' : (name[0] || 'A').toUpperCase()}
                      </span>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Name row */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        {isAnon ? (
                          <p style={{ margin: 0, fontWeight: 700, fontSize: '15px', color: '#ffffff' }}>{name}</p>
                        ) : (
                          <button type="button" onClick={() => testimony.user_id && navigate(`/profile/${testimony.user_id}`)}
                            style={{ background: 'none', border: 'none', padding: 0, cursor: testimony.user_id ? 'pointer' : 'default', fontWeight: 700, fontSize: '15px', ...getNameStyle(authorTier), textAlign: 'left' }}>
                            {name}
                            {authorTier === 'monthly' && <span style={{ marginLeft: '4px', fontSize: '12px' }}>⭐</span>}
                            {authorTier === 'lifetime' && <span style={{ marginLeft: '4px', fontSize: '12px' }}>👑</span>}
                          </button>
                        )}
                        <span style={{ fontSize: '11px', color: 'rgba(212,168,67,0.6)', flexShrink: 0 }}>{timeAgo(testimony.created_at)}</span>
                      </div>

                      {/* Edit mode or content */}
                      {editingId === testimony.id ? (
                        <div style={{ marginTop: '8px' }}>
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value.slice(0, CONTENT_MAX))}
                            rows={4}
                            style={{
                              width: '100%', borderRadius: '12px', padding: '10px 14px', resize: 'none',
                              color: '#ffffff', fontSize: '14px', background: 'rgba(255,255,255,0.07)',
                              border: '1.5px solid rgba(212,168,67,0.35)', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
                            }}
                          />
                          <div style={{ display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: 'rgba(212,168,67,0.5)', flex: 1 }}>{editContent.length}/{CONTENT_MAX}</span>
                            <button type="button" onClick={() => handleEditSave(testimony.id)} disabled={saving || !editContent.trim()}
                              style={{ padding: '6px 16px', background: 'linear-gradient(135deg,#D4A843,#F0C040)', color: '#1A1200', border: 'none', borderRadius: '50px', fontSize: '12px', fontWeight: 700, cursor: saving || !editContent.trim() ? 'not-allowed' : 'pointer', opacity: saving || !editContent.trim() ? 0.6 : 1 }}>
                              {saving ? t('testimony.saving') : t('testimony.save')}
                            </button>
                            <button type="button" onClick={() => { setEditingId(null); setEditContent('') }}
                              style={{ padding: '6px 14px', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50px', fontSize: '12px', cursor: 'pointer' }}>
                              {t('testimony.cancel')}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p style={{ margin: '8px 0 0', fontSize: '14px', lineHeight: 1.65, color: 'rgba(220,220,220,0.92)' }}>{testimony.content}</p>
                      )}

                      {/* Reactions + category tag */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px', alignItems: 'center' }}>
                        {reactions.map((r) => {
                          const active = my === r.key
                          const n = counts[r.key] ?? 0
                          return (
                            <button key={r.key} type="button"
                              disabled={!user?.id || reactionBusy === testimony.id}
                              onClick={() => toggleReaction(testimony.id, r.key)}
                              title={r.label}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '4px',
                                borderRadius: '50px', padding: '5px 10px', fontSize: '15px',
                                border: active ? '1px solid rgba(212,168,67,0.45)' : '1px solid rgba(255,255,255,0.1)',
                                background: active ? 'rgba(212,168,67,0.18)' : 'rgba(255,255,255,0.06)',
                                color: active ? '#D4A843' : 'rgba(255,255,255,0.7)',
                                cursor: user?.id ? 'pointer' : 'not-allowed',
                                backdropFilter: 'blur(6px)',
                              }}>
                              <span aria-hidden>{r.icon}</span>
                              {n > 0 && <span style={{ fontSize: '12px' }}>{n}</span>}
                            </button>
                          )
                        })}
                        {/* Category tag */}
                        <span style={{
                          marginLeft: 'auto', padding: '4px 10px', borderRadius: '50px',
                          background: 'rgba(255,255,255,0.1)', fontSize: '11px',
                          color: '#D4A843', fontWeight: 600,
                        }}>
                          {categorizeTestimony(testimony.content)}
                        </span>
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
