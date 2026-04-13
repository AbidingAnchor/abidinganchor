import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const FILTER_CATEGORIES = ['All', 'Health', 'Family', 'Guidance', 'Praise', 'Grief', 'Protection']
const FORM_CATEGORIES = ['Health', 'Family', 'Guidance', 'Praise', 'Grief', 'Protection', 'General']



function timeAgo(iso) {
  if (!iso) return ''
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (sec < 45) return 'just now'
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`
  if (sec < 604800) return `${Math.floor(sec / 86400)}d ago`
  return new Date(iso).toLocaleDateString()
}

export default function CommunityPrayer() {
  const { t } = useTranslation()
  const { user, profile } = useAuth()
  const [tab, setTab] = useState('wall')
  const [filterCat, setFilterCat] = useState('All')
  const [prayers, setPrayers] = useState([])
  const [myPrayedIds, setMyPrayedIds] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [formContent, setFormContent] = useState('')
  const [formCategory, setFormCategory] = useState('General')
  const [formAnonymous, setFormAnonymous] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [activeUsersCount, setActiveUsersCount] = useState(0)
  const [animatingPrayId, setAnimatingPrayId] = useState(null)
  const [prayingId, setPrayingId] = useState(null)

  const firstName = useMemo(
    () => profile?.full_name?.split(' ')[0] || user?.user_metadata?.full_name?.split(' ')[0] || '',
    [profile?.full_name, user?.user_metadata?.full_name],
  )

  const loadWall = useCallback(async () => {
    if (!user?.id) return
    try {
      let q = supabase.from('community_prayers').select('*').order('created_at', { ascending: false })
      if (filterCat !== 'All') {
        q = q.eq('category', filterCat)
      }
      const { data: rows, error } = await q
      if (error) throw error
      setPrayers(rows || [])

      const ids = (rows || []).map((r) => r.id)
      if (ids.length === 0) {
        setMyPrayedIds(new Set())
        return
      }
      const { data: ints, error: e2 } = await supabase
        .from('prayer_interactions')
        .select('prayer_id')
        .eq('user_id', user.id)
        .in('prayer_id', ids)
      if (e2) throw e2
      setMyPrayedIds(new Set((ints || []).map((i) => i.prayer_id)))
    } catch {
      setPrayers([])
      setMyPrayedIds(new Set())
    }
  }, [user?.id, filterCat])

  const loadMine = useCallback(async () => {
    if (!user?.id) return
    try {
      const { data, error } = await supabase
        .from('community_prayers')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      setPrayers(data || [])
    } catch {
      setPrayers([])
    }
  }, [user?.id])

  const refresh = useCallback(() => {
    if (tab === 'wall') return loadWall()
    return loadMine()
  }, [tab, loadWall, loadMine])

  const loadActiveUsersCount = useCallback(async () => {
    try {
      const today = new Date().toISOString().slice(0, 10)
      const { data, error } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .gte('last_active_date', today)
      if (error) throw error
      setActiveUsersCount(data?.length || 0)
    } catch {
      setActiveUsersCount(0)
    }
  }, [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      try {
        if (tab === 'wall') await loadWall()
        else await loadMine()
        await loadActiveUsersCount()
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [tab, loadWall, loadMine, loadActiveUsersCount])

  /** Inserts into prayer_interactions (user_id + prayer_id) and bumps community_prayers.pray_count. */
  const handlePray = async (prayer) => {
    if (!user?.id) return
    const id = prayer.id
    if (myPrayedIds.has(id)) return
    const count = Math.max(0, Number(prayer.pray_count) || 0)
    setPrayingId(id)
    try {
      const { error: i1 } = await supabase.from('prayer_interactions').insert({
        user_id: user.id,
        prayer_id: id,
      })
      if (i1) throw i1
      const { error: i2 } = await supabase
        .from('community_prayers')
        .update({ pray_count: count + 1 })
        .eq('id', id)
      if (i2) throw i2
      setMyPrayedIds((prev) => new Set(prev).add(id))
      setPrayers((prev) => prev.map((p) => (p.id === id ? { ...p, pray_count: count + 1 } : p)))
      setAnimatingPrayId(id)
      setTimeout(() => setAnimatingPrayId(null), 400)
    } catch {
      await refresh()
    } finally {
      setPrayingId(null)
    }
  }

  const submitPrayer = async () => {
    const text = formContent.trim()
    if (!text || !user?.id) return
    setSubmitting(true)
    try {
      const displayName = formAnonymous ? null : (firstName || null)
      const { error } = await supabase.from('community_prayers').insert({
        user_id: user.id,
        content: text,
        category: formCategory,
        is_anonymous: formAnonymous,
        display_name: displayName,
        pray_count: 0,
      })
      if (error) throw error
      try {
        const pk = 'abidinganchor-community-prayer-submissions'
        localStorage.setItem(pk, String(parseInt(localStorage.getItem(pk) || '0', 10) + 1))
      } catch {
        /* ignore */
      }
      setFormContent('')
      setFormCategory('General')
      setFormAnonymous(true)
      setModalOpen(false)
      await refresh()
    } catch {
      /* silent */
    } finally {
      setSubmitting(false)
    }
  }

  const deleteMine = async (id) => {
    if (!user?.id) return
    const ok = window.confirm('Remove this prayer from the wall?')
    if (!ok) return
    try {
      await supabase.from('prayer_interactions').delete().eq('prayer_id', id)
      const { error } = await supabase.from('community_prayers').delete().eq('id', id).eq('user_id', user.id)
      if (error) throw error
      await loadMine()
    } catch {
      /* silent */
    }
  }

  const displayAuthor = (p) => {
    if (p.is_anonymous) return 'Anonymous'
    const n = p.display_name?.trim()
    return n || 'Anonymous'
  }

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      <div
        className="content-scroll"
        style={{
          position: 'relative',
          zIndex: 1,
          padding: '0 16px',
          paddingTop: '16px',
          paddingBottom: '120px',
          maxWidth: '680px',
          margin: '0 auto',
          width: '100%',
        }}
      >
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 style={{ color: 'var(--heading-text)', fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>
              🤝 Community Prayer
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', fontStyle: 'italic' }}>Lift each other up in prayer.</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>
              🟢 {activeUsersCount} believers praying today
            </p>
          </div>
          <Link to="/friends" className="btn-secondary">
            Friends 👥
          </Link>
        </header>

        <div className="mb-4 flex gap-2 app-card">
          {['wall', 'mine'].map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${tab === key ? 'bg-gold text-primary-purple' : 'text-gold'}`}
            >
              {key === 'wall' ? t('prayerWall.title') : 'My Submissions'}
            </button>
          ))}
        </div>

        {tab === 'wall' && (
          <>
            <div style={{ marginBottom: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {FILTER_CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setFilterCat(c)}
                  className={filterCat === c ? '' : 'glass-panel'}
                  style={{
                    borderRadius: '50px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: filterCat === c ? 700 : 600,
                    background: filterCat === c ? '#D4A843' : undefined,
                    border: filterCat === c ? 'none' : '1px solid var(--glass-border)',
                    color: filterCat === c ? '#0a1a3e' : 'var(--text-primary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
            <button type="button" className="btn-primary mb-4 w-full sm:w-auto" onClick={() => setModalOpen(true)}>
              + Add Prayer
            </button>
          </>
        )}

        {tab === 'mine' && (
          <button type="button" className="btn-primary mb-4 w-full sm:w-auto" onClick={() => setModalOpen(true)}>
            + Add Prayer
          </button>
        )}

        {loading ? (
          <article className="glass-panel p-4 text-white/70">
            Loading…
          </article>
        ) : null}

        {!loading && tab === 'wall' && prayers.length === 0 ? (
          <article style={{
            background: 'var(--card-parchment)',
            border: '1px solid var(--glass-border)',
            borderLeft: '3px solid var(--gold)',
            borderRadius: '12px',
            padding: '24px',
            textAlign: 'center',
            height: 'auto'
          }}>
            <p style={{ fontSize: '32px', marginBottom: '8px' }}>🙏</p>
            <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>No prayers in this category yet.</p>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Be the first to share a request.</p>
          </article>
        ) : null}

        {!loading && tab === 'mine' && prayers.length === 0 ? (
          <article style={{
            background: 'var(--card-parchment)',
            border: '1px solid var(--glass-border)',
            borderLeft: '3px solid var(--gold)',
            borderRadius: '12px',
            padding: '24px',
            textAlign: 'center',
            height: 'auto'
          }}>
            <p style={{ fontSize: '32px', marginBottom: '8px' }}>✨</p>
            <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>You haven&apos;t posted to the wall yet.</p>
          </article>
        ) : null}

        {!loading && tab === 'wall' && (
          <ul className="space-y-3">
            {prayers.map((p) => {
              const prayed = myPrayedIds.has(p.id)
              const cnt = Math.max(0, Number(p.pray_count) || 0)
              return (
                <li key={p.id} className="app-card p-4 text-primary border-l-[3px] border-gold">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="gold-badge">
                      {p.category || 'General'}
                    </span>
                    <span className="text-xs text-secondary">{timeAgo(p.created_at)}</span>
                  </div>
                  <p className="text-body leading-relaxed text-primary">{p.content}</p>
                  <p className="mt-2 text-xs font-medium text-gold-accent">{displayAuthor(p)}</p>
                  <p className="mt-2 text-xs text-secondary">
                    {cnt === 0 ? 'No prayers yet' : `${cnt} ${cnt === 1 ? 'person has' : 'people have'} prayed`}
                  </p>
                  <button
                    type="button"
                    onClick={() => !prayed && handlePray(p)}
                    disabled={prayingId === p.id}
                    aria-pressed={prayed}
                    className={`mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition sm:w-auto sm:px-6 ${
                      prayed ? 'btn-primary pointer-events-none' : 'btn-secondary text-gold-accent'
                    }`}
                    style={{
                      transform: animatingPrayId === p.id ? 'scale(1.06)' : 'scale(1)',
                      transition: animatingPrayId === p.id ? 'transform 0.15s ease-out, background-color 0.15s ease-out' : 'transform 0.2s ease',
                      backgroundColor: animatingPrayId === p.id ? '#D4A843' : undefined,
                      opacity: prayingId === p.id ? 0.75 : 1,
                    }}
                  >
                    {prayed ? 'Prayed! 🙏' : prayingId === p.id ? 'Praying…' : '🙏 Pray'}
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        {!loading && tab === 'mine' && (
            <ul className="space-y-3">
              {prayers.map((p) => {
                const minePrayCount = Math.max(0, Number(p.pray_count) || 0)
                return (
                <li key={p.id} className="app-card p-4 text-primary border-l-[3px] border-gold">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="gold-badge">
                      {p.category || 'General'}
                    </span>
                    <span className="text-xs text-secondary">{timeAgo(p.created_at)}</span>
                  </div>
                  <p className="text-body leading-relaxed text-primary">{p.content}</p>
                  <p className="mt-2 text-xs text-gold-accent">{displayAuthor(p)}</p>
                  <p className="mt-2 text-xs text-secondary">
                    {minePrayCount === 0
                      ? 'No prayers yet'
                      : `${minePrayCount} ${minePrayCount === 1 ? 'person has' : 'people have'} prayed`}
                  </p>
                <button
                  type="button"
                  onClick={() => deleteMine(p.id)}
                  className="mt-3 rounded-xl border border-red-400/50 bg-red-500/15 px-4 py-2 text-sm font-semibold text-red-200"
                >
                  Delete
                </button>
              </li>
                )
              })}
          </ul>
        )}
      </div>

      {modalOpen ? (
        <div
          className="fixed inset-0 z-[10000] flex items-end justify-center p-4 sm:items-center"
          style={{ background: 'rgba(5, 12, 35, 0.75)' }}
          role="presentation"
          onClick={() => !submitting && setModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl p-5 text-stone-900 shadow-xl app-card"
            style={{ maxHeight: '90vh', overflow: 'auto' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="community-prayer-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="community-prayer-modal-title" className="text-lg font-bold text-gold-accent">
              Share a prayer request
            </h2>
            <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-secondary">Your prayer</label>
            <textarea
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              rows={5}
              placeholder="Share your heart…"
              className="bg-dark mt-1 w-full rounded-xl p-3 text-primary placeholder:text-text-muted focus:outline-none focus:border-gold"
            />
            <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-secondary">Category</label>
            <select
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              className="bg-dark mt-1 w-full rounded-xl p-3 text-primary focus:outline-none focus:border-gold"
            >
              {FORM_CATEGORIES.map((c) => (
                <option key={c} value={c} className="bg-card">
                  {c}
                </option>
              ))}
            </select>
            <label className="mt-4 flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={formAnonymous}
                onChange={(e) => setFormAnonymous(e.target.checked)}
                className="h-4 w-4 accent-gold"
              />
              <span className="text-sm text-primary">Post anonymously {!formAnonymous && firstName ? `(show as ${firstName})` : ''}</span>
            </label>
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" className="btn-secondary flex-1 py-3" onClick={() => !submitting && setModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary flex-1 py-3" disabled={submitting} onClick={submitPrayer}>
                {submitting ? 'Posting…' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
