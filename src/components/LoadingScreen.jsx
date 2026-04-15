import { useTranslation } from 'react-i18next'

export default function LoadingScreen() {
  useTranslation()
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100000,
        minHeight: '100dvh',
        width: '100%',
        margin: 0,
        background: '#000000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding:
          'max(16px, env(safe-area-inset-top, 0px)) 20px max(16px, env(safe-area-inset-bottom, 0px))',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes loading-logo-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.82; }
        }
      `}</style>
      <div
        style={{
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          maxWidth: 'min(92vw, 320px)',
        }}
      >
        <img
          src="/NewLogo.png"
          alt="Abiding Anchor"
          style={{
            width: 'min(72vw, 260px)',
            height: 'auto',
            maxHeight: 'min(42vh, 280px)',
            objectFit: 'contain',
            display: 'block',
            margin: '0 auto',
            animation: 'loading-logo-pulse 2.2s ease-in-out infinite',
          }}
        />
        <p
          style={{
            color: '#D4A843',
            margin: '16px 0 0',
            fontWeight: 700,
            letterSpacing: '0.08em',
            fontSize: 'clamp(13px, 3.5vw, 16px)',
            lineHeight: 1.4,
          }}
        >
          Abiding in His Word...
        </p>
      </div>
    </div>
  )
}
