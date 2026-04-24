import { useState, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Home, BookOpenText, Scroll, Users, BookMarked, Menu } from 'lucide-react'
import MoreDrawer from './MoreDrawer'
import { useWorshipPlaybackState } from '../lib/worshipGlobalAudio'
export default function BottomNav() {
  const { t } = useTranslation()
  const mainTabs = useMemo(
    () => [
      { labelKey: 'nav.home', path: '/', icon: Home },
      { labelKey: 'nav.read', path: '/read', icon: BookOpenText },
      { labelKey: 'nav.prayer', path: '/prayer', icon: Scroll },
      { labelKey: 'nav.fellowship', path: '/fellowship', icon: Users },
      { labelKey: 'nav.journal', path: '/journal', icon: BookMarked },
      { labelKey: 'nav.more', path: '#more', icon: Menu },
    ],
    [],
  )
  const moreOptions = useMemo(
    () => [
      { labelKey: 'nav.search', path: '/search', icon: '⌕' },
      { labelKey: 'nav.journey', path: '/faith-journey', icon: '✝' },
      { labelKey: 'nav.community', path: '/testimony-wall', icon: '✎' },
      { labelKey: 'nav.create', path: '/share-card', icon: '♦' },
      { label: 'Hall of Faith 👑', path: '/hall-of-faith', icon: '👑' },
      { labelKey: 'nav.settings', path: '/settings', icon: '⚙' },
    ],
    [],
  )
  const navigate = useNavigate()
  const location = useLocation()
  const [moreOpen, setMoreOpen] = useState(false)
  const worshipPlayback = useWorshipPlaybackState()
  const showWorshipPlaying =
    worshipPlayback.isPlaying && location.pathname !== '/worship'

  const handleTabPress = (tab) => {
    if (tab.path === '#more') {
      setMoreOpen(true)
    } else {
      navigate(tab.path)
    }
  }

  const handleMoreOptionPress = (path) => {
    setMoreOpen(false)
    navigate(path)
  }

  const isActive = (path) => {
    if (path === '#more') return false
    return location.pathname === path
  }

  return (
    <>
      <nav
        className="bottom-nav"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          background: 'rgba(10,20,50,0.95)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(212,168,67,0.15)',
          height: '72px',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          paddingLeft: 'env(safe-area-inset-left, 0px)',
          paddingRight: 'env(safe-area-inset-right, 0px)',
        }}
      >
        {showWorshipPlaying ? (
          <button
            type="button"
            className="worship-nav-playing-indicator"
            onClick={() => navigate('/worship')}
            aria-label={t('nav.worship')}
            title={t('nav.worship')}
          >
            <span className="worship-eq-bars" aria-hidden>
              <span />
              <span />
              <span />
            </span>
            <span className="worship-nav-playing-emoji" aria-hidden>
              🎵
            </span>
          </button>
        ) : null}
        {mainTabs.map((tab) => (
          <button
            key={tab.path}
            type="button"
            onClick={() => handleTabPress(tab)}
            style={{
              flex: 1,
              minWidth: '0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              paddingTop: '10px',
              paddingBottom: '10px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
            }}
          >
            {isActive(tab.path) && (
              <div
                style={{
                  width: '20px',
                  height: '2px',
                  background: '#D4A843',
                  borderRadius: '2px',
                  marginBottom: '6px',
                }}
              />
            )}
            <tab.icon
              size={tab.path === '/' ? 22 : 24}
              strokeWidth={isActive(tab.path) ? 2.5 : 1.5}
              color={isActive(tab.path) ? '#D4A843' : 'rgba(255,255,255,0.35)'}
            />
            <span
              style={{
                fontSize: '10px',
                fontWeight: isActive(tab.path) ? 700 : 500,
                color: isActive(tab.path) ? '#D4A843' : 'rgba(255,255,255,0.35)',
                transition: 'color 0.2s ease, font-weight 0.2s ease',
              }}
            >
              {t(tab.labelKey)}
            </span>
          </button>
        ))}
      </nav>

      <MoreDrawer
        isOpen={moreOpen}
        onClose={() => setMoreOpen(false)}
        onOptionPress={handleMoreOptionPress}
        options={moreOptions}
      />
    </>
  )
}
