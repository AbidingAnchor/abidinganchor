import { useMemo } from 'react'
import { getReadingHistory } from '../utils/readingHistory'
import { getStreak } from '../utils/streak'
import { getPrayerEntries } from '../utils/prayer'
import { getJournalEntries } from '../utils/journal'
import { getHighlights } from '../utils/highlights'

function getStartDate() {
  const key = 'abidinganchor-start-date'
  const existing = localStorage.getItem(key)
  if (existing) return new Date(existing)
  const now = new Date().toISOString()
  localStorage.setItem(key, now)
  return new Date(now)
}

export default function FaithJourney() {
  const history = getReadingHistory()
  const streak = getStreak()
  const prayers = getPrayerEntries()
  const journal = getJournalEntries()
  const highlights = getHighlights()
  const memorized = JSON.parse(localStorage.getItem('abidinganchor-memorized') || '[]')
  const sharedCount = Number(localStorage.getItem('abidinganchor-shared-count') || '0')
  const startDate = getStartDate()
  const daysAgo = Math.max(1, Math.floor((Date.now() - startDate.getTime()) / 86400000))

  const stats = [
    ['📖', history.length, 'Chapters Read'],
    ['🔥', streak.longestStreak || 1, 'Longest Streak'],
    ['🙏', prayers.length, 'Prayers Written'],
    ['✅', prayers.filter((p) => p.answered).length, 'Prayers Answered'],
    ['📓', journal.length, 'Journal Entries'],
    ['⭐', highlights.length, 'Verses Highlighted'],
    ['🧠', memorized.length, 'Verses Memorized'],
    ['📤', sharedCount, 'Verses Shared'],
  ]

  const milestones = useMemo(() => {
    const readOld = history.some((h) => h.testament === 'old')
    const readNew = history.some((h) => h.testament === 'new')
    return [
      ['First Step', '✝️', true, 'Opened the app for the first time'],
      ['Seeker', '📖', history.length >= 1, 'Read your first Bible chapter'],
      ['Faithful', '🔥', (streak.longestStreak || 1) >= 7, '7 day reading streak'],
      ['Devoted', '🔥', (streak.longestStreak || 1) >= 30, '30 day reading streak'],
      ['Warrior', '⚔️', (streak.longestStreak || 1) >= 100, '100 day reading streak'],
      ['Prayer Warrior', '🙏', prayers.length >= 10, 'Written 10 prayers'],
      ['Faithful Witness', '✅', prayers.filter((p) => p.answered).length >= 5, 'Marked 5 prayers as answered'],
      ['Scribe', '📓', journal.length >= 10, 'Written 10 journal entries'],
      ['Memorizer', '🧠', memorized.length >= 5, 'Memorized 5 verses'],
      ['Evangelist', '📤', sharedCount >= 10, 'Shared 10 verses as images'],
      ['Highlighter', '⭐', highlights.length >= 20, 'Highlighted 20 verses'],
      ['Genesis to Revelation', '📜', readOld && readNew, 'Read at least one chapter from Old and New Testament'],
    ]
  }, [history, streak.longestStreak, prayers, journal.length, memorized.length, highlights.length, sharedCount])

  return (
    <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
      <div className="content-scroll" style={{ padding: '0 16px', paddingTop: '220px', paddingBottom: '100px', maxWidth: '680px', margin: '0 auto', width: '100%' }}>
        <section className="space-y-4">
          <header>
            <h1 className="text-3xl font-bold" style={{ color: '#D4A843', textShadow: '0 1px 8px rgba(0,60,120,0.4)' }}>✦ Faith Journey</h1>
            <p className="text-white/85">Your story with God&apos;s Word</p>
            <p className="mt-2 text-sm text-white/75">Your journey began {daysAgo} days ago</p>
            <p className="text-xs text-white/60">Walking with AbidingAnchor since {startDate.toLocaleDateString()}</p>
          </header>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {stats.map(([icon, value, label]) => (
              <article key={label} className="rounded-2xl border border-white/20 bg-white/10 p-3 text-center backdrop-blur-md">
                <p className="text-lg">{icon}</p>
                <p className="text-lg font-bold text-white">{value}</p>
                <p className="text-xs text-white/75">{label}</p>
              </article>
            ))}
          </div>

          <section className="space-y-2">
            {milestones.map(([title, icon, earned, desc], index) => (
              <div key={title} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: earned ? '#D4A843' : 'rgba(255,255,255,0.2)', color: earned ? '#1a1a1a' : '#fff' }}>
                    {earned ? icon : '🔒'}
                  </div>
                  {index < milestones.length - 1 ? <div className="mt-1 h-full w-[2px]" style={{ background: 'rgba(212,168,67,0.6)' }} /> : null}
                </div>
                <article className="mb-2 flex-1 rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur-md">
                  <p className="font-semibold text-white">{title}</p>
                  <p className="text-sm text-white/75">{desc}</p>
                </article>
              </div>
            ))}
          </section>

          <footer className="rounded-2xl border border-[#D4A843] bg-white/10 p-4 text-center text-[#D4A843] backdrop-blur-md">
            Being confident of this, that he who began a good work in you will carry it on to completion. <br />— Philippians 1:6
          </footer>
        </section>
      </div>
    </div>
  )
}
