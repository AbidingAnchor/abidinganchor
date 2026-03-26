import { useMemo, useState } from 'react'
import { deleteJournalEntry, getJournalEntries, saveToJournal } from '../utils/journal'

const filters = ['All', 'This Week', 'Saved Verses', 'Daily Verse', 'Prayers']

function normalizeEntry(entry) {
  const tag = entry.tag ?? (Array.isArray(entry.tags) && entry.tags.length > 0 ? entry.tags[0] : 'Reflection')
  const savedDate = entry.date ?? (entry.savedAt ? new Date(entry.savedAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }) : '')
  return {
    id: String(entry.id),
    reference: entry.reference ?? 'Saved Verse',
    note: entry.note || entry.verse || '',
    date: savedDate,
    tag,
  }
}

const todayDisplay = new Date().toLocaleDateString('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
})

function Journal() {
  const [showForm, setShowForm] = useState(false)
  const [activeFilter, setActiveFilter] = useState('All')
  const [reference, setReference] = useState('')
  const [note, setNote] = useState('')
  const [entries, setEntries] = useState(() => getJournalEntries().map(normalizeEntry))
  const glassCard = {
    background: 'rgba(255, 255, 255, 0.25)',
    backdropFilter: 'blur(14px)',
    border: '1px solid rgba(255, 255, 255, 0.5)',
  }
  const headingStyle = { color: '#ffffff', textShadow: '0 1px 8px rgba(0,60,120,0.4)' }
  const bodyStyle = { color: 'rgba(255,255,255,0.85)' }

  const filteredEntries = useMemo(() => {
    if (activeFilter === 'All') return entries
    if (activeFilter === 'Saved Verses') return entries.filter((entry) => entry.tag === 'Saved Verse')
    if (activeFilter === 'Daily Verse') return entries.filter((entry) => entry.tag === 'Daily Verse')
    if (activeFilter === 'Prayers') return entries.filter((entry) => entry.tag === 'Prayer')
    if (activeFilter === 'This Week') {
      const now = new Date()
      const weekAgo = new Date()
      weekAgo.setDate(now.getDate() - 7)
      return entries.filter((entry) => {
        const date = new Date(entry.date)
        return !Number.isNaN(date.getTime()) && date >= weekAgo && date <= now
      })
    }
    return entries
  }, [activeFilter, entries])

  const handleSaveEntry = () => {
    if (!reference.trim() || !note.trim()) return
    const newEntry = saveToJournal({
      verse: note.trim(),
      reference: reference.trim(),
      note: note.trim(),
      tags: ['Reflection'],
    })
    setEntries((prev) => [normalizeEntry(newEntry), ...prev])
    setReference('')
    setNote('')
    setShowForm(false)
  }

  const handleDeleteEntry = (entry) => {
    deleteJournalEntry(entry.id)
    const nextEntries = getJournalEntries().map(normalizeEntry)
    setEntries(nextEntries)
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
      <div
        className="content-scroll"
        style={{ padding: '0 16px', paddingTop: '200px', paddingBottom: '100px', maxWidth: '680px', margin: '0 auto', width: '100%' }}
      >
    <section className="space-y-5">
      <header className="space-y-1">
        <h1 className="font-bold" style={{ ...headingStyle, fontSize: '24px' }}>Prayer Journal</h1>
        <p style={bodyStyle}>Your personal reflections &amp; notes</p>
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-accent-gold">{entries.length} entries</p>
      </header>

      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setShowForm((prev) => !prev)}
          className="w-full rounded-xl bg-accent-gold px-4 py-3 text-sm font-semibold text-[#1a1a1a] transition hover:brightness-95"
        >
          + New Journal Entry
        </button>

        {showForm && (
          <article className="space-y-3 rounded-2xl p-4" style={glassCard}>
            <input
              type="text"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="Verse reference e.g. John 3:16"
              className="w-full rounded-lg bg-white/85 px-3 py-2 text-[#1a1a1a] placeholder:text-[#1a1a1a]/60 focus:outline-none"
              style={{ width: '100%', maxWidth: '100%' }}
            />
            <textarea
              rows={4}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Write your reflection, prayer, or thoughts..."
              className="w-full rounded-lg bg-white/85 px-3 py-2 text-[#1a1a1a] placeholder:text-[#1a1a1a]/60 focus:outline-none"
              style={{ width: '100%', maxWidth: '100%' }}
            />
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-gold">{todayDisplay}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              <button
                type="button"
                onClick={handleSaveEntry}
                style={{ minWidth: '140px', flex: 1 }}
                className="rounded-lg bg-accent-gold px-3 py-2 text-sm font-semibold text-[#1a1a1a]"
              >
                Save Entry
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                style={{ minWidth: '140px', flex: 1 }}
                className="rounded-lg border border-accent-gold px-3 py-2 text-sm font-semibold text-white"
              >
                Cancel
              </button>
            </div>
          </article>
        )}
      </div>

      <section className="flex flex-wrap gap-2">
        {filters.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setActiveFilter(filter)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              activeFilter === filter ? 'bg-accent-gold text-primary-dark' : 'bg-parchment text-primary-dark'
            }`}
            style={activeFilter === filter ? undefined : glassCard}
          >
            {filter}
          </button>
        ))}
      </section>

      {filteredEntries.length > 0 ? (
        <section className="space-y-3">
          {filteredEntries.map((entry) => (
            <article key={entry.id} className="rounded-r-2xl rounded-l-md border-l-[3px] border-accent-gold p-4" style={{ ...glassCard, isolation: 'isolate' }}>
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs" style={bodyStyle}>{entry.date}</p>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-accent-gold">{entry.reference}</p>
              </div>
              <div className="mt-2">
                <span className="rounded-full bg-olive px-2 py-1 text-xs font-medium text-background-cream">{entry.tag}</span>
              </div>
              <p className="mt-3 text-lg text-white [font-family:'Lora',serif] italic">{entry.note}</p>
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleDeleteEntry(entry)}
                  className="text-xs font-medium text-red-200"
                >
                  🗑 Delete
                </button>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className="flex min-h-56 flex-col items-center justify-center rounded-2xl p-6 text-center" style={glassCard}>
          <p className="text-4xl text-accent-gold">✝</p>
          <p className="mt-3 text-lg font-semibold text-white" style={{ textShadow: '0 1px 8px rgba(0,60,120,0.4)' }}>Your journal is empty</p>
          <p className="mt-1 text-sm" style={bodyStyle}>Start writing your first reflection</p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="mt-4 rounded-lg bg-accent-gold px-4 py-2 text-sm font-semibold text-[#1a1a1a]"
          >
            Write First Entry
          </button>
        </section>
      )}
    </section>
      </div>
    </div>
  )
}

export default Journal
