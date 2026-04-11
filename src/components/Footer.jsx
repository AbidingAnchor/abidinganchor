import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer
      className="glass-nav-bar"
      style={{
        position: 'static',
        width: '100%',
        marginTop: 'auto',
        textAlign: 'center',
        fontSize: '12px',
        color: 'rgba(255,255,255,0.4)',
        padding: '10px 10px 88px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
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
