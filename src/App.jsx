import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Home from './pages/Home'
import ReadingPlan from './pages/ReadingPlan'
import Search from './pages/Search'
import Journal from './pages/Journal'
import Prayer from './pages/Prayer'
import Memorize from './pages/Memorize'
import AICompanion from './pages/AICompanion'
import FaithJourney from './pages/FaithJourney'
import Devotional from './pages/Devotional'
import ScriptureArt from './pages/ScriptureArt'
import ReadingPlans from './pages/ReadingPlans'
import FastingTracker from './pages/FastingTracker'
import Support from './pages/Support'
import PrivacyPolicy from './pages/PrivacyPolicy'
import TermsOfService from './pages/TermsOfService'
import Legal from './pages/Legal'
import Navbar from './components/Navbar'
import AppBackground from './components/AppBackground'
import LegalModal from './components/LegalModal'
import WorshipPlayer from './components/WorshipPlayer'
import Footer from './components/Footer'
import { getScenery, toggleScenery } from './utils/scenery'

export default function App() {
  const [scenery, setScenery] = useState(() => getScenery())
  const [showSceneryTip, setShowSceneryTip] = useState(() => !localStorage.getItem('abidinganchor-scenery-tip-seen'))
  const [worshipVisible, setWorshipVisible] = useState(false)
  const [worshipAutoPlayToken, setWorshipAutoPlayToken] = useState(0)
  const [worshipStatus, setWorshipStatus] = useState({ isPlaying: false, currentTrack: 'Peaceful Worship', isVisible: false })

  const handleToggleScenery = () => {
    setScenery((prev) => toggleScenery(prev))
    if (showSceneryTip) {
      localStorage.setItem('abidinganchor-scenery-tip-seen', 'true')
      setShowSceneryTip(false)
    }
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
      <div style={{ minHeight: '100vh', position: 'relative', background: '#0d1f4e', display: 'flex', flexDirection: 'column' }}>
        <AppBackground scenery={scenery} />
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2,
            pointerEvents: 'none',
            background: 'linear-gradient(to bottom, rgba(13,31,78,0.3) 0%, rgba(13,31,78,0.6) 100%)',
          }}
        />

        <div style={{ position: 'relative', zIndex: 10, isolation: 'isolate', flex: 1, display: 'flex', flexDirection: 'column', paddingBottom: '80px' }}>
          <Routes>
            <Route path="/" element={<Home onOpenWorship={(startPlaying) => openWorship(startPlaying)} worshipStatus={worshipStatus} />} />
            <Route path="/reading-plan" element={<ReadingPlan onOpenWorship={(startPlaying) => openWorship(startPlaying)} />} />
            <Route path="/search" element={<Search onOpenWorship={(startPlaying) => openWorship(startPlaying)} />} />
            <Route path="/prayer" element={<Prayer />} />
            <Route path="/journal" element={<Journal />} />
            <Route path="/memorize" element={<Memorize />} />
            <Route path="/devotional" element={<Devotional />} />
            <Route path="/scripture-art" element={<ScriptureArt />} />
            <Route path="/reading-plans" element={<ReadingPlans />} />
            <Route path="/fasting" element={<FastingTracker />} />
            <Route path="/ai-companion" element={<AICompanion />} />
            <Route path="/faith-journey" element={<FaithJourney />} />
            <Route path="/support" element={<Support />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route path="/legal" element={<Legal />} />
          </Routes>
          <Footer />
        </div>
      </div>
      <LegalModal />
      <WorshipPlayer
        visible={worshipVisible}
        onClose={() => setWorshipVisible(false)}
        autoPlayToken={worshipAutoPlayToken}
        onStatusChange={setWorshipStatus}
      />
      <Navbar scenery={scenery} onToggleScenery={handleToggleScenery} showSceneryTip={showSceneryTip} />
    </BrowserRouter>
  )
}
