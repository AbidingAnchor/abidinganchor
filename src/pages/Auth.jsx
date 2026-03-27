import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

function mapError(message = '') {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) return 'Incorrect email or password.'
  if (m.includes('already registered')) return 'This email is already taken.'
  if (m.includes('email')) return 'Please enter a valid email address.'
  return message || 'Something went wrong. Please try again.'
}

export default function Auth() {
  const { user, signIn, signUp } = useAuth()
  const [mode, setMode] = useState('signin')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')

  if (user) return <Navigate to="/" replace />

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    if (!email.trim()) return setError('Email is required.')
    if (!password.trim()) return setError('Password is required.')
    if (mode === 'signup') {
      if (password !== confirmPassword) return setError("Passwords don't match.")
      if (password.length < 6) return setError('Password must be at least 6 characters.')
    }
    setLoading(true)
    if (mode === 'signin') {
      const { error: signInError } = await signIn(email.trim(), password)
      if (signInError) setError(mapError(signInError.message))
      setLoading(false)
      return
    }
    const { error: signUpError } = await signUp(email.trim(), password, fullName.trim())
    if (signUpError) setError(mapError(signUpError.message))
    else setSuccess('Check your email to confirm your account 🙏')
    setLoading(false)
  }

  const handleForgotPassword = async () => {
    setError('')
    setSuccess('')
    if (!email.trim()) {
      setError('Enter your email first, then tap "Forgot password?".')
      return
    }
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim())
    if (resetError) setError(mapError(resetError.message))
    else setSuccess('Password reset email sent.')
  }

  return (
    <div style={{ minHeight: '100vh', padding: '0 16px', paddingTop: '220px', paddingBottom: '120px', maxWidth: '680px', margin: '0 auto' }}>
      <article className="app-card" style={{ padding: '20px' }}>
        <h1 style={{ margin: 0, color: '#D4A843', fontSize: '28px', textAlign: 'center' }}>
          {mode === 'signin' ? 'Sign In' : 'Create Account'}
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.84)', textAlign: 'center', marginTop: '8px' }}>
          Your private place with God&apos;s Word
        </p>

        <form onSubmit={handleSubmit} style={{ marginTop: '14px', display: 'grid', gap: '10px' }}>
          {mode === 'signup' ? (
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full Name" className="rounded-lg bg-white/90 px-3 py-2 text-[#1a1a1a] focus:outline-none" />
          ) : null}
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" className="rounded-lg bg-white/90 px-3 py-2 text-[#1a1a1a] focus:outline-none" />
          <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" className="rounded-lg bg-white/90 px-3 py-2 text-[#1a1a1a] focus:outline-none" />
          {mode === 'signup' ? (
            <input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm Password" type="password" className="rounded-lg bg-white/90 px-3 py-2 text-[#1a1a1a] focus:outline-none" />
          ) : null}
          <button type="submit" className="gold-btn" disabled={loading}>
            {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button type="button" onClick={() => { setMode((m) => (m === 'signin' ? 'signup' : 'signin')); setError(''); setSuccess('') }} className="back-btn">
            {mode === 'signin' ? 'Need an account?' : 'Already have an account?'}
          </button>
          <button type="button" onClick={handleForgotPassword} style={{ background: 'none', border: 'none', color: '#D4A843', fontSize: '12px' }}>
            Forgot password?
          </button>
        </div>

        {error ? <p style={{ marginTop: '10px', color: '#ffb3b3', fontSize: '13px' }}>{error}</p> : null}
        {success ? <p style={{ marginTop: '10px', color: '#D4A843', fontSize: '13px' }}>{success}</p> : null}
      </article>
    </div>
  )
}
