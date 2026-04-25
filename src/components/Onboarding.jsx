import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { fetchVerse } from '../utils/bibleTranslation'
import { useThemeBackgroundType } from '../hooks/useThemeBackgroundType'
import { supabase } from '../lib/supabase'
import { userStorageKey } from '../utils/userStorage'
import { initialDisplayNameFromAuth } from '../utils/profileDisplay'

function isAtLeast13FromDobString(dobYmd) {
  if (!dobYmd || typeof dobYmd !== 'string') return false
  const parts = dobYmd.split('-').map((x) => parseInt(x, 10))
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return false
  const [y, m, d] = parts
  const birth = new Date(y, m - 1, d)
  if (!Number.isFinite(birth.getTime())) return false
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const mo = today.getMonth() - birth.getMonth()
  if (mo < 0 || (mo === 0 && today.getDate() < birth.getDate())) age -= 1
  return age >= 13
}

const GROWTH_GOALS = [
  { id: 'prayer', icon: '🙏', labelKey: 'goalPrayer' },
  { id: 'bible', icon: '📖', labelKey: 'goalBible' },
  { id: 'discipline', icon: '💪', labelKey: 'goalDiscipline' },
  { id: 'identity', icon: '🆔', labelKey: 'goalIdentity' },
  { id: 'warfare', icon: '⚔️', labelKey: 'goalWarfare' },
  { id: 'discipleship', icon: '🤝', labelKey: 'goalDiscipleship' },
]

const FAITH_DURATIONS = [
  { id: 'new', icon: '🌱', labelKey: 'faithNew' },
  { id: 'less_than_2', icon: '📖', labelKey: 'faithLessThan2' },
  { id: '2_to_10', icon: '✝️', labelKey: 'faith2to10' },
  { id: '10_plus', icon: '👑', labelKey: 'faith10plus' },
]

const DAILY_COMMITMENTS = [
  { id: 'quick', labelKey: 'commitQuick', descriptionKey: 'commitQuickDesc' },
  { id: 'standard', labelKey: 'commitStandard', descriptionKey: 'commitStandardDesc' },
  { id: 'deep', labelKey: 'commitDeep', descriptionKey: 'commitDeepDesc' },
]

const APP_TOUR_FEATURES = [
  { icon: '📖', titleKey: 'featureBibleTitle', descriptionKey: 'featureBibleDesc' },
  { icon: '🙏', titleKey: 'featurePrayerTitle', descriptionKey: 'featurePrayerDesc' },
  { icon: '🧭', titleKey: 'featureJourneyTitle', descriptionKey: 'featureJourneyDesc' },
  { icon: '📓', titleKey: 'featureJournalTitle', descriptionKey: 'featureJournalDesc' },
  { icon: '👥', titleKey: 'featureCommunityTitle', descriptionKey: 'featureCommunityDesc' },
]

const ONBOARDING_STEP_KEY = 'onboarding-step'
const ONBOARDING_COMPLETED_KEY = 'onboarding_completed'
const TOTAL_STEPS = 7

function readStoredStep(userId) {
  if (!userId || typeof window === 'undefined') return 1
  try {
    const raw = sessionStorage.getItem(userStorageKey(userId, ONBOARDING_STEP_KEY))
    const n = parseInt(raw, 10)
    return Number.isFinite(n) && n >= 1 && n <= 7 ? n : 1
  } catch {
    return 1
  }
}

export default function Onboarding({ onComplete }) {
  const { t } = useTranslation()
  const { user, profile, refreshProfile } = useAuth()
  const themeSky = useThemeBackgroundType()
  const [screen, setScreen] = useState(() => readStoredStep(user?.id))

  useEffect(() => {
    if (!user?.id) return
    try {
      sessionStorage.setItem(userStorageKey(user.id, ONBOARDING_STEP_KEY), String(screen))
    } catch {
      /* ignore */
    }
  }, [user?.id, screen])
  const [displayName, setDisplayName] = useState(() => initialDisplayNameFromAuth(user, profile))
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [ageConfirmed, setAgeConfirmed] = useState(false)
  const [selectedGoals, setSelectedGoals] = useState([])
  const [faithDuration, setFaithDuration] = useState('')
  const [dailyCommitment, setDailyCommitment] = useState('')
  const [formError, setFormError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const [fadeIn, setFadeIn] = useState(false)
  const [onboardingVerseText, setOnboardingVerseText] = useState('')
  const [onboardingVerseLoading, setOnboardingVerseLoading] = useState(true)

  useEffect(() => {
    const id = requestAnimationFrame(() => setFadeIn(true))
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    const loadOnboardingVerse = async () => {
      setOnboardingVerseLoading(true)
      try {
        const text = await fetchVerse(43, 15, 4, 'en')
        setOnboardingVerseText(text)
      } catch {
        setOnboardingVerseText('Abide in me, and I in you')
      } finally {
        setOnboardingVerseLoading(false)
      }
    }

    loadOnboardingVerse()
  }, [])

  useEffect(() => {
    // Keep onboarding blocking: browser back should not dismiss this flow.
    window.history.pushState({ onboarding: true }, '', window.location.href)
    const onPopState = () => {
      window.history.pushState({ onboarding: true }, '', window.location.href)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const canContinueProfile = useMemo(() => {
    const cleanName = displayName.trim()
    if (!cleanName) return false
    if (!dateOfBirth) return false
    if (!isAtLeast13FromDobString(dateOfBirth)) return false
    if (!ageConfirmed) return false
    return true
  }, [displayName, dateOfBirth, ageConfirmed])

  const onboardingTheme = useMemo(() => {
    const sky = themeSky
    if (sky === 'day') {
      return {
        mode: 'day',
        cardBg: 'rgba(245,237,214,0.85)',
        cardBorder: '1px solid rgba(122, 98, 55, 0.30)',
        cardText: '#2B2115',
        mutedText: 'rgba(43,33,21,0.72)',
        subtleText: 'rgba(43,33,21,0.58)',
        optionBg: 'rgba(255,255,255,0.5)',
        optionBorder: '1px solid rgba(122, 98, 55, 0.22)',
      }
    }
    if (sky === 'sunset') {
      return {
        mode: 'evening',
        cardBg: 'rgba(82,57,104,0.78)',
        cardBorder: '1px solid rgba(222,168,92,0.40)',
        cardText: '#F8F2E8',
        mutedText: 'rgba(248,242,232,0.82)',
        subtleText: 'rgba(248,242,232,0.68)',
        optionBg: 'rgba(255,198,122,0.12)',
        optionBorder: '1px solid rgba(255,210,150,0.24)',
      }
    }
    return {
      mode: 'night',
      cardBg: 'rgba(255,255,255,0.07)',
      cardBorder: '1px solid rgba(255,255,255,0.10)',
      cardText: '#FFFFFF',
      mutedText: 'rgba(255,255,255,0.82)',
      subtleText: 'rgba(255,255,255,0.62)',
      optionBg: 'rgba(255,255,255,0.05)',
      optionBorder: '1px solid rgba(255,255,255,0.10)',
    }
  }, [themeSky])

  const toggleGoal = (goalId) => {
    setSelectedGoals(prev => 
      (prev || []).includes(goalId) 
        ? (prev || []).filter(id => id !== goalId)
        : [...(prev || []), goalId]
    )
  }

  const getRecommendations = () => {
    // Simple recommendation logic
    if (selectedGoals.includes('prayer') && selectedGoals.includes('bible')) {
      return {
        path: t('onboarding.pathPrayerScripture'),
        readingPlan: t('onboarding.planPsalms'),
        studyDepth: t('onboarding.depthBalanced')
      }
    }
    if (selectedGoals.includes('discipline')) {
      return {
        path: t('onboarding.pathDisciplines'),
        readingPlan: t('onboarding.planNTLetters'),
        studyDepth: t('onboarding.depthDeep')
      }
    }
    if (selectedGoals.includes('identity')) {
      return {
        path: t('onboarding.pathIdentity'),
        readingPlan: t('onboarding.planRomans'),
        studyDepth: t('onboarding.depthReflective')
      }
    }
    return {
      path: t('onboarding.pathFoundations'),
      readingPlan: t('onboarding.planGospels'),
      studyDepth: t('onboarding.depthStandard')
    }
  }

  const completeOnboarding = async () => {
    if (isCompleting) return
    setIsCompleting(true)
    setLoading(true)
    setFormError('')
    let saveSucceeded = false
    try {
      if (user?.id) {
        try {
          sessionStorage.removeItem(userStorageKey(user.id, ONBOARDING_STEP_KEY))
        } catch {
          /* ignore */
        }
      }

      if (user?.id) {
        const trimmed = displayName.trim()
        if (!trimmed || !dateOfBirth || !isAtLeast13FromDobString(dateOfBirth) || !ageConfirmed) {
          setFormError('Please complete all required profile fields before finishing.')
          setLoading(false)
          return
        }

        const { error } = await supabase
          .from('profiles')
          .update({
            onboarding_completed: true,
            onboarding_complete: true
          })
          .eq('id', user.id)

        if (error) {
          console.error('Onboarding update error:', error)
          throw error
        }

        try {
          localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true')
        } catch {
          /* ignore */
        }
        await refreshProfile()
        saveSucceeded = true
      } else {
        setFormError('You must be signed in to complete onboarding.')
      }
    } catch (error) {
      console.error('Onboarding save error:', error)
      setFormError('We could not save your onboarding yet. Please try again.')
    }
    setLoading(false)
    setIsCompleting(false)
    if (saveSucceeded) {
      onComplete?.()
    }
  }

  const handleAdvance = async () => {
    if (screen === TOTAL_STEPS) {
      await completeOnboarding()
      return
    }
    setScreen((prev) => Math.min(TOTAL_STEPS, prev + 1))
  }

  return (
    <>
      <div
        className="onboarding-root-fade"
        style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100dvh',
        width: '100%',
        boxSizing: 'border-box',
        paddingTop: 'max(16px, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(16px, env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'max(16px, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(16px, env(safe-area-inset-right, 0px))',
        background: 'transparent',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        opacity: fadeIn ? 1 : 0,
        transition: 'opacity 150ms ease-out',
        pointerEvents: 'auto',
      }}
      >
        <div style={{
          maxWidth: '480px',
          width: '100%',
          textAlign: 'center',
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          flexShrink: 0,
          margin: 0,
          background: onboardingTheme.cardBg,
          border: onboardingTheme.cardBorder,
          borderRadius: '20px',
          padding: screen > 1 ? '56px 18px 20px' : '20px 18px',
          boxShadow: onboardingTheme.mode === 'day'
            ? '0 12px 40px rgba(85, 62, 22, 0.14)'
            : '0 14px 45px rgba(0,0,0,0.35)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}>
          {screen > 1 ? (
            <button
              type="button"
              aria-label="Previous step"
              onClick={() => setScreen((s) => Math.max(1, s - 1))}
              style={{
                position: 'absolute',
                left: '10px',
                top: '10px',
                zIndex: 12,
                minWidth: '44px',
                minHeight: '44px',
                width: '44px',
                height: '44px',
                padding: 0,
                margin: 0,
                border: 'none',
                borderRadius: '12px',
                background: 'rgba(212, 175, 55, 0.14)',
                color: '#D4AF37',
                fontSize: '22px',
                lineHeight: 1,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 1px 0 rgba(0,0,0,0.06)',
              }}
            >
              <span aria-hidden style={{ transform: 'translateX(-1px)', display: 'block' }}>←</span>
            </button>
          ) : null}
          {/* Progress Dots */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '8px',
            marginBottom: '40px',
          }}>
            {[1, 2, 3, 4, 5, 6, 7].map((s) => (
              <div
                key={s}
                style={{
                  width: screen === s ? '24px' : '8px',
                  height: '8px',
                  borderRadius: screen === s ? '20px' : '50%',
                  background: screen === s ? '#D4A843' : onboardingTheme.optionBg,
                  transition: 'all 0.3s ease'
                }}
              />
            ))}
          </div>

          {/* Screen 1 - Welcome */}
          {screen === 1 && (
            <div>
              <img
                src="/NewLogo.png"
                alt="AbidingAnchor"
                style={{
                  width: '80px',
                  height: '80px',
                  objectFit: 'contain',
                  margin: '0 auto 24px',
                  display: 'block',
                  borderRadius: '20px',
                  boxShadow: '0 0 40px rgba(212,168,67,0.3)'
                }}
              />
              <h1 style={{
                color: onboardingTheme.cardText,
                fontSize: '24px',
                fontWeight: 700,
                marginBottom: '12px'
              }}>
                {t('onboarding.welcomeTitle')}
              </h1>
              <p style={{
                color: onboardingTheme.subtleText,
                fontSize: '13px',
                marginBottom: '8px'
              }}>
                {t('onboarding.welcomeSubtitle')}
              </p>
              <p style={{
                color: onboardingTheme.mode === 'day' ? 'rgba(118,82,34,0.75)' : 'rgba(212,168,67,0.82)',
                fontSize: '11px',
                fontStyle: 'italic',
                marginBottom: '32px'
              }}>
                {onboardingVerseLoading ? 'Abide in me, and I in you — John 15:4' : `${onboardingVerseText} — John 15:4`}
              </p>
                <button
                type="button"
                  onClick={() => {
                    setFormError('')
                    setScreen(2)
                  }}
                style={{
                  background: '#D4A843',
                  color: '#060f26',
                  border: 'none',
                  borderRadius: '16px',
                  padding: '16px',
                  fontSize: '16px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  width: '100%'
                }}
              >
                {t('onboarding.beginJourney')}
              </button>
            </div>
          )}

          {/* Screen 2 - Profile */}
          {screen === 2 && (
            <div style={{ width: '100%' }}>
              <p style={{
                color: '#D4A843',
                fontSize: '9px',
                fontWeight: 600,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                marginBottom: '8px'
              }}>
                {t('onboarding.step1of5')}
              </p>
              <h2 style={{
                color: onboardingTheme.cardText,
                fontSize: '22px',
                fontWeight: 700,
                marginBottom: '24px'
              }}>
                {t('onboarding.tellUsAboutYou')}
              </h2>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                marginBottom: 0,
                textAlign: 'left',
              }}>
                <label style={{ color: onboardingTheme.mutedText, fontSize: '13px', fontWeight: 600 }}>
                  {t('onboarding.displayName')}
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => {
                      setDisplayName(e.target.value)
                      if (formError) setFormError('')
                    }}
                    placeholder={t('onboarding.displayNamePlaceholder')}
                    style={{
                      marginTop: '6px',
                      width: '100%',
                      borderRadius: '12px',
                      border: onboardingTheme.optionBorder,
                      background: onboardingTheme.optionBg,
                      color: onboardingTheme.cardText,
                      fontSize: '15px',
                      padding: '12px 14px',
                      boxSizing: 'border-box',
                    }}
                  />
                </label>
                <label style={{ color: onboardingTheme.mutedText, fontSize: '13px', fontWeight: 600 }}>
                  {t('onboarding.dateOfBirth')}
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => {
                      setDateOfBirth(e.target.value)
                      if (formError) setFormError('')
                    }}
                    max={new Date().toISOString().slice(0, 10)}
                    style={{
                      marginTop: '6px',
                      width: '100%',
                      borderRadius: '12px',
                      border: onboardingTheme.optionBorder,
                      background: onboardingTheme.optionBg,
                      color: onboardingTheme.cardText,
                      fontSize: '15px',
                      padding: '12px 14px',
                      boxSizing: 'border-box',
                    }}
                  />
                </label>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    marginTop: '4px',
                    cursor: 'pointer',
                    color: onboardingTheme.mutedText,
                    fontSize: '13px',
                    fontWeight: 600,
                    textAlign: 'left',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={ageConfirmed}
                    onChange={(e) => {
                      setAgeConfirmed(e.target.checked)
                      if (formError) setFormError('')
                    }}
                    style={{ marginTop: '2px', width: '18px', height: '18px', flexShrink: 0 }}
                  />
                  <span>{t('onboarding.ageConfirm')}</span>
                </label>
              </div>
              {formError ? (
                <p style={{ marginTop: '10px', color: '#ffb3b3', fontSize: '13px' }}>{formError}</p>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  const name = displayName.trim()
                  if (!name) {
                    setFormError(t('onboarding.displayNameRequired'))
                    return
                  }
                  if (!dateOfBirth) {
                    setFormError(t('onboarding.dateOfBirthRequired'))
                    return
                  }
                  if (!isAtLeast13FromDobString(dateOfBirth)) {
                    setFormError(t('onboarding.ageRequired'))
                    return
                  }
                  if (!ageConfirmed) {
                    setFormError(t('onboarding.ageConfirmRequired'))
                    return
                  }
                  setFormError('')
                  setScreen(3)
                }}
                style={{
                  marginTop: '16px',
                  background: '#D4A843',
                  color: '#060f26',
                  border: 'none',
                  borderRadius: '16px',
                  padding: '16px',
                  fontSize: '16px',
                  fontWeight: 700,
                  cursor: canContinueProfile ? 'pointer' : 'not-allowed',
                  opacity: canContinueProfile ? 1 : 0.7,
                  width: '100%'
                }}
              >
                {t('onboarding.continue')}
              </button>
            </div>
          )}

          {/* Screen 3 - Growth Goals */}
          {screen === 3 && (
            <div style={{ width: '100%' }}>
              <p style={{
                color: '#D4A843',
                fontSize: '9px',
                fontWeight: 600,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                marginBottom: '8px'
              }}>
                {t('onboarding.step2of5')}
              </p>
              <h2 style={{
                color: onboardingTheme.cardText,
                fontSize: '22px',
                fontWeight: 700,
                marginBottom: '24px'
              }}>
                {t('onboarding.whatToGrowIn')}
              </h2>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '12px',
                marginBottom: 0
              }}>
                {GROWTH_GOALS.map((goal) => {
                  const sel = selectedGoals.includes(goal.id)
                  return (
                  <button
                    key={goal.id}
                    type="button"
                    onClick={() => toggleGoal(goal.id)}
                    className={sel ? '' : 'glass-panel'}
                    style={{
                      ...(sel
                        ? {
                            background: 'rgba(212,168,67,0.15)',
                            border: '1px solid #D4A843',
                            color: '#D4A843',
                            backdropFilter: 'none',
                            WebkitBackdropFilter: 'none',
                          }
                        : {
                            border: onboardingTheme.optionBorder,
                            color: onboardingTheme.cardText,
                          }),
                      borderRadius: '14px',
                      padding: '12px 16px',
                      fontSize: '15px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {goal.icon} {t(`onboarding.${goal.labelKey}`)}
                  </button>
                  )
                })}
              </div>
              {selectedGoals.length > 0 && (
                <button
                  type="button"
                  onClick={() => setScreen(4)}
                  style={{
                    marginTop: '16px',
                    background: '#D4A843',
                    color: '#060f26',
                    border: 'none',
                    borderRadius: '16px',
                    padding: '16px',
                    fontSize: '16px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    width: '100%'
                  }}
                >
                  {t('onboarding.continue')}
                </button>
              )}
            </div>
          )}

          {/* Screen 4 - Faith Duration */}
          {screen === 4 && (
            <div style={{ width: '100%' }}>
              <p style={{
                color: '#D4A843',
                fontSize: '9px',
                fontWeight: 600,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                marginBottom: '8px'
              }}>
                {t('onboarding.step3of5')}
              </p>
              <h2 style={{
                color: onboardingTheme.cardText,
                fontSize: '22px',
                fontWeight: 700,
                marginBottom: '24px'
              }}>
                {t('onboarding.howLongBeliever')}
              </h2>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                marginBottom: 0
              }}>
                {FAITH_DURATIONS.map((duration) => {
                  const sel = faithDuration === duration.id
                  return (
                  <button
                    key={duration.id}
                    type="button"
                    onClick={() => setFaithDuration(duration.id)}
                    className={sel ? '' : 'glass-panel'}
                    style={{
                      ...(sel
                        ? {
                            background: 'rgba(212,168,67,0.08)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderLeft: '3px solid #D4A843',
                            color: '#D4A843',
                            backdropFilter: 'none',
                            WebkitBackdropFilter: 'none',
                          }
                        : {
                            border: onboardingTheme.optionBorder,
                            color: onboardingTheme.cardText,
                          }),
                      borderRadius: '14px',
                      padding: '16px 20px',
                      fontSize: '16px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      textAlign: 'left'
                    }}
                  >
                    {duration.icon} {t(`onboarding.${duration.labelKey}`)}
                  </button>
                  )
                })}
              </div>
              {faithDuration && (
                <button
                  type="button"
                  onClick={() => setScreen(5)}
                  style={{
                    marginTop: '16px',
                    background: '#D4A843',
                    color: '#060f26',
                    border: 'none',
                    borderRadius: '16px',
                    padding: '16px',
                    fontSize: '16px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    width: '100%'
                  }}
                >
                  {t('onboarding.continue')}
                </button>
              )}
            </div>
          )}

          {/* Screen 5 - Daily Commitment */}
          {screen === 5 && (
            <div style={{ width: '100%' }}>
              <p style={{
                color: '#D4A843',
                fontSize: '9px',
                fontWeight: 600,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                marginBottom: '8px'
              }}>
                {t('onboarding.step4of5')}
              </p>
              <h2 style={{
                color: onboardingTheme.cardText,
                fontSize: '22px',
                fontWeight: 700,
                marginBottom: '24px'
              }}>
                {t('onboarding.howMuchTime')}
              </h2>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                marginBottom: 0
              }}>
                {DAILY_COMMITMENTS.map((commitment) => {
                  const sel = dailyCommitment === commitment.id
                  return (
                  <button
                    key={commitment.id}
                    type="button"
                    onClick={() => setDailyCommitment(commitment.id)}
                    className={sel ? '' : 'glass-panel'}
                    style={{
                      ...(sel
                        ? {
                            background: 'rgba(212,168,67,0.08)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderLeft: '3px solid #D4A843',
                            color: '#D4A843',
                            backdropFilter: 'none',
                            WebkitBackdropFilter: 'none',
                          }
                        : {
                            border: onboardingTheme.optionBorder,
                            color: onboardingTheme.cardText,
                          }),
                      borderRadius: '14px',
                      padding: '16px',
                      fontSize: '16px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      textAlign: 'left'
                    }}
                  >
                    {t(`onboarding.${commitment.labelKey}`)}
                    <div style={{
                      fontSize: '13px',
                      fontWeight: 400,
                      color: onboardingTheme.subtleText,
                      marginTop: '4px'
                    }}>
                      {t(`onboarding.${commitment.descriptionKey}`)}
                    </div>
                  </button>
                  )
                })}
              </div>
              {dailyCommitment && (
                <button
                  type="button"
                  onClick={() => setScreen(6)}
                  style={{
                    marginTop: '16px',
                    background: '#D4A843',
                    color: '#060f26',
                    border: 'none',
                    borderRadius: '16px',
                    padding: '16px',
                    fontSize: '16px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    width: '100%'
                  }}
                >
                  {t('onboarding.continue')}
                </button>
              )}
            </div>
          )}

          {/* Screen 6 - App Tour */}
          {screen === 6 && (
            <div style={{ width: '100%' }}>
              <p style={{
                color: '#D4A843',
                fontSize: '9px',
                fontWeight: 600,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                marginBottom: '8px'
              }}>
                {t('onboarding.step5of5')}
              </p>
              <h2 style={{
                color: onboardingTheme.cardText,
                fontSize: '22px',
                fontWeight: 700,
                marginBottom: '24px'
              }}>
                {t('onboarding.whatsWaiting')}
              </h2>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                marginBottom: '32px'
              }}>
                {APP_TOUR_FEATURES.map((feature, index) => (
                  <div
                    key={index}
                    style={{
                      background: onboardingTheme.optionBg,
                      border: onboardingTheme.optionBorder,
                      borderRadius: '14px',
                      padding: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px'
                    }}
                  >
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '12px',
                      background: 'rgba(212,168,67,0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '20px'
                    }}>
                      {feature.icon}
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <p style={{
                        color: onboardingTheme.cardText,
                        fontSize: '15px',
                        fontWeight: 600,
                        marginBottom: '4px',
                        margin: 0
                      }}>
                        {t(`onboarding.${feature.titleKey}`)}
                      </p>
                      <p style={{
                        color: onboardingTheme.subtleText,
                        fontSize: '13px',
                        margin: 0
                      }}>
                        {t(`onboarding.${feature.descriptionKey}`)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={handleAdvance}
                style={{
                  background: '#D4A843',
                  color: '#060f26',
                  border: 'none',
                  borderRadius: '16px',
                  padding: '16px',
                  fontSize: '16px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  width: '100%'
                }}
              >
                {t('onboarding.imReady')}
              </button>
            </div>
          )}

          {/* Screen 7 - Summary */}
          {screen === 7 && (
            <div style={{ width: '100%' }}>
              <h2 style={{
                color: '#D4A843',
                fontSize: '24px',
                fontWeight: 700,
                marginBottom: '16px'
              }}>
                {t('onboarding.pathReady')}
              </h2>
              <p style={{
                color: onboardingTheme.mutedText,
                fontSize: '15px',
                marginBottom: '32px',
                lineHeight: '1.6'
              }}>
                {t('onboarding.basedOnAnswers')}
              </p>

              <div style={{
                background: onboardingTheme.optionBg,
                border: onboardingTheme.optionBorder,
                borderRadius: '16px',
                padding: '24px',
                textAlign: 'left',
                marginBottom: '32px'
              }}>
                <div style={{ marginBottom: '20px' }}>
                  <p style={{
                    color: onboardingTheme.subtleText,
                    fontSize: '12px',
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    marginBottom: '8px'
                  }}>
                    {t('onboarding.recommendedPath')}
                  </p>
                  <p style={{
                    color: onboardingTheme.cardText,
                    fontSize: '18px',
                    fontWeight: 700,
                    margin: 0
                  }}>
                    {getRecommendations().path}
                  </p>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <p style={{
                    color: onboardingTheme.subtleText,
                    fontSize: '12px',
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    marginBottom: '8px'
                  }}>
                    {t('onboarding.dailyReadingPlan')}
                  </p>
                  <p style={{
                    color: onboardingTheme.cardText,
                    fontSize: '16px',
                    fontWeight: 600,
                    margin: 0
                  }}>
                    {getRecommendations().readingPlan}
                  </p>
                </div>

                <div>
                  <p style={{
                    color: onboardingTheme.subtleText,
                    fontSize: '12px',
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    marginBottom: '8px'
                  }}>
                    {t('onboarding.studyDepth')}
                  </p>
                  <p style={{
                    color: onboardingTheme.cardText,
                    fontSize: '16px',
                    fontWeight: 600,
                    margin: 0
                  }}>
                    {getRecommendations().studyDepth}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={completeOnboarding}
                disabled={loading || isCompleting}
                style={{
                  background: '#D4A843',
                  color: '#060f26',
                  border: 'none',
                  borderRadius: '16px',
                  padding: '16px',
                  fontSize: '16px',
                  fontWeight: 700,
                  cursor: loading || isCompleting ? 'not-allowed' : 'pointer',
                  opacity: loading || isCompleting ? 0.7 : 1,
                  width: '100%'
                }}
              >
                {loading ? t('onboarding.settingUpPath') : t('onboarding.openJourney')}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
