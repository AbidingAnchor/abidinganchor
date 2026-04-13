import { useTranslation } from 'react-i18next'

export default function LoadingScreen() {
  useTranslation()
  return (
    <div style={{ position: 'relative', zIndex: 10, minHeight: '100vh', background: 'transparent', display: 'grid', placeItems: 'center' }}>
      <style>{`
        @keyframes loading-icon-pulse {
          0%, 100% { transform: scale(1); opacity: 0.96; }
          50% { transform: scale(1.05); opacity: 1; }
        }
      `}</style>
      <div style={{ textAlign: 'center' }}>
        <img
          src="/icon-192x192.png"
          alt="AbidingAnchor app icon"
          width={80}
          height={80}
          style={{ margin: '0 auto', animation: 'loading-icon-pulse 2.2s ease-in-out infinite' }}
        />
        <p style={{ color: '#D4A843', marginTop: '8px', fontWeight: 700, letterSpacing: '0.08em' }}>Abiding in His Word...</p>
      </div>
    </div>
  )
}
