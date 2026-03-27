import { useEffect, useMemo, useState } from 'react'
import { deleteJournalEntry, getJournalEntries, saveToJournal } from '../utils/journal'
import { getHighlights } from '../utils/highlights'

const filters = ['All', 'This Week', 'Saved Verses', 'Daily Verse', 'Prayers']
const GRATITUDE_KEY = 'abidinganchor-gratitude'
const gratitudeVerses = ['Philippians 4:6', '1 Thessalonians 5:18', 'Psalm 107:1', 'Colossians 3:17']

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
  const [activeTab, setActiveTab] = useState('journal')
  const [showForm, setShowForm] = useState(false)
  const [activeFilter, setActiveFilter] = useState('All')
  const [reference, setReference] = useState('')
  const [note, setNote] = useState('')
  const [entries, setEntries] = useState(() => getJournalEntries().map(normalizeEntry))
  const [gratitudeText, setGratitudeText] = useState('')
  const [gratitudeEntries, setGratitudeEntries] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(GRATITUDE_KEY) || '[]')
    } catch {
      return []
    }
  })
  const [loading, setLoading] = useState(true)
  const glassCard = {
    background: 'rgba(255, 255, 255, 0.25)',
    backdropFilter: 'blur(14px)',
    border: '1px solid rgba(255, 255, 255, 0.5)',
  }
  const headingStyle = { color: '#ffffff', textShadow: '0 1px 8px rgba(0,60,120,0.4)' }
  const bodyStyle = { color: 'rgba(255,255,255,0.85)' }

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 220)
    return () => clearTimeout(t)
  }, [])

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

  const highlightEntries = useMemo(() => Object.values(getHighlights() || {}), [entries, activeTab])
  const gratitudeStreak = useMemo(() => {
    if (gratitudeEntries.length === 0) return 0
    const days = [...new Set(gratitudeEntries.map((entry) => new Date(entry.date).toDateString()))]
    days.sort((a, b) => new Date(b) - new Date(a))
    let streak = 0
    let cursor = new Date()
    cursor.setHours(0, 0, 0, 0)
    for (const day of days) {
      const compare = new Date(day)
      compare.setHours(0, 0, 0, 0)
      if (compare.getTime() === cursor.getTime()) {
        streak += 1
        cursor.setDate(cursor.getDate() - 1)
      } else if (compare.getTime() < cursor.getTime()) {
        break
      }
    }
    return streak
  }, [gratitudeEntries])

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

  const saveGratitude = () => {
    if (!gratitudeText.trim()) return
    const next = [{ id: String(Date.now()), date: new Date().toISOString(), text: gratitudeText.trim() }, ...gratitudeEntries].slice(0, 30)
    setGratitudeEntries(next)
    localStorage.setItem(GRATITUDE_KEY, JSON.stringify(next))
    setGratitudeText('')
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
      <div
        className="content-scroll"
        style={{ padding: '0 16px', paddingTop: '200px', paddingBottom: '100px', maxWidth: '680px', margin: '0 auto', width: '100%' }}
      >
    <section className="space-y-5">
      <section className="flex gap-2">
        <button type="button" onClick={() => setActiveTab('journal')} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${activeTab === 'journal' ? 'bg-accent-gold text-primary-dark' : 'text-white'}`} style={activeTab === 'journal' ? undefined : glassCard}>Journal</button>
        <button type="button" onClick={() => setActiveTab('gratitude')} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${activeTab === 'gratitude' ? 'bg-accent-gold text-primary-dark' : 'text-white'}`} style={activeTab === 'gratitude' ? undefined : glassCard}>Gratitude</button>
        <button type="button" onClick={() => setActiveTab('highlights')} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${activeTab === 'highlights' ? 'bg-accent-gold text-primary-dark' : 'text-white'}`} style={activeTab === 'highlights' ? undefined : glassCard}>Highlights</button>
      </section>

      {activeTab === 'gratitude' ? (
        <section className="space-y-3">
          <article className="rounded-2xl p-4" style={glassCard}>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-accent-gold">Gratitude Verse</p>
            <p className="mt-2 text-lg text-white [font-family:'Lora',serif]">{gratitudeVerses[new Date().getDate() % gratitudeVerses.length]}</p>
            <p className="mt-1 text-sm text-white/80">Streak: {gratitudeStreak} day{gratitudeStreak === 1 ? '' : 's'}</p>
          </article>
          <article className="rounded-2xl p-4" style={{ ...glassCard, border: '1px solid rgba(212,168,67,0.65)' }}>
            <p className="text-sm font-semibold text-white">Today I'm grateful for...</p>
            <textarea rows={3} value={gratitudeText} onChange={(event) => setGratitudeText(event.target.value)} className="mt-2 w-full rounded-lg bg-white/85 px-3 py-2 text-[#1a1a1a] placeholder:text-[#1a1a1a]/60 focus:outline-none" />
            <button type="button" className="gold-btn mt-3" onClick={saveGratitude}>Save Gratitude</button>
          </article>
          {gratitudeEntries.slice(0, 7).map((entry) => (
            <article key={entry.id} className="rounded-2xl p-4" style={glassCard}>
              <p className="text-xs text-white/70">{new Date(entry.date).toLocaleDateString()}</p>
              <p className="mt-1 text-white">{entry.text}</p>
            </article>
          ))}
        </section>
      ) : null}

      {activeTab === 'highlights' ? (
        <section className="space-y-3">
          {highlightEntries.length === 0 ? (
            <section className="flex min-h-56 flex-col items-center justify-center rounded-2xl p-6 text-center" style={glassCard}>
              <p className="text-4xl text-accent-gold">💛</p>
              <p className="mt-3 text-lg font-semibold text-white">Nothing highlighted yet.</p>
            </section>
          ) : highlightEntries.map((entry) => (
            <article key={entry.reference} className="rounded-r-2xl rounded-l-md border-l-[3px] border-accent-gold p-4" style={{ ...glassCard, background: `${entry.color || '#D4A843'}33` }}>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-accent-gold">{entry.reference}</p>
              <p className="mt-2 text-white">{entry.text}</p>
            </article>
          ))}
        </section>
      ) : null}

      {activeTab === 'journal' ? (
      <>
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

      {loading ? (
        <section className="space-y-2 rounded-2xl p-4" style={glassCard}>
          <div className="gold-skeleton" />
          <div className="gold-skeleton" style={{ width: '80%' }} />
          <div className="gold-skeleton" style={{ width: '60%' }} />
        </section>
      ) : filteredEntries.length > 0 ? (
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
          <p className="text-4xl text-accent-gold">📜</p>
          <p className="mt-3 text-lg font-semibold text-white" style={{ textShadow: '0 1px 8px rgba(0,60,120,0.4)' }}>Your journal is empty. Start writing today.</p>
          <p className="mt-1 text-sm" style={bodyStyle}>Capture a verse, reflection, or prayer.</p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="mt-4 rounded-lg bg-accent-gold px-4 py-2 text-sm font-semibold text-[#1a1a1a]"
          >
            Write First Entry
          </button>
        </section>
      )}
      </>
      ) : null}
    </section>
      </div>
    </div>
  )
}

export default Journal
