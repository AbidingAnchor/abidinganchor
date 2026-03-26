import SkyBackground from './SkyBackground'

export default function AppBackground() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        background: '#0d1f4e',
      }}
      aria-hidden="true"
    >
      <SkyBackground />
      <div
        style={{
          position: 'absolute',
          top: '64px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 4,
          pointerEvents: 'none',
          opacity: 0.85,
          filter: 'drop-shadow(0 0 15px #D4A843) drop-shadow(0 0 30px rgba(212, 168, 67, 0.4)) drop-shadow(0 0 20px #D4A843)',
        }}
        aria-hidden="true"
      >
        <svg width="86" height="120" viewBox="0 0 86 120" fill="#D4A843">
          <rect x="38.5" y="8" width="9" height="104" rx="2" />
          <rect x="14" y="39" width="58" height="9" rx="2" />
        </svg>
      </div>
    </div>
  )
}
