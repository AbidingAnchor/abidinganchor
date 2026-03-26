import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import ReadingPlan from './pages/ReadingPlan'
import Search from './pages/Search'
import Journal from './pages/Journal'
import Support from './pages/Support'
import PrivacyPolicy from './pages/PrivacyPolicy'
import TermsOfService from './pages/TermsOfService'
import Navbar from './components/Navbar'
import SkyBackground from './components/SkyBackground'

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ minHeight: '100vh', position: 'relative' }}>
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 0,
            overflow: 'hidden',
            pointerEvents: 'none',
          }}
        >
          <SkyBackground />
        </div>

        <div style={{ position: 'relative', zIndex: 10, isolation: 'isolate', paddingBottom: '80px' }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/plan" element={<ReadingPlan />} />
            <Route path="/search" element={<Search />} />
            <Route path="/journal" element={<Journal />} />
            <Route path="/support" element={<Support />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
          </Routes>
        </div>
      </div>
      <Navbar />
    </BrowserRouter>
  )
}
