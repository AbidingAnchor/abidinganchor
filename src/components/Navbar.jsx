import { NavLink } from 'react-router-dom'

const tabs = [
  { label: 'Home', path: '/', icon: '🏠' },
  { label: 'Read', path: '/reading-plan', icon: '📖' },
  { label: 'Search', path: '/search', icon: '🔍' },
  { label: 'Journey', path: '/faith-journey', icon: '🧭' },
  { label: 'Prayer', path: '/prayer', icon: '🙏' },
  { label: 'Journal', path: '/journal', icon: '📓' },
]

export default function Navbar({ theme = 'day', onToggleTheme }) {
  const isNight = theme === 'night'
  return (
    <>
      <button
        type="button"
        onClick={onToggleTheme}
        aria-label="Toggle theme"
        style={{
          position: 'fixed',
          top: '16px',
          right: '16px',
          zIndex: 9998,
          border: '1px solid rgba(255,255,255,0.3)',
          background: isNight ? 'rgba(13, 7, 0, 0.9)' : 'rgba(10, 31, 78, 0.8)',
          color: '#fff',
          borderRadius: '999px',
          width: '40px',
          height: '40px',
        }}
      >
        {theme === 'night' ? '☀️' : '🌙'}
      </button>
      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          background: isNight ? 'rgba(26, 14, 0, 0.92)' : 'rgba(10, 22, 50, 0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(255,255,255,0.15)',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          padding: '10px 0 16px',
          paddingBottom: 'env(safe-area-inset-bottom, 12px)',
          paddingLeft: 'env(safe-area-inset-left, 0px)',
          paddingRight: 'env(safe-area-inset-right, 0px)',
        }}
      >
        {tabs.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            className={({ isActive }) =>
              `text-center font-semibold transition-all ${
                isActive ? 'nav-active' : 'text-[#8B7355] hover:text-[#8B7355]'
              }`
            }
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', fontSize: '9px' }}
          >
            <span style={{ fontSize: '14px' }}>{tab.icon}</span>
            <span>{tab.label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  )
}
