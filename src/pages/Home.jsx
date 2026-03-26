import { useCallback, useEffect, useState } from 'react'
import { dailyVerses } from '../data/dailyVerses'
import { getJournalEntries, saveToJournal } from '../utils/journal'
import SaveToast from '../components/SaveToast'

function getTodaysVerse() {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const diff = now - start
  const oneDay = 1000 * 60 * 60 * 24
  const dayOfYear = Math.floor(diff / oneDay)
  const index = (dayOfYear - 1) % dailyVerses.length
  return dailyVerses[index]
}

function Home() {
  const [todaysVerse, setTodaysVerse] = useState(() => getTodaysVerse())
  const [toastTrigger, setToastTrigger] = useState(0)
  const [shareToastVisible, setShareToastVisible] = useState(false)

  useEffect(() => {
    let timeoutId
    const scheduleNextMidnight = () => {
      setTodaysVerse(getTodaysVerse())
      const now = new Date()
      const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0)
      const ms = Math.max(1000, nextMidnight - now)
      timeoutId = setTimeout(scheduleNextMidnight, ms)
    }
    scheduleNextMidnight()
    return () => clearTimeout(timeoutId)
  }, [])

  const handleSaveDailyVerse = useCallback(() => {
    saveToJournal({
      verse: todaysVerse.text,
      reference: todaysVerse.ref,
      tags: ['Daily Verse'],
    })
    setToastTrigger((t) => t + 1)
  }, [todaysVerse])

  const handleSaveVerseOfWeek = useCallback(() => {
    saveToJournal({
      verse: 'The Lord is my shepherd; I shall not want.',
      reference: 'Psalm 23:1',
      tags: ['Daily Verse'],
    })
    setToastTrigger((t) => t + 1)
  }, [])

  const handleShare = useCallback(async () => {
    const verseText = todaysVerse.text
    const verseReference = todaysVerse.ref
    const shareData = {
      title: 'AbidingAnchor - Anchored in His Word',
      text: `"${verseText}" - ${verseReference}`,
      url: 'https://abidinganchor.netlify.app',
    }

    try {
      if (navigator.share) {
        await navigator.share(shareData)
        return
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(`"${verseText}" - ${verseReference}\n\nAbidingAnchor: https://abidinganchor.netlify.app`)
        setShareToastVisible(true)
        return
      }

      setShareToastVisible(true)
    } catch {
      alert('Unable to share right now. Please try again.')
    }
  }, [todaysVerse])

  useEffect(() => {
    if (!shareToastVisible) return
    const timeoutId = setTimeout(() => setShareToastVisible(false), 2200)
    return () => clearTimeout(timeoutId)
  }, [shareToastVisible])

  const today = new Date()
  const formattedDate = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const dayToMonFirstIndex = [6, 0, 1, 2, 3, 4, 5]
  const todayIndex = dayToMonFirstIndex[today.getDay()]
  const streakLength = 3
  const journalCount = getJournalEntries().length

  return (
    <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
      <div
        className="content-scroll"
        style={{
          padding: '0 16px',
          paddingTop: 'clamp(280px, 38vw, 320px)',
          paddingBottom: '100px',
          maxWidth: '680px',
          margin: '0 auto',
          width: '100%',
        }}
      >
        <div style={{ position: 'absolute', top: '24px', left: '24px', zIndex: 50 }}>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-yellow-100">ABIDING ANCHOR</p>
          <p className="text-yellow-100/90" style={{ marginTop: '4px', fontSize: '11px', fontStyle: 'italic' }}>
            Anchored in His Word
          </p>
          <h1
            className="text-white"
            style={{ marginTop: '8px', fontSize: '22px', fontWeight: 700, textShadow: '0 2px 8px rgba(0,0,0,0.8)', maxWidth: '280px' }}
          >
            Welcome to your quiet study space
          </h1>
          <p className="text-blue-50" style={{ marginTop: '8px', fontSize: '12px', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
            {formattedDate}
          </p>
        </div>
        <section className="space-y-6">
          <article
            className="rounded-3xl p-6 text-white shadow-md"
            style={{
              background: 'rgba(255, 255, 255, 0.25)',
              backdropFilter: 'blur(14px)',
              border: '1px solid rgba(255, 255, 255, 0.5)',
              isolation: 'isolate',
            }}
          >
            <div className="relative">
              <span className="absolute -top-3 left-0 text-6xl leading-none text-yellow-200">"</span>
              <p className="pl-8 pr-1 pt-4 text-xl leading-relaxed text-white [font-family:'Lora',serif] italic sm:text-2xl">
                {todaysVerse.text}
              </p>
            </div>

            <p className="mt-4 text-sm font-semibold uppercase tracking-[0.2em] text-yellow-100">{todaysVerse.ref}</p>

            <div className="my-5 flex items-center gap-3 text-yellow-100">
              <div className="h-px flex-1 bg-yellow-100/50" />
              <div className="h-px flex-1 bg-yellow-100/50" />
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              <button
                type="button"
                onClick={handleSaveDailyVerse}
                style={{ minWidth: '140px', flex: 1 }}
                className="rounded-xl border border-[#F0B429] bg-[#F0B429] px-3 py-2 text-sm font-semibold text-[#1a1a1a] transition hover:brightness-95"
              >
                Save to Journal
              </button>
              <button
                type="button"
                onClick={handleShare}
                style={{ minWidth: '140px', flex: 1 }}
                className="rounded-xl border border-yellow-100/80 px-3 py-2 text-sm font-semibold text-yellow-100 transition hover:bg-white/10"
              >
                Share
              </button>
            </div>
          </article>

          <section
            className="rounded-2xl p-4 shadow-sm"
            style={{
              background: 'rgba(255, 255, 255, 0.25)',
              backdropFilter: 'blur(14px)',
              border: '1px solid rgba(255, 255, 255, 0.5)',
            }}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white" style={{ textShadow: '0 1px 8px rgba(0,60,120,0.4)' }}>Reading Streak</h2>
              <p className="text-sm font-medium text-white/85">🔥 3 day streak</p>
            </div>
            <div className="flex items-center justify-between gap-2" style={{ overflowX: 'auto' }}>
              {days.map((day, index) => {
                const isToday = index === todayIndex
                const isCompleted = index < todayIndex && index >= todayIndex - streakLength
                const dotClass = isToday
                  ? 'bg-accent-gold border-accent-gold'
                  : isCompleted
                    ? 'bg-olive border-olive'
                    : 'border-white/60 bg-transparent'

                return (
                  <div key={day} className="flex flex-col items-center gap-2">
                    <span className={`h-3 w-3 rounded-full border ${dotClass}`} />
                    <span className="text-xs text-white/85">{day}</span>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white" style={{ textShadow: '0 1px 8px rgba(0,60,120,0.4)' }}>Quick Access</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              <article
                className="rounded-2xl p-4 shadow-sm"
                style={{
                  minWidth: '140px',
                  flex: 1,
                  background: 'rgba(255, 255, 255, 0.25)',
                  backdropFilter: 'blur(14px)',
                  border: '1px solid rgba(255, 255, 255, 0.5)',
                }}
              >
                <p className="text-sm uppercase tracking-wide text-white/85">Continue Reading</p>
                <p className="mt-2 text-2xl font-semibold text-white">John 3</p>
              </article>
              <article
                className="rounded-2xl p-4 shadow-sm"
                style={{
                  minWidth: '140px',
                  flex: 1,
                  background: 'rgba(255, 255, 255, 0.25)',
                  backdropFilter: 'blur(14px)',
                  border: '1px solid rgba(255, 255, 255, 0.5)',
                }}
              >
                <p className="text-sm uppercase tracking-wide text-white/85">Open Journal</p>
                <p className="mt-2 text-2xl font-semibold text-white">{journalCount} {journalCount === 1 ? 'note' : 'notes'} saved</p>
              </article>
            </div>
          </section>

          <section
            className="rounded-2xl p-5 shadow-sm"
            style={{
              background: 'rgba(255, 255, 255, 0.25)',
              backdropFilter: 'blur(14px)',
              border: '1px solid rgba(255, 255, 255, 0.5)',
            }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/85">Verse of the Week</p>
            <p className="mt-2 text-lg text-white [font-family:'Lora',serif] italic">
              "The Lord is my shepherd; I shall not want."
            </p>
            <p className="mt-2 text-sm font-medium uppercase tracking-[0.15em] text-white/85">Psalm 23:1</p>
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={handleSaveVerseOfWeek}
                className="rounded-lg border border-accent-gold px-3 py-1.5 text-xs font-medium text-white"
              >
                Save to Journal
              </button>
            </div>
          </section>
        </section>
        <SaveToast trigger={toastTrigger} />
        <div
          style={{
            position: 'fixed',
            bottom: '132px',
            left: '50%',
            transform: `translateX(-50%) translateY(${shareToastVisible ? '0px' : '16px'})`,
            opacity: shareToastVisible ? 1 : 0,
            transition: 'opacity 0.3s ease, transform 0.3s ease',
            zIndex: 9999,
            pointerEvents: 'none',
            background: 'rgba(10, 20, 50, 0.92)',
            color: '#fff',
            padding: '10px 16px',
            borderRadius: '999px',
            fontSize: '13px',
            fontWeight: '600',
            border: '1px solid rgba(255,255,255,0.3)',
            whiteSpace: 'nowrap',
          }}
        >
          Verse copied to clipboard!
        </div>
      </div>
    </div>
  )
}

export default Home
