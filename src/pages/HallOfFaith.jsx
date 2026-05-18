import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { SHIMMER_KEYFRAMES } from '../hooks/useNameStyle'
import { useThemeBackgroundType } from '../hooks/useThemeBackgroundType'
import { supabase } from '../lib/supabase'
import DayBackground from '../components/DayBackground'

const HALL_STYLES = `
  @keyframes hof-shimmer {
    0%   { background-position: 200% center; }
    100% { background-position: -200% center; }
  }
  @keyframes hof-twinkle {
    0%, 100% { opacity: 0.3; transform: scale(1); }
    50%       { opacity: 1;   transform: scale(1.4); }
  }
  @keyframes hof-scroll {
    0%   { transform: translateY(0); }
    100% { transform: translateY(-50%); }
  }
  @keyframes hof-fade-in {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  ${SHIMMER_KEYFRAMES}
`

function StarField({ count = 120 }) {
  const stars = useRef(
    Array.from({ length: count }, (_, i) => ({
      id: i,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      size: Math.random() * 2.5 + 1,
      delay: `${Math.random() * 4}s`,
      duration: `${Math.random() * 3 + 2}s`,
    })),
  )

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {stars.current.map((s) => (
        <div
          key={s.id}
          style={{
            position: 'absolute',
            top: s.top,
            left: s.left,
            width: s.size,
            height: s.size,
            borderRadius: '50%',
            background: '#fff',
            animation: `hof-twinkle ${s.duration} ${s.delay} infinite ease-in-out`,
          }}
        />
      ))}
    </div>
  )
}

function NameRow({ name, color, tier, isOwn }) {
  const isLifetime = tier === 'lifetime'
  const badge = isLifetime ? '👑' : tier === 'monthly' ? '⭐' : null
  const hasCustomColor = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(color || ''))

  if (isOwn) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '28px',
        animation: 'hof-fade-in 0.6s ease',
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 20px',
          borderRadius: '999px',
          background: 'rgba(10,16,40,0.7)',
          border: '1px solid rgba(212,175,55,0.4)',
          boxShadow: '0 4px 20px rgba(212,175,55,0.15)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}>
          {badge && <span style={{ fontSize: '16px', flexShrink: 0 }}>{badge}</span>}
          <span style={{
            fontSize: '16px',
            fontWeight: 700,
            fontFamily: 'Georgia, serif',
            color: '#D4AF37',
            letterSpacing: '0.05em',
            textShadow: '0 0 10px rgba(212,175,55,0.3)',
          }}>{name}</span>
          <span style={{ fontSize: '12px', color: 'rgba(212,175,55,0.5)', fontWeight: 500 }}>← You</span>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      marginBottom: '28px',
    }}>
      {badge && <span style={{ fontSize: '16px', flexShrink: 0, filter: 'drop-shadow(0 0 4px rgba(212,175,55,0.4))' }}>{badge}</span>}
      <span
        style={{
          fontSize: '16px',
          fontWeight: 600,
          fontFamily: 'Georgia, serif',
          letterSpacing: '0.05em',
          color: hasCustomColor ? color : 'rgba(212,175,55,0.85)',
          background: (!hasCustomColor)
            ? 'linear-gradient(90deg, #B8860B, #D4A843, #F0C96A, #D4A843, #B8860B)'
            : undefined,
          backgroundSize: (!hasCustomColor) ? '200% auto' : undefined,
          WebkitBackgroundClip: (!hasCustomColor) ? 'text' : undefined,
          WebkitTextFillColor: (!hasCustomColor) ? 'transparent' : undefined,
          backgroundClip: (!hasCustomColor) ? 'text' : undefined,
          animation: (!hasCustomColor) ? 'shimmer 2s linear infinite' : undefined,
          textShadow: hasCustomColor ? undefined : undefined,
        }}
      >
        {name}
      </span>
    </div>
  )
}

export default function HallOfFaith() {
  const navigate = useNavigate()
  const themeType = useThemeBackgroundType()
  console.log('themeType:', themeType)
  const isDaytime = themeType === 'day' || themeType === 'morning' || themeType === 'afternoon'
  const isEvening = themeType === 'sunset'
  const { user, profile } = useAuth()
  const [supporters, setSupporters] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef(null)
  const animRef = useRef(null)


  useEffect(() => {
    document.title = 'Hall of Faith — AbidingAnchor'
    loadSupporters()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadSupporters = async () => {
    setLoading(true)
    try {
      const { count } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .neq('supporter_tier', 'free')
        .not('supporter_tier', 'is', null)

      setTotalCount(count || 0)

      const { data } = await supabase
        .from('profiles')
        .select('id, display_name, full_name, username, name_color, supporter_tier, profile_border')
        .neq('supporter_tier', 'free')
        .not('supporter_tier', 'is', null)
        .order('is_founding_member', { ascending: false })
        .limit(50)

      const mappedSupporters = (data || []).map((p) => ({
        id: p.id,
        name: (p.display_name || p.full_name || p.username || 'Faithful Believer').trim().replace(/^'/, ''),
        color: p.name_color || '#ffffff',
        tier: p.supporter_tier,
        border: p.profile_border,
        isOwn: p.id === user?.id,
      }))

      setSupporters(mappedSupporters)
    } catch (err) {
      console.error('Error loading supporters:', err)
    }
    setLoading(false)
  }

  const rows = supporters

  const scrollDuration = Math.max(30, rows.length * 1.8)

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: themeType === 'night'
        ? 'radial-gradient(ellipse at 40% 30%, rgba(10,18,50,1) 0%, rgba(5,8,28,1) 55%, rgba(2,4,15,1) 100%)'
        : themeType === 'sunset'
          ? 'linear-gradient(180deg, rgba(30,20,60,1) 0%, rgba(60,30,80,1) 50%, rgba(20,10,40,1) 100%)'
          : '#F5EFE0',
      color: isDaytime ? '#1A1A1A' : '#fff',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <style>{HALL_STYLES}</style>
      {isDaytime ? <DayBackground /> : null}
      <StarField count={isDaytime ? 0 : 120} />

      {/* Close button */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          zIndex: 20,
          marginTop: '56px',
          width: '40px',
          height: '40px',
          background: isDaytime ? 'rgba(245,239,224,0.9)' : 'rgba(10,16,40,0.7)',
          border: '1px solid rgba(212,175,55,0.5)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: '#D4AF37',
          fontSize: '18px',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          boxShadow: '0 2px 12px rgba(212,175,55,0.15)',
        }}
      >
        ←
      </button>

      {/* Title */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        textAlign: 'center',
        paddingTop: '72px',
        paddingBottom: '20px',
        background: themeType === 'night'
          ? 'linear-gradient(180deg, rgba(2,4,15,1) 60%, transparent 100%)'
          : themeType === 'sunset'
            ? 'linear-gradient(180deg, rgba(30,20,60,1) 60%, transparent 100%)'
            : 'linear-gradient(180deg, #F5EFE0 65%, transparent 100%)',
      }}>
        <h1 style={{
          margin: '0 0 6px',
          fontSize: '28px',
          fontWeight: 900,
          fontFamily: 'Georgia, serif',
          background: 'linear-gradient(90deg, #b8860b, #ffd700, #ffec8b, #ffd700, #b8860b)',
          backgroundSize: '200%',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          animation: isDaytime ? undefined : 'hof-shimmer 3s infinite linear',
          letterSpacing: '0.05em',
          textShadow: isDaytime ? undefined : '0 0 20px rgba(212,175,55,0.4), 0 0 40px rgba(212,175,55,0.15)',
        }}>
          Hall of Faith
        </h1>
        <p style={{
          margin: 0,
          color: 'rgba(212,175,55,0.5)',
          fontSize: '11px',
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          fontFamily: 'Georgia, serif',
          fontStyle: 'italic',
        }}>
          Hebrews 11
        </p>
      </div>

      {/* Scrolling names */}
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ marginTop: '40vh', color: 'rgba(255,255,255,0.5)', fontSize: '16px' }}>
            Loading...
          </div>
        ) : rows.length === 0 ? (
          <div style={{
            marginTop: '40vh',
            textAlign: 'center',
            padding: '0 32px',
            animation: 'hof-fade-in 0.8s ease',
          }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🕊️</div>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '16px', lineHeight: 1.6 }}>
              Be among the first to support<br />this ministry.
            </p>
            <button
              type="button"
              onClick={() => navigate('/supporter-upgrade')}
              style={{
                marginTop: '16px',
                background: '#D4A843',
                color: '#0a1432',
                border: 'none',
                borderRadius: '12px',
                padding: '12px 24px',
                fontWeight: 800,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Support the Ministry ⭐
            </button>
          </div>
        ) : (
          <div
            ref={scrollRef}
            style={{
              width: '100%',
              maxWidth: '400px',
              paddingTop: '160px',
              background: 'transparent',
              borderRadius: isDaytime ? '16px' : undefined,
              border: 'none',
              outline: 'none',
              boxShadow: 'none',
              color: isDaytime ? '#1A1A1A' : undefined,
              animation: `hof-scroll ${scrollDuration}s linear infinite`,
            }}
          >
            {/* Duplicate for seamless loop */}
            {[...rows, ...rows.filter(r => !r.isOwn)].map((row, i) => (
              <NameRow
                key={`${row.id}-${i}`}
                name={row.name}
                color={row.color}
                tier={row.tier}
                border={row.border}
                isOwn={row.isOwn}
              />
            ))}
            {/* Spacer equal to screen height so names scroll fully */}
            <div style={{ height: '100vh' }} />
          </div>
        )}
      </div>

      {/* Bottom gradient + counter */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        background: isDaytime
          ? 'linear-gradient(transparent, #F5EFE0 60%)'
          : isEvening
            ? 'linear-gradient(transparent, rgba(20,10,40,0.98) 55%)'
            : 'linear-gradient(transparent, rgba(2,4,15,0.98) 55%)',
        borderTop: isDaytime ? 'none' : '1px solid rgba(212,175,55,0.3)',
        paddingTop: '60px',
        paddingBottom: 'env(safe-area-inset-bottom, 16px)',
        paddingLeft: '20px',
        paddingRight: '20px',
        textAlign: 'center',
        backdropFilter: isDaytime ? undefined : 'blur(8px)',
        WebkitBackdropFilter: isDaytime ? undefined : 'blur(8px)',
      }}>
        {totalCount > 0 && (
          <p style={{
            margin: '0 0 8px',
            color: isDaytime ? 'rgba(0,0,0,0.55)' : 'rgba(212,175,55,0.7)',
            fontSize: '12px',
            letterSpacing: '0.05em',
            padding: '0 4px',
          }}>
            Among{' '}
            <span style={{ color: '#D4AF37', fontWeight: 700 }}>{totalCount.toLocaleString()}</span>
            {' '}faithful supporters keeping God's Word free for the world 🌍
          </p>
        )}
        <button
          type="button"
          onClick={loadSupporters}
          style={{
            background: 'transparent',
            border: '1px solid rgba(212,168,67,0.3)',
            color: 'rgba(212,168,67,0.7)',
            borderRadius: '999px',
            padding: '6px 16px',
            fontSize: '12px',
            cursor: 'pointer',
            marginBottom: '8px',
          }}
        >
          Refresh ↺
        </button>
      </div>
    </div>
  )
}
