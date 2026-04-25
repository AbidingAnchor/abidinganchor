import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const GuestSignupModalContext = createContext(null)

function GuestSignupModal({ open, onClose, onSignUp, onMaybeLater }) {
  const { t } = useTranslation()

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onMaybeLater()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onMaybeLater])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{
        zIndex: 10050,
        background: 'rgba(6, 12, 35, 0.72)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="guest-signup-modal-title"
      onClick={onMaybeLater}
    >
      <article
        className="glass-panel relative z-[1] w-full text-center text-white"
        style={{
          maxWidth: '400px',
          padding: '28px 22px 24px',
          borderRadius: '20px',
          border: '1px solid rgba(240, 192, 64, 0.45)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)',
          background: 'linear-gradient(165deg, rgba(22,36,72,0.96) 0%, rgba(10,20,50,0.98) 100%)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="guest-signup-modal-title"
          style={{
            margin: '0 0 10px',
            fontSize: 'clamp(17px, 4.2vmin, 20px)',
            fontWeight: 700,
            lineHeight: 1.35,
            color: '#F5E6B8',
          }}
        >
          {t('guest.modalTitle')}
        </h2>
        <p
          style={{
            margin: '0 0 22px',
            fontSize: '13px',
            lineHeight: 1.5,
            color: 'rgba(255,255,255,0.72)',
          }}
        >
          {t('guest.modalSubtitle')}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            type="button"
            onClick={onSignUp}
            className="w-full rounded-xl px-4 py-3 text-sm font-bold"
            style={{
              background: 'linear-gradient(180deg, #e4c56a 0%, #F0C040 45%, #b8922f 100%)',
              color: '#1a1520',
              border: '1px solid rgba(255,230,180,0.35)',
              boxShadow: '0 4px 14px rgba(240,192,64,0.35)',
            }}
          >
            {t('guest.signUpFree')}
          </button>
          <button
            type="button"
            onClick={onMaybeLater}
            className="w-full rounded-xl px-4 py-3 text-sm font-semibold"
            style={{
              background: 'transparent',
              color: 'rgba(255,255,255,0.9)',
              border: '1px solid rgba(240, 192, 64, 0.55)',
            }}
          >
            {t('guest.maybeLater')}
          </button>
        </div>
      </article>
    </div>
  )
}

export function GuestSignupModalProvider({ children }) {
  const [open, setOpen] = useState(false)
  /** 'feature' = close only; 'route' = after dismiss navigate to safe guest path */
  const [mode, setMode] = useState('feature')
  const navigate = useNavigate()

  const openGuestSignupModal = useCallback((options) => {
    const nextMode = options?.routeIntercept === true ? 'route' : 'feature'
    setMode(nextMode)
    setOpen(true)
  }, [])

  const closeOnly = useCallback(() => {
    setOpen(false)
  }, [])

  const handleSignUp = useCallback(() => {
    setOpen(false)
    setMode('feature')
    navigate('/auth')
  }, [navigate])

  const handleMaybeLater = useCallback(() => {
    setOpen(false)
    if (mode === 'route') {
      setMode('feature')
      navigate('/read', { replace: true })
    }
  }, [mode, navigate])

  const value = useMemo(() => ({ openGuestSignupModal }), [openGuestSignupModal])

  return (
    <GuestSignupModalContext.Provider value={value}>
      {children}
      <GuestSignupModal
        open={open}
        onClose={handleMaybeLater}
        onSignUp={handleSignUp}
        onMaybeLater={handleMaybeLater}
      />
    </GuestSignupModalContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components -- context + hook pair
export function useGuestSignupModal() {
  const ctx = useContext(GuestSignupModalContext)
  if (!ctx) {
    throw new Error('useGuestSignupModal must be used within GuestSignupModalProvider')
  }
  return ctx
}
