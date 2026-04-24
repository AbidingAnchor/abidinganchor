import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'

const SHIMMER_KEYFRAMES = `
  @keyframes shimmer-gold {
    0%   { background-position: 200% center; }
    100% { background-position: -200% center; }
  }
  @keyframes tier-float {
    0%, 100% { transform: translateY(0px); }
    50%       { transform: translateY(-4px); }
  }
  @keyframes supporter-pulse-blue {
    0%, 100% { box-shadow: 0 0 10px 3px rgba(147, 197, 253, 0.6); }
    50%       { box-shadow: 0 0 20px 6px rgba(147, 197, 253, 0.9); }
  }
`

const TIER_LIMIT_LABEL = {
  free: 'supporter.limitFree',
  monthly: 'supporter.limitMonthly',
  lifetime: 'supporter.limitLifetime',
}

function TierCard({ tier, currentTier, t }) {
  const isMonthly = tier === 'monthly'
  const isLifetime = tier === 'lifetime'
  const isCurrent = tier === currentTier

  const cardStyle = {
    position: 'relative',
    borderRadius: '20px',
    padding: '24px 20px',
    marginBottom: '16px',
    cursor: 'default',
    transition: 'transform 0.2s ease',
    border: isLifetime
      ? '2px solid rgba(255, 215, 0, 0.7)'
      : isMonthly
      ? '2px solid rgba(147, 197, 253, 0.6)'
      : '1px solid rgba(255,255,255,0.1)',
    background: isLifetime
      ? 'linear-gradient(135deg, rgba(30,20,0,0.95), rgba(15,10,0,0.98))'
      : isMonthly
      ? 'linear-gradient(135deg, rgba(10,20,50,0.95), rgba(5,15,40,0.98))'
      : 'rgba(255,255,255,0.05)',
    boxShadow: isLifetime
      ? '0 8px 32px rgba(255, 215, 0, 0.15)'
      : isMonthly
      ? '0 8px 32px rgba(147, 197, 253, 0.1)'
      : 'none',
  }

  const features = tier === 'free'
    ? [
        t('supporter.featureAllApp'),
        t('supporter.featureBible12'),
        t('supporter.featureBibleProject'),
        t('supporter.feature5Ai'),
      ]
    : tier === 'monthly'
    ? [
        t('supporter.feature50Ai'),
        t('supporter.featureColorPicker'),
        t('supporter.featureSilverBorder'),
        t('supporter.featureSupporterBadge'),
        t('supporter.featureHallOfFaith'),
        t('supporter.featurePrayerList'),
      ]
    : [
        t('supporter.featureUnlimitedAi'),
        t('supporter.featureColorPicker'),
        t('supporter.featureGoldName'),
        t('supporter.featureAnimatedBorders'),
        t('supporter.featureCrownBadge'),
        t('supporter.featureFoundingStatus'),
        t('supporter.featureHallOfFaithFirst'),
        t('supporter.featureMinistryPrayer'),
        t('supporter.featurePersonalPrayer'),
        t('supporter.featureAboutPage'),
      ]

  return (
    <div style={cardStyle}>
      {isMonthly && (
        <div style={{
          position: 'absolute',
          top: '-12px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'linear-gradient(90deg, #3b82f6, #93c5fd)',
          color: '#fff',
          fontWeight: 800,
          fontSize: '11px',
          letterSpacing: '1px',
          padding: '4px 14px',
          borderRadius: '999px',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}>
          {t('supporter.mostPopular')}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
        <span style={{ fontSize: '28px' }}>
          {tier === 'free' ? '🕊️' : tier === 'monthly' ? '⭐' : '👑'}
        </span>
        <div>
          <p style={{
            margin: 0,
            fontWeight: 800,
            fontSize: '18px',
            color: isLifetime
              ? 'transparent'
              : isMonthly
              ? '#93c5fd'
              : 'rgba(255,255,255,0.7)',
            background: isLifetime
              ? 'linear-gradient(90deg, #b8860b, #ffd700, #ffec8b, #ffd700, #b8860b)'
              : undefined,
            backgroundSize: isLifetime ? '200%' : undefined,
            WebkitBackgroundClip: isLifetime ? 'text' : undefined,
            WebkitTextFillColor: isLifetime ? 'transparent' : undefined,
            backgroundClip: isLifetime ? 'text' : undefined,
            animation: isLifetime ? 'shimmer-gold 2s infinite linear' : undefined,
          }}>
            {tier === 'free' ? t('supporter.tierFree') : tier === 'monthly' ? t('supporter.tierSupporter') : t('supporter.tierLifetime')}
          </p>
          <p style={{
            margin: 0,
            fontSize: '22px',
            fontWeight: 900,
            color: isLifetime ? '#ffd700' : isMonthly ? '#ffffff' : 'rgba(255,255,255,0.5)',
          }}>
            {tier === 'free' ? t('supporter.priceFree') : tier === 'monthly' ? t('supporter.priceMonthly') : t('supporter.priceLifetime')}
          </p>
        </div>
        {isCurrent && (
          <div style={{
            marginLeft: 'auto',
            background: 'rgba(212,168,67,0.2)',
            border: '1px solid rgba(212,168,67,0.5)',
            borderRadius: '999px',
            padding: '4px 12px',
            fontSize: '12px',
            fontWeight: 700,
            color: '#D4A843',
          }}>
            {t('supporter.current')}
          </div>
        )}
      </div>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {features.map((f) => (
          <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <span style={{
              color: isLifetime ? '#ffd700' : isMonthly ? '#93c5fd' : 'rgba(255,255,255,0.4)',
              fontSize: '14px',
              marginTop: '1px',
              flexShrink: 0,
            }}>
              ✓
            </span>
            <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>{f}</span>
          </li>
        ))}
      </ul>

      {!isCurrent && tier !== 'free' && (
        <button
          type="button"
          style={{
            marginTop: '20px',
            width: '100%',
            padding: '13px',
            borderRadius: '12px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 800,
            fontSize: '15px',
            background: isLifetime
              ? 'linear-gradient(90deg, #b8860b, #ffd700, #b8860b)'
              : 'linear-gradient(90deg, #3b82f6, #93c5fd)',
            color: isLifetime ? '#0a0a00' : '#fff',
            transition: 'opacity 0.2s',
          }}
          onClick={() => {
            const url = tier === 'monthly'
              ? 'https://buy.stripe.com/cNifZibWh3FF2I35PfdAk01'
              : 'https://buy.stripe.com/9B6bJ2gcx2BB3M76TjdAk02'
            window.open(url, '_blank')
          }}
        >
          {tier === 'monthly' ? t('supporter.btnMonthly') : t('supporter.btnLifetime')}
        </button>
      )}
    </div>
  )
}

export default function SupporterUpgrade() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { profile, refreshProfile } = useAuth()
  const currentTier = profile?.supporter_tier || 'free'

  useEffect(() => {
    document.title = `${t('supporter.pageTitle')} — AbidingAnchor`
  }, [t])

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #050d1f 0%, #091021 60%, #040a18 100%)',
      color: '#fff',
    }}>
      <style>{SHIMMER_KEYFRAMES}</style>

      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '16px 16px 8px',
        paddingTop: '72px',
      }}>
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            width: '40px',
            height: '40px',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(212,168,67,0.3)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#D4A843',
            fontSize: '20px',
            flexShrink: 0,
          }}
        >
          ←
        </button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <span style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>{t('supporter.pageTitle')}</span>
        </div>
        <div style={{ width: '40px' }} />
      </div>

      <div style={{ padding: '0 16px 40px', maxWidth: '480px', margin: '0 auto' }}>
        {/* Hero */}
        <div style={{ textAlign: 'center', padding: '24px 0 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>⚓</div>
          <h1 style={{
            margin: '0 0 8px',
            fontSize: '26px',
            fontWeight: 900,
            color: '#D4A843',
            letterSpacing: '0.02em',
          }}>
            {t('supporter.heroTitle')}
          </h1>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: '15px', lineHeight: 1.6 }}>
            {t('supporter.heroSubtitle')}
          </p>
        </div>

        {/* Tier Cards */}
        <TierCard tier="free" currentTier={currentTier} t={t} />
        <TierCard tier="monthly" currentTier={currentTier} t={t} />
        <TierCard tier="lifetime" currentTier={currentTier} t={t} />

        {/* Bottom Note */}
        <div style={{
          marginTop: '8px',
          padding: '18px 16px',
          borderRadius: '16px',
          background: 'rgba(212,168,67,0.08)',
          border: '1px solid rgba(212,168,67,0.2)',
          textAlign: 'center',
        }}>
          <p style={{
            margin: 0,
            color: '#F5E6B8',
            fontSize: '14px',
            fontWeight: 700,
            lineHeight: 1.7,
          }}>
            {t('supporter.bottomNote')}
          </p>
        </div>
      </div>
    </div>
  )
}
