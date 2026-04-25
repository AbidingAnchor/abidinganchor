import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { getGuestBrowse } from '../utils/guestBrowse'
import { useGuestSignupModal } from '../context/GuestSignupModalContext'

const HEADER_PATH_TO_KEY = {
  '/': 'brand',
  '/read': 'read',
  '/reading-plan': 'readingPlans',
  '/search': 'search',
  '/faith-journey': 'journey',
  '/prayer': 'prayer',
  '/community-prayer': 'community',
  '/testimony-wall': 'testimonyWall',
  '/journal': 'journal',
  '/share-card': 'shareCard',
  '/memorize': 'memorize',
  '/devotional': 'devotional',
  '/scripture-art': 'scriptureArt',
  '/bible-videos': 'bibleVideos',
  '/reading-plans': 'readingPlans',
  '/fasting': 'fasting',
  '/ai-companion': 'aiCompanion',
  '/friends': 'friends',
  '/support': 'support',
  '/settings': 'settings',
  '/edit-profile': 'settings',
  '/privacy': 'privacyPolicy',
  '/privacy-policy': 'privacyPolicy',
  '/terms': 'termsOfService',
  '/terms-of-service': 'termsOfService',
  '/legal': 'legalPage',
}

export default function Header() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, profile, refreshProfile } = useAuth()
  const { openGuestSignupModal } = useGuestSignupModal()
  const [localAvatarUrl, setLocalAvatarUrl] = useState(null)

  const headerKey = HEADER_PATH_TO_KEY[location.pathname] ?? 'brand'
  const currentTitle = t(`header.${headerKey}`)

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

  const profileFirst =
    profile?.full_name?.trim()?.split(/\s+/)?.[0] ||
    user?.user_metadata?.full_name?.trim()?.split(/\s+/)?.[0] ||
    ''
  const displayName = profileFirst || ''
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
        borderBottom: '1px solid var(--glass-border)',
        background: 'var(--nav-bg)',
      }}
    >
      {/* Profile avatar (settings trigger) */}
      <button
          type="button"
          onClick={() => {
            if (user) navigate('/settings')
            else if (getGuestBrowse()) openGuestSignupModal()
            else navigate('/auth')
          }}
          aria-label={user ? t('header.settings') : t('auth.signIn')}
          title={user ? t('header.settings') : t('auth.signIn')}
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
            border: '2px solid #D4A843',
            cursor: 'pointer',
            padding: 0,
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
            {(displayName || '?').charAt(0).toUpperCase()}
          </span>
          {rawAvatarUrl ? (
            <img
              src={localAvatarUrl || profile?.avatar_url}
              alt={t('common.profile')}
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
        </button>

      {/* Title */}
      <h1
        style={{
          fontSize: '16px',
          letterSpacing: '0.15em',
          color: '#D4A843',
          fontWeight: 500,
          margin: 0,
          textShadow: '0 0 20px rgba(212, 168, 67, 0.45), 0 0 40px rgba(212, 168, 67, 0.15)',
        }}
      >
        {currentTitle}
      </h1>

      <div style={{ width: '36px', height: '36px' }} aria-hidden />
    </div>
  )
}
