import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function Footer() {
  const { t } = useTranslation()
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
      <span>{t('footer.copyright')}</span>
      <span style={{ margin: '0 6px' }}>·</span>
      <Link to="/privacy" style={{ color: '#D4A843', textDecoration: 'none' }}>
        {t('footer.privacy')}
      </Link>
      <span style={{ margin: '0 6px' }}>·</span>
      <Link to="/terms" style={{ color: '#D4A843', textDecoration: 'none' }}>
        {t('footer.terms')}
      </Link>
      <span style={{ margin: '0 6px' }}>·</span>
      <Link to="/legal" style={{ color: '#D4A843', textDecoration: 'none' }}>
        {t('footer.legal')}
      </Link>
    </footer>
  )
}
