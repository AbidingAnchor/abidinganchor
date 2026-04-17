import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * Full-viewport overlay while auth/session resolves. Background is transparent so
 * BackgroundManager’s themed sky (day / sunset / night) shows through — same
 * theme as the rest of the app via html[data-theme] and body.theme-*.
 */
export default function LoadingScreen() {
  useTranslation()
  const [logoLoaded, setLogoLoaded] = useState(false)

  useEffect(() => {
    let alive = true
    const img = new Image()
    img.src = '/NewLogo.png'
    if (img.complete) {
      if (alive) setLogoLoaded(true)
      return () => {
        alive = false
      }
    }
    img.onload = () => {
      if (alive) setLogoLoaded(true)
    }
    img.onerror = () => {
      if (alive) setLogoLoaded(true)
    }
    return () => {
      alive = false
    }
  }, [])

  return (
    <div
      className="aa-loading-screen"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100dvh',
        zIndex: 9999,
        margin: 0,
        background: 'var(--loading-screen-bg)',
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
        .aa-loading-screen {
          --loading-screen-bg: linear-gradient(180deg, #07112a 0%, #0b1738 58%, #091021 100%);
        }
        html[data-theme="day"] .aa-loading-screen {
          --loading-screen-bg: linear-gradient(180deg, #8ec7ea 0%, #bfdff2 48%, #f1dfbf 100%);
        }
        html[data-theme="sunset"] .aa-loading-screen {
          --loading-screen-bg: linear-gradient(180deg, #3a2346 0%, #5a2d5f 45%, #e39a5a 100%);
        }
        html[data-theme="night"] .aa-loading-screen {
          --loading-screen-bg: linear-gradient(180deg, #07112a 0%, #0b1738 58%, #091021 100%);
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
          src="/NewLogo.png"
          alt="Abiding Anchor"
          onLoad={() => setLogoLoaded(true)}
          onError={() => setLogoLoaded(true)}
          style={{
            width: 'clamp(180px, 48vw, 200px)',
            height: 'auto',
            maxHeight: 'min(36vh, 220px)',
            objectFit: 'contain',
            display: 'block',
            margin: '0 auto',
            animation: 'loading-logo-pulse 2.2s ease-in-out infinite',
            opacity: logoLoaded ? 1 : 0,
            transition: 'opacity 220ms ease',
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
