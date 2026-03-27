import SkyBackground from './SkyBackground'

export default function AppBackground({ scenery }) {
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
      <SkyBackground scenery={scenery} />
    </div>
  )
}
