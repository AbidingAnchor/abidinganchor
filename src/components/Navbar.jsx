import { NavLink } from 'react-router-dom'

const tabs = [
  { label: 'Home', path: '/', icon: '⌂' },
  { label: 'Plan', path: '/plan', icon: '📖' },
  { label: 'Search', path: '/search', icon: '🔍' },
  { label: 'Journal', path: '/journal', icon: '📝' },
  { label: 'Support', path: '/support', icon: '♥' },
]

export default function Navbar() {
  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: 'rgba(10, 22, 50, 0.85)',
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
            `text-center font-semibold transition-colors ${
              isActive ? 'text-accent-gold' : 'text-[#8B7355] hover:text-[#8B7355]'
            }`
          }
          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', fontSize: '9px' }}
        >
          <span style={{ fontSize: '14px', color: tab.label === 'Support' ? '#FFD700' : undefined }}>{tab.icon}</span>
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
