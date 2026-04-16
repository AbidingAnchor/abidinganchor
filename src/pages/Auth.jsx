import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { userStorageKey } from '../utils/userStorage'
import LoadingScreen from '../components/LoadingScreen'
import { formatAuthErrorMessage } from '../utils/authErrors'

const MIN_AUTH_SCALE = 0.58

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

const AUTH_SESSION_POLL_MS = 3000

export default function Auth() {
  const { user, profile, loading: authLoading, signIn, signUp, syncAuthFromStoredSession } = useAuth()
  const [authView, setAuthView] = useState('signIn')
  const [signInEmail, setSignInEmail] = useState('')
  const [signInPassword, setSignInPassword] = useState('')
  const [signUpDisplayName, setSignUpDisplayName] = useState('')
  const [signUpEmail, setSignUpEmail] = useState('')
  const [signUpPassword, setSignUpPassword] = useState('')
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0)
  const [opacity, setOpacity] = useState(1)

  const outerFitRef = useRef(null)
  const innerFitRef = useRef(null)
  const [fit, setFit] = useState({ scale: 1, clipPx: null })

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

  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const prevHtmlOverflow = html.style.overflow
    const prevBodyOverflow = body.style.overflow
    const prevBodyOverscroll = body.style.overscrollBehavior
    const prevHtmlOverscroll = html.style.overscrollBehavior
    const prevHtmlBg = html.style.backgroundColor
    const prevBodyBg = body.style.backgroundColor
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    body.style.overscrollBehavior = 'none'
    html.style.overscrollBehavior = 'none'
    html.style.backgroundColor = '#0a1432'
    body.style.backgroundColor = '#0a1432'
    return () => {
      html.style.overflow = prevHtmlOverflow
      body.style.overflow = prevBodyOverflow
      body.style.overscrollBehavior = prevBodyOverscroll
      html.style.overscrollBehavior = prevHtmlOverscroll
      html.style.backgroundColor = prevHtmlBg
      body.style.backgroundColor = prevBodyBg
    }
  }, [])

  const recalcFit = useCallback(() => {
    const outer = outerFitRef.current
    const inner = innerFitRef.current
    if (!outer || !inner) return
    const available = outer.clientHeight
    if (available <= 0) return
    const needed = inner.scrollHeight
    if (needed <= available + 2) {
      setFit((prev) =>
        prev.scale === 1 && prev.clipPx == null ? prev : { scale: 1, clipPx: null },
      )
      return
    }
    const scale = Math.max(MIN_AUTH_SCALE, available / needed)
    const clipPx = Math.min(available, Math.ceil(needed * scale))
    setFit((prev) =>
      prev.scale === scale && prev.clipPx === clipPx ? prev : { scale, clipPx },
    )
  }, [])

  useLayoutEffect(() => {
    recalcFit()
    const outer = outerFitRef.current
    const inner = innerFitRef.current
    if (!outer || !inner) return
    const ro = new ResizeObserver(() => recalcFit())
    ro.observe(outer)
    ro.observe(inner)
    window.addEventListener('resize', recalcFit)
    const vv = window.visualViewport
    vv?.addEventListener('resize', recalcFit)
    vv?.addEventListener('scroll', recalcFit)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', recalcFit)
      vv?.removeEventListener('resize', recalcFit)
      vv?.removeEventListener('scroll', recalcFit)
    }
  }, [
    recalcFit,
    error,
    success,
    loading,
    authView,
    signUpDisplayName,
    signUpEmail,
    signUpPassword,
    signUpConfirmPassword,
  ])

  /**
   * Email confirm often opens in another tab. Poll storage as a fallback; on PC, `storage`
   * fires when another tab writes Supabase session to localStorage so we sync immediately.
   */
  useEffect(() => {
    if (user) return undefined
    let cancelled = false
    const tick = async () => {
      if (cancelled) return
      try {
        await syncAuthFromStoredSession()
      } catch {
        /* ignore */
      }
    }
    void tick()
    const id = window.setInterval(tick, AUTH_SESSION_POLL_MS)

    const onStorage = (event) => {
      if (cancelled) return
      if (event.storageArea !== localStorage) return
      if (event.key != null && !String(event.key).includes('-auth-token')) return
      void tick()
    }
    window.addEventListener('storage', onStorage)

    return () => {
      cancelled = true
      window.clearInterval(id)
      window.removeEventListener('storage', onStorage)
    }
  }, [user, syncAuthFromStoredSession])

  if (user) {
    if (authLoading || !profile) return <LoadingScreen />
    let onboarded = profile.onboarding_complete === true
    try {
      onboarded =
        onboarded || localStorage.getItem(userStorageKey(user.id, 'onboarding-complete')) === 'true'
    } catch {
      /* keep profile flag only */
    }
    return <Navigate to={onboarded ? '/' : '/onboarding'} replace />
  }

  const cleanSignInEmail = signInEmail.trim().toLowerCase()
  const cleanSignUpEmail = signUpEmail.trim().toLowerCase()

  const handleSignIn = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    if (!cleanSignInEmail) return setError('Email is required.')
    if (!isValidEmail(cleanSignInEmail)) return setError('Please enter a valid email address.')
    if (!signInPassword.trim()) return setError('Password is required.')
    setLoading(true)
    const { error: signInError } = await signIn(cleanSignInEmail, signInPassword)
    if (signInError) setError(formatAuthErrorMessage(signInError))
    setLoading(false)
  }

  const handleSignUp = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    const name = signUpDisplayName.trim()
    if (!name) return setError('Please choose a display name.')
    if (!cleanSignUpEmail) return setError('Email is required.')
    if (!isValidEmail(cleanSignUpEmail)) return setError('Please enter a valid email address.')
    if (!signUpPassword.trim()) return setError('Password is required.')
    if (signUpPassword.length < 6) return setError('Password must be at least 6 characters.')
    if (signUpPassword !== signUpConfirmPassword) {
      return setError('Passwords do not match.')
    }
    if (name.toLowerCase() === cleanSignUpEmail) {
      return setError('Display name cannot be your email address.')
    }
    if (name.includes('@')) {
      return setError('Display name cannot look like an email address.')
    }
    setLoading(true)
    const { error: signUpError, usedEmailFallback } = await signUp(cleanSignUpEmail, signUpPassword, name)
    if (signUpError) setError(formatAuthErrorMessage(signUpError))
    else if (usedEmailFallback) {
      setSuccess('')
    } else {
      setSuccess(
        'We sent a confirmation link to your email. Please check your inbox and confirm your account before signing in.',
      )
    }
    setLoading(false)
  }

  const pad = 'max(8px, env(safe-area-inset-top, 0px)) max(12px, env(safe-area-inset-right, 0px)) max(8px, env(safe-area-inset-bottom, 0px)) max(12px, env(safe-area-inset-left, 0px))'
  const gapCol = 'clamp(4px, 1.4vmin, 12px)'
  const logoSize = 'clamp(72px, min(24vw, 20dvh), 200px)'
  const titleSize = 'clamp(0.85rem, 4.2vmin, 2.25rem)'
  const taglineSize = 'clamp(11px, 2.8vmin, 13px)'
  const modalPad = 'clamp(10px, 3.2vmin, 26px)'
  const h2Size = 'clamp(1.05rem, 3.8vmin, 1.5rem)'
  const inputPad = 'clamp(10px, 2.8vmin, 14px)'
  const inputFont = 'clamp(14px, 3.5vmin, 16px)'
  const formGap = 'clamp(8px, 2.2vmin, 16px)'
  const verseSize = 'clamp(10px, 2.9vmin, 13px)'
  const refSize = 'clamp(9px, 2.5vmin, 11px)'
  const pillFont = 'clamp(8px, 2.4vmin, 11px)'
  const pillPadV = 'clamp(4px, 1.2vmin, 6px)'
  const pillPadH = 'clamp(6px, 1.8vmin, 10px)'
  const freeSize = 'clamp(10px, 2.6vmin, 12px)'

  const isScaled = fit.clipPx != null && fit.scale < 1

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100dvh',
        minHeight: '100vh',
        maxHeight: '100dvh',
        overflow: 'hidden',
        overscrollBehavior: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        zIndex: 20,
      }}
    >
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          height: '100%',
          maxWidth: '560px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          minHeight: 0,
          padding: pad,
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      >
        <div
          ref={outerFitRef}
          style={{
            flex: 1,
            minHeight: 0,
            maxHeight: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
          }}
        >
          <div
            style={{
              width: '100%',
              maxHeight: '100%',
              minHeight: 0,
              height: isScaled ? fit.clipPx : 'auto',
              overflow: 'hidden',
              position: 'relative',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                position: isScaled ? 'absolute' : 'relative',
                top: isScaled ? 0 : undefined,
                left: isScaled ? '50%' : undefined,
                transform: isScaled ? `translateX(-50%) scale(${fit.scale})` : 'none',
                transformOrigin: 'top center',
                width: '100%',
                maxWidth: '480px',
                marginLeft: isScaled ? undefined : 'auto',
                marginRight: isScaled ? undefined : 'auto',
                boxSizing: 'border-box',
              }}
            >
              <div
                ref={innerFitRef}
                style={{
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: gapCol,
                  boxSizing: 'border-box',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    gap: 'clamp(2px, 1vmin, 10px)',
                    flexShrink: 0,
                  }}
                >
                  <img
                    src="/Logo.png"
                    alt="Abiding Anchor logo"
                    style={{
                      width: logoSize,
                      height: logoSize,
                      maxWidth: '100%',
                      objectFit: 'contain',
                      flexShrink: 0,
                      filter: 'drop-shadow(0 0 15px rgba(212, 175, 55, 0.6))',
                      animation: 'authLogoFloat 4s ease-in-out infinite',
                    }}
                  />
                  <h1
                    style={{
                      margin: 0,
                      padding: '0 4px',
                      color: '#D4A843',
                      fontSize: titleSize,
                      letterSpacing: 'clamp(0.06em, 1.5vw, 0.22em)',
                      fontFamily: "'Cinzel', 'Times New Roman', serif",
                      fontWeight: 600,
                      textAlign: 'center',
                      lineHeight: 1.12,
                      textShadow: '0 2px 12px rgba(0,0,0,0.35)',
                    }}
                  >
                    ABIDING ANCHOR
                  </h1>
                  <p
                    style={{
                      margin: 0,
                      padding: '0 8px',
                      color: 'rgba(255,255,255,0.68)',
                      fontSize: taglineSize,
                      letterSpacing: '0.02em',
                      textAlign: 'center',
                      lineHeight: 1.35,
                    }}
                  >
                    Your private space to grow in faith
                  </p>
                </div>

                <article
                  style={{
                    width: '100%',
                    maxWidth: '480px',
                    borderRadius: 'clamp(12px, 3vmin, 16px)',
                    padding: modalPad,
                    boxSizing: 'border-box',
                    background: 'rgba(255,255,255,0.05)',
                    border: '0.5px solid rgba(212,168,67,0.8)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    boxShadow: '0 0 24px rgba(212,168,67,0.18), 0 10px 40px rgba(0,0,0,0.35)',
                    flexShrink: 0,
                  }}
                >
                  <h2
                    style={{
                      margin: '0 0 4px',
                      color: '#D4A843',
                      fontSize: h2Size,
                      textAlign: 'center',
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                    }}
                  >
                    {authView === 'signIn' ? 'Sign In' : 'Create account'}
                  </h2>
                  {authView === 'signIn' ? (
                    <div className="grid w-full" style={{ gap: formGap }}>
                      <form
                        onSubmit={handleSignIn}
                        noValidate
                        className="grid w-full"
                        style={{ gap: formGap }}
                      >
                        <input
                          value={signInEmail}
                          onChange={(e) => setSignInEmail(e.target.value)}
                          placeholder="Email"
                          type="email"
                          className="app-input w-full"
                          style={{
                            borderRadius: '12px',
                            padding: inputPad,
                            fontSize: inputFont,
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
                          value={signInPassword}
                          onChange={(e) => setSignInPassword(e.target.value)}
                          placeholder="Password"
                          type="password"
                          className="app-input w-full"
                          style={{
                            borderRadius: '12px',
                            padding: inputPad,
                            fontSize: inputFont,
                            background: 'rgba(0,0,0,0.15)',
                            color: 'white',
                            border: '0.5px solid rgba(212,175,55,0.4)',
                          }}
                          autoComplete="current-password"
                        />
                        <button
                          type="submit"
                          className="btn-primary w-full"
                          disabled={loading}
                          style={{ padding: inputPad, fontSize: inputFont }}
                        >
                          {loading ? 'Please wait...' : 'Sign In'}
                        </button>
                      </form>
                      <button
                        type="button"
                        className="btn-primary w-full"
                        disabled={loading}
                        onClick={() => {
                          setError('')
                          setSuccess('')
                          setAuthView('signUp')
                        }}
                        style={{ padding: inputPad, fontSize: inputFont }}
                      >
                        Create Free Account
                      </button>
                    </div>
                  ) : (
                    <div className="grid w-full" style={{ gap: formGap }}>
                      <form
                        onSubmit={handleSignUp}
                        noValidate
                        className="grid w-full"
                        style={{ gap: formGap }}
                      >
                        <input
                          value={signUpDisplayName}
                          onChange={(e) => setSignUpDisplayName(e.target.value)}
                          placeholder="Display name"
                          type="text"
                          className="app-input w-full"
                          style={{
                            borderRadius: '12px',
                            padding: inputPad,
                            fontSize: inputFont,
                            background: 'rgba(0,0,0,0.15)',
                            color: 'white',
                            border: '0.5px solid rgba(212,175,55,0.4)',
                          }}
                          autoCapitalize="words"
                          autoCorrect="off"
                          autoComplete="nickname"
                          spellCheck={false}
                        />
                        <input
                          value={signUpEmail}
                          onChange={(e) => setSignUpEmail(e.target.value)}
                          placeholder="Email"
                          type="email"
                          className="app-input w-full"
                          style={{
                            borderRadius: '12px',
                            padding: inputPad,
                            fontSize: inputFont,
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
                          value={signUpPassword}
                          onChange={(e) => setSignUpPassword(e.target.value)}
                          placeholder="Password"
                          type="password"
                          className="app-input w-full"
                          style={{
                            borderRadius: '12px',
                            padding: inputPad,
                            fontSize: inputFont,
                            background: 'rgba(0,0,0,0.15)',
                            color: 'white',
                            border: '0.5px solid rgba(212,175,55,0.4)',
                          }}
                          autoComplete="new-password"
                        />
                        <input
                          value={signUpConfirmPassword}
                          onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                          placeholder="Confirm password"
                          type="password"
                          className="app-input w-full"
                          style={{
                            borderRadius: '12px',
                            padding: inputPad,
                            fontSize: inputFont,
                            background: 'rgba(0,0,0,0.15)',
                            color: 'white',
                            border: '0.5px solid rgba(212,175,55,0.4)',
                          }}
                          autoComplete="new-password"
                        />
                        <button
                          type="submit"
                          className="btn-primary w-full"
                          disabled={loading}
                          style={{ padding: inputPad, fontSize: inputFont }}
                        >
                          {loading ? 'Please wait...' : 'Create account'}
                        </button>
                      </form>
                      <button
                        type="button"
                        className="btn-primary w-full"
                        disabled={loading}
                        onClick={() => {
                          setError('')
                          setSuccess('')
                          setAuthView('signIn')
                        }}
                        style={{
                          padding: inputPad,
                          fontSize: inputFont,
                          background: 'transparent',
                          border: '1px solid rgba(212,175,55,0.45)',
                          color: 'rgba(255,255,255,0.9)',
                        }}
                      >
                        Back to sign in
                      </button>
                    </div>
                  )}

                  {error ? (
                    <p className="mt-3 text-[#ffb3b3] text-sm leading-snug">{error}</p>
                  ) : null}
                  {success ? (
                    <p className="mt-3 text-gold text-sm leading-snug">{success}</p>
                  ) : null}
                </article>

                <div
                  style={{
                    width: '100%',
                    maxWidth: '480px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    flexShrink: 0,
                  }}
                >
                  <p
                    style={{
                      fontSize: verseSize,
                      fontStyle: 'italic',
                      color: 'rgba(255,255,255,0.82)',
                      lineHeight: 1.45,
                      margin: 'clamp(2px, 0.8vmin, 10px) 0 0',
                      padding: '0 6px',
                      textAlign: 'center',
                      opacity,
                      transition: 'opacity 0.45s ease',
                    }}
                  >
                    &ldquo;{verses[currentVerseIndex].text}&rdquo;
                  </p>
                  <p
                    style={{
                      fontSize: refSize,
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
                      gap: 'clamp(4px, 1.2vmin, 8px)',
                      marginTop: 'clamp(4px, 1.2vmin, 10px)',
                    }}
                  >
                    {['Bible Reader', 'Guided Prayers', 'Daily Streak', 'AI Companion'].map(
                      (pill) => (
                        <span
                          key={pill}
                          style={{
                            padding: `${pillPadV} ${pillPadH}`,
                            borderRadius: '999px',
                            background: 'rgba(255,255,255,0.12)',
                            border: '1px solid rgba(255,255,255,0.22)',
                            color: 'rgba(255,255,255,0.88)',
                            fontSize: pillFont,
                            fontWeight: 500,
                            letterSpacing: '0.01em',
                            lineHeight: 1,
                          }}
                        >
                          {pill}
                        </span>
                      ),
                    )}
                  </div>

                  <p
                    style={{
                      margin: 'clamp(4px, 1vmin, 8px) 0 0',
                      color: 'rgba(255,255,255,0.62)',
                      fontSize: freeSize,
                      textAlign: 'center',
                      padding: '0 6px',
                      lineHeight: 1.35,
                    }}
                  >
                    Free forever. Built as a ministry. {'\u{1F64F}'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes authLogoFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
      `}</style>
    </div>
  )
}
