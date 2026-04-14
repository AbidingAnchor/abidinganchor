import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

export default function Auth() {
  const { user, signIn, signUp } = useAuth()
  const [mode, setMode] = useState('signin')
  const [fullName, setFullName] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [signUpConsent, setSignUpConsent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')

  const verses = [
    { text: "He is like a tree planted by streams of water", reference: "Psalm 1:3" },
    { text: "The Lord is my shepherd, I shall not want", reference: "Psalm 23:1" },
    { text: "I can do all things through Christ who strengthens me", reference: "Phil 4:13" },
    { text: "Be still and know that I am God", reference: "Psalm 46:10" },
    { text: "The Lord is my light and my salvation", reference: "Psalm 27:1" },
    { text: "Trust in the Lord with all your heart", reference: "Proverbs 3:5" },
    { text: "For God so loved the world", reference: "John 3:16" },
    { text: "I am the way, the truth, and the life", reference: "John 14:6" },
    { text: "Come to me all who are weary", reference: "Matthew 11:28" },
    { text: "Your word is a lamp to my feet", reference: "Psalm 119:105" }
  ]
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0)
  const [opacity, setOpacity] = useState(1)

  useEffect(() => {
    const interval = setInterval(() => {
      setOpacity(0)
      setTimeout(() => {
        setCurrentVerseIndex((prev) => (prev + 1) % verses.length)
        setOpacity(1)
      }, 500)
    }, 4000)
    return () => clearInterval(interval)
  }, [verses.length])

  if (user) return <Navigate to="/" replace />

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail) return setError('Email is required.')
    if (!isValidEmail(cleanEmail)) return setError('Please enter a valid email address.')
    if (!password.trim()) return setError('Password is required.')
    if (mode === 'signup') {
      if (password !== confirmPassword) return setError("Passwords don't match.")
      if (password.length < 6) return setError('Password must be at least 6 characters.')
      const dob = new Date(dateOfBirth)
      if (Number.isNaN(dob.getTime())) return setError('Date of Birth is required.')
      const now = new Date()
      let age = now.getFullYear() - dob.getFullYear()
      const monthDelta = now.getMonth() - dob.getMonth()
      if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < dob.getDate())) age -= 1
      if (age < 13) {
        return setError('You must be at least 13 years old to create an account. AbidingAnchor is not directed at children under 13.')
      }
      if (!signUpConsent) return setError('Please provide consent to continue.')
    }
    setLoading(true)
    if (mode === 'signin') {
      const { error: signInError } = await signIn(cleanEmail, password)
      if (signInError) {
        setError(signInError.message)
      }
      setLoading(false)
      return
    }
    const { error: signUpError, usedEmailFallback } = await signUp(cleanEmail, password, fullName.trim())
    if (signUpError) {
      setError(signUpError.message)
    }
    else if (usedEmailFallback) setSuccess('Account created and signed in. You can continue now. 🙏')
    else setSuccess('Check your email to confirm your account 🙏')
    setLoading(false)
  }

  const handleForgotPassword = async () => {
    setError('')
    setSuccess('')
    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail) {
      setError('Enter your email first, then tap "Forgot password?".')
      return
    }
    if (!isValidEmail(cleanEmail)) {
      setError('Please enter a valid email address.')
      return
    }
    try {
      const redirectTo = `${window.location.origin}/reset-password`
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail, { redirectTo })
      if (resetError) throw resetError
      setSuccess('Password reset email sent.')
    } catch (err) {
      if (import.meta.env.DEV) console.error('Password reset error:', err)
      setError(err?.message || 'Failed to send password reset email.')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      padding: '0 20px',
    }}>
      {/* Spacer to push content below clouds */}
      <div style={{ height: '320px' }} />

      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: '16px', animation: 'fadeInDown 0.8s ease forwards' }}>
        <h1 style={{ fontSize: '22px', letterSpacing: '0.15em', 
          color: '#D4A843', margin: '0 0 4px 0', fontWeight: 300,
          textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
          ABIDING ANCHOR
        </h1>
        <p style={{ fontSize: '13px', fontStyle: 'italic', 
          color: 'rgba(255,255,255,0.8)', margin: 0,
          textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
          Anchored in His Word
        </p>
      </div>

      {/* Sign in card */}
      <article 
        className="app-card sign-in-modal" 
        style={{ 
          width: '90%',
          maxWidth: '400px',
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          margin: 0,
          zIndex: 30,
          animation: 'fadeInUp 0.8s ease forwards',
          animationDelay: '0.2s',
          padding: '24px',
          maxHeight: 'calc(100vh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 16px)',
          overflowY: 'auto'
        }}
      >
        {/* Gold shimmer border effect */}
        <div style={{
          position: 'absolute',
          inset: -2,
          borderRadius: '20px',
          padding: '2px',
          background: 'linear-gradient(45deg, rgba(212,168,67,0), rgba(212,168,67,0.4), rgba(212,168,67,0))',
          backgroundSize: '200% 200%',
          animation: 'shimmer 3s ease infinite',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
          pointerEvents: 'none'
        }} />
        
        <h2 className="font-cinzel text-[28px] text-gold text-center mb-4" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
          {mode === 'signin' ? 'Sign In' : 'Create Account'}
        </h2>

        <form onSubmit={handleSubmit} className="mt-4 grid gap-3">
          {mode === 'signup' ? (
            <>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full Name" className="app-input" style={{ borderRadius: '12px', padding: '12px' }} />
              <label className="text-white/[0.65] text-sm">Date of Birth</label>
              <input value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} type="date" className="app-input" style={{ borderRadius: '12px', padding: '12px' }} />
            </>
          ) : null}
          <input 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            placeholder="Email" 
            type="email" 
            className="app-input" 
            style={{ borderRadius: '12px', padding: '12px' }}
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="email"
            keyboardType="email-address"
            spellCheck={false}
          />
          <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" className="app-input" style={{ borderRadius: '12px', padding: '12px' }} />
          {mode === 'signup' ? (
            <input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm Password" type="password" className="app-input" style={{ borderRadius: '12px', padding: '12px' }} />
          ) : null}
          {mode === 'signup' ? (
            <label className="flex items-start gap-2 text-white/[0.65] text-sm leading-snug">
              <input
                type="checkbox"
                checked={signUpConsent}
                onChange={(e) => setSignUpConsent(e.target.checked)}
                className="mt-0.5"
              />
              <span>I consent to AbidingAnchor storing my spiritual journal and prayer data securely in the cloud to enable sync across my devices.</span>
            </label>
          ) : null}
          <button type="submit" className="btn-primary w-full" disabled={loading || (mode === 'signup' && !signUpConsent)} style={{ opacity: loading || (mode === 'signup' && !signUpConsent) ? 0.55 : 1 }}>
            {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="mt-4 flex justify-between items-center">
          <button type="button" onClick={() => { setMode((m) => (m === 'signin' ? 'signup' : 'signin')); setError(''); setSuccess(''); setSignUpConsent(false); setDateOfBirth('') }} className="btn-secondary">
            {mode === 'signin' ? 'Need an account?' : 'Already have an account?'}
          </button>
          <button type="button" onClick={handleForgotPassword} className="text-gold text-xs bg-transparent border-none">
            Forgot password?
          </button>
        </div>

        {error ? <p className="mt-2 text-[#ffb3b3] text-sm">{error}</p> : null}
        {success ? <p className="mt-2 text-gold text-sm">{success}</p> : null}
      </article>

      {/* Bottom - pushed to bottom with marginTop auto */}
      <div style={{ marginTop: '40px', textAlign: 'center', 
        paddingBottom: '30px', paddingTop: '20px', animation: 'fadeInUp 0.8s ease forwards', animationDelay: '0.4s' }}>
        {/* Bible verse */}
        <p style={{ 
          fontSize: '13px', 
          fontStyle: 'italic',
          color: 'rgba(255,255,255,0.7)',
          lineHeight: '1.6',
          maxWidth: '350px',
          margin: '0 auto',
          textShadow: '0 1px 4px rgba(0,0,0,0.3)',
          opacity: opacity,
          transition: 'opacity 0.5s ease'
        }}>
          "{verses[currentVerseIndex].text}"
        </p>
        <p style={{ 
          fontSize: '11px', 
          color: 'rgba(212,168,67,0.8)',
          marginTop: '3px',
          letterSpacing: '0.05em',
          opacity: opacity,
          transition: 'opacity 0.5s ease'
        }}>
          {verses[currentVerseIndex].reference}
        </p>

        {/* Feature pills */}
        <div style={{ marginTop: '16px' }}>
          <p style={{ 
            fontSize: '12px', 
            color: 'rgba(255,255,255,0.6)',
            marginBottom: '8px'
          }}>
            Everything you need for your faith journey
          </p>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: '6px',
            flexWrap: 'nowrap'
          }}>
            <div style={{
              background: 'rgba(212,168,67,0.15)',
              border: '1px solid rgba(212,168,67,0.3)',
              color: 'rgba(255,255,255,0.7)',
              borderRadius: '20px',
              padding: '4px 8px',
              fontSize: '10px'
            }}>
              Bible Reader
            </div>
            <div style={{
              background: 'rgba(212,168,67,0.15)',
              border: '1px solid rgba(212,168,67,0.3)',
              color: 'rgba(255,255,255,0.7)',
              borderRadius: '20px',
              padding: '4px 8px',
              fontSize: '10px'
            }}>
              Prayer Journal
            </div>
            <div style={{
              background: 'rgba(212,168,67,0.15)',
              border: '1px solid rgba(212,168,67,0.3)',
              color: 'rgba(255,255,255,0.7)',
              borderRadius: '20px',
              padding: '4px 8px',
              fontSize: '10px'
            }}>
              AI Companion
            </div>
          </div>
          <p style={{ 
            fontSize: '11px', 
            color: 'rgba(255,255,255,0.45)',
            marginTop: '10px',
            textAlign: 'center'
          }}>
            Free forever. Built as a ministry. ✝️
          </p>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes shimmer {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
      `}</style>
    </div>
  )
}
