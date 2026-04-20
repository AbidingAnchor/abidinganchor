import { useEffect } from 'react'
import { Link } from 'react-router-dom'

export default function About() {
  useEffect(() => {
    document.title = 'About — AbidingAnchor'
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
