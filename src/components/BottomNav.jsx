import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import MoreDrawer from './MoreDrawer'

const mainTabs = [
  { label: 'Home', path: '/', icon: '🏠' },
  { label: 'Read', path: '/read', icon: '📖' },
  { label: 'Prayer', path: '/prayer', icon: '🙏' },
  { label: 'Journal', path: '/journal', icon: '📓' },
  { label: 'More', path: '#more', icon: '☰' },
]

const moreOptions = [
  { label: 'Search', path: '/search', icon: '🔍' },
  { label: 'Journey', path: '/faith-journey', icon: '✨' },
  { label: 'Community', path: '/community-prayer', icon: '🤝' },
  { label: 'Create', path: '/share-card', icon: '🕊️' },
  { label: 'Settings', path: '/settings', icon: '⚙️' },
]

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const [moreOpen, setMoreOpen] = useState(false)

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
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          background: 'rgba(7, 13, 26, 0.95)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          height: '72px',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          paddingLeft: 'env(safe-area-inset-left, 0px)',
          paddingRight: 'env(safe-area-inset-right, 0px)',
        }}
      >
        {mainTabs.map((tab) => (
          <button
            key={tab.path}
            onClick={() => handleTabPress(tab)}
            style={{
              flex: 1,
              minWidth: '0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              padding: '8px 4px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
              paddingTop: '12px',
            }}
          >
            <span
              style={{
                fontSize: '24px',
                filter: isActive(tab.path) ? 'drop-shadow(0 0 8px rgba(212, 168, 67, 0.6))' : 'none',
                opacity: isActive(tab.path) ? 1 : 0.5,
                transition: 'opacity 0.2s ease',
              }}
            >
              {tab.icon}
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 500,
                color: isActive(tab.path) ? '#D4A843' : 'rgba(255, 255, 255, 0.6)',
                transition: 'color 0.2s ease',
              }}
            >
              {tab.label}
            </span>
            {isActive(tab.path) && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '32px',
                  height: '3px',
                  background: '#D4A843',
                  borderRadius: '0 0 2px 2px',
                  boxShadow: '0 2px 8px rgba(212, 168, 67, 0.4)',
                }}
              />
            )}
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
