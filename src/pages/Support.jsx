import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  SUPPORT_BMAC_LINK,
  SUPPORT_PAGE_GOLD,
  SUPPORT_ROADMAP_ITEMS,
  WALL_OF_HONOR_EMPTY,
  WALL_OF_HONOR_SUBTITLE,
  WALL_OF_HONOR_TITLE,
} from '../data/supportPageConstants'
import { fetchWallOfHonorSupporters, formatSupporterSince, supporterDisplayName } from '../data/supportWallOfHonor'
import { supabase } from '../lib/supabase'
import { parseMinistryTransparencyStats } from '../utils/parseMinistryTransparencyStats'
import { userStorageKey } from '../utils/userStorage'

function WallOfHonorAvatar({ avatarUrl, gold }) {
  const [imgError, setImgError] = useState(false)
  const showFallback = !avatarUrl || imgError
  return (
    <div
      style={{
        width: '44px',
        height: '44px',
        borderRadius: '50%',
        overflow: 'hidden',
        flexShrink: 0,
        border: `1px solid rgba(212, 175, 55, 0.35)`,
        background: 'rgba(0, 0, 0, 0.2)',
      }}
    >
      {showFallback ? (
        <div
          aria-hidden
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: gold,
            fontSize: '22px',
            lineHeight: 1,
          }}
        >
          ⚓
        </div>
      ) : (
        <img
          src={avatarUrl}
          alt=""
          width={44}
          height={44}
          referrerPolicy="no-referrer"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onError={() => setImgError(true)}
        />
      )}
    </div>
  )
}

export default function Support() {
  const { user } = useAuth()
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [aiPrayersCount, setAiPrayersCount] = useState(null)
  const [usersReachedCount, setUsersReachedCount] = useState(null)
  const [transparencyLoading, setTransparencyLoading] = useState(true)
  const [honorSupporters, setHonorSupporters] = useState([])
  const [honorLoading, setHonorLoading] = useState(true)

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

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setHonorLoading(true)
      const { supporters } = await fetchWallOfHonorSupporters()
      if (!cancelled) {
        setHonorSupporters(supporters)
        setHonorLoading(false)
      }
    })()
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

        {[
          { amount:'$3', label:'A Small Blessing',
            desc:'Covers one day of server costs' },
          { amount:'$10', label:'A Faithful Gift',
            desc:'Helps keep the app running for a week' },
          { amount:'$25', label:'A Ministry Partner',
            desc:'Funds new features & spreading the Word' },
        ].map(tier => (
          <a
            key={tier.amount}
            href={SUPPORT_BMAC_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="glass-panel"
            style={{
              borderRadius: '16px',
              padding: '14px 18px',
              marginBottom: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              textDecoration: 'none',
            }}
          >
            <div
              style={{
                background: '#D4A843',
                border: '1px solid rgba(212, 168, 67, 0.95)',
                borderRadius: '12px',
                padding: '8px 14px',
                minWidth: '52px',
                textAlign: 'center',
              }}
            >
              <div style={{ color: '#141824', fontSize: '18px', fontWeight: 'bold' }}>{tier.amount}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div className="support-tier-label" style={{ color: 'rgba(255, 255, 255, 0.95)', fontSize: '14px', fontWeight: 600 }}>
                {tier.label}
              </div>
              <div className="support-tier-desc" style={{ color: 'rgba(255, 255, 255, 0.62)', fontSize: '12px', marginTop: '2px' }}>
                {tier.desc}
              </div>
            </div>
            <div style={{ color: 'rgba(212, 168, 67, 0.85)', fontSize: '20px', lineHeight: 1 }} aria-hidden>
              ›
            </div>
          </a>
        ))}

        <section
          className="glass-panel"
          style={{
            borderRadius: '20px',
            padding: '18px 16px',
            marginBottom: '16px',
            marginTop: '4px',
            border: '1px solid rgba(212, 175, 55, 0.28)',
            background: 'var(--card-bg, rgba(15, 20, 45, 0.88))',
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

        <section
          className="glass-panel"
          style={{
            borderRadius: '20px',
            padding: '18px 16px',
            marginBottom: '16px',
            border: '1px solid rgba(212, 175, 55, 0.28)',
            background: 'var(--card-bg, rgba(15, 20, 45, 0.88))',
          }}
        >
          <h2
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap',
              color: 'var(--text-primary, #f5f5f5)',
              fontSize: '16px',
              fontWeight: 700,
              margin: '0 0 6px',
              fontFamily: 'Georgia, serif',
              letterSpacing: '0.02em',
            }}
          >
            <span style={{ fontSize: '18px', lineHeight: 1, filter: 'none' }} aria-hidden>
              🏆
            </span>
            {WALL_OF_HONOR_TITLE}
          </h2>
          <p
            style={{
              margin: '0 0 16px',
              fontSize: '12px',
              lineHeight: 1.5,
              color: 'var(--text-secondary, rgba(255,255,255,0.65))',
            }}
          >
            {WALL_OF_HONOR_SUBTITLE}
          </p>

          {honorLoading ? (
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary, rgba(255,255,255,0.55))' }}>
              Loading…
            </p>
          ) : honorSupporters.length === 0 ? (
            <p
              style={{
                margin: 0,
                fontSize: '13px',
                fontStyle: 'italic',
                color: 'var(--text-secondary, rgba(255,255,255,0.5))',
                textAlign: 'center',
                padding: '12px 8px',
              }}
            >
              {WALL_OF_HONOR_EMPTY}
            </p>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: '10px',
              }}
            >
              {honorSupporters.map((row) => {
                const name = supporterDisplayName(row)
                const sinceLabel = formatSupporterSince(row.supporter_since)
                return (
                  <article
                    key={row.id}
                    style={{
                      borderRadius: '14px',
                      padding: '12px 10px',
                      background: 'rgba(0, 0, 0, 0.22)',
                      border: '1px solid rgba(212, 175, 55, 0.22)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      gap: '8px',
                      minWidth: 0,
                    }}
                  >
                    <WallOfHonorAvatar avatarUrl={row.avatar_url} gold={gold} />
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: 'var(--text-primary, rgba(255,255,255,0.95))',
                        lineHeight: 1.3,
                        wordBreak: 'break-word',
                      }}
                    >
                      {name}
                    </div>
                    <span
                      style={{
                        display: 'inline-block',
                        fontSize: '9px',
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: gold,
                        border: `1px solid rgba(212, 175, 55, 0.45)`,
                        borderRadius: '999px',
                        padding: '3px 8px',
                        background: 'rgba(212, 175, 55, 0.08)',
                      }}
                    >
                      Ministry Supporter
                    </span>
                    {sinceLabel ? (
                      <span
                        style={{
                          fontSize: '11px',
                          color: 'var(--text-secondary, rgba(255,255,255,0.55))',
                          lineHeight: 1.35,
                        }}
                      >
                        {sinceLabel}
                      </span>
                    ) : null}
                  </article>
                )
              })}
            </div>
          )}
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
