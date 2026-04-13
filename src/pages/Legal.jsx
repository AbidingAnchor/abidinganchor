import { useEffect } from 'react'
import { Link } from 'react-router-dom'

export default function Legal() {
  useEffect(() => {
    document.title = 'Legal — AbidingAnchor'
  }, [])

  return (
    <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
      <div
        className="content-scroll"
        style={{ padding: '0 16px', paddingTop: '220px', paddingBottom: '120px', maxWidth: '680px', margin: '0 auto', width: '100%' }}
      >
        <section className="space-y-4">
          <header className="space-y-1 text-center">
            <h1 className="text-3xl font-bold" style={{ color: '#D4A843', textShadow: '0 1px 8px rgba(0,60,120,0.4)' }}>
              Legal &amp; Privacy
            </h1>
            <p className="text-white/85">AbidingAnchor Ministry</p>
          </header>

          <div className="space-y-3">
            <Link
              to="/privacy"
              className="block glass-panel rounded-2xl p-5 text-center text-lg font-semibold text-white transition hover:brightness-105"
            >
              Privacy Policy
            </Link>
            <Link
              to="/terms"
              className="block glass-panel rounded-2xl p-5 text-center text-lg font-semibold text-white transition hover:brightness-105"
            >
              Terms of Service
            </Link>
          </div>

          <article className="glass-panel rounded-2xl p-5 text-center text-white/90">
            Questions? Contact us at{' '}
            <a
              href="mailto:abidingstudiosdev@gmail.com"
              style={{ color: '#D4A843', fontWeight: 700, textDecoration: 'underline' }}
            >
              abidingstudiosdev@gmail.com
            </a>
          </article>

          <article className="glass-panel rounded-2xl p-5 text-white/90">
            <p className="text-sm">
              2026 Compliance Notice: AbidingAnchor follows a Privacy by Design model and may receive anonymized age-category signals from Apple and Google Play solely for age-appropriate experience compliance. We do not store personal data on our servers.
            </p>
          </article>
        </section>
      </div>
    </div>
  )
}
