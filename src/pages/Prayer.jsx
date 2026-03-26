import { useMemo, useState } from 'react'
import { deletePrayer, getPrayerEntries, savePrayer, toggleAnswered } from '../utils/prayer'

export default function Prayer() {
  const [text, setText] = useState('')
  const [entries, setEntries] = useState(() => getPrayerEntries())
  const [showAnswered, setShowAnswered] = useState(false)

  const active = useMemo(() => entries.filter((p) => !p.answered), [entries])
  const answered = useMemo(() => entries.filter((p) => p.answered), [entries])

  const addPrayer = () => {
    if (!text.trim()) return
    setEntries(savePrayer({ text, date: new Date().toISOString(), answered: false }))
    setText('')
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
      <div className="content-scroll" style={{ padding: '0 16px', paddingTop: '220px', paddingBottom: '100px', maxWidth: '680px', margin: '0 auto', width: '100%' }}>
        <section className="space-y-4">
          <header className="space-y-1">
            <h1 className="text-3xl font-bold" style={{ color: '#D4A843', textShadow: '0 1px 8px rgba(0,60,120,0.4)' }}>🙏 Prayer Journal</h1>
            <p className="text-white/85">Bring everything to Him (Philippians 4:6)</p>
          </header>

          <article className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-md space-y-3">
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder="Write your prayer request..." className="w-full rounded-xl border border-white/20 bg-black/10 p-3 text-white placeholder:text-white/60 focus:outline-none" />
            <button type="button" onClick={addPrayer} className="rounded-xl px-4 py-2 text-sm font-semibold text-[#1a1a1a]" style={{ background: '#D4A843' }}>
              Add Prayer
            </button>
          </article>

          {entries.length === 0 ? <article className="rounded-2xl border border-white/20 bg-white/10 p-4 text-white/85 backdrop-blur-md">Your prayers are heard. Start writing below. 💛</article> : null}

          {active.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[#D4A843]">Active Prayers</h2>
              {active.map((entry) => (
                <article key={entry.id} className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-md">
                  <p className="text-white">{entry.text}</p>
                  <p className="mt-2 text-xs text-white/65">{new Date(entry.date).toLocaleString()}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <button type="button" onClick={() => setEntries(toggleAnswered(entry.id))} className="rounded-lg border border-[#D4A843] px-3 py-1.5 text-xs font-semibold text-[#D4A843]">✓ Mark as Answered</button>
                    <button type="button" onClick={() => setEntries(deletePrayer(entry.id))} className="text-sm text-red-300">🗑️</button>
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
    </div>
  )
}
