import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import CelestialBackground from './CelestialBackground'
import DayBackground from './DayBackground'
import { useThemeBackgroundType } from '../hooks/useThemeBackgroundType'

/**
 * Full-viewport overlay while auth/session resolves. Background is transparent so
 * BackgroundManager’s themed sky (day / sunset / night) shows through — same
 * theme as the rest of the app via html[data-theme] and body.theme-*.
 */
export default function LoadingScreen() {
  useTranslation()
  const [logoLoaded, setLogoLoaded] = useState(false)
  const skyPeriod = useThemeBackgroundType()
  const isDaytime = skyPeriod === 'day' || skyPeriod === 'morning' || skyPeriod === 'afternoon'

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
        background: isDaytime ? '#F5EFE0' : '#0A1628',
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
      {isDaytime ? (
        <div style={{ position: 'absolute', inset: 0, zIndex: -1 }}>
          <DayBackground />
        </div>
      ) : null}
      {!isDaytime ? (
        <div style={{ position: 'absolute', inset: 0, zIndex: -1 }}>
          <CelestialBackground />
        </div>
      ) : null}
      <style>{`
        @keyframes loading-logo-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.88; }
        }
        @keyframes dotAppear {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
        .aa-loading-screen {
          --loading-screen-bg: #050816;
          background: ${isDaytime
            ? '#F5EFE0'
            : 'linear-gradient(to bottom, #050816 0%, #0A0F2C 50%, #050816 100%)'};
        }
        .aa-loading-screen::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: ${isDaytime
            ? 'none'
            : 'radial-gradient(ellipse at center, rgba(14, 30, 70, 0.5) 0%, transparent 70%)'};
          pointer-events: none;
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
            color: isDaytime ? '#1A1A1A' : '#FFFFFF',
            margin: '12px 0 0',
            fontWeight: 700,
            letterSpacing: '0.08em',
            fontSize: 'clamp(16px, 4.1vw, 20px)',
            lineHeight: 1.2,
            textTransform: 'uppercase',
            textShadow: isDaytime ? 'none' : '0 1px 12px rgba(0,0,0,0.5)',
          }}
        >
          Abiding Anchor
        </p>
        <p
          style={{
            color: isDaytime ? '#1A1A1A' : '#FFFFFF',
            margin: '14px 0 0',
            fontWeight: 700,
            letterSpacing: '0.08em',
            fontSize: 'clamp(13px, 3.5vw, 16px)',
            lineHeight: 1.4,
            textShadow: isDaytime ? 'none' : '0 1px 14px rgba(0,0,0,0.45)',
          }}
        >
          Abiding in His Word
          <span style={{ display: 'inline-block', fontSize: 'inherit', color: isDaytime ? '#1A1A1A' : '#FFFFFF', opacity: 0, animation: 'dotAppear 1.5s infinite 0s' }}>.</span>
          <span style={{ display: 'inline-block', fontSize: 'inherit', color: isDaytime ? '#1A1A1A' : '#FFFFFF', opacity: 0, animation: 'dotAppear 1.5s infinite 0.5s' }}>.</span>
          <span style={{ display: 'inline-block', fontSize: 'inherit', color: isDaytime ? '#1A1A1A' : '#FFFFFF', opacity: 0, animation: 'dotAppear 1.5s infinite 1s' }}>.</span>
        </p>
      </div>
    </div>
  )
}
