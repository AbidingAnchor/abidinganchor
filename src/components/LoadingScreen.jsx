import { useEffect, useLayoutEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * Full-viewport overlay while auth/session resolves. Background is transparent so
 * BackgroundManager’s themed sky (day / sunset / night) shows through — same
 * theme as the rest of the app via html[data-theme] and body.theme-*.
 */
export default function LoadingScreen() {
  useTranslation()
  const [logoLoaded, setLogoLoaded] = useState(false)
  const [themeReady, setThemeReady] = useState(false)

  useLayoutEffect(() => {
    const applyThemeImmediately = () => {
      if (typeof window === 'undefined' || typeof document === 'undefined') return
      let preference = 'automatic'
      try {
        const raw = localStorage.getItem('theme-preference')
        const v = String(raw || '').trim().toLowerCase()
        if (v === 'day' || v === 'evening' || v === 'night' || v === 'automatic') {
          preference = v
        }
      } catch {
        /* ignore */
      }

      const now = new Date()
      const totalMinutes = now.getHours() * 60 + now.getMinutes()
      let theme = 'night'
      if (preference === 'day') theme = 'day'
      else if (preference === 'evening') theme = 'sunset'
      else if (preference === 'night') theme = 'night'
      else if (totalMinutes >= 6 * 60 && totalMinutes < 18 * 60) theme = 'day'
      else if (totalMinutes >= 18 * 60 && totalMinutes < 20 * 60) theme = 'sunset'

      document.documentElement.setAttribute('data-theme', theme)

      const body = document.body
      if (!body) return
      const classes = [
        'theme-day',
        'theme-morning',
        'theme-afternoon',
        'theme-evening',
        'theme-sunset',
        'theme-night',
      ]
      for (const cls of classes) body.classList.remove(cls)
      if (theme === 'day') {
        body.classList.add('theme-day')
        body.classList.add(now.getHours() < 12 ? 'theme-morning' : 'theme-afternoon')
      } else if (theme === 'sunset') {
        body.classList.add('theme-sunset', 'theme-evening')
      } else {
        body.classList.add('theme-night')
      }
    }

    applyThemeImmediately()
    setThemeReady(true)
  }, [])

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

  if (!themeReady) return null

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
