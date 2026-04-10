import { useMemo, useState } from 'react'
import BibleReader from '../components/BibleReader'
import { saveToJournal } from '../utils/journal'
import SaveToast from '../components/SaveToast'
import { books } from './Search'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const BIBLE_FLAT = [...books.old, ...books.new]

function strNorm(s) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

const BOOK_ALIASES = {
  matt: 'matthew',
  mk: 'mark',
  psalm: 'psalms',
  psalms: 'psalms',
}

function parseTodayReading(text) {
  const fallback = { name: 'Matthew', api: 'matthew', chapter: 1, total: 28 }
  if (!text || typeof text !== 'string') return fallback
  const firstPart = text.split(/\s+-\s+/)[0].trim()
  const m = firstPart.match(/^(.+?)\s+(\d+)\s*$/)
  if (!m) return fallback
  const rawBook = m[1].trim()
  const chapter = parseInt(m[2], 10)
  let n = strNorm(rawBook)
  if (BOOK_ALIASES[n]) n = BOOK_ALIASES[n]
  let book = BIBLE_FLAT.find((b) => b.apiName === n)
  if (!book) book = BIBLE_FLAT.find((b) => strNorm(b.name) === strNorm(rawBook))
  if (!book) book = BIBLE_FLAT.find((b) => b.apiName.startsWith(n) && n.length >= 3)
  if (!book) return { name: rawBook, api: n || fallback.api, chapter, total: 150 }
  return { name: book.name, api: book.apiName, chapter, total: book.chapters }
}

const plans = [
  {
    id: 'nt30',
    name: '30-Day New Testament',
    totalDays: 30,
    completedDays: 12,
    todayReading: 'Matthew 5 - 7',
    subtitle: 'The Sermon on the Mount',
    readTime: '~12 min read',
    week: [
      { day: 'Mon', reading: 'Matt 3' },
      { day: 'Tue', reading: 'Matt 4' },
      { day: 'Wed', reading: 'Matt 5' },
      { day: 'Thu', reading: 'Matt 6' },
      { day: 'Fri', reading: 'Matt 7' },
      { day: 'Sat', reading: 'Matt 8' },
      { day: 'Sun', reading: 'Matt 9' },
    ],
  },
  {
    id: 'psalms7',
    name: '7-Day Psalms',
    totalDays: 7,
    completedDays: 2,
    todayReading: 'Psalm 23 - 27',
    subtitle: 'Confidence and Comfort',
    readTime: '~8 min read',
    week: [
      { day: 'Mon', reading: 'Psalm 1 - 5' },
      { day: 'Tue', reading: 'Psalm 6 - 10' },
      { day: 'Wed', reading: 'Psalm 11 - 17' },
      { day: 'Thu', reading: 'Psalm 18 - 22' },
      { day: 'Fri', reading: 'Psalm 23 - 27' },
      { day: 'Sat', reading: 'Psalm 28 - 34' },
      { day: 'Sun', reading: 'Psalm 35 - 41' },
    ],
  },
]

function ReadingPlan({ onOpenWorship }) {
  const { user } = useAuth()
  const [viewMode, setViewMode] = useState('plans')
  const [activePlanId, setActivePlanId] = useState('nt30')
  const [selectedDay, setSelectedDay] = useState('Wed')
  const [toastTrigger, setToastTrigger] = useState(0)
  const [readerOpen, setReaderOpen] = useState(false)
  const [readerState, setReaderState] = useState(() => parseTodayReading(plans[0].todayReading))
  const [testament, setTestament] = useState('old')
  const [chapterPickerBook, setChapterPickerBook] = useState(null)
  const activePlan = plans.find((plan) => plan.id === activePlanId) ?? plans[0]
  const completion = Math.round((activePlan.completedDays / activePlan.totalDays) * 100)

  // Define style objects that were missing
  const glassCard = {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(14px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
  }

  const weekStatus = useMemo(() => {
    const todayIndex = 2
    return activePlan.week.map((entry, index) => ({
      ...entry,
      isCompleted: index < todayIndex,
      isToday: index === todayIndex,
      isFuture: index > todayIndex,
    }))
  }, [activePlan])




  const handleSaveReadingToJournal = async () => {
    await saveToJournal({
      verse: `${activePlan.todayReading} — ${activePlan.subtitle}`,
      reference: activePlan.todayReading,
      tags: ['Reading Plan'],
    })
    setToastTrigger((t) => t + 1)
  }

  const visibleBooks = testament === 'old' ? books.old : books.new

  const handleContinueReading = async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('last_book,last_chapter').eq('id', user.id).single()
      if (error) {
        console.error('Profile query error:', error)
        const targetBook = BIBLE_FLAT[0]
        setReaderState({ name: targetBook.name, api: targetBook.apiName, chapter: 1, total: targetBook.chapters })
        setReaderOpen(true)
        return
      }
      const lastBook = data?.last_book || 'GEN'
      const lastChapter = data?.last_chapter || 'GEN.1'
      const targetBook = BIBLE_FLAT.find((book) => book.name === lastBook) || BIBLE_FLAT[0]
      setReaderState({ name: targetBook.name, api: targetBook.apiName, chapter: Number(lastChapter || 1), total: targetBook.chapters })
      setReaderOpen(true)
    } catch (error) {
      console.error('Continue reading error:', error)
      const targetBook = BIBLE_FLAT[0]
      setReaderState({ name: targetBook.name, api: targetBook.apiName, chapter: 1, total: targetBook.chapters })
      setReaderOpen(true)
    }
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
      <div
        className="content-scroll"
        style={{ padding: '0 16px', paddingTop: '220px', paddingBottom: '100px', maxWidth: '680px', margin: '0 auto', width: '100%' }}
      >
        {readerOpen ? (
          <BibleReader
            open={readerOpen}
            onClose={() => setReaderOpen(false)}
            bookDisplayName={readerState.name}
            apiBookName={readerState.api}
            chapterNumber={readerState.chapter}
            onChapterChange={(n) => setReaderState((s) => ({ ...s, chapter: n }))}
            totalChapters={readerState.total}
            journalTags={['Reading Plan']}
            onOpenWorship={onOpenWorship}
          />
        ) : (
        <section className="space-y-6">
      <div className="flex gap-2">
        <button type="button" onClick={() => setViewMode('plans')} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${viewMode === 'plans' ? 'bg-gold text-primary-purple' : 'text-white app-card'}`}>
          Reading Plans
        </button>
        <button type="button" onClick={() => setViewMode('bible')} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${viewMode === 'bible' ? 'bg-gold text-primary-purple' : 'text-white app-card'}`}>
          Full Bible
        </button>
      </div>
      {viewMode === 'plans' ? (
      <>
      <header className="space-y-2">
        <h1 className="text-page-title">Reading Plan</h1>
        <p className="text-body">Stay consistent in the Word</p>
        <div className="space-y-2 rounded-2xl p-4 app-card">
          <div className="flex items-center justify-between">
            <p className="text-sm text-body">{activePlan.completedDays} of {activePlan.totalDays} days complete</p>
            <p className="text-sm font-semibold text-gold">{completion}% complete</p>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/30">
            <div className="h-full rounded-full bg-gold-gradient" style={{ width: `${completion}%` }} />
          </div>
        </div>
      </header>

      <section className="space-y-3">
        <h2 className="text-section-header">Plan Selector</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {plans.map((plan) => {
            const isActive = plan.id === activePlanId
            return (
              <button
                  key={plan.id}
                  type="button"
                  onClick={() => setActivePlanId(plan.id)}
                  className={`app-card p-4 text-left transition ${isActive ? 'border-gold' : 'border-border-gold-light hover:border-gold'}`}
                  style={{ minWidth: '140px', flex: 1 }}
                >
                <p className="text-base font-semibold text-white">{plan.name}</p>
                <p className="mt-1 text-sm text-body">
                  {plan.completedDays} / {plan.totalDays} days complete
                </p>
              </button>
            )
          })}
        </div>
      </section>

      <article className="app-card rounded-3xl p-8 text-white shadow-md">
        <p className="text-xs font-semibold uppercase tracking-wide text-gold">Today&apos;s Reading</p>
        <p className="mt-2 text-scripture">{activePlan.todayReading}</p>
        <p className="mt-1 text-body">{activePlan.subtitle}</p>
        <div className="mt-5 flex items-center justify-between gap-3">
          <p className="text-xs text-body">{activePlan.readTime}</p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={handleSaveReadingToJournal}
              className="btn-secondary"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setReaderState(parseTodayReading(activePlan.todayReading))
                setReaderOpen(true)
              }}
              className="btn-primary"
            >
              Start Reading
            </button>
          </div>
        </div>
      </article>

      <section className="space-y-3">
        <h2 className="text-section-header">Weekly Calendar</h2>
        <div
          style={{
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            paddingBottom: '4px',
          }}
        >
          <style>{`.cal-scroll::-webkit-scrollbar { display: none; }`}</style>
          <div className="cal-scroll" style={{ display: 'flex', gap: '8px', minWidth: 'max-content', paddingRight: '16px' }}>
            {weekStatus.map((entry) => {
              const isSelected = selectedDay === entry.day
              const stateClasses = entry.isCompleted
                ? 'bg-gold-gradient text-primary-dark border-transparent'
                : entry.isToday
                  ? 'border-gold text-white'
                  : 'border-border-gold-light text-white'

              return (
                <button
                  key={entry.day}
                  type="button"
                  onClick={() => setSelectedDay(entry.day)}
                  className={`app-card border p-2 text-left transition ${stateClasses} ${
                    isSelected ? 'ring-2 ring-gold/60' : ''
                  }`}
                  style={{ minWidth: '80px' }}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide">{entry.day}</p>
                    {entry.isCompleted && <span className="text-sm text-primary-dark">✓</span>}
                  </div>
                  <p className={`text-xs ${entry.isCompleted ? 'text-primary-dark/95' : 'text-body'}`}>
                    {entry.reading}
                  </p>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-section-header">Progress</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          <article className="app-card rounded-xl p-4 text-center" style={{ minWidth: '140px', flex: 1 }}>
            <p className="text-xs uppercase tracking-wide text-accent-gold">Days Done</p>
            <p className="mt-1 text-sm font-semibold text-white">
              {activePlan.completedDays} / {activePlan.totalDays}
            </p>
          </article>
          <article className="app-card rounded-xl p-4 text-center" style={{ minWidth: '140px', flex: 1 }}>
            <p className="text-xs uppercase tracking-wide text-accent-gold">Streak</p>
            <p className="mt-1 text-sm font-semibold text-white">3 days 🔥</p>
          </article>
          <article className="app-card rounded-xl p-4 text-center" style={{ minWidth: '140px', flex: 1 }}>
            <p className="text-xs uppercase tracking-wide text-accent-gold">Best Streak</p>
            <p className="mt-1 text-sm font-semibold text-white">7 days</p>
          </article>
        </div>
      </section>
    </>
      ) : (
        <section className="space-y-3">
          <header className="space-y-2">
            <h1 className="text-page-title">Read Scripture</h1>
            <p className="text-body">Browse all 66 books and read chapter by chapter</p>
            <button type="button" className="btn-primary" onClick={handleContinueReading}>Continue Reading</button>
          </header>
          <div className="inline-flex rounded-xl p-1">
            <button type="button" onClick={() => setTestament('old')} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${testament === 'old' ? 'bg-accent-gold text-primary-dark' : 'app-card text-white'}`}>Old Testament (39)</button>
            <button type="button" onClick={() => setTestament('new')} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${testament === 'new' ? 'bg-accent-gold text-primary-dark' : 'app-card text-white'}`}>New Testament (27)</button>
          </div>
          {chapterPickerBook ? (
            <article className="rounded-2xl p-4" style={glassCard}>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-white">{chapterPickerBook.name}</h2>
                <button type="button" className="back-btn" onClick={() => setChapterPickerBook(null)}>Back</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(44px, 1fr))', gap: '8px' }}>
                {Array.from({ length: chapterPickerBook.chapters }, (_, idx) => idx + 1).map((chapter) => (
                  <button
                    key={chapter}
                    type="button"
                    onClick={() => {
                      setReaderState({ name: chapterPickerBook.name, api: chapterPickerBook.apiName, chapter, total: chapterPickerBook.chapters })
                      setReaderOpen(true)
                    }}
                    className="app-card rounded-lg py-2 text-sm text-white border border-white/20 hover:border-accent-gold"
                  >
                    {chapter}
                  </button>
                ))}
              </div>
            </article>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: '8px' }}>
              {visibleBooks.map((book) => (
                <button key={book.name} type="button" onClick={() => setChapterPickerBook(book)} className="app-card rounded-lg p-3 text-left transition hover:brightness-95">
                  <p className="text-sm font-semibold text-white">{book.name}</p>
                  <p className="text-xs text-body">{book.chapters} chapters</p>
                </button>
              ))}
            </div>
          )}
        </section>
      )}
    </section>
        )}
        <SaveToast trigger={toastTrigger} />
      </div>
    </div>
  )
}

export default ReadingPlan
