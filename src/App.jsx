import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import Home from './pages/Home'
import ReadingPlan from './pages/ReadingPlan'
import Search from './pages/Search'
import Journal from './pages/Journal'
import Prayer from './pages/Prayer'
import Memorize from './pages/Memorize'
import AICompanion from './pages/AICompanion'
import FaithJourney from './pages/FaithJourney'
import Support from './pages/Support'
import PrivacyPolicy from './pages/PrivacyPolicy'
import TermsOfService from './pages/TermsOfService'
import Legal from './pages/Legal'
import Navbar from './components/Navbar'
import SkyBackground from './components/SkyBackground'
import LegalModal from './components/LegalModal'
import WorshipPlayer from './components/WorshipPlayer'
import { getTheme, setTheme } from './utils/theme'

export default function App() {
  const [theme, setThemeState] = useState(() => getTheme())
  const [worshipVisible, setWorshipVisible] = useState(false)
  const [worshipAutoPlayToken, setWorshipAutoPlayToken] = useState(0)
  const [worshipStatus, setWorshipStatus] = useState({ isPlaying: false, currentTrack: 'Peaceful Worship', isVisible: false })
  const isNight = theme === 'night'
  const appBackground = useMemo(
    () => (isNight ? 'linear-gradient(180deg, #1a0e00 0%, #2d1a00 100%)' : 'transparent'),
    [isNight],
  )

  const handleToggleTheme = () => {
    setThemeState((prev) => setTheme(prev === 'night' ? 'day' : 'night'))
  }

  const openWorship = (startPlaying = false) => {
    setWorshipVisible(true)
    if (startPlaying) setWorshipAutoPlayToken((t) => t + 1)
  }

  useEffect(() => {
    if (!localStorage.getItem('abidinganchor-start-date')) {
      localStorage.setItem('abidinganchor-start-date', new Date().toISOString())
    }
  }, [])

  return (
    <BrowserRouter>
      <div style={{ minHeight: '100vh', position: 'relative', background: appBackground }}>
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 0,
            overflow: 'hidden',
            pointerEvents: 'none',
          }}
        >
          {isNight ? null : <SkyBackground />}
        </div>
        {isNight ? (
          <div
            style={{
              position: 'fixed',
              top: '64px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 5,
              pointerEvents: 'none',
              opacity: 0.9,
            }}
          >
            <svg width="86" height="120" viewBox="0 0 86 120" fill="#D4A843" aria-hidden="true">
              <rect x="38.5" y="8" width="9" height="104" rx="2" />
              <rect x="14" y="39" width="58" height="9" rx="2" />
            </svg>
          </div>
        ) : null}

        <div style={{ position: 'relative', zIndex: 10, isolation: 'isolate', paddingBottom: '80px' }}>
          <Routes>
            <Route path="/" element={<Home onOpenWorship={(startPlaying) => openWorship(startPlaying)} worshipStatus={worshipStatus} />} />
            <Route path="/plan" element={<ReadingPlan onOpenWorship={(startPlaying) => openWorship(startPlaying)} />} />
            <Route path="/search" element={<Search onOpenWorship={(startPlaying) => openWorship(startPlaying)} />} />
            <Route path="/prayer" element={<Prayer />} />
            <Route path="/journal" element={<Journal />} />
            <Route path="/memorize" element={<Memorize />} />
            <Route path="/ai-companion" element={<AICompanion />} />
            <Route path="/faith-journey" element={<FaithJourney />} />
            <Route path="/support" element={<Support />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/legal" element={<Legal />} />
          </Routes>
        </div>
      </div>
      <LegalModal />
      <WorshipPlayer
        visible={worshipVisible}
        onClose={() => setWorshipVisible(false)}
        autoPlayToken={worshipAutoPlayToken}
        onStatusChange={setWorshipStatus}
      />
      <Navbar theme={theme} onToggleTheme={handleToggleTheme} />
    </BrowserRouter>
  )
}
