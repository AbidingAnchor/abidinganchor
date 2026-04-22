import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function Footer({ compact = false }) {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const authLike = pathname === '/auth' || pathname === '/reset-password'
  const isHomePage = pathname === '/'
  const hideProductHuntOnAuth = pathname === '/auth'
  const legalLinks = [
    { to: '/about', label: 'About' },
    { to: '/privacy', label: t('footer.privacy') },
    { to: '/terms', label: t('footer.terms') },
    { to: '/legal', label: t('footer.legal') },
  ]
  const linkStyle = {
    color: '#D4A843',
    textDecoration: 'none',
    fontWeight: 600,
    cursor: 'pointer',
    pointerEvents: 'auto',
  }

  const pad = compact
    ? '20px 0 0'
    : authLike
      ? 'clamp(20px, 5vmin, 36px) 12px clamp(28px, 7vmin, 48px)'
      : '10px 10px 88px'

  return (
    <footer
      className="glass-nav-bar"
      style={{
        position: 'static',
        zIndex: 20,
        width: '100%',
        marginTop: compact ? 0 : 'auto',
        marginBottom: 0,
        textAlign: 'center',
        fontSize: '12px',
        color: 'rgba(255,255,255,0.4)',
        padding: pad,
        borderTop: '1px solid rgba(255,255,255,0.06)',
        pointerEvents: 'auto',
      }}
    >
      <span>{t('footer.copyright')}</span>
      {legalLinks.map((link) => (
        <span key={link.to} style={{ pointerEvents: 'auto' }}>
          <span style={{ margin: '0 6px' }}>·</span>
          <Link to={link.to} style={linkStyle}>
            {link.label}
          </Link>
        </span>
      ))}
      {!isHomePage && !hideProductHuntOnAuth ? (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginTop: authLike ? 'clamp(18px, 4.5vmin, 28px)' : '16px',
            marginBottom: 0,
            lineHeight: 0,
          }}
        >
          <a
            href="https://www.producthunt.com/products/abiding-anchor?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-abiding-anchor"
            target="_blank"
            rel="noopener noreferrer"
            style={{ lineHeight: 0, display: 'inline-block' }}
          >
            <img
              alt="Abiding Anchor on Product Hunt"
              width="250"
              height="54"
              src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1124085&theme=light&t=1776230155188"
              style={{ display: 'block' }}
            />
          </a>
        </div>
      ) : null}
    </footer>
  )
}
