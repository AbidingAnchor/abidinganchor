import { useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { appendAvatarCacheBust } from '../utils/avatarUrl'

const tabs = [
  { label: 'Home', path: '/', icon: '🏠' },
  { label: 'Read', path: '/read', icon: '📖' },
  { label: 'Search', path: '/search', icon: '🔍' },
  { label: 'Journey', path: '/faith-journey', icon: '🧭' },
  { label: 'Prayer', path: '/prayer', icon: '🙏' },
  { label: 'Community', path: '/community-prayer', icon: '🤝' },
  { label: 'Journal', path: '/journal', icon: '📓' },
]

export default function Navbar() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [localAvatarUrl, setLocalAvatarUrl] = useState(null)

  useEffect(() => {
    const loadAvatar = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) return
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .maybeSingle()
      if (data?.avatar_url) setLocalAvatarUrl(data.avatar_url)
    }
    loadAvatar()
  }, [])

  const displayName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email || ''
  const rawAvatarUrl =
    localAvatarUrl ??
    profile?.avatar_url ??
    user?.user_metadata?.avatar_url ??
    user?.user_metadata?.picture
  const avatarDisplayUrl = useMemo(
    () => appendAvatarCacheBust(rawAvatarUrl),
    [rawAvatarUrl],
  )

  return (
    <>
      {/* Premium header bar */}
      <div
        style={{
          position: 'fixed',
          top: 'calc(env(safe-area-inset-top, 0px))',
          left: 0,
          right: 0,
          height: '56px',
          zIndex: 9998,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          background: 'rgba(10,22,50,0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(212,168,67,0.25)',
        }}
      >
        {/* Profile avatar */}
        {displayName ? (
          <div
            key={(localAvatarUrl ?? profile?.avatar_url) || 'no-avatar'}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: '#D4A843',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(212,168,67,0.3)',
              border: rawAvatarUrl ? '2px solid rgba(212,168,67,0.4)' : 'none',
            }}
          >
            <span
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 600,
                zIndex: 0,
              }}
            >
              {displayName.charAt(0).toUpperCase()}
            </span>
            {avatarDisplayUrl ? (
              <img
                src={avatarDisplayUrl}
                alt="Profile"
                crossOrigin="anonymous"
                onError={(e) => {
                  e.target.style.display = 'none'
                }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: '50%',
                  zIndex: 1,
                }}
              />
            ) : null}
          </div>
        ) : (
          <div style={{ width: '36px' }} />
        )}

        {/* Title */}
        <h1
          style={{
            fontSize: '16px',
            letterSpacing: '0.15em',
            color: '#D4A843',
            fontWeight: 500,
            margin: 0,
            textShadow: '0 2px 8px rgba(0,0,0,0.3)'
          }}
        >
          ABIDING ANCHOR
        </h1>

        {/* Settings icon */}
        <button
          type="button"
          onClick={() => navigate('/settings')}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.15)'
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'
          }}
        >
          ⚙️
        </button>
      </div>
      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          background: 'rgba(13,0,32,0.97)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(212,168,67,0.15)',
          height: '65px',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          padding: '0 0 16px',
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
              `text-center text-sm font-semibold transition-all ${isActive ? 'text-accent-gold active-nav-link' : 'text-white/[0.35]'}`
            }
            style={({ isActive }) => ({
              flex: 1,
              minWidth: '50px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              paddingTop: '8px',
              borderTop: isActive ? '2px solid #D4A843' : 'none',
            })}
          >
            {({ isActive }) => (
              <>
                <span className="text-2xl" style={{ filter: isActive ? 'drop-shadow(0 0 6px rgba(212,168,67,0.6))' : 'none' }}>
                  {tab.icon}
                </span>
                <span style={{ fontSize: '10px' }}>{tab.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </>
  )
}
