import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const LEGAL_STORAGE_KEY = 'abidinganchor-legal-agreed'

export default function LegalModal() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const alreadyAgreed = localStorage.getItem(LEGAL_STORAGE_KEY)
    if (!alreadyAgreed) setOpen(true)
  }, [])

  const handleAgree = () => {
    localStorage.setItem(LEGAL_STORAGE_KEY, 'true')
    setOpen(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4">
      <article className="w-full max-w-md rounded-2xl border border-white/20 bg-white/10 p-6 text-center text-white backdrop-blur-md">
        <div className="mb-2 flex justify-center" style={{ color: '#D4A843' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <rect x="10.5" y="2" width="3" height="20" rx="1" />
            <rect x="3" y="8" width="18" height="3" rx="1" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold">Welcome to AbidingAnchor</h2>
        <p className="mt-1 text-sm text-white/80">Anchored in His Word</p>
        <p className="mt-4 text-sm leading-relaxed text-white/90">
          By using this app, you agree to our Terms of Service and acknowledge our Privacy Policy.
        </p>
        <p className="mt-3 text-sm">
          <Link to="/terms" style={{ color: '#D4A843', fontWeight: 700, textDecoration: 'none' }}>
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link to="/privacy" style={{ color: '#D4A843', fontWeight: 700, textDecoration: 'none' }}>
            Privacy Policy
          </Link>
        </p>
        <button
          type="button"
          onClick={handleAgree}
          className="mt-5 w-full rounded-xl px-4 py-2 text-sm font-bold"
          style={{ background: '#D4A843', color: '#1a1a1a' }}
        >
          I Agree &amp; Continue
        </button>
      </article>
    </div>
  )
}
