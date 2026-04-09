import { useEffect, useMemo, useState } from 'react'
import PrayerTimer from '../components/PrayerTimer'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Prayer() {
  const { user } = useAuth()
  const [text, setText] = useState('')
  const [entries, setEntries] = useState([])
  const [showAnswered, setShowAnswered] = useState(false)
  const [loading, setLoading] = useState(true)
  const [timerOpen, setTimerOpen] = useState(false)

  const active = useMemo(() => entries.filter((p) => !p.answered), [entries])
  const answered = useMemo(() => entries.filter((p) => p.answered), [entries])

  const loadPrayers = async () => {
    if (!user?.id) return
    const { data } = await supabase
      .from('prayers')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setEntries((data || []).map((row) => ({
      id: row.id,
      text: row.content,
      date: row.created_at,
      answered: Boolean(row.answered),
    })))
  }

  const addPrayer = async () => {
    if (!text.trim()) return
    await supabase.from('prayers').insert({
      user_id: user.id,
      content: text.trim(),
      answered: false,
    })
    await loadPrayers()
    setText('')
  }

  useEffect(() => {
    let active = true
    const boot = async () => {
      setLoading(true)
      await loadPrayers()
      if (active) setLoading(false)
    }
    boot()
    return () => { active = false }
  }, [user?.id])

  return (
    <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
      <div className="content-scroll" style={{ padding: '0 16px', paddingTop: '220px', paddingBottom: '100px', maxWidth: '680px', margin: '0 auto', width: '100%' }}>
        <section className="space-y-4">
          <header className="space-y-1">
            <h1 className="text-page-title">🙏 Prayer Journal</h1>
            <p className="text-body">A private space to write your prayers to God. Only you can see these - they never leave your device. 🙏</p>
          </header>

          <article className="app-card rounded-2xl p-4 text-sm text-white/80 border-l-[3px] border-gold">
            <p>
              💡 This is your personal prayer journal. Write your prayers, and when God answers them, mark them as answered to keep a record of His faithfulness.
            </p>
            <button type="button" className="btn-primary mt-3" onClick={() => setTimerOpen(true)}>
              Start Prayer Timer ⏱️
            </button>
          </article>

          <article className="app-card rounded-2xl p-4 space-y-3 border-l-[3px] border-gold">
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder="Write your prayer to God... He hears every word. (Philippians 4:6-7)" className="app-card w-full rounded-xl p-3 text-white placeholder:text-white/60 focus:outline-none focus:border-gold" />
            <button type="button" onClick={addPrayer} className="btn-primary">
              Add Prayer
            </button>
          </article>

          {loading ? (
            <article className="app-card rounded-2xl p-4 space-y-2 border-l-[3px] border-gold">
              <div className="gold-skeleton" />
              <div className="gold-skeleton" style={{ width: '72%' }} />
            </article>
          ) : null}
          {!loading && entries.length === 0 ? (
            <article className="app-card rounded-2xl p-5 text-center text-body border-l-[3px] border-gold">
              <p className="text-4xl text-gold">🫶</p>
              <p className="mt-2 text-base font-semibold text-white">No prayers yet. Bring your heart to God.</p>
            </article>
          ) : null}

          {active.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-section-header">MY PRAYERS</h2>
              {active.map((entry) => (
                <article key={entry.id} className="app-card rounded-2xl p-4 border-l-[3px] border-gold">
                  <p className="text-body">{entry.text}</p>
                  <p className="mt-2 text-xs text-text-secondary-light">{new Date(entry.date).toLocaleString()}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <button type="button" onClick={async () => { await supabase.from('prayers').update({ answered: !entry.answered }).eq('id', entry.id); await loadPrayers() }} className="btn-primary">✓ Mark as Answered</button>
                    <button type="button" onClick={async () => { await supabase.from('prayers').delete().eq('id', entry.id); await loadPrayers() }} className="text-red-400">🗑️</button>
                  </div>
                </article>
              ))}
            </section>
          )}

          <section className="space-y-2">
            <button type="button" onClick={() => setShowAnswered((v) => !v)} className="app-card w-full rounded-2xl border border-border-gold-light p-3 text-left font-semibold text-gold">
              🌟 Answered Prayers {showAnswered ? '▲' : '▼'}
            </button>
            {showAnswered && (
              <div className="space-y-2">
                <p className="text-gold">God is faithful!</p>
                {answered.length === 0 ? <p className="text-body">No answered prayers yet.</p> : answered.map((entry) => (
                  <article key={entry.id} className="app-card rounded-xl p-3 text-white/90 border-l-[3px] border-gold">
                    ✓ {entry.text}
                  </article>
                ))}
              </div>
            )}
          </section>
        </section>
      </div>
      <PrayerTimer open={timerOpen} onClose={() => setTimerOpen(false)} />
    </div>
  )
}
