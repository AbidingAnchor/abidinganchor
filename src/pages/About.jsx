import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const SHIMMER = `
  @keyframes about-shimmer {
    0%   { background-position: 200% center; }
    100% { background-position: -200% center; }
  }
`

export default function About() {
  const navigate = useNavigate()
  const [foundingMembers, setFoundingMembers] = useState([])

  useEffect(() => {
    document.title = 'About — AbidingAnchor'
    supabase
      .from('profiles')
      .select('id, display_name, full_name, username, name_color')
      .eq('is_founding_member', true)
      .limit(50)
      .then(({ data }) => setFoundingMembers(data || []))
  }, [])

  return (
    <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
      <div
        className="content-scroll"
        style={{
          padding: '0 16px',
          paddingTop: '92px',
          paddingBottom: '120px',
          maxWidth: '760px',
          margin: '0 auto',
          width: '100%',
        }}
      >
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
              What's New
            </span>
          </div>
          <div style={{ width: '40px' }} />
        </div>
        <main
          className="glass-panel"
          style={{
            borderRadius: '24px',
            border: '1px solid rgba(212, 168, 67, 0.35)',
            background: 'rgba(8, 18, 41, 0.88)',
            boxShadow: '0 14px 34px rgba(0, 0, 0, 0.35)',
            padding: '26px 20px',
          }}
        >
          <header style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '12px' }}>
            <img
              src="/Logo.png"
              alt="Abiding Anchor logo"
              style={{ width: '96px', height: '96px', objectFit: 'contain', filter: 'drop-shadow(0 0 12px rgba(212, 168, 67, 0.25))' }}
            />
            <h1
              style={{
                margin: 0,
                color: '#D4A843',
                fontSize: '30px',
                fontWeight: 700,
                letterSpacing: '0.02em',
                textShadow: '0 2px 10px rgba(0, 0, 0, 0.35)',
              }}
            >
              About Abiding Anchor
            </h1>
          </header>

          <section style={{ marginTop: '22px' }}>
            <h2 style={{ margin: '0 0 10px', color: '#F2D486', fontSize: '20px', fontWeight: 700 }}>
              Our Story
            </h2>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.9)', lineHeight: 1.8, fontSize: '15px' }}>
              Abiding Anchor was founded by Drew, a solo Christian developer who built it as a free ministry
              tool for believers who want a distraction-free space to study Scripture.
            </p>
            <p style={{ margin: '12px 0 0', color: 'rgba(255,255,255,0.88)', lineHeight: 1.8, fontSize: '15px' }}>
              Drew noticed that most Bible apps are cluttered with ads, social features, and paywalls, so he built
              Abiding Anchor as a distraction-free alternative and offered it as ministry to anyone seeking a quiet,
              focused place to meet with God in His Word.
            </p>
          </section>

          <section style={{ marginTop: '20px' }}>
            <h2 style={{ margin: '0 0 10px', color: '#F2D486', fontSize: '20px', fontWeight: 700 }}>
              Our Mission
            </h2>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.9)', lineHeight: 1.8, fontSize: '15px' }}>
              To provide every believer with a free, private, and focused space to grow in God's Word. No ads.
              No tracking. No subscriptions. Ever.
            </p>
          </section>

          <section style={{ marginTop: '20px' }}>
            <h2 style={{ margin: '0 0 10px', color: '#F2D486', fontSize: '20px', fontWeight: 700 }}>
              Features
            </h2>
            <ul
              style={{
                margin: 0,
                padding: 0,
                listStyle: 'none',
                display: 'grid',
                gap: '8px',
              }}
            >
              {[
                'Bible Reader',
                'Guided Prayers',
                'AI Bible Companion',
                'Journaling',
                "Strong's Concordance",
                'Hebrew & Greek Tools',
                'Ambient Worship Music',
                'Daily Streak',
              ].map((feature) => (
                <li
                  key={feature}
                  style={{
                    borderRadius: '12px',
                    border: '1px solid rgba(212, 168, 67, 0.22)',
                    background: 'rgba(255,255,255,0.03)',
                    padding: '10px 12px',
                    color: 'rgba(255,255,255,0.92)',
                    fontSize: '14px',
                    lineHeight: 1.5,
                  }}
                >
                  <span style={{ color: '#D4A843', marginRight: '8px' }} aria-hidden>
                    ✦
                  </span>
                  {feature}
                </li>
              ))}
            </ul>
          </section>

          <section style={{ marginTop: '20px' }}>
            <h2 style={{ margin: '0 0 10px', color: '#F2D486', fontSize: '20px', fontWeight: 700 }}>
              Contact
            </h2>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.88)', fontSize: '15px', lineHeight: 1.7 }}>
              Questions, feedback, or prayer requests are always welcome:
            </p>
            <a
              href="mailto:abidingstudiosdev@gmail.com"
              style={{
                display: 'inline-block',
                marginTop: '8px',
                color: '#D4A843',
                fontWeight: 700,
                textDecoration: 'underline',
              }}
            >
              abidingstudiosdev@gmail.com
            </a>
          </section>

          <section
            style={{
              marginTop: '18px',
              borderRadius: '14px',
              border: '1px solid rgba(212, 168, 67, 0.3)',
              background: 'rgba(212, 168, 67, 0.1)',
              padding: '14px 16px',
            }}
          >
            <p
              style={{
                margin: 0,
                color: '#F5E6B8',
                textAlign: 'center',
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                fontSize: '13px',
              }}
            >
              Free forever. Built as a ministry.
            </p>
          </section>

          {foundingMembers.length > 0 && (
            <section style={{ marginTop: '24px' }}>
              <style>{SHIMMER}</style>
              <h2 style={{ margin: '0 0 14px', color: '#F2D486', fontSize: '20px', fontWeight: 700, textAlign: 'center' }}>
                Our Founding Members 👑
              </h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
                {foundingMembers.map((m) => {
                  const name = m.display_name || m.full_name || m.username || 'Faithful Believer'
                  return (
                    <span
                      key={m.id}
                      style={{
                        display: 'inline-block',
                        padding: '6px 14px',
                        borderRadius: '999px',
                        outline: '1px solid rgba(255,215,0,0.35)',
                        background: 'rgba(255,215,0,0.06)',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '15px',
                          fontWeight: 700,
                          background: 'linear-gradient(90deg, #b8860b, #ffd700, #ffec8b, #ffd700, #b8860b)',
                          backgroundSize: '200%',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                          animation: 'about-shimmer 2.5s infinite linear',
                        }}
                      >
                        👑 {name}
                      </span>
                    </span>
                  )
                })}
              </div>
            </section>
          )}

          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center' }}>
            <Link
              to="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                textDecoration: 'none',
                color: '#0C1326',
                background: '#D4A843',
                border: '1px solid rgba(212, 168, 67, 0.9)',
                borderRadius: '999px',
                padding: '10px 16px',
                fontSize: '14px',
                fontWeight: 700,
              }}
            >
              <span aria-hidden>←</span>
              Back to Home
            </Link>
          </div>
        </main>
      </div>
    </div>
  )
}
