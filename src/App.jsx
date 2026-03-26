import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useMemo, useState } from 'react'
import Home from './pages/Home'
import ReadingPlan from './pages/ReadingPlan'
import Search from './pages/Search'
import Journal from './pages/Journal'
import Prayer from './pages/Prayer'
import Memorize from './pages/Memorize'
import Support from './pages/Support'
import PrivacyPolicy from './pages/PrivacyPolicy'
import TermsOfService from './pages/TermsOfService'
import Legal from './pages/Legal'
import Navbar from './components/Navbar'
import SkyBackground from './components/SkyBackground'
import LegalModal from './components/LegalModal'
import { getTheme, setTheme } from './utils/theme'

export default function App() {
  const [theme, setThemeState] = useState(() => getTheme())
  const isNight = theme === 'night'
  const appBackground = useMemo(
    () => (isNight ? 'linear-gradient(180deg, #1a0e00 0%, #2d1a00 100%)' : 'transparent'),
    [isNight],
  )

  const handleToggleTheme = () => {
    setThemeState((prev) => setTheme(prev === 'night' ? 'day' : 'night'))
  }

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

        <div style={{ position: 'relative', zIndex: 10, isolation: 'isolate', paddingBottom: '80px' }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/plan" element={<ReadingPlan />} />
            <Route path="/search" element={<Search />} />
            <Route path="/prayer" element={<Prayer />} />
            <Route path="/journal" element={<Journal />} />
            <Route path="/memorize" element={<Memorize />} />
            <Route path="/support" element={<Support />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/legal" element={<Legal />} />
          </Routes>
        </div>
      </div>
      <LegalModal />
      <Navbar theme={theme} onToggleTheme={handleToggleTheme} />
    </BrowserRouter>
  )
}
