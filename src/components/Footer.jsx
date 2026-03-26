import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: '64px',
        zIndex: 9997,
        textAlign: 'center',
        fontSize: '12px',
        color: 'rgba(255,255,255,0.4)',
        padding: '6px 10px',
        paddingBottom: 'calc(6px + env(safe-area-inset-bottom, 0px))',
        background: 'rgba(0,0,0,0.12)',
        backdropFilter: 'blur(6px)',
      }}
    >
      <span>© 2026 AbidingAnchor Ministry</span>
      <span style={{ margin: '0 6px' }}>·</span>
      <Link to="/privacy" style={{ color: '#D4A843', textDecoration: 'none' }}>
        Privacy Policy
      </Link>
      <span style={{ margin: '0 6px' }}>·</span>
      <Link to="/terms" style={{ color: '#D4A843', textDecoration: 'none' }}>
        Terms of Service
      </Link>
      <span style={{ margin: '0 6px' }}>·</span>
      <Link to="/legal" style={{ color: '#D4A843', textDecoration: 'none' }}>
        Legal
      </Link>
    </footer>
  )
}
