import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

export default function Auth() {
  const { user, signIn, signUp } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0)
  const [opacity, setOpacity] = useState(1)

  const verses = [
    { text: 'He is like a tree planted by streams of water', reference: 'Psalm 1:3' },
    { text: 'The Lord is my shepherd, I shall not want', reference: 'Psalm 23:1' },
    { text: 'I can do all things through Christ who strengthens me', reference: 'Phil 4:13' },
    { text: 'Be still and know that I am God', reference: 'Psalm 46:10' },
    { text: 'The Lord is my light and my salvation', reference: 'Psalm 27:1' },
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setOpacity(0)
      setTimeout(() => {
        setCurrentVerseIndex((prev) => (prev + 1) % verses.length)
        setOpacity(1)
      }, 450)
    }, 4200)
    return () => clearInterval(interval)
  }, [verses.length])

  if (user) return <Navigate to="/" replace />

  const cleanEmail = email.trim().toLowerCase()

  const handleSignIn = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    if (!cleanEmail) return setError('Email is required.')
    if (!isValidEmail(cleanEmail)) return setError('Please enter a valid email address.')
    if (!password.trim()) return setError('Password is required.')
    setLoading(true)
    const { error: signInError } = await signIn(cleanEmail, password)
    if (signInError) setError(signInError.message)
    setLoading(false)
  }

  const handleCreateAccount = async () => {
    setError('')
    setSuccess('')
    if (!cleanEmail) return setError('Email is required.')
    if (!isValidEmail(cleanEmail)) return setError('Please enter a valid email address.')
    if (!password.trim()) return setError('Password is required.')
    if (password.length < 6) return setError('Password must be at least 6 characters.')
    setLoading(true)
    const { error: signUpError } = await signUp(cleanEmail, password, '')
    if (signUpError) setError(signUpError.message)
    else setSuccess('Check your email to confirm your account.')
    setLoading(false)
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        minHeight: '100vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
      }}
    >
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          minHeight: '100vh',
          maxWidth: '560px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          padding: '16px 20px',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            maxWidth: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            gap: '10px',
          }}
        >
          <img
            src="/Logo.png"
            alt="Abiding Anchor logo"
            style={{
              width: '200px',
              height: '200px',
              objectFit: 'contain',
              filter: 'drop-shadow(0 0 15px rgba(212, 175, 55, 0.6))',
              animation: 'logoFloat 4s ease-in-out infinite',
            }}
          />
          <h1
            style={{
              margin: '-10px 0 -2px',
              color: '#D4A843',
              fontSize: '36px',
              letterSpacing: '0.22em',
              fontFamily: "'Cinzel', 'Times New Roman', serif",
              fontWeight: 600,
              textAlign: 'center',
              textShadow: '0 2px 12px rgba(0,0,0,0.35)',
            }}
          >
            ABIDING ANCHOR
          </h1>
          <p
            style={{
              margin: '0 0 6px',
              color: 'rgba(255,255,255,0.68)',
              fontSize: '13px',
              letterSpacing: '0.02em',
              textAlign: 'center',
            }}
          >
            Your private space to grow in faith
          </p>

        </div>

        <article
          style={{
            width: '100%',
            maxWidth: '480px',
            borderRadius: '16px',
            padding: '26px',
            boxSizing: 'border-box',
            background: 'rgba(255,255,255,0.05)',
            border: '0.5px solid rgba(212,168,67,0.8)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            boxShadow: '0 0 24px rgba(212,168,67,0.18), 0 10px 40px rgba(0,0,0,0.35)',
          }}
        >
          <h2
            style={{
              margin: '0 0 4px',
              color: '#D4A843',
              fontSize: '24px',
              textAlign: 'center',
              fontWeight: 700,
              letterSpacing: '0.05em',
            }}
          >
            Sign In
          </h2>
          <form onSubmit={handleSignIn} className="grid gap-4">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              type="email"
              className="app-input"
              style={{
                borderRadius: '12px',
                padding: '14px',
                fontSize: '16px',
                background: 'rgba(0,0,0,0.15)',
                color: 'white',
                border: '0.5px solid rgba(212,175,55,0.4)',
              }}
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="email"
              spellCheck={false}
            />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              type="password"
              className="app-input"
              style={{
                borderRadius: '12px',
                padding: '14px',
                fontSize: '16px',
                background: 'rgba(0,0,0,0.15)',
                color: 'white',
                border: '0.5px solid rgba(212,175,55,0.4)',
              }}
            />
            <button
              type="submit"
              className="btn-primary w-full"
              disabled={loading}
              style={{ padding: '14px', fontSize: '16px' }}
            >
              {loading ? 'Please wait...' : 'Sign In'}
            </button>
            <button
              type="button"
              className="btn-primary w-full"
              disabled={loading}
              onClick={handleCreateAccount}
              style={{ padding: '14px', fontSize: '16px' }}
            >
              Create Free Account
            </button>
          </form>

          {error ? <p className="mt-3 text-[#ffb3b3] text-sm">{error}</p> : null}
          {success ? <p className="mt-3 text-gold text-sm">{success}</p> : null}
        </article>

        <div
          style={{
            width: '100%',
            maxWidth: '480px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          <p
            style={{
              fontSize: '13px',
              fontStyle: 'italic',
              color: 'rgba(255,255,255,0.82)',
              lineHeight: '1.5',
              margin: '10px 0 0',
              textAlign: 'center',
              opacity,
              transition: 'opacity 0.45s ease',
            }}
          >
            "{verses[currentVerseIndex].text}"
          </p>
          <p
            style={{
              fontSize: '11px',
              color: 'rgba(212,168,67,0.9)',
              margin: '2px 0 0',
              letterSpacing: '0.05em',
              textAlign: 'center',
              opacity,
              transition: 'opacity 0.45s ease',
            }}
          >
            {verses[currentVerseIndex].reference}
          </p>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '10px',
            }}
          >
            {['Bible Reader', 'Guided Prayers', 'Daily Streak', 'AI Companion'].map((pill) => (
              <span
                key={pill}
                style={{
                  padding: '6px 10px',
                  borderRadius: '999px',
                  background: 'rgba(255,255,255,0.12)',
                  border: '1px solid rgba(255,255,255,0.22)',
                  color: 'rgba(255,255,255,0.88)',
                  fontSize: '11px',
                  fontWeight: 500,
                  letterSpacing: '0.01em',
                  lineHeight: 1,
                }}
              >
                {pill}
              </span>
            ))}
          </div>

          <p
            style={{
              margin: '8px 0 0',
              color: 'rgba(255,255,255,0.62)',
              fontSize: '12px',
              textAlign: 'center',
            }}
          >
            Free forever. Built as a ministry. 🙏
          </p>
        </div>
      </div>
      <style>{`
        @keyframes logoFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-7px); }
        }
      `}</style>
    </div>
  )
}
