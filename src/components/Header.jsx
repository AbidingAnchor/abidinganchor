import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const screenTitles = {
  '/': 'ABIDING ANCHOR',
  '/read': '📖 Read',
  '/search': '🔍 Search',
  '/faith-journey': '✨ Journey',
  '/prayer': '🙏 Prayer Wall',
  '/community-prayer': '🤝 Community',
  '/journal': '📓 Journal',
  '/share-card': '🕊️ Share Your Faith',
  '/memorize': '📖 Memorize',
  '/devotional': '📖 Devotional',
  '/scripture-art': '🎨 Scripture Art',
  '/reading-plans': '📚 Reading Plans',
  '/fasting': '🍃 Fasting Tracker',
  '/ai-companion': '🤖 AI Companion',
  '/friends': '👥 Friends',
  '/settings': '⚙️ Settings',
}

export default function Header() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, profile, refreshProfile } = useAuth()
  const [localAvatarUrl, setLocalAvatarUrl] = useState(null)

  const currentTitle = screenTitles[location.pathname] || 'ABIDING ANCHOR'

  useEffect(() => {
    if (!user?.id) return
    const loadAvatar = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .maybeSingle()
      if (data?.avatar_url) {
        setLocalAvatarUrl(data.avatar_url)
        refreshProfile(data)
      }
    }
    loadAvatar()
  }, [user?.id, refreshProfile])

  const displayName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email || ''
  const rawAvatarUrl = useMemo(
    () =>
      localAvatarUrl ??
      profile?.avatar_url ??
      user?.user_metadata?.avatar_url ??
      user?.user_metadata?.picture,
    [localAvatarUrl, profile?.avatar_url, user?.user_metadata?.avatar_url, user?.user_metadata?.picture]
  )

  return (
    <div
      className="glass-nav-bar"
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
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        background: 'rgba(7, 13, 26, 0.95)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      {/* Profile avatar */}
      {displayName ? (
        <div
          key={localAvatarUrl || 'no-avatar'}
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
            boxShadow: '0 2px 8px rgba(212, 168, 67, 0.3)',
            border: rawAvatarUrl ? '2px solid rgba(212, 168, 67, 0.4)' : 'none',
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
          {rawAvatarUrl ? (
            <img
              src={localAvatarUrl || profile?.avatar_url}
              alt="Profile"
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
          textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
        }}
      >
        {currentTitle}
      </h1>

      {/* Settings icon */}
      <button
        type="button"
        onClick={() => navigate('/settings')}
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.08)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)'
        }}
      >
        ⚙️
      </button>
    </div>
  )
}
