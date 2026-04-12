import { useTranslation } from 'react-i18next'

export default function LoadingScreen() {
  const { t } = useTranslation()
  return (
    <div style={{ position: 'relative', zIndex: 10, minHeight: '100vh', background: 'transparent', display: 'grid', placeItems: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '64px', color: '#D4A843', animation: 'gold-pulse 1.4s ease-in-out infinite' }}>✝</div>
        <p style={{ color: '#D4A843', marginTop: '8px', fontWeight: 700, letterSpacing: '0.08em' }}>{t('loading.message')}</p>
      </div>
    </div>
  )
}
