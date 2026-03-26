import { useEffect, useMemo, useState } from 'react'
import BibleTrivia from '../components/BibleTrivia'
import VerseFlashcards from '../components/VerseFlashcards'
import JourneyMap from '../components/JourneyMap'
import Achievements from '../components/Achievements'

const VERSE_PROGRESS_KEY = 'abidinganchor-verse-progress'
const TRIVIA_STREAK_KEY = 'abidinganchor-trivia-streak'
const ACHIEVEMENTS_KEY = 'abidinganchor-achievements'

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export default function FaithJourney() {
  const [view, setView] = useState('hub') // hub | trivia | flashcards | map | achievements
  const [pulse, setPulse] = useState(false)

  const stats = useMemo(() => {
    const verseProgress = readJson(VERSE_PROGRESS_KEY, {})
    const memorized = Object.values(verseProgress).filter((p) => p?.memorized).length
    const triviaStreak = readJson(TRIVIA_STREAK_KEY, { count: 0 }).count || 0
    const achievements = readJson(ACHIEVEMENTS_KEY, {})
    const badges = Object.values(achievements).filter((a) => a?.unlockedAt).length
    return { memorized, triviaStreak, badges }
  }, [view])

  useEffect(() => {
    setPulse(true)
    const t = setTimeout(() => setPulse(false), 1200)
    return () => clearTimeout(t)
  }, [])

  const glassCard = {
    background: 'rgba(255, 255, 255, 0.18)',
    backdropFilter: 'blur(14px)',
    border: '1px solid rgba(255,255,255,0.35)',
  }

  const FeatureCard = ({ icon, title, desc, onStart }) => (
    <article className="rounded-2xl p-4 text-white shadow-sm" style={{ ...glassCard }}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-2xl">{icon}</p>
          <p className="mt-2 text-base font-semibold text-white">{title}</p>
          <p className="mt-1 text-xs text-white/70">{desc}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onStart}
        className="mt-4 w-full rounded-xl px-4 py-2 text-sm font-semibold text-[#1a1a1a]"
        style={{ background: '#D4A843' }}
      >
        Start
      </button>
    </article>
  )

  return (
    <div className="content-scroll" style={{ padding: '0 16px', paddingTop: '110px', paddingBottom: '110px', maxWidth: '680px', margin: '0 auto', width: '100%' }}>
      {view === 'hub' ? (
        <section className="space-y-4">
            <style>
              {`
                @keyframes journey-glow {
                  0%, 100% { text-shadow: 0 0 10px rgba(212,168,67,0.30); }
                  50% { text-shadow: 0 0 24px rgba(212,168,67,0.65); }
                }
              `}
            </style>

            <header className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">Faith Journey</p>
              <h1
                className="text-4xl font-extrabold"
                style={{
                  color: '#D4A843',
                  animation: pulse ? 'journey-glow 1.6s ease-in-out infinite' : 'none',
                }}
              >
                Your Faith Journey
              </h1>
              <p className="text-sm text-white/80">A gamified space to learn, memorize, and grow.</p>
            </header>

            <div className="rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur-md">
              <div className="flex items-center justify-between gap-2">
                <div className="text-center" style={{ flex: 1 }}>
                  <p className="text-xs text-white/65">Verses Memorized</p>
                  <p className="mt-1 text-xl font-bold text-white">{stats.memorized}</p>
                </div>
                <div className="h-8 w-px bg-white/15" />
                <div className="text-center" style={{ flex: 1 }}>
                  <p className="text-xs text-white/65">Trivia Streak</p>
                  <p className="mt-1 text-xl font-bold text-white">{stats.triviaStreak}</p>
                </div>
                <div className="h-8 w-px bg-white/15" />
                <div className="text-center" style={{ flex: 1 }}>
                  <p className="text-xs text-white/65">Badges Earned</p>
                  <p className="mt-1 text-xl font-bold text-white">{stats.badges}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <FeatureCard icon="🎮" title="Daily Trivia" desc="Test your Bible knowledge" onStart={() => setView('trivia')} />
              <FeatureCard icon="📖" title="Verse Flashcards" desc="Memorize God’s Word" onStart={() => setView('flashcards')} />
              <FeatureCard icon="🗺️" title="Journey Map" desc="Track your progress" onStart={() => setView('map')} />
              <FeatureCard icon="🏆" title="Achievements" desc="Earn faith badges" onStart={() => setView('achievements')} />
            </div>

            <footer className="rounded-2xl border border-[#D4A843] bg-white/10 p-4 text-center text-sm text-white/85 backdrop-blur-md">
              <span style={{ color: '#D4A843', fontWeight: 700 }}>Keep going.</span> “Let us run with perseverance the race that is set before us.”
              <br />
              <span className="text-xs text-white/60">— Hebrews 12:1</span>
            </footer>
        </section>
      ) : view === 'trivia' ? (
        <BibleTrivia onExit={() => setView('hub')} />
      ) : view === 'flashcards' ? (
        <VerseFlashcards onExit={() => setView('hub')} />
      ) : view === 'map' ? (
        <JourneyMap onExit={() => setView('hub')} />
      ) : (
        <Achievements onExit={() => setView('hub')} />
      )}
    </div>
  )
}
