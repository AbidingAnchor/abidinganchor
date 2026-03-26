import { Link } from 'react-router-dom'

export default function Legal() {
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
              className="block rounded-2xl border border-white/20 bg-white/10 p-5 text-center text-lg font-semibold text-white backdrop-blur-md transition hover:brightness-105"
            >
              Privacy Policy
            </Link>
            <Link
              to="/terms"
              className="block rounded-2xl border border-white/20 bg-white/10 p-5 text-center text-lg font-semibold text-white backdrop-blur-md transition hover:brightness-105"
            >
              Terms of Service
            </Link>
          </div>

          <article className="rounded-2xl border border-white/20 bg-white/10 p-5 text-center text-white/90 backdrop-blur-md">
            Questions? Contact us at <span style={{ color: '#D4A843', fontWeight: 700 }}>AbidingAnchor@outlook.com</span>
          </article>
        </section>
      </div>
    </div>
  )
}
