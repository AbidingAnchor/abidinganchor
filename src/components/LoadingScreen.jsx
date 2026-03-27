export default function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', background: '#0d1f4e', display: 'grid', placeItems: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '64px', color: '#D4A843', animation: 'gold-pulse 1.4s ease-in-out infinite' }}>✝</div>
        <p style={{ color: '#D4A843', marginTop: '8px', fontWeight: 700, letterSpacing: '0.08em' }}>Loading...</p>
      </div>
    </div>
  )
}
