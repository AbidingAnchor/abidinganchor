import { BrowserRouter, Navigate, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import ReactGA from 'react-ga4'
import Home from './pages/Home'
import ReadingPlan from './pages/ReadingPlan'
import Search from './pages/Search'
import Journal from './pages/Journal'
import Prayer from './pages/Prayer'
import ShareCard from './pages/ShareCard'
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
import Settings from './pages/Settings'
import EditProfile from './pages/EditProfile'
import WorshipMode from './pages/WorshipMode'
import BibleVideos from './pages/BibleVideos'
import BottomNav from './components/BottomNav'
import Header from './components/Header'
import LegalModal from './components/LegalModal'
import WorshipPlayer from './components/WorshipPlayer'
import Footer from './components/Footer'
import Onboarding from './components/Onboarding'
import Auth from './pages/Auth'
import ResetPassword from './pages/ResetPassword'
import { useAuth } from './context/AuthContext'
import { userStorageKey } from './utils/userStorage'
import LoadingScreen from './components/LoadingScreen'
import BackgroundManager from './components/BackgroundManager'
import { useWorshipPlaybackState } from './lib/worshipGlobalAudio'
import { applyDailyStreakOnAppOpen } from './lib/dailyAppStreak'
import { syncWeeklyActiveDays } from './hooks/useStreakTracker'

const LEGAL_ACCEPTED_KEY = 'legalAccepted'
const GA_MEASUREMENT_ID = 'G-1VXQ7114R7'

function ProtectedRoute({ children }) {
  const { user, profile, loading, suspendedInfo } = useAuth()
  if (loading) return <LoadingScreen />
  if (suspendedInfo) return null
  if (!user) return <Navigate to="/auth" replace />
  if (!profile) return <Navigate to="/onboarding" replace />
  try {
    const onboardingLocal =
      localStorage.getItem(userStorageKey(user.id, 'onboarding-complete')) === 'true'
    const isOnboarded = profile.onboarding_complete === true || onboardingLocal
    if (!isOnboarded) return <Navigate to="/onboarding" replace />
  } catch {
    if (profile.onboarding_complete !== true) return <Navigate to="/onboarding" replace />
  }
  return children
}

function OnboardingRoute() {
  const { user, loading, profile, suspendedInfo } = useAuth()
  const navigate = useNavigate()
  if (loading) return <LoadingScreen />
  if (suspendedInfo) return null
  if (!user) return <Navigate to="/auth" replace />
  if (profile?.onboarding_complete) return <Navigate to="/" replace />
  return <Onboarding onComplete={() => navigate('/')} />
}

function SuspendedScreen({ bannedAt }) {
  const bannedDateText = bannedAt ? new Date(bannedAt).toLocaleString() : 'Unknown'

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #081229 0%, #0b1738 55%, #091021 100%)',
        color: '#F5E6B8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: 'min(92vw, 700px)',
          borderRadius: '20px',
          border: '1px solid rgba(201,168,76,0.45)',
          background: 'rgba(9, 17, 39, 0.94)',
          boxShadow: '0 12px 36px rgba(0,0,0,0.45)',
          padding: '28px 24px',
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: '30px', marginBottom: '10px' }} aria-hidden>🚫</p>
        <h1 style={{ color: '#C9A84C', fontSize: '28px', fontWeight: 800, margin: '0 0 14px 0' }}>
          Your Account Has Been Suspended
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.85)', lineHeight: 1.65, marginBottom: '8px' }}>
          Your access to AbidingAnchor has been revoked. This action was taken to protect the integrity of our community.
        </p>
        <p style={{ color: '#C9A84C', fontWeight: 700, marginBottom: '10px' }}>
          Banned on: {bannedDateText}.
        </p>
        <p style={{ color: 'rgba(255,255,255,0.8)', lineHeight: 1.65, margin: 0 }}>
          If you believe this was a mistake or would like to appeal, please reach out to our staff team via Discord.
        </p>
      </div>
    </div>
  )
}

function AppShell() {
  const { user, refreshProfile, suspendedInfo, loading } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [worshipVisible, setWorshipVisible] = useState(false)
  const [worshipAutoPlayToken, setWorshipAutoPlayToken] = useState(0)
  const [hasAcceptedLegal, setHasAcceptedLegal] = useState(
    () => localStorage.getItem(LEGAL_ACCEPTED_KEY) === 'true',
  )
  const gaInitializedRef = useRef(false)
  const lastTrackedPathRef = useRef('')
  const worshipPlayback = useWorshipPlaybackState()
  const worshipStatus = useMemo(
    () => ({
      isPlaying: worshipPlayback.isPlaying,
      currentTrack: worshipPlayback.trackName,
      isVisible: worshipVisible,
    }),
    [worshipPlayback.isPlaying, worshipPlayback.trackName, worshipVisible],
  )
  const showNav =
    !loading &&
    location.pathname !== '/auth' &&
    location.pathname !== '/reset-password' &&
    location.pathname !== '/onboarding'
  const showFooter =
    !loading &&
    location.pathname !== '/auth' &&
    location.pathname !== '/reset-password' &&
    location.pathname !== '/onboarding' &&
    location.pathname !== '/read' &&
    location.pathname !== '/reading-plan' &&
    location.pathname !== '/worship'
  const showHeader =
    !loading &&
    location.pathname !== '/auth' &&
    location.pathname !== '/reset-password' &&
    location.pathname !== '/onboarding'

  const openWorship = (startPlaying = false) => {
    setWorshipVisible(true)
    if (startPlaying) setWorshipAutoPlayToken((t) => t + 1)
  }

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    let timeoutId
    const run = async () => {
      await syncWeeklyActiveDays(user.id)
      await applyDailyStreakOnAppOpen(user.id)
      if (!cancelled) await refreshProfile()
    }
    run()
    const onVis = () => {
      if (document.visibilityState === 'visible') run()
    }
    document.addEventListener('visibilitychange', onVis)
    const scheduleMidnight = () => {
      const now = new Date()
      const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1, 0)
      const ms = Math.max(1000, nextMidnight - now)
      timeoutId = setTimeout(() => {
        run()
        scheduleMidnight()
      }, ms)
    }
    scheduleMidnight()
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVis)
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [user?.id, refreshProfile])

  useEffect(() => {
    const syncLegalAccepted = () => {
      setHasAcceptedLegal(localStorage.getItem(LEGAL_ACCEPTED_KEY) === 'true')
    }
    window.addEventListener('storage', syncLegalAccepted)
    return () => window.removeEventListener('storage', syncLegalAccepted)
  }, [])

  useEffect(() => {
    if (!gaInitializedRef.current) {
      ReactGA.initialize(GA_MEASUREMENT_ID)
      gaInitializedRef.current = true
    }
    const page = `${location.pathname}${location.search}${location.hash}`
    if (lastTrackedPathRef.current === page) return
    lastTrackedPathRef.current = page
    ReactGA.send({ hitType: 'pageview', page })
  }, [location.pathname, location.search, location.hash])

  if (suspendedInfo) {
    return <SuspendedScreen bannedAt={suspendedInfo.bannedAt} />
  }

  return (
    <div className="relative text-white" style={{ background: 'transparent' }}>
      <BackgroundManager />
      <div style={{ position: 'relative', zIndex: 10, background: 'transparent' }}>
        <div
          style={{
            minHeight: '100vh',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            background: 'transparent',
          }}
        >
          <div
            style={{
              position: 'relative',
              zIndex: 10,
              isolation: 'isolate',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              paddingTop: showHeader ? '56px' : '0px',
              paddingBottom: showNav ? '80px' : '0px',
              background: 'transparent',
            }}
          >
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/" element={<ProtectedRoute><Home onOpenWorship={(startPlaying) => openWorship(startPlaying)} worshipStatus={worshipStatus} /></ProtectedRoute>} />
              <Route path="/read" element={<ProtectedRoute><ReadingPlan onOpenWorship={(startPlaying) => openWorship(startPlaying)} /></ProtectedRoute>} />
              <Route path="/reading-plan" element={<ProtectedRoute><ReadingPlan onOpenWorship={(startPlaying) => openWorship(startPlaying)} /></ProtectedRoute>} />
              <Route path="/search" element={<ProtectedRoute><Search onOpenWorship={(startPlaying) => openWorship(startPlaying)} /></ProtectedRoute>} />
              <Route path="/prayer" element={<ProtectedRoute><Prayer /></ProtectedRoute>} />
              <Route path="/my-prayers" element={<Navigate to="/prayer" replace />} />
              <Route path="/share-card" element={<ProtectedRoute><ShareCard /></ProtectedRoute>} />
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
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/edit-profile" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
              <Route path="/worship" element={<ProtectedRoute><WorshipMode /></ProtectedRoute>} />
              <Route path="/bible-videos" element={<ProtectedRoute><BibleVideos /></ProtectedRoute>} />
              <Route path="/onboarding" element={<OnboardingRoute />} />
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
      </div>
      {showFooter && !hasAcceptedLegal ? (
        <LegalModal
          onAgreed={() => {
            setHasAcceptedLegal(true)
            navigate('/onboarding')
          }}
        />
      ) : null}
      <WorshipPlayer
        visible={worshipVisible}
        onClose={() => setWorshipVisible(false)}
        autoPlayToken={worshipAutoPlayToken}
      />
      {showHeader ? <Header /> : null}
      {showNav ? <BottomNav /> : null}
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}
