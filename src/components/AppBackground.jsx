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
    </div>
  )
}
