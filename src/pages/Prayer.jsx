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
            <h1 className="text-3xl font-bold" style={{ color: '#D4A843', textShadow: '0 1px 8px rgba(0,60,120,0.4)' }}>🙏 Prayer Journal</h1>
            <p className="text-white/85">A private space to write your prayers to God. Only you can see these - they never leave your device. 🙏</p>
          </header>

          <article className="rounded-2xl border border-white/20 bg-white/10 p-4 text-sm text-white/80 backdrop-blur-md">
            <p>
              💡 This is your personal prayer journal. Write your prayers, and when God answers them, mark them as answered to keep a record of His faithfulness.
            </p>
            <button type="button" className="gold-btn mt-3" onClick={() => setTimerOpen(true)}>
              Start Prayer Timer ⏱️
            </button>
          </article>

          <article className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-md space-y-3">
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder="Write your prayer to God... He hears every word. (Philippians 4:6-7)" className="w-full rounded-xl border border-white/20 bg-black/10 p-3 text-white placeholder:text-white/60 focus:outline-none" />
            <button type="button" onClick={addPrayer} className="rounded-xl px-4 py-2 text-sm font-semibold text-[#1a1a1a]" style={{ background: '#D4A843' }}>
              Add Prayer
            </button>
          </article>

          {loading ? (
            <article className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-md space-y-2">
              <div className="gold-skeleton" />
              <div className="gold-skeleton" style={{ width: '72%' }} />
            </article>
          ) : null}
          {!loading && entries.length === 0 ? (
            <article className="rounded-2xl border border-white/20 bg-white/10 p-5 text-center text-white/85 backdrop-blur-md">
              <p className="text-4xl text-[#D4A843]">🫶</p>
              <p className="mt-2 text-base font-semibold text-white">No prayers yet. Bring your heart to God.</p>
            </article>
          ) : null}

          {active.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[#D4A843]">MY PRAYERS</h2>
              {active.map((entry) => (
                <article key={entry.id} className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-md">
                  <p className="text-white">{entry.text}</p>
                  <p className="mt-2 text-xs text-white/65">{new Date(entry.date).toLocaleString()}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <button type="button" onClick={async () => { await supabase.from('prayers').update({ answered: !entry.answered }).eq('id', entry.id); await loadPrayers() }} className="rounded-lg border border-[#D4A843] px-3 py-1.5 text-xs font-semibold text-[#D4A843]">✓ Mark as Answered</button>
                    <button type="button" onClick={async () => { await supabase.from('prayers').delete().eq('id', entry.id); await loadPrayers() }} className="text-sm text-red-300">🗑️</button>
                  </div>
                </article>
              ))}
            </section>
          )}

          <section className="space-y-2">
            <button type="button" onClick={() => setShowAnswered((v) => !v)} className="w-full rounded-2xl border border-white/20 bg-white/10 p-3 text-left font-semibold text-[#D4A843] backdrop-blur-md">
              🌟 Answered Prayers {showAnswered ? '▲' : '▼'}
            </button>
            {showAnswered && (
              <div className="space-y-2">
                <p className="text-sm text-[#D4A843]">God is faithful!</p>
                {answered.length === 0 ? <p className="text-sm text-white/75">No answered prayers yet.</p> : answered.map((entry) => (
                  <article key={entry.id} className="rounded-xl border border-white/20 bg-white/10 p-3 text-white/90 backdrop-blur-md">
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
