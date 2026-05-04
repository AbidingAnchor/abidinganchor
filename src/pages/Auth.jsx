import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import LoadingScreen from '../components/LoadingScreen'
import { formatAuthErrorMessage } from '../utils/authErrors'
import { supabase } from '../lib/supabase'
import i18n, { LANGUAGE_STORAGE_KEY } from '../i18n'
import { setGuestBrowse } from '../utils/guestBrowse'

const MIN_AUTH_SCALE = 0.58
const AUTH_LANG_OPTIONS = [
  { code: 'en', flag: '🇺🇸', label: 'EN' },
  { code: 'es', flag: '🇪🇸', label: 'ES' },
  { code: 'pt', flag: '🇧🇷', label: 'PT' },
  { code: 'fr', flag: '🇫🇷', label: 'FR' },
  { code: 'de', flag: '🇩🇪', label: 'DE' },
  { code: 'tl', flag: '🇵🇭', label: 'TL' },
  { code: 'ko', flag: '🇰🇷', label: 'KO' },
  { code: 'hi', flag: '🇮🇳', label: 'HI' },
  { code: 'it', flag: '🇮🇹', label: 'IT' },
  { code: 'ru', flag: '🇷🇺', label: 'RU' },
  { code: 'ro', flag: '🇷🇴', label: 'RO' },
  { code: 'zh', flag: '🇨🇳', label: 'ZH' },
]

const FEATURE_ITEMS = [
  { icon: '📖', titleKey: 'auth.pillBibleReader', descKey: 'auth.pillBibleReaderDesc' },
  { icon: '🙏', titleKey: 'auth.pillGuidedPrayers', descKey: 'auth.pillGuidedPrayersDesc' },
  { icon: '🔥', titleKey: 'auth.pillDailyStreak', descKey: 'auth.pillDailyStreakDesc' },
  { icon: '✦', titleKey: 'auth.pillAiCompanion', descKey: 'auth.pillAiCompanionDesc' },
]

const VERSE_ROTATE_MS = 5200
const VERSE_FADE_MS = 520
const VERSE_BLOCK_MIN_HEIGHT = 'clamp(84px, 12dvh, 116px)'

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

export default function Auth() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { user, profile, loading: authLoading, signIn, signUp } = useAuth()
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
  const [verseOpacity, setVerseOpacity] = useState(1)
  const [latestUpdates, setLatestUpdates] = useState([])
  const [showDesktopUpdates, setShowDesktopUpdates] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : false,
  )

  const verses = useMemo(() => {
    const raw = t('auth.verses', { returnObjects: true })
    if (Array.isArray(raw) && raw.length > 0) {
      return raw.map((row) => ({
        text: row?.text ?? '',
        reference: row?.ref ?? row?.reference ?? '',
      }))
    }
    return [
      { text: 'He is like a tree planted by streams of water', reference: 'Psalm 1:3' },
      { text: 'The Lord is my shepherd, I shall not want', reference: 'Psalm 23:1' },
    ]
  }, [t, i18n.language])

  useEffect(() => {
    setCurrentVerseIndex(0)
    setVerseOpacity(1)
  }, [verses])

  useEffect(() => {
    if (verses.length === 0) return undefined
    const interval = setInterval(() => {
      setVerseOpacity(0)
      if (verseSwapTimeoutRef.current) {
        clearTimeout(verseSwapTimeoutRef.current)
      }
      verseSwapTimeoutRef.current = setTimeout(() => {
        setCurrentVerseIndex((prev) => (prev + 1) % verses.length)
        setVerseOpacity(1)
      }, VERSE_FADE_MS)
    }, VERSE_ROTATE_MS)
    return () => {
      clearInterval(interval)
      if (verseSwapTimeoutRef.current) {
        clearTimeout(verseSwapTimeoutRef.current)
        verseSwapTimeoutRef.current = null
      }
    }
  }, [verses.length])

  useEffect(() => {
    let active = true
    const loadUpdates = async () => {
      try {
        const { data, error } = await supabase
          .from('app_updates')
          .select('id, version, title, features, created_at')
          .order('created_at', { ascending: false })
          .limit(3)
        if (error) throw error
        if (active) setLatestUpdates(data || [])
      } catch {
        if (active) setLatestUpdates([])
      }
    }
    loadUpdates()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const onResize = () => setShowDesktopUpdates(window.innerWidth >= 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

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
    html.style.backgroundColor = '#010409'
    body.style.backgroundColor = '#010409'
    return () => {
      html.style.overflow = prevHtmlOverflow
      body.style.overflow = prevBodyOverflow
      body.style.overscrollBehavior = prevBodyOverscroll
      html.style.overscrollBehavior = prevHtmlOverscroll
      html.style.backgroundColor = prevHtmlBg
      body.style.backgroundColor = prevBodyBg
    }
  }, [])

  const outerFitRef = useRef(null)
  const innerFitRef = useRef(null)
  const [fit, setFit] = useState({ scale: 1, clipPx: null })
  const verseSwapTimeoutRef = useRef(null)

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
    i18n.language,
  ])

  if (user) {
    if (authLoading) return <LoadingScreen />
    const onboarded = profile?.onboarding_complete === true
    return <Navigate to={onboarded ? '/' : '/onboarding'} replace />
  }

  const cleanSignInEmail = signInEmail.trim().toLowerCase()
  const cleanSignUpEmail = signUpEmail.trim().toLowerCase()
  const activeLanguage = (i18n.resolvedLanguage || i18n.language || 'en').slice(0, 2)

  const setLanguage = async (code) => {
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, code)
    } catch {
      /* ignore */
    }
    await i18n.changeLanguage(code)
  }

  const handleContinueGuest = () => {
    setGuestBrowse(true)
    navigate('/read')
  }

  const handleSignIn = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    if (!cleanSignInEmail) return setError(t('auth.errors.emailRequired'))
    if (!isValidEmail(cleanSignInEmail)) return setError(t('auth.errors.emailInvalid'))
    if (!signInPassword.trim()) return setError(t('auth.errors.passwordRequired'))
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
    if (!name) return setError(t('auth.errors.displayNameRequired'))
    if (!cleanSignUpEmail) return setError(t('auth.errors.emailRequired'))
    if (!isValidEmail(cleanSignUpEmail)) return setError(t('auth.errors.emailInvalid'))
    if (!signUpPassword.trim()) return setError(t('auth.errors.passwordRequired'))
    if (signUpPassword.length < 6) return setError(t('auth.errors.passwordTooShort'))
    if (signUpPassword !== signUpConfirmPassword) {
      return setError(t('auth.errors.passwordMismatch'))
    }
    if (name.toLowerCase() === cleanSignUpEmail) {
      return setError(t('auth.errors.displayNameEmail'))
    }
    if (name.includes('@')) {
      return setError(t('auth.errors.displayNameLooksEmail'))
    }
    setLoading(true)
    const { error: signUpError } = await signUp(cleanSignUpEmail, signUpPassword, name)
    if (signUpError) setError(formatAuthErrorMessage(signUpError))
    else {
      setSuccess(t('auth.confirmationSent'))
    }
    setLoading(false)
  }

  const pad = 'max(8px, env(safe-area-inset-top, 0px)) max(12px, env(safe-area-inset-right, 0px)) max(8px, env(safe-area-inset-bottom, 0px)) max(12px, env(safe-area-inset-left, 0px))'
  const gapCol = 'clamp(6px, 1.6vmin, 14px)'
  const logoSize = 'clamp(72px, min(24vw, 20dvh), 200px)'
  const titleSize = 'clamp(0.85rem, 4.2vmin, 2.25rem)'
  const taglineSize = 'clamp(11px, 2.8vmin, 14px)'
  const modalPad = 'clamp(14px, 3.5vmin, 28px)'
  const h2Size = 'clamp(1.05rem, 3.8vmin, 1.5rem)'
  const formGap = 'clamp(8px, 2.2vmin, 16px)'
  const verseSize = 'clamp(11px, 3vmin, 14px)'
  const refSize = 'clamp(10px, 2.6vmin, 12px)'
  const freeSize = 'clamp(10px, 2.6vmin, 12px)'
  const socialSize = 'clamp(12px, 3vmin, 14px)'

  const isScaled = fit.clipPx != null && fit.scale < 1
  const verseRow = verses[currentVerseIndex] || { text: '', reference: '' }

  const glassCard = {
    width: '100%',
    maxWidth: '480px',
    borderRadius: '20px',
    padding: modalPad,
    boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(212,168,67,0.2)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    flexShrink: 0,
  }

  const authInputStyle = {
    width: '100%',
    boxSizing: 'border-box',
    borderRadius: '12px',
    padding: '14px 16px',
    fontSize: '15px',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'white',
  }

  const authBtnPrimary = {
    width: '100%',
    borderRadius: '50px',
    background: '#D4A843',
    color: '#0a1428',
    fontWeight: 700,
    padding: '14px 20px',
    fontSize: '15px',
    border: 'none',
    cursor: 'pointer',
  }

  const authBtnSecondary = {
    width: '100%',
    borderRadius: '50px',
    background: 'transparent',
    border: '2px solid #D4A843',
    color: '#D4A843',
    fontWeight: 700,
    padding: '14px 20px',
    fontSize: '15px',
    cursor: 'pointer',
  }

  const authBtnGuest = {
    width: '100%',
    borderRadius: '50px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.15)',
    color: 'rgba(255,255,255,0.7)',
    fontWeight: 600,
    padding: '14px 20px',
    fontSize: '15px',
    cursor: 'pointer',
  }

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
                {/* Brand + language */}
                <div
                  style={{
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    gap: 'clamp(4px, 1.2vmin, 10px)',
                    flexShrink: 0,
                  }}
                >
                  <img
                    src="/Logo.png"
                    alt={t('auth.logoAlt')}
                    className="auth-logo-glow"
                    style={{
                      width: logoSize,
                      height: logoSize,
                      maxWidth: '100%',
                      objectFit: 'contain',
                      flexShrink: 0,
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
                    {t('auth.brandTitle')}
                  </h1>
                  <p
                    style={{
                      margin: 0,
                      padding: '0 10px',
                      color: 'rgba(255,255,255,0.72)',
                      fontSize: taglineSize,
                      letterSpacing: '0.03em',
                      textAlign: 'center',
                      lineHeight: 1.45,
                      maxWidth: '34em',
                    }}
                  >
                    {t('auth.tagline')}
                  </p>
                  <div
                    role="group"
                    aria-label={i18n.t('settings.uiLanguage', { defaultValue: 'App language' })}
                    style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '4px' }}
                  >
                    {AUTH_LANG_OPTIONS.map((opt) => {
                      const active = activeLanguage === opt.code
                      return (
                        <button
                          key={opt.code}
                          type="button"
                          onClick={() => setLanguage(opt.code)}
                          style={{
                            borderRadius: '999px',
                            border: active ? '1px solid #D4A843' : '1px solid rgba(255,255,255,0.22)',
                            background: active ? 'rgba(212,168,67,0.22)' : 'rgba(255,255,255,0.08)',
                            color: 'white',
                            padding: '5px 10px',
                            fontSize: '11px',
                            cursor: 'pointer',
                            fontWeight: active ? 700 : 500,
                          }}
                        >
                          {opt.flag} {opt.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Feature highlights — above sign-in */}
                <div
                  style={{
                    width: '100%',
                    maxWidth: '480px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: '10px',
                    flexShrink: 0,
                  }}
                >
                  {FEATURE_ITEMS.map((item) => (
                    <div
                      key={item.titleKey}
                      style={{
                        borderRadius: '16px',
                        padding: '16px',
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(212,168,67,0.2)',
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)',
                        textAlign: 'left',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        minHeight: '96px',
                      }}
                    >
                      <div
                        aria-hidden
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          background: 'rgba(212,168,67,0.1)',
                          border: '1px solid rgba(212,168,67,0.25)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '18px',
                          flexShrink: 0,
                        }}
                      >
                        {item.icon}
                      </div>
                      <span
                        style={{
                          color: '#ffffff',
                          fontWeight: 700,
                          fontSize: '14px',
                          lineHeight: 1.25,
                          marginTop: '10px',
                        }}
                      >
                        {t(item.titleKey)}
                      </span>
                      <span
                        style={{
                          color: 'rgba(255,255,255,0.5)',
                          fontSize: '12px',
                          lineHeight: 1.35,
                          marginTop: '4px',
                        }}
                      >
                        {t(item.descKey)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Social proof */}
                <p
                  style={{
                    margin: 0,
                    padding: '0 12px',
                    color: 'rgba(255,230,180,0.95)',
                    fontSize: socialSize,
                    fontWeight: 600,
                    letterSpacing: '0.04em',
                    textAlign: 'center',
                    textShadow: '0 1px 8px rgba(0,0,0,0.35)',
                  }}
                >
                  {t('auth.socialProof')}
                </p>

                {/* Glass sign-in card */}
                <article style={glassCard}>
                  <h2
                    style={{
                      margin: '0 0 8px',
                      color: '#D4A843',
                      fontSize: h2Size,
                      textAlign: 'center',
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                    }}
                  >
                    {authView === 'signIn' ? t('auth.signIn') : t('auth.createAccount')}
                  </h2>
                  {authView === 'signIn' ? (
                    <div className="grid w-full" style={{ gap: formGap }}>
                      <form onSubmit={handleSignIn} noValidate className="grid w-full" style={{ gap: formGap }}>
                        <input
                          value={signInEmail}
                          onChange={(e) => setSignInEmail(e.target.value)}
                          placeholder={t('auth.email')}
                          type="email"
                          className="app-input auth-input-auth-page w-full"
                          style={authInputStyle}
                          autoCapitalize="none"
                          autoCorrect="off"
                          autoComplete="email"
                          spellCheck={false}
                        />
                        <input
                          value={signInPassword}
                          onChange={(e) => setSignInPassword(e.target.value)}
                          placeholder={t('auth.password')}
                          type="password"
                          className="app-input auth-input-auth-page w-full"
                          style={authInputStyle}
                          autoComplete="current-password"
                        />
                        <button
                          type="submit"
                          disabled={loading}
                          style={{
                            ...authBtnPrimary,
                            ...(loading ? { opacity: 0.6, cursor: 'not-allowed' } : {}),
                          }}
                        >
                          {loading ? t('auth.pleaseWait') : t('auth.signIn')}
                        </button>
                      </form>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => {
                          setError('')
                          setSuccess('')
                          setAuthView('signUp')
                        }}
                        style={{
                          ...authBtnSecondary,
                          ...(loading ? { opacity: 0.6, cursor: 'not-allowed' } : {}),
                        }}
                      >
                        {t('auth.createFreeAccount')}
                      </button>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={handleContinueGuest}
                        style={{
                          ...authBtnGuest,
                          ...(loading ? { opacity: 0.6, cursor: 'not-allowed' } : {}),
                        }}
                      >
                        {t('auth.continueAsGuest')}
                      </button>
                      <p
                        style={{
                          margin: 0,
                          textAlign: 'center',
                          color: 'rgba(255,255,255,0.55)',
                          fontSize: 'clamp(10px, 2.6vmin, 12px)',
                          lineHeight: 1.4,
                        }}
                      >
                        {t('auth.continueAsGuestHint')}
                      </p>
                    </div>
                  ) : (
                    <div className="grid w-full" style={{ gap: formGap }}>
                      <form onSubmit={handleSignUp} noValidate className="grid w-full" style={{ gap: formGap }}>
                        <input
                          value={signUpDisplayName}
                          onChange={(e) => setSignUpDisplayName(e.target.value)}
                          placeholder={t('auth.displayName')}
                          type="text"
                          className="app-input auth-input-auth-page w-full"
                          style={authInputStyle}
                          autoCapitalize="words"
                          autoCorrect="off"
                          autoComplete="nickname"
                          spellCheck={false}
                        />
                        <input
                          value={signUpEmail}
                          onChange={(e) => setSignUpEmail(e.target.value)}
                          placeholder={t('auth.email')}
                          type="email"
                          className="app-input auth-input-auth-page w-full"
                          style={authInputStyle}
                          autoCapitalize="none"
                          autoCorrect="off"
                          autoComplete="email"
                          spellCheck={false}
                        />
                        <input
                          value={signUpPassword}
                          onChange={(e) => setSignUpPassword(e.target.value)}
                          placeholder={t('auth.password')}
                          type="password"
                          className="app-input auth-input-auth-page w-full"
                          style={authInputStyle}
                          autoComplete="new-password"
                        />
                        <input
                          value={signUpConfirmPassword}
                          onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                          placeholder={t('auth.confirmPassword')}
                          type="password"
                          className="app-input auth-input-auth-page w-full"
                          style={authInputStyle}
                          autoComplete="new-password"
                        />
                        <button
                          type="submit"
                          disabled={loading}
                          style={{
                            ...authBtnPrimary,
                            ...(loading ? { opacity: 0.6, cursor: 'not-allowed' } : {}),
                          }}
                        >
                          {loading ? t('auth.pleaseWait') : t('auth.createAccount')}
                        </button>
                      </form>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => {
                          setError('')
                          setSuccess('')
                          setAuthView('signIn')
                        }}
                        style={{
                          ...authBtnSecondary,
                          ...(loading ? { opacity: 0.6, cursor: 'not-allowed' } : {}),
                        }}
                      >
                        {t('auth.backToSignIn')}
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

                {/* Rotating verses — above What's New (footer sits under transparent auth layer) */}
                <div
                  style={{
                    width: '100%',
                    maxWidth: '480px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    flexShrink: 0,
                    marginTop: 'clamp(6px, 1.5vmin, 14px)',
                  }}
                >
                  <div
                    style={{
                      minHeight: VERSE_BLOCK_MIN_HEIGHT,
                      width: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <p
                      style={{
                        fontSize: verseSize,
                        fontStyle: 'italic',
                        color: 'rgba(255,255,255,0.88)',
                        lineHeight: 1.5,
                        margin: 0,
                        padding: '0 8px',
                        textAlign: 'center',
                        opacity: verseOpacity,
                        transition: `opacity ${VERSE_FADE_MS}ms ease-in-out`,
                        maxWidth: '36em',
                      }}
                    >
                      &ldquo;{verseRow.text}&rdquo;
                    </p>
                    <p
                      style={{
                        fontSize: refSize,
                        color: 'rgba(212,168,67,0.95)',
                        margin: '6px 0 0',
                        letterSpacing: '0.06em',
                        textAlign: 'center',
                        opacity: verseOpacity,
                        transition: `opacity ${VERSE_FADE_MS}ms ease-in-out`,
                        fontWeight: 600,
                      }}
                    >
                      {verseRow.reference}
                    </p>
                  </div>

                  <p
                    style={{
                      margin: 'clamp(8px, 1.4vmin, 14px) 0 0',
                      color: 'rgba(255,255,255,0.62)',
                      fontSize: freeSize,
                      textAlign: 'center',
                      padding: '0 8px',
                      lineHeight: 1.45,
                    }}
                  >
                    {t('auth.freeForever')} {'\u{1F64F}'}
                  </p>
                </div>

                {/* Reserve vertical space so fixed footer does not cover verse / What's New */}
                <div
                  aria-hidden
                  style={{
                    flexShrink: 0,
                    width: '100%',
                    minHeight: 'clamp(120px, 26dvh, 200px)',
                    height: 'clamp(120px, 26dvh, 200px)',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes authLogoFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes authLogoGlowPulse {
          0%, 100% {
            filter: drop-shadow(0 0 14px rgba(212, 168, 67, 0.5))
              drop-shadow(0 0 32px rgba(212, 168, 67, 0.22));
          }
          50% {
            filter: drop-shadow(0 0 22px rgba(212, 168, 67, 0.85))
              drop-shadow(0 0 48px rgba(212, 168, 67, 0.4));
          }
        }
        .auth-logo-glow {
          animation:
            authLogoFloat 5s ease-in-out infinite,
            authLogoGlowPulse 3.2s ease-in-out infinite;
        }
        .auth-input-auth-page:focus {
          border: 1px solid rgba(212, 168, 67, 0.5) !important;
          outline: none;
        }
      `}</style>
    </div>
  )
}
