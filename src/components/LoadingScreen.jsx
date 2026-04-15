import { useTranslation } from 'react-i18next'

export default function LoadingScreen() {
  useTranslation()
  return (
    <div style={{ position: 'relative', zIndex: 10, minHeight: '100vh', background: 'transparent', display: 'grid', placeItems: 'center' }}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
      <div style={{ textAlign: 'center' }}>
        <img
          src="/NewLogo.png"
          alt="AbidingAnchor app icon"
          width={220}
          height={220}
          style={{ margin: '0 auto', borderRadius: '50%', animation: 'pulse 2.2s ease-in-out infinite' }}
        />
        <p style={{ color: '#D4A843', marginTop: '8px', fontWeight: 700, letterSpacing: '0.08em' }}>Abiding in His Word...</p>
      </div>
    </div>
  )
}
