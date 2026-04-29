import { useState, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import MoreDrawer from './MoreDrawer'
import { useWorshipPlaybackState } from '../lib/worshipGlobalAudio'
import { useThemeBackgroundType } from '../hooks/useThemeBackgroundType'
export default function BottomNav() {
  const { t } = useTranslation()
  const themeType = useThemeBackgroundType()
  const isDaytime = themeType === 'day'
  const mainTabs = useMemo(
    () => [
      { labelKey: 'nav.home', path: '/', emoji: '🏠' },
      { labelKey: 'nav.read', path: '/read', emoji: '📖' },
      { labelKey: 'nav.prayer', path: '/prayer', emoji: '🙏' },
      { labelKey: 'nav.fellowship', path: '/fellowship', emoji: '👥' },
      { labelKey: 'nav.journal', path: '/journal', emoji: '📝' },
      { labelKey: 'nav.more', path: '#more', emoji: '☰' },
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
      { label: 'Sermons 🎙️', path: '/sermons', icon: '🎙️' },
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
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: isDaytime ? '#F5EFE0' : '#0A1628',
          background: isDaytime ? '#F5EFE0' : '#0A1628',
          paddingBottom: 'env(safe-area-inset-bottom)',
          paddingLeft: 'env(safe-area-inset-left, 0px)',
          paddingRight: 'env(safe-area-inset-right, 0px)',
          margin: 0,
        }}
      >
      <nav
        className="bottom-nav"
        style={{
          background: isDaytime ? '#F5EFE0' : '#0A1628',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(212,168,67,0.15)',
          minHeight: '64px',
          height: '64px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingLeft: 0,
          paddingRight: 0,
          margin: 0,
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
              gap: '3px',
              height: '100%',
              paddingTop: '6px',
              paddingBottom: '6px',
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
            <span style={{ fontSize: 20, lineHeight: 1 }}>{tab.emoji}</span>
            <span
              style={{
                fontSize: '9px',
                fontWeight: isActive(tab.path) ? 700 : 500,
                color: isActive(tab.path) ? (isDaytime ? '#8B6200' : '#D4A843') : (isDaytime ? 'rgba(15,31,61,0.55)' : 'rgba(255,255,255,0.35)'),
                transition: 'color 0.2s ease, font-weight 0.2s ease',
                whiteSpace: 'nowrap',
              }}
            >
              {t(tab.labelKey)}
            </span>
          </button>
        ))}
      </nav>
      </div>

      <MoreDrawer
        isOpen={moreOpen}
        onClose={() => setMoreOpen(false)}
        onOptionPress={handleMoreOptionPress}
        options={moreOptions}
      />
    </>
  )
}
