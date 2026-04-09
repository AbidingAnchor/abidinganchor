import { useEffect, useMemo, useState } from 'react'
import { deleteJournalEntry, getJournalEntries, saveToJournal } from '../utils/journal'
import { getHighlights } from '../utils/highlights'
import { useAuth } from '../context/AuthContext'

const filters = ['All', 'This Week', 'Saved Verses', 'Daily Verse', 'Prayers']
const GRATITUDE_KEY = 'abidinganchor-gratitude'
const gratitudeVerses = ['Philippians 4:6', '1 Thessalonians 5:18', 'Psalm 107:1', 'Colossians 3:17']

function normalizeEntry(entry) {
  const tag = entry.entry_type || 'Reflection'
  const savedDate = entry.created_at ? new Date(entry.created_at).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }) : ''
  return {
    id: String(entry.id),
    reference: entry.verse_reference ?? 'No verse reference',
    note: entry.content || '',
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
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('journal')
  const [showForm, setShowForm] = useState(false)
  const [activeFilter, setActiveFilter] = useState('All')
  const [reference, setReference] = useState('')
  const [note, setNote] = useState('')
  const [entries, setEntries] = useState([])
  const [gratitudeText, setGratitudeText] = useState('')
  const [gratitudeEntries, setGratitudeEntries] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(GRATITUDE_KEY) || '[]')
    } catch {
      return []
    }
  })
  const [loading, setLoading] = useState(true)

  // Define style objects that were missing
  const bodyStyle = {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: '14px',
  }

  useEffect(() => {
    let active = true
    const load = async () => {
      if (!user?.id) return
      setLoading(true)
      const data = await getJournalEntries(user.id)
      if (!active) return
      setEntries((data || []).map(normalizeEntry))
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [user?.id])

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

  const handleSaveEntry = async () => {
    if (!note.trim()) return
    const newEntry = await saveToJournal({
      verse: reference.trim() ? note.trim() : null,
      reference: reference.trim() || null,
      note: note.trim(),
      tags: ['Reflection'],
      userId: user?.id,
    })
    if (!newEntry) return
    setEntries((prev) => [normalizeEntry(newEntry), ...prev])
    setReference('')
    setNote('')
    setShowForm(false)
  }

  const handleDeleteEntry = async (entry) => {
    await deleteJournalEntry(entry.id)
    const nextEntries = await getJournalEntries(user?.id)
    setEntries((nextEntries || []).map(normalizeEntry))
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
        <button type="button" onClick={() => setActiveTab('journal')} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${activeTab === 'journal' ? 'bg-gold text-primary-purple' : 'app-card text-gold'}`}>Journal</button>
        <button type="button" onClick={() => setActiveTab('gratitude')} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${activeTab === 'gratitude' ? 'bg-gold text-primary-purple' : 'app-card text-gold'}`}>Gratitude</button>
        <button type="button" onClick={() => setActiveTab('highlights')} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${activeTab === 'highlights' ? 'bg-gold text-primary-purple' : 'app-card text-gold'}`}>Highlights</button>
      </section>

      {activeTab === 'gratitude' ? (
        <section className="space-y-3">
          <article className="app-card rounded-2xl p-4 border-l-[3px] border-gold">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-gold">Gratitude Verse</p>
            <p className="mt-2 text-scripture">{gratitudeVerses[new Date().getDate() % gratitudeVerses.length]}</p>
            <p className="mt-1 text-body">Streak: {gratitudeStreak} day{gratitudeStreak === 1 ? '' : 's'}</p>
          </article>
          <article className="app-card rounded-2xl p-4 border-l-[3px] border-gold">
            <p className="text-section-header">Today I'm grateful for...</p>
            <textarea rows={3} value={gratitudeText} onChange={(event) => setGratitudeText(event.target.value)} className="app-card mt-2 w-full rounded-lg px-3 py-2 text-white placeholder:text-white/60 focus:outline-none focus:border-gold" />
            <button type="button" className="btn-primary mt-3" onClick={saveGratitude}>Save Gratitude</button>
          </article>
          {gratitudeEntries.slice(0, 7).map((entry) => (
            <article key={entry.id} className="app-card rounded-2xl p-4 border-l-[3px] border-gold">
              <p className="text-text-secondary-light">{new Date(entry.date).toLocaleDateString()}</p>
              <p className="mt-1 text-body">{entry.text}</p>
            </article>
          ))}
        </section>
      ) : null}

      {activeTab === 'highlights' ? (
        <section className="space-y-3">
          {highlightEntries.length === 0 ? (
            <section className="app-card flex min-h-56 flex-col items-center justify-center rounded-2xl p-6 text-center border-l-[3px] border-gold">
              <p className="text-4xl text-gold">💛</p>
              <p className="mt-3 text-lg font-semibold text-white">Nothing highlighted yet.</p>
            </section>
          ) : highlightEntries.map((entry) => (
            <article key={entry.reference} className="app-card rounded-r-2xl rounded-l-md border-l-[3px] border-gold p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-gold">{entry.reference}</p>
              <p className="mt-2 text-body">{entry.text}</p>
            </article>
          ))}
        </section>
      ) : null}

      {activeTab === 'journal' ? (
      <>
      <header className="space-y-1">
        <h1 className="text-page-title">Prayer Journal</h1>
        <p className="text-body">Your personal reflections &amp; notes</p>
        <p className="text-gold text-xs font-semibold uppercase tracking-wider">{entries.length} entries</p>
      </header>

      <div className="space-y-3">
          <button type="button" onClick={() => setIsAddingNewEntry(true)} className="btn-primary">
            + New Journal Entry
          </button>

        {showForm && (
          <article className="app-card space-y-3 rounded-2xl p-4 border-l-[3px] border-[#D4A843]">
            <input
              type="text"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="Verse reference e.g. John 3:16"
              className="app-card w-full rounded-lg px-3 py-2 text-white placeholder:text-white/60 focus:outline-none focus:border-[#D4A843]"
              style={{ width: '100%', maxWidth: '100%' }}
            />
            <textarea
              rows={4}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Write your reflection, prayer, or thoughts..."
              className="app-card w-full rounded-lg px-3 py-2 text-white placeholder:text-white/60 focus:outline-none focus:border-[#D4A843]"
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
              activeFilter === filter ? 'bg-accent-gold text-[#1a1a1a]' : 'app-card text-gold-accent'
            }`}
          >
            {filter}
          </button>
        ))}
      </section>

      {loading ? (
        <section className="app-card space-y-2 rounded-2xl p-4 border-l-[3px] border-[#D4A843]">
          <div className="gold-skeleton" />
          <div className="gold-skeleton" style={{ width: '80%' }} />
          <div className="gold-skeleton" style={{ width: '60%' }} />
        </section>
      ) : filteredEntries.length > 0 ? (
        <section className="space-y-3">
          {filteredEntries.map((entry) => (
            <article key={entry.id} className="app-card rounded-r-2xl rounded-l-md border-l-[3px] border-accent-gold p-4">
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
        <section className="app-card flex min-h-56 flex-col items-center justify-center rounded-2xl p-6 text-center border-l-[3px] border-[#D4A843]">
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
