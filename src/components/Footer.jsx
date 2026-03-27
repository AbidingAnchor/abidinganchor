import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer
      style={{
        position: 'static',
        width: '100%',
        marginTop: 'auto',
        textAlign: 'center',
        fontSize: '12px',
        color: 'rgba(255,255,255,0.4)',
        padding: '10px 10px 88px',
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
