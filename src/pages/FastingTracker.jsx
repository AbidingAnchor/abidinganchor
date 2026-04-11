import { useEffect, useMemo, useState } from 'react'

const KEY = 'abidinganchor-fasting'

const fastTypes = [
  { id: 'sunrise-sunset', label: '🌅 Sunrise to Sunset', hours: 12 },
  { id: 'intermittent', label: '⏰ Intermittent (16 hours)', hours: 16 },
  { id: '24-hours', label: '🌙 24 Hours', hours: 24 },
  { id: 'daniel-3-days', label: '📖 3 Days (Daniel Fast)', hours: 72 },
  { id: 'custom', label: '✏️ Custom', hours: 8 },
]

const encouragements = [
  { ref: 'Isaiah 58:6', text: 'Is not this the kind of fasting I have chosen...', note: 'God uses fasting to free and restore.' },
  { ref: 'Matthew 6:16-18', text: 'When you fast, do not look somber...', note: 'Fast quietly before your Father.' },
  { ref: 'Daniel 10:3', text: 'I ate no choice food... until the three weeks were over.', note: 'Consistency in fasting deepens focus.' },
  { ref: 'Joel 2:12', text: 'Return to me with all your heart, with fasting and weeping.', note: 'Fasting is a return to God’s heart.' },
  { ref: 'Acts 13:2-3', text: 'While they were worshiping the Lord and fasting...', note: 'Fasting can sharpen spiritual direction.' },
]

function readStore() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{"history":[],"active":null,"notes":[]}')
  } catch {
    return { history: [], active: null, notes: [] }
  }
}

function saveStore(v) {
  localStorage.setItem(KEY, JSON.stringify(v))
}

function formatDuration(ms) {
  const total = Math.floor(ms / 1000)
  const h = String(Math.floor(total / 3600)).padStart(2, '0')
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0')
  const s = String(total % 60).padStart(2, '0')
  return `${h}:${m}:${s}`
}

export default function FastingTracker() {
  const [store, setStore] = useState(() => readStore())
  const [now, setNow] = useState(Date.now())
  const [type, setType] = useState('sunrise-sunset')
  const [customHours, setCustomHours] = useState(8)
  const [intention, setIntention] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 220)
    return () => clearTimeout(t)
  }, [])

  const active = store.active
  const elapsedMs = active ? now - new Date(active.startedAt).getTime() : 0
  const versePick = encouragements[Math.floor(now / 3600000) % encouragements.length]

  const totalHours = useMemo(
    () => (store.history || []).reduce((sum, h) => sum + (h.durationMs || 0), 0) / 3600000,
    [store.history],
  )
  const personalRecord = useMemo(
    () => Math.max(0, ...(store.history || []).map((h) => (h.durationMs || 0) / 3600000)),
    [store.history],
  )

  const startFast = () => {
    const selected = fastTypes.find((f) => f.id === type)
    const targetHours = type === 'custom' ? Number(customHours || 1) : selected.hours
    const next = {
      ...store,
      active: {
        id: Date.now(),
        type,
        typeLabel: selected.label,
        intention: intention.trim(),
        startedAt: new Date().toISOString(),
        targetHours,
      },
    }
    setStore(next)
    saveStore(next)
    setIntention('')
  }

  const breakFast = () => {
    if (!active) return
    if (!window.confirm('Break your fast now?')) return
    const endedAt = new Date().toISOString()
    const durationMs = Date.now() - new Date(active.startedAt).getTime()
    const entry = { ...active, endedAt, durationMs, date: new Date().toLocaleDateString() }
    const next = { ...store, active: null, history: [entry, ...(store.history || [])].slice(0, 100) }
    setStore(next)
    saveStore(next)
  }

  const addNote = () => {
    if (!note.trim() || !active) return
    const next = {
      ...store,
      notes: [{ id: Date.now(), text: note.trim(), at: new Date().toISOString() }, ...(store.notes || [])].slice(0, 80),
    }
    setStore(next)
    saveStore(next)
    setNote('')
  }

  return (
    <div className="content-scroll" style={{ padding: '0 16px', paddingTop: '110px', paddingBottom: '110px', maxWidth: '680px', margin: '0 auto' }}>
      <h1 className="text-2xl font-bold text-white">🕐 <span style={{ color: '#D4A843' }}>Fasting Tracker</span></h1>

      {active ? (
        <section className="mt-4 glass-panel rounded-2xl p-4 text-white">
          <div className="mx-auto flex h-52 w-52 items-center justify-center rounded-full border-4 border-[#D4A843]" style={{ boxShadow: '0 0 20px rgba(212,168,67,0.45)' }}>
            <p className="text-3xl font-semibold">{formatDuration(elapsedMs)}</p>
          </div>
          <p className="mt-3 text-center text-sm text-white/80">Fasting since {new Date(active.startedAt).toLocaleTimeString()}</p>
          <p className="mt-1 text-center text-xs text-[#D4A843]">{active.typeLabel}</p>
          <div className="mt-4 glass-panel rounded-xl p-3 text-sm">
            <p className="italic text-white/90">{versePick.text}</p>
            <p className="mt-1 text-xs text-[#D4A843]">{versePick.ref}</p>
            <p className="mt-1 text-xs text-white/70">{versePick.note}</p>
          </div>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={breakFast} className="rounded-lg border border-white/35 px-3 py-2 text-sm text-white">Break Fast</button>
            <input value={note} onChange={(e) => setNote(e.target.value)} className="flex-1 glass-input-field rounded-lg px-3 py-2 text-sm text-white" placeholder="Add prayer note..." />
            <button type="button" onClick={addNote} className="rounded-lg px-3 py-2 text-sm font-semibold text-[#1a1a1a]" style={{ background: '#D4A843' }}>Save</button>
          </div>
        </section>
      ) : (
        <section className="mt-4 glass-panel rounded-2xl p-4 text-white">
          <p className="text-sm font-semibold text-[#D4A843]">Start Fast</p>
          <div className="mt-2 space-y-2">
            {fastTypes.map((f) => (
              <label key={f.id} className="flex items-center gap-2 text-sm">
                <input type="radio" checked={type === f.id} onChange={() => setType(f.id)} />
                {f.label}
              </label>
            ))}
            {type === 'custom' ? (
              <input type="number" min={1} max={168} value={customHours} onChange={(e) => setCustomHours(e.target.value)} className="w-full glass-input-field rounded-lg px-3 py-2 text-sm text-white" placeholder="Custom hours" />
            ) : null}
            <input value={intention} onChange={(e) => setIntention(e.target.value)} className="w-full glass-input-field rounded-lg px-3 py-2 text-sm text-white" placeholder="What are you seeking God for? (optional)" />
            <button type="button" onClick={startFast} className="w-full rounded-xl px-4 py-2 text-sm font-semibold text-[#1a1a1a]" style={{ background: '#D4A843' }}>
              Start Fast
            </button>
          </div>
        </section>
      )}

      <section className="mt-4 glass-panel rounded-2xl p-4 text-white">
        <p className="text-sm font-semibold text-[#D4A843]">History</p>
        <p className="mt-1 text-xs text-white/75">Total fasting hours: {totalHours.toFixed(1)} | Personal record: {personalRecord.toFixed(1)}h</p>
        <div className="mt-3 space-y-2">
          {loading ? (
            <>
              <div className="gold-skeleton" />
              <div className="gold-skeleton" style={{ width: '72%' }} />
            </>
          ) : store.history.length ? store.history.map((h) => (
            <article key={h.id} className="glass-panel rounded-xl p-3 text-sm">
              <p className="text-white/90">{h.typeLabel}</p>
              <p className="text-xs text-white/70">{h.date} - {(h.durationMs / 3600000).toFixed(1)}h</p>
            </article>
          )) : <p className="text-sm text-white/70">🕐 Your fasting journey begins here.</p>}
        </div>
      </section>
    </div>
  )
}
