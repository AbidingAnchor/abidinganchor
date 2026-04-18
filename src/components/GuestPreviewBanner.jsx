import { useTranslation } from 'react-i18next'
import { useIsGuestSession } from '../hooks/useIsGuestSession'
import { useGuestSignupModal } from '../context/GuestSignupModalContext'

/**
 * Informational strip for guest sessions — does not block the page.
 */
export default function GuestPreviewBanner() {
  const { t } = useTranslation()
  const isGuest = useIsGuestSession()
  const { openGuestSignupModal } = useGuestSignupModal()
  if (!isGuest) return null

  return (
    <div
      role="status"
      style={{
        marginBottom: '14px',
        padding: '12px 14px',
        borderRadius: '12px',
        border: '1px solid rgba(212, 168, 67, 0.45)',
        background: 'linear-gradient(135deg, rgba(212,168,67,0.14) 0%, rgba(13,31,78,0.45) 100%)',
        boxShadow: '0 4px 18px rgba(0,0,0,0.2)',
      }}
    >
      <p style={{ margin: 0, color: 'rgba(255,248,230,0.95)', fontSize: '13px', lineHeight: 1.45 }}>
        {t('guest.banner')}
      </p>
      <button
        type="button"
        onClick={() => openGuestSignupModal()}
        style={{
          display: 'inline-block',
          marginTop: '10px',
          padding: 0,
          border: 'none',
          background: 'none',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 700,
          color: '#D4A843',
          letterSpacing: '0.04em',
        }}
      >
        {t('guest.signUp')} →
      </button>
    </div>
  )
}
