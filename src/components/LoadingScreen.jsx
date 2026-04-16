import { memo, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import logoSrc from '../assets/NewLogo.png'

/** Max time a gated route may show the loader before forcing progress (see App.jsx). */
export const LOADING_SCREEN_MAX_MS = 3000

/**
 * Full-viewport overlay while auth/session resolves. Background is transparent so
 * BackgroundManager’s themed sky (day / sunset / night) shows through — same
 * theme as the rest of the app via html[data-theme] and body.theme-*.
 *
 * Logo stays visually stable: no React state tied to image load (avoids flash on re-render).
 *
 * @param {number} [maxDisplayMs] When set with onTimeout, fires once after this many ms.
 * @param {() => void} [onTimeout] Called when maxDisplayMs elapses.
 * @param {boolean} [active=true] When false, the timeout is cleared.
 */
function LoadingScreen({ maxDisplayMs, onTimeout, active = true }) {
  useTranslation()
  const onTimeoutRef = useRef(onTimeout)
  onTimeoutRef.current = onTimeout

  useEffect(() => {
    if (!active || maxDisplayMs == null || maxDisplayMs <= 0) return undefined
    const t = window.setTimeout(() => onTimeoutRef.current?.(), maxDisplayMs)
    return () => window.clearTimeout(t)
  }, [active, maxDisplayMs])

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100dvh',
        zIndex: 9999,
        margin: 0,
        background: 'transparent',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding:
          'max(16px, env(safe-area-inset-top, 0px)) max(20px, env(safe-area-inset-right, 0px)) max(16px, env(safe-area-inset-bottom, 0px)) max(20px, env(safe-area-inset-left, 0px))',
        boxSizing: 'border-box',
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      <style>{`
        @keyframes loading-logo-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.88; }
        }
      `}</style>
      <div
        style={{
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          maxWidth: 'min(92vw, 280px)',
          pointerEvents: 'auto',
        }}
      >
        <img
          src={logoSrc}
          alt="Abiding Anchor"
          decoding="async"
          fetchPriority="high"
          loading="eager"
          style={{
            width: 'clamp(180px, 48vw, 200px)',
            height: 'auto',
            maxHeight: 'min(36vh, 220px)',
            objectFit: 'contain',
            display: 'block',
            margin: '0 auto',
            animation: 'loading-logo-pulse 2.2s ease-in-out infinite',
          }}
        />
        <p
          style={{
            color: 'var(--gold, #D4A843)',
            margin: '14px 0 0',
            fontWeight: 700,
            letterSpacing: '0.08em',
            fontSize: 'clamp(13px, 3.5vw, 16px)',
            lineHeight: 1.4,
            textShadow: '0 1px 14px rgba(0,0,0,0.45)',
          }}
        >
          Abiding in His Word...
        </p>
      </div>
    </div>
  )
}

export default memo(LoadingScreen)
