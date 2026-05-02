import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  SUPPORT_BMAC_LINK,
  SUPPORT_PAGE_GOLD,
  SUPPORT_ROADMAP_ITEMS,
} from '../data/supportPageConstants'
import { supabase } from '../lib/supabase'
import { parseMinistryTransparencyStats } from '../utils/parseMinistryTransparencyStats'
import { userStorageKey } from '../utils/userStorage'

const STRIPE_MONTHLY = 'https://buy.stripe.com/cNifZibWh3FF2I35PfdAk01'
const STRIPE_LIFETIME = 'https://buy.stripe.com/9B6bJ2gcx2BB3M76TjdAk02'

export default function Support() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const currentTier = profile?.supporter_tier || 'free'
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [aiPrayersCount, setAiPrayersCount] = useState(null)
  const [usersReachedCount, setUsersReachedCount] = useState(null)
  const [transparencyLoading, setTransparencyLoading] = useState(true)

  useEffect(() => {
    setNotificationsEnabled(
      localStorage.getItem(userStorageKey(user?.id, 'support-browser-notifications')) === 'enabled',
    )
  }, [user?.id])

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

  const handleNotifications = async () => {
    if (!('Notification' in window)) {
      alert('Your browser does not support notifications')
      return
    }
    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      new Notification('AbidingAnchor', {
        body: 'You will now receive daily verse notifications! \uD83D\uDE4F',
        icon: '/icon-192x192.png',
      })
      localStorage.setItem(userStorageKey(user?.id, 'support-browser-notifications'), 'enabled')
      setNotificationsEnabled(true)
    } else {
      alert('Notifications blocked. Please enable them in your browser settings.')
    }
  }

  const gold = SUPPORT_PAGE_GOLD

  return (
    <div style={{ position:'relative', zIndex: 10, minHeight:'100vh',
      overflow:'hidden', fontFamily:'sans-serif' }}>
      <div className="content-scroll" style={{ padding:'0 16px', paddingTop:'60px', paddingBottom:'120px', maxWidth:'680px', margin:'0 auto', width:'100%' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '16px 16px 8px 16px',
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
            }}
          >
            ←
          </button>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <span style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff' }}>
              Support the Ministry
            </span>
          </div>
          <div style={{ width: '40px' }} />
        </div>

        <h1 style={{ textAlign:'center', color:'#fff',
          fontSize:'26px', fontWeight:'bold', margin:'0 0 6px',
          textShadow:'0 2px 8px rgba(0,60,120,0.4)',
          fontFamily:'Georgia, serif' }}>
          Support This Ministry
        </h1>
        <p style={{ textAlign:'center', color:'rgba(255,255,255,0.85)',
          fontSize:'13px', margin:'0 0 20px',
          textShadow:'0 1px 4px rgba(0,60,120,0.3)' }}>
          Keeping the gospel free for everyone
        </p>

        <div className="glass-panel" style={{ borderRadius:'20px',
          padding:'20px', marginBottom:'16px' }}>
          <p style={{ color:'#fff', fontSize:'14px', lineHeight:'1.8',
            textAlign:'center', margin:0, fontFamily:'Georgia,serif',
            fontStyle:'italic',
            textShadow:'0 1px 4px rgba(0,60,120,0.3)' }}>
            &quot;AbidingAnchor was built as an act of worship to Jesus Christ.
            Every verse, every prayer, every word of Scripture in
            this app is a free gift — because the gospel belongs
            to everyone. If AbidingAnchor has drawn you closer to God,
            please consider supporting this mission so it can
            keep growing and reach more hearts around the world.&quot;
          </p>
          <p style={{ textAlign:'center', color:'rgba(255,220,100,0.9)',
            fontSize:'12px', marginTop:'12px', fontWeight:'600',
            letterSpacing:'0.06em' }}>
            — Built in Jesus&apos; name {'\uD83D\uDE4F'}
          </p>
        </div>

        <div className="glass-panel" style={{
          padding:'14px 16px', marginBottom:'20px',
          borderLeft:'3px solid rgba(255,220,80,0.55)',
          borderRadius:'0 14px 14px 0' }}>
          <p style={{ color:'rgba(255,255,255,0.9)', fontSize:'13px',
            fontFamily:'Georgia,serif', fontStyle:'italic',
            lineHeight:'1.7', margin:'0 0 6px' }}>
            &quot;Each one must give as he has decided in his heart,
            not reluctantly or under compulsion, for God loves
            a cheerful giver.&quot;
          </p>
          <p style={{ color:'rgba(255,220,80,0.9)', fontSize:'11px',
            fontWeight:'700', letterSpacing:'0.08em', margin:0 }}>
            2 CORINTHIANS 9:7
          </p>
        </div>

        <section style={{ marginBottom: '14px' }}>
          <h2 style={{ color: '#D4A843', fontSize: '13px', fontWeight: 700, margin: '0 0 8px', letterSpacing: '0.06em' }}>
            Daily Notifications
          </h2>
          <article className="glass-panel" style={{ borderRadius: '16px', padding: '14px 16px' }}>
            <p style={{ color: 'rgba(255,255,255,0.95)', fontSize: '12px', margin: '0 0 10px' }}>
              Receive a gentle daily reminder to spend time in the Word.
            </p>
            <button
              type="button"
              onClick={handleNotifications}
              style={{ border: '1px solid rgba(212,168,67,0.6)', borderRadius: '10px', padding: '10px 12px', background: notificationsEnabled ? 'rgba(40,120,70,0.4)' : '#D4A843', color: notificationsEnabled ? '#fff' : '#1a1a1a', fontWeight: 700, fontSize: '13px' }}
            >
              {notificationsEnabled ? 'Notifications On \u2705' : 'Enable Daily Notifications \uD83D\uDD14'}
            </button>
          </article>
        </section>

        {/* FREE */}
        <div
          style={{
            background: '#F0E8D4',
            borderRadius: 20,
            border: '1px solid rgba(212,168,67,0.2)',
            padding: '20px',
            marginBottom: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.15em',
                color: '#8B6200',
              }}
            >
              FREE
            </span>
            {currentTier === 'free' ? (
              <span
                style={{
                  background: '#E8D9B8',
                  color: '#8B6200',
                  borderRadius: 50,
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '3px 10px',
                }}
              >
                Your Plan
              </span>
            ) : null}
          </div>
          <p style={{ fontSize: 20, fontWeight: 700, color: '#1A1A1A', margin: '0 0 12px' }}>Always Free</p>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {['All app features', 'Bible in 12 languages', 'BibleProject videos', '5 AI messages/day'].map((line) => (
              <li key={line} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                <span style={{ color: '#8B6200', flexShrink: 0 }}>✓</span>
                <span style={{ fontSize: 14, color: '#1A1A1A', lineHeight: 1.45 }}>{line}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* SUPPORTER */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 20,
            border: '2px solid rgba(212,168,67,0.5)',
            padding: '20px',
            marginBottom: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.15em',
                color: '#8B6200',
              }}
            >
              SUPPORTER
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A' }}>⭐ $4.99/mo</span>
          </div>
          <div style={{ marginBottom: 12 }}>
            <span style={{ fontSize: 28, fontWeight: 800, color: '#1A1A1A' }}>$4.99</span>
            <span style={{ fontSize: 14, color: '#6B6B6B' }}> /month</span>
          </div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {[
              '50 AI messages/day',
              'Full name color picker',
              'Animated silver/blue profile border',
              '⭐ Supporter badge',
              'Name in Hall of Faith',
              'Name on Ministry prayer list',
            ].map((line) => (
              <li key={line} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                <span style={{ color: '#D4A843', flexShrink: 0 }}>✓</span>
                <span style={{ fontSize: 14, color: '#1A1A1A', lineHeight: 1.45 }}>{line}</span>
              </li>
            ))}
          </ul>
          {currentTier === 'monthly' ? (
            <button
              type="button"
              disabled
              style={{
                marginTop: 16,
                width: '100%',
                padding: '14px',
                borderRadius: 50,
                border: 'none',
                fontWeight: 700,
                fontSize: 15,
                background: '#0A1628',
                color: '#D4A843',
                cursor: 'default',
              }}
            >
              Current Plan ✓
            </button>
          ) : (
            <button
              type="button"
              onClick={() => window.open(STRIPE_MONTHLY, '_blank')}
              style={{
                marginTop: 16,
                width: '100%',
                padding: '14px',
                borderRadius: 50,
                border: 'none',
                fontWeight: 700,
                fontSize: 15,
                background: '#D4A843',
                color: '#1A1A1A',
                cursor: 'pointer',
              }}
            >
              Support Monthly ⭐
            </button>
          )}
        </div>

        {/* LIFETIME */}
        <div
          style={{
            background: 'linear-gradient(145deg, #F4E8C1 0%, #E8C55A 30%, #D4A843 60%, #C9922A 100%)',
            borderRadius: 20,
            border: '2px solid #C9922A',
            padding: '20px',
            marginBottom: 12,
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              background: '#0A1628',
              color: '#D4A843',
              fontSize: 10,
              fontWeight: 700,
              borderRadius: 50,
              padding: '4px 12px',
            }}
          >
            MOST POPULAR
          </div>
          <p
            style={{
              margin: '0 0 8px',
              paddingRight: 100,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.15em',
              color: '#5C3A00',
            }}
          >
            LIFETIME
          </p>
          <div style={{ marginBottom: 12 }}>
            <span style={{ fontSize: 28, fontWeight: 800, color: '#1A1A1A' }}>$49.99</span>
            <div style={{ fontSize: 14, color: '#5C3A00', marginTop: 2 }}>one time</div>
          </div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {[
              '200 AI messages/day',
              'Full name color picker',
              'Shimmering gold name effect',
              'Exclusive animated borders',
              '👑 Gold crown badge',
              '"Founding Member" status',
              'Name in Hall of Faith (shown first)',
              'Ministry prayer list',
              'Personal prayer by name',
              'Name in About page',
            ].map((line) => (
              <li key={line} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                <span style={{ color: '#8B6200', flexShrink: 0 }}>✓</span>
                <span style={{ fontSize: 14, color: '#1A1A1A', lineHeight: 1.45 }}>{line}</span>
              </li>
            ))}
          </ul>
          {currentTier === 'lifetime' ? (
            <button
              type="button"
              disabled
              style={{
                marginTop: 16,
                width: '100%',
                padding: '14px',
                borderRadius: 50,
                border: 'none',
                fontWeight: 700,
                fontSize: 15,
                background: '#0A1628',
                color: '#D4A843',
                cursor: 'default',
              }}
            >
              Current Plan ✓
            </button>
          ) : (
            <button
              type="button"
              onClick={() => window.open(STRIPE_LIFETIME, '_blank')}
              style={{
                marginTop: 16,
                width: '100%',
                padding: '14px',
                borderRadius: 50,
                border: 'none',
                fontWeight: 700,
                fontSize: 15,
                background: '#0A1628',
                color: '#D4A843',
                cursor: 'pointer',
              }}
            >
              Get Lifetime Access 👑
            </button>
          )}
        </div>

        <section
          className="glass-panel"
          style={{
            borderRadius: '20px',
            padding: '18px 16px',
            marginBottom: '16px',
            marginTop: '4px',
            border: '1px solid rgba(212, 175, 55, 0.28)',
            background: 'var(--card-bg, rgba(255, 255, 255, 0.06))',
          }}
        >
          <h2
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'var(--text-primary, #f5f5f5)',
              fontSize: '16px',
              fontWeight: 700,
              margin: '0 0 14px',
              fontFamily: 'Georgia, serif',
              letterSpacing: '0.02em',
            }}
          >
            <span style={{ fontSize: '18px', lineHeight: 1 }} aria-hidden>
              {'\uD83D\uDCCA'}
            </span>
            Ministry Transparency
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
              gap: '10px',
              marginBottom: '18px',
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
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
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
                style={{
                  borderRadius: '14px',
                  padding: '12px 10px',
                  textAlign: 'center',
                  background: 'rgba(0, 0, 0, 0.22)',
                  border: '1px solid rgba(212, 175, 55, 0.2)',
                }}
              >
                <div style={{ color: gold, fontSize: '22px', fontWeight: 800, lineHeight: 1.15, fontVariantNumeric: 'tabular-nums' }}>
                  {card.value}
                </div>
                <div style={{ color: 'var(--text-primary, #eee)', fontSize: '11px', fontWeight: 700, marginTop: '8px', letterSpacing: '0.04em' }}>
                  {card.label}
                </div>
                <div style={{ color: 'var(--text-secondary, rgba(255,255,255,0.55))', fontSize: '10px', marginTop: '4px', lineHeight: 1.35 }}>
                  {card.sub}
                </div>
              </div>
            ))}
          </div>

          <h3
            style={{
              color: gold,
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              margin: '0 0 10px',
            }}
          >
            What We&apos;re Building Next
          </h3>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {SUPPORT_ROADMAP_ITEMS.map((item) => (
              <li
                key={item.text}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: '12px',
                  background: 'rgba(0, 0, 0, 0.18)',
                  border: '1px solid rgba(212, 175, 55, 0.15)',
                  color: 'var(--text-primary, rgba(255,255,255,0.92))',
                  fontSize: '13px',
                  lineHeight: 1.45,
                }}
              >
                <span style={{ flexShrink: 0 }} aria-hidden>
                  {item.icon}
                </span>
                <span style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600 }}>{item.text}</span>
                  <span style={{ color: 'var(--text-secondary, rgba(255,255,255,0.5))', display: 'block', fontSize: '11px', marginTop: '2px' }}>
                    {item.status}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <a href={SUPPORT_BMAC_LINK}
          target="_blank"
          rel="noopener noreferrer"
          style={{ width:'100%', padding:'16px',
            background:'linear-gradient(135deg, #F0C040, #D4A020)',
            border:'none', borderRadius:'16px', color:'#1a0a00',
            fontSize:'16px', fontWeight:'700', cursor:'pointer',
            marginTop:'8px', letterSpacing:'0.02em',
            textDecoration:'none', display:'block', textAlign:'center' }}>
          Buy Me a Coffee {'\u2615'}
        </a>

        <p style={{ textAlign:'center',
          color:'rgba(255,255,255,0.55)', fontSize:'11px',
          marginTop:'16px', lineHeight:'1.6' }}>
          You&apos;ll be taken to Buy Me a Coffee to complete your gift.
          All donations go directly to maintaining and growing AbidingAnchor.
          Thank you for being part of this mission. {'\uD83D\uDE4F'}
        </p>

        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <Link to="/memorize" style={{ color: '#D4A843', fontSize: '12px', textDecoration: 'none', fontWeight: 600 }}>
            Memorize
          </Link>
          <Link to="/legal" style={{ color: '#D4A843', fontSize: '12px', textDecoration: 'none', fontWeight: 600 }}>
            Legal &amp; Privacy
          </Link>
          <Link to="/privacy" style={{ color: '#D4A843', fontSize: '12px', textDecoration: 'none', fontWeight: 600 }}>
            Privacy Policy
          </Link>
          <Link to="/terms" style={{ color: '#D4A843', fontSize: '12px', textDecoration: 'none', fontWeight: 600 }}>
            Terms of Service
          </Link>
        </div>

      </div>
    </div>
  )
}
