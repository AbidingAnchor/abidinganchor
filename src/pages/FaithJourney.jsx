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

  

  const FeatureCard = ({ icon, title, desc, onStart }) => (
    <article className="app-card">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-2xl">{icon}</p>
          <p className="text-body text-gold">{title}</p>
          <p className="text-text-secondary text-sm">{desc}</p>
        </div>
      </div>
      <button type="button" onClick={onStart} className="btn-primary mt-4 w-full">
        Start
      </button>
    </article>
  )

  return (
    <div className="content-scroll" style={{ padding: '0 16px', paddingTop: '110px', paddingBottom: '110px', maxWidth: '680px', margin: '0 auto', width: '100%' }}>
      {view === 'hub' ? (
        <section className="space-y-4">
            <header className="space-y-2">
              <p className="text-section-header">Faith Journey</p>
              <h1 className="text-page-title">
                Your Faith Journey
              </h1>
              <p className="text-body">A gamified space to learn, memorize, and grow.</p>
            </header>

            <div className="app-card p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-center" style={{ flex: 1 }}>
                  <p className="text-text-secondary">Verses Memorized</p>
                  <p className="text-xl font-bold text-gold">{stats.memorized}</p>
                </div>
                <div className="h-8 w-px bg-border" />
                <div className="text-center" style={{ flex: 1 }}>
                  <p className="text-text-secondary">Trivia Streak</p>
                  <p className="text-xl font-bold text-gold">{stats.triviaStreak}</p>
                </div>
                <div className="h-8 w-px bg-border" />
                <div className="text-center" style={{ flex: 1 }}>
                  <p className="text-text-secondary">Badges Earned</p>
                  <p className="text-xl font-bold text-gold">{stats.badges}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <FeatureCard icon="🎮" title="Daily Trivia" desc="Test your Bible knowledge" onStart={() => setView('trivia')} />
              <FeatureCard icon="📖" title="Verse Flashcards" desc="Memorize God’s Word" onStart={() => setView('flashcards')} />
              <FeatureCard icon="🗺️" title="Journey Map" desc="Track your progress" onStart={() => setView('map')} />
              <FeatureCard icon="🏆" title="Achievements" desc="Earn faith badges" onStart={() => setView('achievements')} />
            </div>

            <footer className="app-card text-center text-sm text-text-secondary">
              <span className="text-gold font-semibold">Keep going.</span> “Let us run with perseverance the race that is set before us.”
              <br />
              <span className="text-text-muted text-xs">— Hebrews 12:1</span>
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
