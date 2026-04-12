import { useState, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import MoreDrawer from './MoreDrawer'

export default function BottomNav() {
  const { t } = useTranslation()
  const mainTabs = useMemo(
    () => [
      { labelKey: 'nav.home', path: '/', icon: '🏠' },
      { labelKey: 'nav.read', path: '/read', icon: '📖' },
      { labelKey: 'nav.prayer', path: '/prayer', icon: '🙏' },
      { labelKey: 'nav.journal', path: '/journal', icon: '📓' },
      { labelKey: 'nav.more', path: '#more', icon: '☰' },
    ],
    [],
  )
  const moreOptions = useMemo(
    () => [
      { labelKey: 'nav.search', path: '/search', icon: '🔍' },
      { labelKey: 'nav.journey', path: '/faith-journey', icon: '✨' },
      { labelKey: 'nav.community', path: '/community-prayer', icon: '🤝' },
      { labelKey: 'nav.create', path: '/share-card', icon: '🕊️' },
      { labelKey: 'nav.settings', path: '/settings', icon: '⚙️' },
    ],
    [],
  )
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
        className="bottom-nav"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          background: 'var(--nav-bg)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderTop: '1px solid var(--nav-border)',
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
                opacity: 1,
                transition: 'opacity 0.2s ease',
              }}
            >
              {tab.icon}
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 500,
                color: isActive(tab.path) ? 'var(--nav-text-active)' : 'var(--nav-text)',
                transition: 'color 0.2s ease',
              }}
            >
              {t(tab.labelKey)}
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
