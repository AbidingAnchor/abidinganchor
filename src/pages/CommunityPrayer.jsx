import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const FILTER_CATEGORIES = ['All', 'Health', 'Family', 'Guidance', 'Praise', 'Grief', 'Protection']
const FORM_CATEGORIES = ['Health', 'Family', 'Guidance', 'Praise', 'Grief', 'Protection', 'General']

const cardStyle = {
  background: 'rgba(255, 255, 255, 0.1)',
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  borderRadius: '16px',
}

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

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      try {
        if (tab === 'wall') await loadWall()
        else await loadMine()
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [tab, loadWall, loadMine])

  const togglePray = async (prayer) => {
    if (!user?.id) return
    const id = prayer.id
    const prayed = myPrayedIds.has(id)
    const count = Math.max(0, Number(prayer.pray_count) || 0)
    try {
      if (prayed) {
        const { error: d1 } = await supabase
          .from('prayer_interactions')
          .delete()
          .eq('user_id', user.id)
          .eq('prayer_id', id)
        if (d1) throw d1
        const { error: d2 } = await supabase
          .from('community_prayers')
          .update({ pray_count: Math.max(0, count - 1) })
          .eq('id', id)
        if (d2) throw d2
        setMyPrayedIds((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
        setPrayers((prev) => prev.map((p) => (p.id === id ? { ...p, pray_count: Math.max(0, count - 1) } : p)))
      } else {
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
      }
    } catch {
      await refresh()
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
    <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
      <div
        className="content-scroll"
        style={{
          padding: '0 16px',
          paddingTop: 'clamp(200px, 32vw, 240px)',
          paddingBottom: '100px',
          maxWidth: '680px',
          margin: '0 auto',
          width: '100%',
        }}
      >
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1
              className="text-2xl font-bold sm:text-3xl"
              style={{ color: '#D4A843', textShadow: '0 1px 8px rgba(0,60,120,0.4)' }}
            >
              🤝 Community Prayer
            </h1>
            <p className="mt-1 text-sm text-white/85">Lift each other up in prayer.</p>
          </div>
          <Link
            to="/friends"
            className="rounded-xl border px-3 py-2 text-sm font-semibold text-[#D4A843] transition hover:bg-white/10"
            style={{ borderColor: 'rgba(212, 168, 67, 0.6)' }}
          >
            Friends 👥
          </Link>
        </header>

        <div className="mb-4 flex gap-2 rounded-2xl p-1" style={{ ...cardStyle, padding: '4px' }}>
          {['wall', 'mine'].map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className="flex-1 rounded-xl py-2.5 text-sm font-semibold transition"
              style={{
                background: tab === key ? 'rgba(212, 168, 67, 0.35)' : 'transparent',
                color: tab === key ? '#fff' : 'rgba(255,255,255,0.7)',
                border: tab === key ? '1px solid rgba(212,168,67,0.6)' : '1px solid transparent',
              }}
            >
              {key === 'wall' ? 'Prayer Wall' : 'My Submissions'}
            </button>
          ))}
        </div>

        {tab === 'wall' && (
          <>
            <div className="mb-3 flex flex-wrap gap-2">
              {FILTER_CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setFilterCat(c)}
                  className="rounded-full px-3 py-1.5 text-xs font-semibold transition"
                  style={{
                    background: filterCat === c ? '#D4A843' : 'rgba(255,255,255,0.12)',
                    color: filterCat === c ? '#1a1a1a' : '#fff',
                    border: '1px solid rgba(255,255,255,0.2)',
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
            <button type="button" className="gold-btn mb-4 w-full sm:w-auto" onClick={() => setModalOpen(true)}>
              + Add Prayer
            </button>
          </>
        )}

        {tab === 'mine' && (
          <button type="button" className="gold-btn mb-4 w-full sm:w-auto" onClick={() => setModalOpen(true)}>
            + Add Prayer
          </button>
        )}

        {loading ? (
          <article className="p-4 text-white/70" style={cardStyle}>
            Loading…
          </article>
        ) : null}

        {!loading && tab === 'wall' && prayers.length === 0 ? (
          <article className="p-6 text-center text-white/85" style={cardStyle}>
            <p className="text-3xl text-[#D4A843]">🙏</p>
            <p className="mt-2 font-semibold text-white">No prayers in this category yet.</p>
            <p className="mt-1 text-sm">Be the first to share a request.</p>
          </article>
        ) : null}

        {!loading && tab === 'mine' && prayers.length === 0 ? (
          <article className="p-6 text-center text-white/85" style={cardStyle}>
            <p className="text-3xl text-[#D4A843]">✨</p>
            <p className="mt-2 font-semibold text-white">You haven&apos;t posted to the wall yet.</p>
          </article>
        ) : null}

        {!loading && tab === 'wall' && (
          <ul className="space-y-3">
            {prayers.map((p) => {
              const prayed = myPrayedIds.has(p.id)
              const cnt = Math.max(0, Number(p.pray_count) || 0)
              return (
                <li key={p.id} className="p-4 text-white" style={cardStyle}>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span
                      className="rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide"
                      style={{ background: 'rgba(212,168,67,0.25)', color: '#F7E7B5', border: '1px solid rgba(212,168,67,0.5)' }}
                    >
                      {p.category || 'General'}
                    </span>
                    <span className="text-xs text-white/60">{timeAgo(p.created_at)}</span>
                  </div>
                  <p className="text-sm leading-relaxed text-white/95">{p.content}</p>
                  <p className="mt-2 text-xs font-medium text-[#D4A843]">{displayAuthor(p)}</p>
                  <button
                    type="button"
                    onClick={() => togglePray(p)}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition sm:w-auto sm:px-6"
                    style={{
                      background: prayed ? 'rgba(212, 168, 67, 0.45)' : 'rgba(255,255,255,0.08)',
                      border: prayed ? '2px solid #D4A843' : '1px solid rgba(255,255,255,0.25)',
                      color: '#fff',
                    }}
                  >
                    <span>🙏</span>
                    <span>{prayed ? 'Praying' : 'Pray for this'}</span>
                    <span className="rounded-full bg-black/20 px-2 py-0.5 text-xs">{cnt}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        {!loading && tab === 'mine' && (
          <ul className="space-y-3">
            {prayers.map((p) => (
              <li key={p.id} className="p-4 text-white" style={cardStyle}>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span
                    className="rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide"
                    style={{ background: 'rgba(212,168,67,0.25)', color: '#F7E7B5', border: '1px solid rgba(212,168,67,0.5)' }}
                  >
                    {p.category || 'General'}
                  </span>
                  <span className="text-xs text-white/60">{timeAgo(p.created_at)}</span>
                </div>
                <p className="text-sm leading-relaxed text-white/95">{p.content}</p>
                <p className="mt-2 text-xs text-[#D4A843]">{displayAuthor(p)}</p>
                <button
                  type="button"
                  onClick={() => deleteMine(p.id)}
                  className="mt-3 rounded-xl border border-red-400/50 bg-red-500/15 px-4 py-2 text-sm font-semibold text-red-200"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {modalOpen ? (
        <div
          className="fixed inset-0 z-[10000] flex items-end justify-center p-4 sm:items-center"
          style={{ background: 'rgba(5, 12, 35, 0.75)', backdropFilter: 'blur(6px)' }}
          role="presentation"
          onClick={() => !submitting && setModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl p-5 text-white shadow-xl"
            style={{ ...cardStyle, maxHeight: '90vh', overflow: 'auto' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="community-prayer-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="community-prayer-modal-title" className="text-lg font-bold text-[#D4A843]">
              Share a prayer request
            </h2>
            <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-white/70">Your prayer</label>
            <textarea
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              rows={5}
              placeholder="Share your heart…"
              className="mt-1 w-full rounded-xl border border-white/20 bg-black/20 p-3 text-white placeholder:text-white/50 focus:outline-none focus:ring-1 focus:ring-[#D4A843]"
            />
            <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-white/70">Category</label>
            <select
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/20 bg-black/20 p-3 text-white focus:outline-none focus:ring-1 focus:ring-[#D4A843]"
            >
              {FORM_CATEGORIES.map((c) => (
                <option key={c} value={c} className="bg-[#0d1f4e]">
                  {c}
                </option>
              ))}
            </select>
            <label className="mt-4 flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={formAnonymous}
                onChange={(e) => setFormAnonymous(e.target.checked)}
                className="h-4 w-4 accent-[#D4A843]"
              />
              <span className="text-sm text-white/90">Post anonymously {!formAnonymous && firstName ? `(show as ${firstName})` : ''}</span>
            </label>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-xl border border-white/30 py-2.5 text-sm font-semibold text-white/90"
                onClick={() => !submitting && setModalOpen(false)}
              >
                Cancel
              </button>
              <button type="button" className="gold-btn flex-1 py-2.5" disabled={submitting || !formContent.trim()} onClick={submitPrayer}>
                {submitting ? 'Posting…' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
