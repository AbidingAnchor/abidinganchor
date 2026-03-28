import { NavLink } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const tabs = [
  { label: 'Home', path: '/', icon: '🏠' },
  { label: 'Read', path: '/read', icon: '📖' },
  { label: 'Search', path: '/search', icon: '🔍' },
  { label: 'Journey', path: '/faith-journey', icon: '🧭' },
  { label: 'Prayer', path: '/prayer', icon: '🙏' },
  { label: 'Community', path: '/community-prayer', icon: '🤝' },
  { label: 'Journal', path: '/journal', icon: '📓' },
]

export default function Navbar({ scenery = 'day', onToggleScenery, showSceneryTip = false }) {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const isNight = scenery === 'night'
  const displayName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email || ''
  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 'calc(env(safe-area-inset-top, 0px) + 12px)',
          left: '12px',
          zIndex: 9998,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        {displayName ? (
          <span style={{ background: 'rgba(10,22,50,0.75)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff', borderRadius: '999px', padding: '6px 10px', fontSize: '11px', maxWidth: '140px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {displayName}
          </span>
        ) : null}
        <button
          type="button"
          onClick={async () => {
            const ok = window.confirm('Are you sure you want to sign out?')
            if (!ok) return
            await signOut()
            navigate('/auth', { replace: true })
          }}
          style={{ border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(10,22,50,0.8)', color: '#fff', borderRadius: '999px', padding: '6px 10px', fontSize: '11px' }}
        >
          Sign Out
        </button>
      </div>
      <button
        type="button"
        onClick={onToggleScenery}
        aria-label="Toggle scenery"
        title={`Switch to ${isNight ? 'day' : 'night'} scenery`}
        style={{
          position: 'fixed',
          top: 'calc(env(safe-area-inset-top, 0px) + 12px)',
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
        {scenery === 'night' ? '☀️' : '🌙'}
      </button>
      {showSceneryTip ? (
        <div
          style={{
            position: 'fixed',
            top: 'calc(env(safe-area-inset-top, 0px) + 56px)',
            right: '12px',
            zIndex: 9998,
            fontSize: '11px',
            color: '#fff',
            background: 'rgba(10,22,50,0.8)',
            border: '1px solid rgba(255,255,255,0.25)',
            borderRadius: '10px',
            padding: '6px 10px',
          }}
        >
          Switch to {isNight ? 'day' : 'night'} scenery
        </div>
      ) : null}
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
