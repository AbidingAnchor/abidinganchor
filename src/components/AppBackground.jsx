import SkyBackground from './SkyBackground'

export default function AppBackground({ scenery }) {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        zIndex: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        background: '#0d1f4e',
      }}
      aria-hidden="true"
    >
      <SkyBackground scenery={scenery} />
      <img 
        src="/images/GoldCross.png"
        alt="Cross"
        onError={(e) => console.log('Cross image failed:', e)}
        onLoad={() => console.log('Cross image loaded!')}
        style={{
          position: 'absolute',
          zIndex: 10,
          top: '8%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '150px',
          height: '150px',
          objectFit: 'contain',
          mixBlendMode: 'screen',
          filter: 'drop-shadow(0 0 30px rgba(212,168,67,0.9))',
          animation: 'crossPulse 3s ease-in-out infinite',
          pointerEvents: 'none'
        }}
      />
    </div>
  )
}
