import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const cardStyle = {
  background: 'rgba(255, 255, 255, 0.1)',
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  borderRadius: '16px',
}

function otherUserId(row, me) {
  return row.requester_id === me ? row.addressee_id : row.requester_id
}

export default function Friends() {
  const { user } = useAuth()
  const uid = user?.id
  const [tab, setTab] = useState('friends')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [incoming, setIncoming] = useState([])
  const [friendsList, setFriendsList] = useState([])

  const loadExcluded = useCallback(async () => {
    if (!uid) return new Set()
    try {
      const { data, error } = await supabase
        .from('friendships')
        .select('requester_id, addressee_id, status')
        .or(`requester_id.eq.${uid},addressee_id.eq.${uid}`)
      if (error) throw error
      const ex = new Set()
      for (const row of data || []) {
        if (row.status === 'pending' || row.status === 'accepted') {
          ex.add(otherUserId(row, uid))
        }
      }
      ex.add(uid)
      return ex
    } catch {
      return new Set([uid])
    }
  }, [uid])

  const loadIncoming = useCallback(async () => {
    if (!uid) return
    try {
      const { data: rows, error } = await supabase
        .from('friendships')
        .select('*')
        .eq('addressee_id', uid)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
      if (error) throw error
      const ids = [...new Set((rows || []).map((r) => r.requester_id))]
      if (ids.length === 0) {
        setIncoming([])
        return
      }
      const { data: profs, error: e2 } = await supabase.from('profiles').select('id, full_name, email').in('id', ids)
      if (e2) {
        console.error('Profile query error:', e2)
        setIncoming([])
        return
      }
      const byId = Object.fromEntries((profs || []).map((p) => [p.id, p]))
      setIncoming(
        (rows || []).map((r) => ({
          ...r,
          requester: byId[r.requester_id] || { full_name: 'Friend', email: '' },
        })),
      )
    } catch {
      setIncoming([])
    }
  }, [uid])

  const loadFriends = useCallback(async () => {
    if (!uid) return
    try {
      const { data: rows, error } = await supabase
        .from('friendships')
        .select('*')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${uid},addressee_id.eq.${uid}`)
      if (error) throw error
      const otherIds = (rows || []).map((r) => otherUserId(r, uid))
      if (otherIds.length === 0) {
        setFriendsList([])
        return
      }
      const { data: profs, error: e2 } = await supabase
        .from('profiles')
        .select('id, full_name, email, reading_streak')
        .in('id', otherIds)
      if (e2) {
        console.error('Profile query error:', e2)
        setFriendsList([])
        return
      }
      const byId = Object.fromEntries((profs || []).map((p) => [p.id, p]))
      const merged = (rows || []).map((r) => {
        const oid = otherUserId(r, uid)
        return {
          friendshipId: r.id,
          profile: byId[oid] || { id: oid, full_name: 'Friend', email: '', reading_streak: 0 },
        }
      })
      merged.sort((a, b) => (Number(b.profile.reading_streak) || 0) - (Number(a.profile.reading_streak) || 0))
      setFriendsList(merged)
    } catch {
      setFriendsList([])
    }
  }, [uid])

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      try {
        await loadExcluded()
        if (tab === 'friends') await loadFriends()
        else if (tab === 'requests') await loadIncoming()
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [uid, tab, loadExcluded, loadFriends, loadIncoming])

  const runSearch = useCallback(async () => {
    const q = search.trim()
    if (!q || !uid) {
      setSearchResults([])
      return
    }
    setSearching(true)
    try {
      const safe = q.replace(/"/g, '').replace(/[%_]/g, '\\$&')
      const wild = `%${safe}%`
      const ex = await loadExcluded()
      const { data: profs, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .or(`full_name.ilike."${wild}",email.ilike."${wild}"`)
        .limit(40)
      if (error) {
        console.error('Profile search error:', error)
        setSearchResults([])
        return
      }
      const filtered = (profs || []).filter((p) => !ex.has(p.id))
      setSearchResults(filtered)
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }, [search, uid, loadExcluded])

  const addFriend = async (targetId) => {
    if (!uid || targetId === uid) return
    try {
      const { error } = await supabase.from('friendships').insert({
        requester_id: uid,
        addressee_id: targetId,
        status: 'pending',
      })
      if (error) throw error
      await loadExcluded()
      setSearchResults((prev) => (prev || []).filter((p) => p.id !== targetId))
    } catch {
      /* silent */
    }
  }

  const acceptRequest = async (friendshipId) => {
    try {
      const { error } = await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId)
      if (error) throw error
      await loadIncoming()
      await loadFriends()
      await loadExcluded()
    } catch {
      /* silent */
    }
  }

  const declineRequest = async (friendshipId) => {
    try {
      const { error } = await supabase.from('friendships').update({ status: 'declined' }).eq('id', friendshipId)
      if (error) throw error
      await loadIncoming()
      await loadExcluded()
    } catch {
      /* silent */
    }
  }

  const unfriend = async (id) => {
    if (!user?.id) return
    const ok = window.confirm('Remove this friend?')
    if (!ok) return
    try {
      const { error } = await supabase.from('friendships').delete().eq('id', id)
      if (error) throw error
      await loadFriends()
    } catch {
      /* silent */
    }
  }

  const handleReportProfile = async (profileId, profileName) => {
    if (!user?.id) return
    const reason = window.prompt(`Report ${profileName}'s profile picture. Please provide a reason:`)
    if (!reason || !reason.trim()) return

    try {
      const { error } = await supabase.from('profile_reports').insert({
        reporter_id: user.id,
        reported_profile_id: profileId,
        reason: reason.trim(),
        created_at: new Date().toISOString()
      })
      if (error) throw error
      alert('Report submitted. Thank you for helping keep our community safe.')
    } catch (error) {
      console.error('Report error:', error)
      alert('Failed to submit report. Please try again.')
    }
  }

  const displayName = (p) => p?.full_name?.trim() || p?.email?.split('@')[0] || 'Friend'

  return (
    <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
      <div
        className="content-scroll"
        style={{
          padding: '0 16px',
          paddingTop: 'clamp(200px, 32vw, 240px)',
          paddingBottom: '120px',
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
              Friends
            </h1>
            <p className="mt-1 text-sm text-white/85">Connect and encourage one another.</p>
          </div>
          <Link
            to="/community-prayer"
            className="rounded-xl border px-3 py-2 text-sm font-semibold text-[#D4A843] transition hover:bg-white/10"
            style={{ borderColor: 'rgba(212, 168, 67, 0.6)' }}
          >
            🤝 Prayer Wall
          </Link>
        </header>

        <div className="mb-4 flex gap-1 rounded-2xl p-1" style={{ ...cardStyle, padding: '4px' }}>
          {[
            { key: 'friends', label: 'Friends' },
            { key: 'requests', label: 'Requests' },
            { key: 'find', label: 'Find Friends' },
          ].map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className="flex-1 rounded-xl py-2.5 text-xs font-semibold transition sm:text-sm"
              style={{
                background: tab === key ? 'rgba(212, 168, 67, 0.35)' : 'transparent',
                color: tab === key ? '#fff' : 'rgba(255,255,255,0.7)',
                border: tab === key ? '1px solid rgba(212,168,67,0.6)' : '1px solid transparent',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {loading && tab !== 'find' ? (
          <article className="p-4 text-white/70" style={cardStyle}>
            Loading…
          </article>
        ) : null}

        {tab === 'find' && (
          <section className="space-y-4">
            <div style={cardStyle} className="p-4">
              <label className="text-xs font-semibold uppercase tracking-wide text-white/70">Search by name or email</label>
              <div className="mt-2 flex gap-2">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && runSearch()}
                  placeholder="Start typing…"
                  className="glass-input-field min-w-0 flex-1 rounded-xl p-3 text-white placeholder:text-white/50 focus:outline-none focus:ring-1 focus:ring-[#D4A843]"
                />
                <button type="button" className="gold-btn shrink-0 px-4" onClick={() => runSearch()}>
                  Search
                </button>
              </div>
              <p className="mt-2 text-xs text-white/55">People you are already friends with or have a pending request with will not appear.</p>
            </div>
            {searching ? <p className="text-sm text-white/70">Searching…</p> : null}
            {!searching && searchResults.length === 0 && search.trim() ? (
              <p className="text-sm text-white/70">No matches found.</p>
            ) : null}
            <ul className="space-y-3">
              {searchResults.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-white" style={cardStyle}>
                  <div>
                    <p className="font-semibold text-white">{displayName(p)}</p>
                    {p.email ? <p className="text-xs text-white/60">{p.email}</p> : null}
                  </div>
                  <button type="button" className="gold-btn text-sm" onClick={() => addFriend(p.id)}>
                    Add Friend
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {tab === 'requests' && !loading && (
          <section className="space-y-3">
            {incoming.length === 0 ? (
              <article className="p-6 text-center text-white/85" style={cardStyle}>
                <p className="text-2xl text-[#D4A843]">📬</p>
                <p className="mt-2 font-semibold text-white">No pending requests</p>
              </article>
            ) : (
              incoming.map((r) => (
                <article key={r.id} className="p-4 text-white" style={cardStyle}>
                  <p className="font-semibold text-white">{displayName(r.requester)}</p>
                  <p className="text-xs text-white/60">wants to be friends</p>
                  <div className="mt-3 flex gap-2">
                    <button type="button" className="gold-btn flex-1 py-2 text-sm" onClick={() => acceptRequest(r.id)}>
                      Accept
                    </button>
                    <button
                      type="button"
                      className="flex-1 rounded-xl border border-white/30 py-2 text-sm font-semibold text-white/90"
                      onClick={() => declineRequest(r.id)}
                    >
                      Decline
                    </button>
                  </div>
                </article>
              ))
            )}
          </section>
        )}

        {tab === 'friends' && !loading && (
          <section className="space-y-3">
            {friendsList.length === 0 ? (
              <article className="p-6 text-center text-white/85" style={cardStyle}>
                <p className="text-2xl text-[#D4A843]">👥</p>
                <p className="mt-2 font-semibold text-white">No friends yet</p>
                <p className="mt-1 text-sm text-white/70">Use Find Friends to connect.</p>
              </article>
            ) : (
              friendsList.map(({ friendshipId, profile: p }) => (
                <article
                  key={friendshipId}
                  className="flex flex-wrap items-center justify-between gap-3 p-4 text-white"
                  style={cardStyle}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ position: 'relative' }}>
                      <div
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          background: '#D4A843',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontSize: '20px',
                          fontWeight: 600,
                          boxShadow: '0 2px 8px rgba(212,168,67,0.3)'
                        }}
                      >
                        {displayName(p).charAt(0).toUpperCase()}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleReportProfile(p.id, displayName(p))}
                        style={{
                          position: 'absolute',
                          bottom: '-4px',
                          right: '-4px',
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: 'rgba(255,80,80,0.9)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          border: '2px solid rgba(15, 23, 42, 0.35)',
                          fontSize: '10px'
                        }}
                        title="Report profile picture"
                      >
                        🚩
                      </button>
                    </div>
                    <div>
                      <p className="font-semibold text-white">{displayName(p)}</p>
                      <p className="text-sm text-[#D4A843]">
                        🔥 {Math.max(0, Number(p.reading_streak) || 0)} day reading streak
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="rounded-xl border border-red-400/50 bg-red-500/15 px-3 py-2 text-xs font-semibold text-red-200"
                    onClick={() => unfriend(friendshipId)}
                  >
                    Unfriend
                  </button>
                </article>
              ))
            )}
          </section>
        )}
      </div>
    </div>
  )
}
