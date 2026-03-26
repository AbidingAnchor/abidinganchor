import { useMemo, useState } from 'react'
import BibleReader from '../components/BibleReader'
import { saveToJournal } from '../utils/journal'
import SaveToast from '../components/SaveToast'
import { books } from './Search'

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
  const [activePlanId, setActivePlanId] = useState('nt30')
  const [selectedDay, setSelectedDay] = useState('Wed')
  const [toastTrigger, setToastTrigger] = useState(0)
  const [readerOpen, setReaderOpen] = useState(false)
  const [readerState, setReaderState] = useState(() => parseTodayReading(plans[0].todayReading))
  const activePlan = plans.find((plan) => plan.id === activePlanId) ?? plans[0]
  const completion = Math.round((activePlan.completedDays / activePlan.totalDays) * 100)

  const weekStatus = useMemo(() => {
    const todayIndex = 2
    return activePlan.week.map((entry, index) => ({
      ...entry,
      isCompleted: index < todayIndex,
      isToday: index === todayIndex,
      isFuture: index > todayIndex,
    }))
  }, [activePlan])

  const glassCard = {
    background: 'rgba(255, 255, 255, 0.25)',
    backdropFilter: 'blur(14px)',
    border: '1px solid rgba(255, 255, 255, 0.5)',
  }
  const headingStyle = { color: '#ffffff', textShadow: '0 1px 8px rgba(0,60,120,0.4)' }
  const bodyStyle = { color: 'rgba(255,255,255,0.85)' }

  const handleSaveReadingToJournal = () => {
    saveToJournal({
      verse: `${activePlan.todayReading} — ${activePlan.subtitle}`,
      reference: activePlan.todayReading,
      tags: ['Reading Plan'],
    })
    setToastTrigger((t) => t + 1)
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
      <header className="space-y-2">
        <h1 className="font-bold" style={{ ...headingStyle, fontSize: '24px' }}>Reading Plan</h1>
        <p style={bodyStyle}>Stay consistent in the Word</p>
        <div className="space-y-2 rounded-2xl p-4" style={glassCard}>
          <div className="flex items-center justify-between">
            <p className="text-sm" style={bodyStyle}>{activePlan.completedDays} of {activePlan.totalDays} days complete</p>
            <p className="text-sm font-semibold text-accent-gold">{completion}% complete</p>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/30">
            <div className="h-full rounded-full bg-accent-gold" style={{ width: `${completion}%` }} />
          </div>
        </div>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold" style={headingStyle}>Plan Selector</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {plans.map((plan) => {
            const isActive = plan.id === activePlanId
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => setActivePlanId(plan.id)}
                className={`rounded-2xl border p-4 text-left transition ${isActive ? 'border-accent-gold' : 'border-white/40 hover:border-accent-gold/50'}`}
                style={{ ...glassCard, minWidth: '140px', flex: 1 }}
              >
                <p className="text-base font-semibold text-white">{plan.name}</p>
                <p className="mt-1 text-sm" style={bodyStyle}>
                  {plan.completedDays} / {plan.totalDays} days complete
                </p>
              </button>
            )
          })}
        </div>
      </section>

      <article className="rounded-3xl p-6 text-background-cream shadow-md" style={{ ...glassCard, isolation: 'isolate' }}>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-gold">Today&apos;s Reading</p>
        <p className="mt-2 text-white [font-family:'Lora',serif]" style={{ fontSize: '24px' }}>{activePlan.todayReading}</p>
        <p className="mt-1" style={bodyStyle}>{activePlan.subtitle}</p>
        <div className="mt-5 flex items-center justify-between gap-3">
          <p className="text-xs" style={bodyStyle}>{activePlan.readTime}</p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={handleSaveReadingToJournal}
              className="rounded-xl border border-accent-gold px-4 py-2 text-sm font-semibold text-white"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setReaderState(parseTodayReading(activePlan.todayReading))
                setReaderOpen(true)
              }}
              className="rounded-xl bg-accent-gold px-4 py-2 text-sm font-semibold text-primary-dark transition hover:brightness-95"
            >
              Start Reading
            </button>
          </div>
        </div>
      </article>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold" style={headingStyle}>Weekly Calendar</h2>
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
                ? 'bg-olive/90 text-background-cream border-olive'
                : entry.isToday
                  ? 'border-accent-gold text-white'
                  : 'border-white/40 text-white'

              return (
                <button
                  key={entry.day}
                  type="button"
                  onClick={() => setSelectedDay(entry.day)}
                  className={`rounded-xl border p-2 text-left transition ${stateClasses} ${
                    isSelected ? 'ring-2 ring-accent-gold/60' : ''
                  }`}
                  style={!entry.isCompleted ? { ...glassCard, minWidth: '80px' } : { minWidth: '80px' }}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide">{entry.day}</p>
                    {entry.isCompleted && <span className="text-sm">✓</span>}
                  </div>
                  <p className={`text-xs ${entry.isCompleted ? 'text-background-cream/95' : ''}`} style={!entry.isCompleted ? bodyStyle : undefined}>
                    {entry.reading}
                  </p>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold" style={headingStyle}>Progress</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          <article className="rounded-xl p-4 text-center" style={{ ...glassCard, minWidth: '140px', flex: 1 }}>
            <p className="text-xs uppercase tracking-wide text-accent-gold">Days Done</p>
            <p className="mt-1 text-sm font-semibold text-white">
              {activePlan.completedDays} / {activePlan.totalDays}
            </p>
          </article>
          <article className="rounded-xl p-4 text-center" style={{ ...glassCard, minWidth: '140px', flex: 1 }}>
            <p className="text-xs uppercase tracking-wide text-accent-gold">Streak</p>
            <p className="mt-1 text-sm font-semibold text-white">3 days 🔥</p>
          </article>
          <article className="rounded-xl p-4 text-center" style={{ ...glassCard, minWidth: '140px', flex: 1 }}>
            <p className="text-xs uppercase tracking-wide text-accent-gold">Best Streak</p>
            <p className="mt-1 text-sm font-semibold text-white">7 days</p>
          </article>
        </div>
      </section>
    </section>
        )}
        <SaveToast trigger={toastTrigger} />
      </div>
    </div>
  )
}

export default ReadingPlan
