import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useThemeBackgroundType } from '../hooks/useThemeBackgroundType'

export default function MoreDrawer({ isOpen, onClose, onOptionPress, options }) {
  const { t } = useTranslation()
  const themeType = useThemeBackgroundType()
  const isDaytime = themeType === 'day'

  const withMenuSquareIcon = (option) => {
    if (option.path === '/search') return '🔍'
    if (option.path === '/faith-journey') return '✨'
    if (option.path === '/testimony-wall') return '📣'
    if (option.path === '/share-card') return '🎨'
    if (option.path === '/settings') return '⚙️'
    return option.icon
  }
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      document.body.style.touchAction = 'none'
      document.body.style.overscrollBehavior = 'none'
    } else {
      document.body.style.overflow = ''
      document.body.style.touchAction = ''
      document.body.style.overscrollBehavior = ''
    }
    return () => {
      document.body.style.overflow = ''
      document.body.style.touchAction = ''
      document.body.style.overscrollBehavior = ''
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
          pointerEvents: 'auto',
          touchAction: 'manipulation',
        }}
      />

      {/* Bottom Sheet */}
      <div
        className="more-bottom-sheet"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 10001,
          background: isDaytime ? '#F5EFE0' : undefined,
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          borderTop: '1px solid rgba(255,255,255,0.09)',
          borderRadius: '24px 24px 0 0',
          paddingBottom: 'env(safe-area-inset-bottom, 20px)',
          paddingLeft: 'env(safe-area-inset-left, 0px)',
          paddingRight: 'env(safe-area-inset-right, 0px)',
          animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          maxHeight: '76vh',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
          pointerEvents: 'auto',
          touchAction: 'pan-y',
        }}
      >
        {/* Handle bar */}
        <div
          style={{
            width: '40px',
            height: '4px',
            backgroundColor: isDaytime ? 'rgba(26,26,26,0.2)' : 'rgba(255,255,255,0.2)',
            borderRadius: '2px',
            margin: '12px auto 16px',
          }}
        />

        {/* Header */}
        <div
          className="more-bottom-sheet__header"
          style={{
            padding: '0 20px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: isDaytime ? '#F5EFE0' : 'transparent',
          }}
        >
          <div>
            <h2
              style={{
                fontSize: '20px',
                fontWeight: 800,
                color: isDaytime ? '#1A1A1A' : '#ffffff',
                margin: 0,
                letterSpacing: '0.05em',
              }}
            >
              {t('nav.more')}
            </h2>
            <div
              style={{
                width: '40px',
                height: '2px',
                background: '#D4A843',
                marginTop: '8px',
                borderRadius: '1px',
              }}
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClose()
              }
            }}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: isDaytime ? '#1A1A1A' : '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              touchAction: 'manipulation',
            }}
          >
            ✕
          </button>
        </div>

        {/* Options list */}
        <div style={{ padding: '0 0 8px' }}>
          {options.map((option, index) => (
            <div key={option.path}>
              <button
                type="button"
                className="more-bottom-sheet__row"
                onClick={() => onOptionPress(option.path)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onOptionPress(option.path)
                  }
                }}
                style={{
                  width: '100%',
                  minHeight: '60px',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 20px',
                  borderBottom: index < options.length - 1 ? (isDaytime ? '1px solid rgba(26,26,26,0.08)' : '1px solid rgba(255,255,255,0.06)') : 'none',
                  background: isDaytime ? '#F5EFE0' : 'transparent',
                  border: 'none',
                  borderRadius: '0',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <div
                  className="more-bottom-sheet__icon-wrap"
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    background: 'rgba(212,168,67,0.1)',
                    border: '1px solid rgba(212,168,67,0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span className="more-bottom-sheet__icon-emoji" style={{ color: isDaytime ? '#1A1A1A' : '#D4A843', fontSize: '20px' }}>
                    {withMenuSquareIcon(option)}
                  </span>
                </div>
                <span
                  style={{
                    flex: 1,
                    fontSize: '16px',
                    fontWeight: 600,
                    color: isDaytime ? '#1A1A1A' : '#ffffff',
                    textAlign: 'left',
                    marginLeft: '14px',
                  }}
                >
                  {option.labelKey ? t(option.labelKey) : option.label}
                </span>
                <span
                  className="more-bottom-sheet__chevron"
                  style={{
                    fontSize: '18px',
                    color: isDaytime ? '#1A1A1A' : '#D4A843',
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
