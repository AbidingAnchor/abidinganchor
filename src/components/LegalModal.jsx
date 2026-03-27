import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const LEGAL_STORAGE_KEY = 'abidinganchor-welcomed'
const LEGACY_KEY = 'abidinganchor-legal-agreed'

export default function LegalModal() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const alreadyAgreed = localStorage.getItem(LEGAL_STORAGE_KEY) || localStorage.getItem(LEGACY_KEY)
    if (!alreadyAgreed) setOpen(true)
  }, [])

  const handleAgree = () => {
    localStorage.setItem(LEGAL_STORAGE_KEY, 'true')
    setOpen(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4">
      <article
        className="w-full text-center text-white"
        style={{
          maxWidth: '420px',
          padding: '40px 32px',
          background: 'rgba(13, 31, 78, 0.92)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(212, 168, 67, 0.3)',
          borderRadius: '24px',
        }}
      >
        <style>
          {`
            @keyframes cross-glow {
              0%, 100% { text-shadow: 0 0 10px rgba(212,168,67,0.35); }
              50% { text-shadow: 0 0 22px rgba(212,168,67,0.75); }
            }
          `}
        </style>

        <div className="mb-2 flex justify-center" style={{ color: '#D4A843' }}>
          <span
            aria-hidden="true"
            style={{
              fontSize: '48px',
              lineHeight: 1,
              animation: 'cross-glow 2.2s ease-in-out infinite',
            }}
          >
            ✝
          </span>
        </div>
        <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#fff' }}>Welcome to AbidingAnchor</h2>
        <p className="mt-1" style={{ color: '#D4A843', fontStyle: 'italic', fontSize: '16px' }}>Anchored in His Word</p>
        <p className="mt-2" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>Your quiet place with God&apos;s Word</p>
        <div className="mx-auto mt-4 h-px w-full" style={{ background: 'rgba(212,168,67,0.65)' }} />
        <p className="mt-4 text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
          By using this app, you agree to our
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
