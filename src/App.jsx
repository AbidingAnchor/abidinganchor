import { BrowserRouter, Navigate, Routes, Route, useLocation } from 'react-router-dom'
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
import CommunityPrayer from './pages/CommunityPrayer'
import Friends from './pages/Friends'
import PrivacyPolicy from './pages/PrivacyPolicy'
import TermsOfService from './pages/TermsOfService'
import Legal from './pages/Legal'
import Navbar from './components/Navbar'
import AppBackground from './components/AppBackground'
import LegalModal from './components/LegalModal'
import WorshipPlayer from './components/WorshipPlayer'
import Footer from './components/Footer'
import { getScenery, toggleScenery } from './utils/scenery'
import Auth from './pages/Auth'
import { useAuth } from './context/AuthContext'
import LoadingScreen from './components/LoadingScreen'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/auth" replace />
  return children
}

function AppShell() {
  const { user } = useAuth()
  const location = useLocation()
  const [scenery, setScenery] = useState(() => getScenery())
  const [showSceneryTip, setShowSceneryTip] = useState(() => !localStorage.getItem('abidinganchor-scenery-tip-seen'))
  const [worshipVisible, setWorshipVisible] = useState(false)
  const [worshipAutoPlayToken, setWorshipAutoPlayToken] = useState(0)
  const [worshipStatus, setWorshipStatus] = useState({ isPlaying: false, currentTrack: 'Peaceful Worship', isVisible: false })
  const showNav = location.pathname !== '/auth'
  const showFooter = location.pathname !== '/auth'

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
    <>
      <div style={{ minHeight: '100vh', position: 'relative', background: '#0d1f4e', display: 'flex', flexDirection: 'column' }}>
        <AppBackground scenery={scenery} />
        <div style={{ position: 'fixed', inset: 0, zIndex: 2, pointerEvents: 'none', background: 'linear-gradient(to bottom, rgba(13,31,78,0.3) 0%, rgba(13,31,78,0.6) 100%)' }} />

        <div style={{ position: 'relative', zIndex: 10, isolation: 'isolate', flex: 1, display: 'flex', flexDirection: 'column', paddingBottom: '80px' }}>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<ProtectedRoute><Home onOpenWorship={(startPlaying) => openWorship(startPlaying)} worshipStatus={worshipStatus} /></ProtectedRoute>} />
            <Route path="/read" element={<ProtectedRoute><ReadingPlan onOpenWorship={(startPlaying) => openWorship(startPlaying)} /></ProtectedRoute>} />
            <Route path="/reading-plan" element={<ProtectedRoute><ReadingPlan onOpenWorship={(startPlaying) => openWorship(startPlaying)} /></ProtectedRoute>} />
            <Route path="/search" element={<ProtectedRoute><Search onOpenWorship={(startPlaying) => openWorship(startPlaying)} /></ProtectedRoute>} />
            <Route path="/prayer" element={<ProtectedRoute><Prayer /></ProtectedRoute>} />
            <Route path="/journal" element={<ProtectedRoute><Journal /></ProtectedRoute>} />
            <Route path="/memorize" element={<ProtectedRoute><Memorize /></ProtectedRoute>} />
            <Route path="/devotional" element={<ProtectedRoute><Devotional /></ProtectedRoute>} />
            <Route path="/scripture-art" element={<ProtectedRoute><ScriptureArt /></ProtectedRoute>} />
            <Route path="/reading-plans" element={<ProtectedRoute><ReadingPlans /></ProtectedRoute>} />
            <Route path="/fasting" element={<ProtectedRoute><FastingTracker /></ProtectedRoute>} />
            <Route path="/ai-companion" element={<ProtectedRoute><AICompanion /></ProtectedRoute>} />
            <Route path="/faith-journey" element={<ProtectedRoute><FaithJourney /></ProtectedRoute>} />
            <Route path="/community-prayer" element={<ProtectedRoute><CommunityPrayer /></ProtectedRoute>} />
            <Route path="/friends" element={<ProtectedRoute><Friends /></ProtectedRoute>} />
            <Route path="/support" element={<ProtectedRoute><Support /></ProtectedRoute>} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route path="/legal" element={<Legal />} />
            <Route path="*" element={<Navigate to={user ? '/' : '/auth'} replace />} />
          </Routes>
          {showFooter ? <Footer /> : null}
        </div>
      </div>
      {showFooter ? <LegalModal /> : null}
      <WorshipPlayer
        visible={worshipVisible}
        onClose={() => setWorshipVisible(false)}
        autoPlayToken={worshipAutoPlayToken}
        onStatusChange={setWorshipStatus}
      />
      {showNav ? <Navbar scenery={scenery} onToggleScenery={handleToggleScenery} showSceneryTip={showSceneryTip} /> : null}
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}
