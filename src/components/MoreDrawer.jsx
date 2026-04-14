import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

export default function MoreDrawer({ isOpen, onClose, onOptionPress, options }) {
  const { t } = useTranslation()
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          zIndex: 10000,
          animation: 'fadeIn 0.2s ease',
        }}
      />

      {/* Bottom Sheet */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 10001,
          background: 'var(--modal-bg)',
          borderTop: '1px solid var(--glass-border)',
          borderRadius: '24px 24px 0 0',
          paddingBottom: 'env(safe-area-inset-bottom, 20px)',
          paddingLeft: 'env(safe-area-inset-left, 0px)',
          paddingRight: 'env(safe-area-inset-right, 0px)',
          animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          maxHeight: '70vh',
          overflowY: 'auto',
        }}
      >
        {/* Handle bar */}
        <div
          style={{
            width: '40px',
            height: '4px',
            background: 'var(--text-muted)',
            borderRadius: '2px',
            margin: '12px auto 16px',
          }}
        />

        {/* Header */}
        <div
          style={{
            padding: '0 20px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2
            style={{
              fontSize: '18px',
              fontWeight: 600,
              color: '#D4A843',
              margin: 0,
              letterSpacing: '0.05em',
            }}
          >
            {t('nav.more')}
          </h2>
          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'var(--btn-secondary-bg)',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            ✕
          </button>
        </div>

        {/* Options list */}
        <div style={{ padding: '0 12px 8px' }}>
          {options.map((option, index) => (
            <div key={option.path}>
              <button
                onClick={() => onOptionPress(option.path)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '16px 16px',
                  background: 'var(--more-menu-item-bg)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  marginBottom: index < options.length - 1 ? '8px' : '0',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--more-menu-item-hover)'
                  e.currentTarget.style.borderColor = 'var(--gold-border)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--more-menu-item-bg)'
                  e.currentTarget.style.borderColor = 'var(--glass-border)'
                }}
              >
                <span
                  style={{
                    fontSize: '24px',
                    opacity: 1,
                  }}
                >
                  {option.icon}
                </span>
                <span
                  style={{
                    flex: 1,
                    fontSize: '16px',
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                    textAlign: 'left',
                  }}
                >
                  {option.labelKey ? t(option.labelKey) : option.label}
                </span>
                <span
                  style={{
                    fontSize: '18px',
                    color: '#D4A843',
                    opacity: 0.8,
                  }}
                >
                  →
                </span>
              </button>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  )
}
