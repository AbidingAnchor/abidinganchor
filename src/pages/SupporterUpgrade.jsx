import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { useThemeBackgroundType } from '../hooks/useThemeBackgroundType'
import DayBackground from '../components/DayBackground'
import {
  SUPPORT_BMAC_LINK,
  SUPPORT_ROADMAP_ITEMS,
} from '../data/supportPageConstants'
import { supabase } from '../lib/supabase'
import { parseMinistryTransparencyStats } from '../utils/parseMinistryTransparencyStats'

const CARD = {
  background: '#F0E8D4',
  border: '1.5px solid rgba(212,168,67,0.35)',
  borderRadius: 20,
  padding: 20,
}

const backBtn = {
  width: 36,
  height: 36,
  background: 'rgba(212,168,67,0.15)',
  border: '1px solid rgba(212,168,67,0.3)',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  color: '#D4A017',
  fontSize: 18,
  flexShrink: 0,
}

export default function SupporterUpgrade() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const sky = useThemeBackgroundType()
  const isDaySky = sky === 'day'
  const currentTier = profile?.supporter_tier || 'free'

  const [aiPrayersCount, setAiPrayersCount] = useState(null)
  const [usersReachedCount, setUsersReachedCount] = useState(null)
  const [transparencyLoading, setTransparencyLoading] = useState(true)

  const monthlyFeatures = [
    t('supporter.feature50Ai'),
    t('supporter.featureColorPicker'),
    t('supporter.featureSilverBorder'),
    t('supporter.featureSupporterBadge'),
    t('supporter.featureHallOfFaith'),
    t('supporter.featurePrayerList'),
  ]

  const lifetimeFeatures = [
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

  useEffect(() => {
    document.title = `${t('supporter.pageTitle')} — AbidingAnchor`
  }, [t])

  useEffect(() => {
    let cancelled = false
    async function loadTransparencyStats() {
      setTransparencyLoading(true)
      try {
        const { data, error } = await supabase.rpc('get_ministry_transparency_stats')
        if (cancelled) return
        if (error) {
          setAiPrayersCount(0)
          setUsersReachedCount(0)
          return
        }
        const { aiPrayers, usersReached } = parseMinistryTransparencyStats(data)
        setAiPrayersCount(aiPrayers)
        setUsersReachedCount(usersReached)
      } catch {
        if (!cancelled) {
          setAiPrayersCount(0)
          setUsersReachedCount(0)
        }
      } finally {
        if (!cancelled) setTransparencyLoading(false)
      }
    }
    void loadTransparencyStats()
    return () => {
      cancelled = true
    }
  }, [])

  const openStripe = (tier) => {
    const url =
      tier === 'monthly'
        ? 'https://buy.stripe.com/cNifZibWh3FF2I35PfdAk01'
        : 'https://buy.stripe.com/9B6bJ2gcx2BB3M76TjdAk02'
    window.open(url, '_blank')
  }

  return (
    <div
      className="supporter-upgrade-page"
      style={{
        position: 'relative',
        minHeight: '100vh',
        overflow: 'hidden',
        fontFamily: 'sans-serif',
        background: isDaySky ? '#F5EFE0' : 'transparent',
      }}
    >
      {isDaySky ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            minHeight: '100vh',
            width: '100%',
            zIndex: 0,
            pointerEvents: 'none',
          }}
        >
          <div style={{ position: 'relative', minHeight: '100vh', width: '100%' }}>
            <DayBackground />
          </div>
        </div>
      ) : null}

      <div
        className="content-scroll supporter-page-content"
        style={{
          position: 'relative',
          zIndex: 1,
          padding: '0 16px',
          paddingTop: '60px',
          paddingBottom: '120px',
          maxWidth: '680px',
          margin: '0 auto',
          width: '100%',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px 0 8px',
          }}
        >
          <button type="button" className="supporter-back" onClick={() => navigate(-1)} style={backBtn}>
            ←
          </button>
          <div style={{ flex: 1 }} />
          <div style={{ width: 36 }} />
        </div>

        <div className="supporter-hero" style={{ textAlign: 'center', marginBottom: 20 }}>
          <div className="supporter-hero-icon" style={{ fontSize: 32, lineHeight: 1, marginBottom: 10 }}>⚓</div>
          <h1
            className="supporter-page-title"
            style={{
              margin: '0 0 10px',
              fontSize: 26,
              fontWeight: 700,
              color: '#1A1A1A',
            }}
          >
            Support the Ministry
          </h1>
          <p
            className="supporter-page-lead"
            style={{
              margin: 0,
              color: '#5C3A00',
              fontSize: 14,
              textAlign: 'center',
              lineHeight: 1.55,
              maxWidth: 420,
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            Every feature is free forever. Supporters help keep the lights on.
          </p>
        </div>

        <div className="supporter-surface-card" style={{ ...CARD, marginBottom: 16 }}>
          <p
            className="supporter-mission-quote"
            style={{
              margin: 0,
              color: '#1A1A1A',
              fontSize: 15,
              lineHeight: 1.75,
              textAlign: 'center',
              fontFamily: 'Georgia, serif',
              fontStyle: 'italic',
            }}
          >
            &quot;AbidingAnchor was built as an act of worship to Jesus Christ. Every verse, every prayer, every word
            of Scripture in this app is a free gift — because the gospel belongs to everyone. If AbidingAnchor has
            drawn you closer to God, please consider supporting this mission so it can keep growing and reach more
            hearts around the world.&quot;
          </p>
          <p
            className="supporter-mission-sig"
            style={{
              textAlign: 'center',
              color: '#1A1A1A',
              fontSize: 13,
              marginTop: 14,
              fontWeight: 600,
              letterSpacing: '0.06em',
            }}
          >
            — Built in Jesus&apos; name 🙏
          </p>
        </div>

        <div className="supporter-surface-card" style={{ ...CARD, marginBottom: 20 }}>
          <p
            className="supporter-verse-body"
            style={{
              margin: '0 0 8px',
              color: '#1A1A1A',
              fontSize: 15,
              fontFamily: 'Georgia, serif',
              fontStyle: 'italic',
              lineHeight: 1.7,
            }}
          >
            &quot;Each one must give as he has decided in his heart, not reluctantly or under compulsion, for God loves
            a cheerful giver.&quot;
          </p>
          <p
            className="supporter-verse-ref"
            style={{
              color: '#1A1A1A',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.08em',
              margin: 0,
            }}
          >
            2 CORINTHIANS 9:7
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flexWrap: 'wrap',
            gap: 14,
            marginBottom: 20,
          }}
        >
          <div
            className="supporter-surface-card supporter-tier-free"
            style={{
              background: '#F0E8D4',
              borderRadius: 20,
              border: '1px solid rgba(212,168,67,0.2)',
              padding: 20,
              marginBottom: 12,
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <p className="supporter-tier-label" style={{ margin: 0, color: '#8B6200', fontWeight: 700, fontSize: 11, letterSpacing: '0.15em' }}>FREE</p>
              <span className="supporter-plan-chip" style={{ background: '#E8D9B8', color: '#8B6200', borderRadius: 50, fontSize: 10, fontWeight: 700, padding: '3px 10px' }}>Your Plan</span>
            </div>
            <p className="supporter-emphasis" style={{ margin: '0 0 12px', fontSize: 20, fontWeight: 700, color: '#1A1A1A' }}>Always Free</p>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {['All app features', 'Bible in 12 languages', 'BibleProject videos', '5 AI messages/day'].map((f) => (
                <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <span className="supporter-check" style={{ color: '#8B6200', fontSize: 14, flexShrink: 0, marginTop: 2 }}>✓</span>
                  <span className="supporter-feature-line" style={{ fontSize: 14, color: '#1A1A1A', lineHeight: 1.5 }}>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* SUPPORTER */}
          <div
            className="supporter-surface-card supporter-tier-monthly"
            style={{
              flex: '1 1 260px',
              minWidth: 0,
              background: 'linear-gradient(145deg, #E8F4FD 0%, #C9E8F5 50%, #A8D8EA 100%)',
              border: '2px solid rgba(100,180,220,0.6)',
              borderRadius: 20,
              padding: 20,
              position: 'relative',
              marginBottom: 12,
            }}
          >
            <p className="supporter-tier-label" style={{ margin: '0 0 6px', color: '#1A5276', fontWeight: 700, fontSize: 13, letterSpacing: '0.08em' }}>
              SUPPORTER
            </p>
            <p className="supporter-emphasis" style={{ margin: '0 0 16px', color: '#1A1A1A', fontSize: 22, fontWeight: 700 }}>$4.99/mo</p>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {monthlyFeatures.map((f) => (
                <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <span className="supporter-check" style={{ color: '#2E86C1', fontSize: 14, flexShrink: 0, marginTop: 2 }}>✓</span>
                  <span className="supporter-feature-line" style={{ fontSize: 14, color: '#1A1A1A', lineHeight: 1.5 }}>{f}</span>
                </li>
              ))}
            </ul>
            {currentTier === 'monthly' ? (
              <div
                className="supporter-tier-current supporter-tier-current--monthly"
                style={{
                  marginTop: 18,
                  textAlign: 'center',
                  color: '#1A1A1A',
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {t('supporter.current')}
              </div>
            ) : (
              <button
                type="button"
                className="supporter-btn-monthly"
                onClick={() => openStripe('monthly')}
                style={{
                  marginTop: 18,
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: 50,
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: 15,
                  background: 'linear-gradient(135deg, #2E86C1, #1A5276)',
                  color: '#FFFFFF',
                }}
              >
                Support Monthly
              </button>
            )}
          </div>

          {/* LIFETIME */}
          <div
            className="supporter-surface-card supporter-tier-lifetime"
            style={{
              flex: '1 1 260px',
              minWidth: 0,
              background: 'linear-gradient(145deg, #F4E8C1 0%, #E8C55A 30%, #D4A843 60%, #C9922A 100%)',
              border: '2px solid #D4A843',
              borderRadius: 20,
              padding: 20,
              position: 'relative',
              marginBottom: 12,
            }}
          >
            <div
              className="supporter-popular-badge"
              style={{
                position: 'absolute',
                top: 10,
                right: 10,
                background: '#0A1628',
                color: '#D4A843',
                borderRadius: 50,
                fontSize: 11,
                fontWeight: 700,
                padding: '4px 12px',
              }}
            >
              MOST POPULAR
            </div>
            <p
              className="supporter-tier-label"
              style={{
                margin: '0 0 6px',
                color: '#5C3A00',
                fontWeight: 800,
                fontSize: 13,
                letterSpacing: '0.15em',
              }}
            >
              LIFETIME
            </p>
            <p className="supporter-emphasis" style={{ margin: '0 0 16px', color: '#1A1A1A', fontWeight: 800, fontSize: 26 }}>$49.99</p>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {lifetimeFeatures.map((f) => (
                <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <span className="supporter-check" style={{ color: '#8B6200', fontSize: 14, flexShrink: 0, marginTop: 2 }}>✓</span>
                  <span className="supporter-feature-line" style={{ fontSize: 14, color: '#3D2000', fontWeight: 500, lineHeight: 1.5 }}>{f}</span>
                </li>
              ))}
            </ul>
            {currentTier === 'lifetime' ? (
              <div
                className="supporter-tier-current supporter-tier-current--lifetime"
                style={{
                  marginTop: 18,
                  textAlign: 'center',
                  background: '#0A1628',
                  color: '#D4A843',
                  borderRadius: 50,
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '8px 12px',
                }}
              >
                {t('supporter.current')}
              </div>
            ) : (
              <button
                type="button"
                className="supporter-btn-lifetime"
                onClick={() => openStripe('lifetime')}
                style={{
                  marginTop: 18,
                  width: '100%',
                  padding: '14px',
                  borderRadius: 50,
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: 15,
                  background: '#0A1628',
                  color: '#D4A843',
                }}
              >
                Get Lifetime Access
              </button>
            )}
          </div>
        </div>

        <div style={{ marginBottom: 24, marginTop: 8 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 16,
            }}
          >
            <div className="supporter-divider-line" style={{ flex: 1, height: 1, background: 'rgba(212,168,67,0.35)' }} />
            <span className="supporter-or" style={{ color: '#1A1A1A', fontSize: 13, fontWeight: 600 }}>or</span>
            <div className="supporter-divider-line" style={{ flex: 1, height: 1, background: 'rgba(212,168,67,0.35)' }} />
          </div>
          <a
            href={SUPPORT_BMAC_LINK}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'center',
              textDecoration: 'none',
              background: '#FFDD00',
              color: '#000000',
              borderRadius: 50,
              fontWeight: 700,
              fontSize: 16,
              padding: '14px 32px',
              boxSizing: 'border-box',
            }}
          >
            Buy Me a Coffee ☕
          </a>
          <p className="supporter-bmac-hint" style={{ margin: '10px 0 0', textAlign: 'center', color: '#6B6B6B', fontSize: 12 }}>
            One-time donation, any amount
          </p>
        </div>

        {/* Ministry Transparency — same structure as Support; light shell + dark text */}
        <section
          className="supporter-surface-card supporter-ministry-section"
          style={{
            borderRadius: 20,
            padding: '18px 16px',
            marginBottom: 16,
            border: '1.5px solid rgba(212,168,67,0.35)',
            background: '#F0E8D4',
          }}
        >
          <h2
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: '#1A1A1A',
              fontSize: 16,
              fontWeight: 700,
              margin: '0 0 14px',
              fontFamily: 'Georgia, serif',
              letterSpacing: '0.02em',
            }}
          >
            <span style={{ fontSize: 18, lineHeight: 1 }} aria-hidden>
              📊
            </span>
            Ministry Transparency
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
              gap: 10,
              marginBottom: 18,
            }}
          >
            {[
              {
                value: transparencyLoading ? '...' : (aiPrayersCount ?? 0).toLocaleString(),
                label: 'AI Prayers Answered',
                sub: 'Companion replies',
              },
              {
                value: '99.9%',
                label: 'Uptime',
                sub: (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'center', color: '#1A1A1A' }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: '#34c759',
                        boxShadow: '0 0 6px rgba(52, 199, 89, 0.65)',
                      }}
                      aria-hidden
                    />
                    This Month
                  </span>
                ),
              },
              {
                value: transparencyLoading ? '...' : (usersReachedCount ?? 0).toLocaleString(),
                label: 'Users Reached',
                sub: 'Profiles in community',
              },
            ].map((card) => (
              <div
                key={card.label}
                className="supporter-stat-tile"
                style={{
                  borderRadius: 14,
                  padding: '12px 10px',
                  textAlign: 'center',
                  background: 'rgba(255,255,255,0.5)',
                  border: '1px solid rgba(212, 168, 67, 0.25)',
                }}
              >
                <div className="supporter-stat-value" style={{ color: '#1A1A1A', fontSize: 22, fontWeight: 800, lineHeight: 1.15, fontVariantNumeric: 'tabular-nums' }}>
                  {card.value}
                </div>
                <div className="supporter-stat-label" style={{ color: '#1A1A1A', fontSize: 11, fontWeight: 700, marginTop: 8, letterSpacing: '0.04em' }}>
                  {card.label}
                </div>
                <div className="supporter-stat-sub" style={{ color: '#1A1A1A', fontSize: 10, marginTop: 4, lineHeight: 1.35 }}>
                  {card.sub}
                </div>
              </div>
            ))}
          </div>

          <h3
            style={{
              color: '#1A1A1A',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              margin: '0 0 10px',
            }}
          >
            What We&apos;re Building Next
          </h3>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {SUPPORT_ROADMAP_ITEMS.map((item) => (
              <li
                key={item.text}
                className="supporter-roadmap-row"
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.45)',
                  border: '1px solid rgba(212, 168, 67, 0.2)',
                  color: '#1A1A1A',
                  fontSize: 13,
                  lineHeight: 1.45,
                }}
              >
                <span style={{ flexShrink: 0 }} aria-hidden>
                  {item.icon}
                </span>
                <span style={{ flex: 1 }}>
                  <span className="supporter-roadmap-title" style={{ fontWeight: 600 }}>{item.text}</span>
                  <span className="supporter-roadmap-status" style={{ color: '#1A1A1A', display: 'block', fontSize: 11, marginTop: 2, opacity: 0.85 }}>
                    {item.status}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <div className="supporter-surface-card" style={{ ...CARD, marginTop: 8 }}>
          <p
            className="supporter-bottom-note"
            style={{
              margin: 0,
              color: '#1A1A1A',
              fontSize: 14,
              fontWeight: 700,
              lineHeight: 1.7,
              textAlign: 'center',
            }}
          >
            {t('supporter.bottomNote')}
          </p>
        </div>
      </div>
    </div>
  )
}
