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
    <article style={{
      background: 'rgba(8,20,50,0.72)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      border: '1px solid rgba(212,168,67,0.25)',
      borderBottom: '2px solid #D4A843',
      borderRadius: '16px',
      padding: '16px'
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
        <div>
          <p style={{ fontSize: '24px' }}>{icon}</p>
          <p style={{ color: '#FFFFFF', fontSize: '16px', fontWeight: 700 }}>{title}</p>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '13px' }}>{desc}</p>
        </div>
      </div>
      <button type="button" onClick={onStart} style={{
        background: '#D4A843',
        color: '#0a1a3e',
        fontWeight: 700,
        borderRadius: '50px',
        padding: '12px',
        width: '100%',
        border: 'none',
        cursor: 'pointer',
        fontSize: '16px',
        marginTop: '16px'
      }}>
        Start
      </button>
    </article>
  )

  return (
    <div style={{ 
      position: 'relative',
      minHeight: '100%',
      height: 'auto',
      overflow: 'hidden',
      paddingBottom: '24px',
      background: 'linear-gradient(to bottom, #0d1f4e, #0a1a3e)'
    }}>
      {view === 'hub' ? (
        <div style={{ padding: '0 16px', paddingTop: '110px', paddingBottom: '20px', maxWidth: '680px', margin: '0 auto', width: '100%' }}>
            <header style={{ marginBottom: '24px' }}>
              <p style={{ color: '#D4A843', fontSize: '13px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>Faith Journey</p>
              <h1 style={{ color: '#FFFFFF', fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>
                Your faith journey
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '15px' }}>A gamified space to learn, memorize, and grow.</p>
            </header>

            <div style={{
              background: 'rgba(8,20,50,0.72)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(212,168,67,0.25)',
              borderRadius: '16px',
              padding: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '13px' }}>Verses Memorized</p>
                  <p style={{ color: '#D4A843', fontSize: '22px', fontWeight: 700 }}>{stats.memorized}</p>
                </div>
                <div style={{ height: '32px', width: '1px', background: 'rgba(255,255,255,0.12)' }} />
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '13px' }}>Trivia Streak</p>
                  <p style={{ color: '#D4A843', fontSize: '22px', fontWeight: 700 }}>{stats.triviaStreak}</p>
                </div>
                <div style={{ height: '32px', width: '1px', background: 'rgba(255,255,255,0.12)' }} />
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '13px' }}>Badges Earned</p>
                  <p style={{ color: '#D4A843', fontSize: '22px', fontWeight: 700 }}>{stats.badges}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <FeatureCard icon="🎮" title="Daily Trivia" desc="Test your Bible knowledge" onStart={() => setView('trivia')} />
              <FeatureCard icon="📖" title="Verse Flashcards" desc="Memorize God’s Word" onStart={() => setView('flashcards')} />
              <FeatureCard icon="🗺️" title="Journey Map" desc="Track your progress" onStart={() => setView('map')} />
              <FeatureCard icon="🏆" title="Achievements" desc="Earn faith badges" onStart={() => setView('achievements')} />
            </div>

            <footer style={{
              background: 'rgba(8,20,50,0.72)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(212,168,67,0.25)',
              borderRadius: '16px',
              padding: '16px',
              textAlign: 'center'
            }}>
              <span style={{ color: '#D4A843', fontWeight: 700, fontSize: '14px' }}>Keep going.</span>
              <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '14px' }}> “Let us run with perseverance the race that is set before us.”</span>
              <br />
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>— Hebrews 12:1</span>
            </footer>
        </div>
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
