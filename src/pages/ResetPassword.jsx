import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getCachedSession, supabase } from '../lib/supabase'
import { clearAbidingAnchorUserStorage } from '../utils/userStorage'

function captureRecoveryHintFromUrl() {
  if (typeof window === 'undefined') return { hash: '', search: '' }
  return { hash: window.location.hash || '', search: window.location.search || '' }
}

function hashLooksLikeRecovery(hash) {
  const h = (hash || '').replace(/^#/, '')
  return /type=recovery|type%3Drecovery/i.test(h) && /access_token=/i.test(h)
}

export default function ResetPassword() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [linkStatus, setLinkStatus] = useState('checking') // checking | ready | invalid
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const recoverySeenRef = useRef(false)
  const urlHintRef = useRef(captureRecoveryHintFromUrl())
  const verifyStartedRef = useRef(false)

  const markReady = useCallback(() => {
    recoverySeenRef.current = true
    setLinkStatus((s) => (s === 'invalid' ? s : 'ready'))
  }, [])

  const markInvalid = useCallback(() => {
    setLinkStatus((s) => (s === 'ready' ? s : 'invalid'))
  }, [])

  // Query-string recovery (e.g. token_hash + type=recovery)
  useEffect(() => {
    const tokenHash = searchParams.get('token_hash') || searchParams.get('token')
    const type = searchParams.get('type')
    if (!tokenHash || type !== 'recovery' || verifyStartedRef.current) return
    verifyStartedRef.current = true
    let cancelled = false
    ;(async () => {
      const { error } = await supabase.auth.verifyOtp({ type: 'recovery', token_hash: tokenHash })
      if (cancelled) return
      if (error) {
        console.error('Recovery verifyOtp:', error)
        markInvalid()
        return
      }
      markReady()
    })()
    return () => {
      cancelled = true
    }
  }, [searchParams, markInvalid, markReady])

  // Hash recovery (implicit) — PASSWORD_RECOVERY event + fallback polling
  useEffect(() => {
    const hadRecoveryHash = hashLooksLikeRecovery(urlHintRef.current.hash)

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) markReady()
    })

    let cancelled = false
    const finalize = async (stage) => {
      if (cancelled || recoverySeenRef.current) return

      const session = await getCachedSession({ forceRefresh: true })
      if (cancelled || recoverySeenRef.current) return

      const hasQueryRecovery =
        (searchParams.get('token_hash') || searchParams.get('token')) &&
        searchParams.get('type') === 'recovery'

      if (hasQueryRecovery) return

      if (session && hadRecoveryHash) {
        markReady()
        return
      }

      if (!hadRecoveryHash) {
        markInvalid()
        return
      }

      if (hadRecoveryHash && !session && stage === 'final') markInvalid()
    }

    const t1 = setTimeout(() => finalize('poll'), 120)
    const t2 = setTimeout(() => finalize('poll'), 900)
    const t3 = setTimeout(() => finalize('final'), 3500)

    return () => {
      cancelled = true
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      subscription.unsubscribe()
    }
  }, [searchParams, markInvalid, markReady])

  useEffect(() => {
    if (!success) return
    const t = setTimeout(() => navigate('/auth', { replace: true }), 3000)
    return () => clearTimeout(t)
  }, [success, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFieldError('')
    setSubmitError('')
    if (password !== confirmPassword) {
      setFieldError("Passwords don't match.")
      return
    }
    if (!password.trim()) {
      setFieldError('Password is required.')
      return
    }
    if (password.length < 6) {
      setFieldError('Password must be at least 6 characters.')
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      clearAbidingAnchorUserStorage()
      await supabase.auth.signOut()
      setSuccess(true)
    } catch (err) {
      console.error('Update password:', err)
      setSubmitError(err.message || 'Could not update password.')
    } finally {
      setLoading(false)
    }
  }

  const showForm = linkStatus === 'ready' && !success

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: '0 20px',
      }}
    >
      <div style={{ height: '320px' }} />

      <div style={{ textAlign: 'center', marginBottom: '16px', animation: 'fadeInDown 0.8s ease forwards' }}>
        <h1
          style={{
            fontSize: '22px',
            letterSpacing: '0.15em',
            color: '#D4A843',
            margin: '0 0 4px 0',
            fontWeight: 300,
            textShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}
        >
          ABIDING ANCHOR
        </h1>
        <p
          style={{
            fontSize: '13px',
            fontStyle: 'italic',
            color: 'rgba(255,255,255,0.8)',
            margin: 0,
            textShadow: '0 1px 4px rgba(0,0,0,0.3)',
          }}
        >
          {t('legal.anchoredInWord')}
        </p>
      </div>

      <article
        className="app-card"
        style={{
          width: '100%',
          maxWidth: '360px',
          position: 'relative',
          animation: 'fadeInUp 0.8s ease forwards',
          animationDelay: '0.2s',
          padding: '24px',
        }}
      >
        <div
          style={{
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
            pointerEvents: 'none',
          }}
        />

        <h2 className="font-cinzel text-[28px] text-gold text-center mb-4" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
          Reset password
        </h2>

        {linkStatus === 'checking' ? (
          <p className="text-white/[0.75] text-sm text-center">Verifying your link…</p>
        ) : null}

        {linkStatus === 'invalid' ? (
          <p className="text-[#ffb3b3] text-sm text-center leading-relaxed">
            This link has expired. Please request a new password reset.
          </p>
        ) : null}

        {success ? (
          <p className="text-gold text-sm text-center leading-relaxed">
            Your password has been updated. You can now sign in.
          </p>
        ) : null}

        {showForm ? (
          <form onSubmit={handleSubmit} className="mt-4 grid gap-3">
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New Password"
              type="password"
              className="app-input"
              style={{ borderRadius: '12px', padding: '12px' }}
              autoComplete="new-password"
            />
            <input
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm Password"
              type="password"
              className="app-input"
              style={{ borderRadius: '12px', padding: '12px' }}
              autoComplete="new-password"
            />
            <button type="submit" className="btn-primary w-full" disabled={loading} style={{ opacity: loading ? 0.55 : 1 }}>
              {loading ? 'Please wait…' : 'Submit'}
            </button>
            {fieldError ? <p className="text-[#ffb3b3] text-sm">{fieldError}</p> : null}
            {submitError ? <p className="text-[#ffb3b3] text-sm">{submitError}</p> : null}
          </form>
        ) : null}
      </article>

      <style>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  )
}
