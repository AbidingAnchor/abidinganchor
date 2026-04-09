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
          width: '100px',
          height: 'auto',
          filter: 'drop-shadow(0 0 15px rgba(212,168,67,0.9)) drop-shadow(0 0 35px rgba(212,168,67,0.6)) drop-shadow(0 0 70px rgba(212,168,67,0.3))',
          animation: 'crossPulse 3s ease-in-out infinite',
          pointerEvents: 'none'
        }}
      />
    </div>
  )
}
