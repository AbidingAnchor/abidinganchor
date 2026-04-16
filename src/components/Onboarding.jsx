import { useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useThemeBackgroundType } from '../hooks/useThemeBackgroundType'
import { supabase } from '../lib/supabase'
import { userStorageKey } from '../utils/userStorage'
import { initialDisplayNameFromAuth } from '../utils/profileDisplay'

const GROWTH_GOALS = [
  { id: 'prayer', icon: '🙏', label: 'Deeper Prayer Life' },
  { id: 'bible', icon: '📖', label: 'Understanding the Bible' },
  { id: 'discipline', icon: '💪', label: 'Spiritual Discipline' },
  { id: 'identity', icon: '🆔', label: 'My Identity in Christ' },
  { id: 'warfare', icon: '⚔️', label: 'Spiritual Warfare' },
  { id: 'discipleship', icon: '🤝', label: 'Discipleship & Leadership' },
]

const FAITH_DURATIONS = [
  { id: 'new', icon: '🌱', label: 'New to faith' },
  { id: 'less_than_2', icon: '📖', label: 'Less than 2 years' },
  { id: '2_to_10', icon: '✝️', label: '2-10 years' },
  { id: '10_plus', icon: '👑', label: '10+ years' },
]

const DAILY_COMMITMENTS = [
  { id: 'quick', label: '5-10 minutes', description: 'Quick devotional' },
  { id: 'standard', label: '15-20 minutes', description: 'Standard study' },
  { id: 'deep', label: '30+ minutes', description: 'Deep study' },
]

const APP_TOUR_FEATURES = [
  { icon: '📖', title: 'Bible Reader', description: 'Full KJV, all 66 books' },
  { icon: '🙏', title: 'Prayer', description: 'Speak prayers by voice, track answered ones' },
  { icon: '🧭', title: 'Journey', description: 'Trivia, flashcards and faith badges' },
  { icon: '📓', title: 'Journal', description: 'Daily reflections with mood tags' },
  { icon: '👥', title: 'Community', description: 'Pray with and for others' },
]

export default function Onboarding({ onComplete }) {
  const { user, profile, refreshProfile } = useAuth()
  const themeSky = useThemeBackgroundType()
  const [screen, setScreen] = useState(1)
  const [displayName, setDisplayName] = useState(() => initialDisplayNameFromAuth(user, profile))
  const [dateOfBirth, setDateOfBirth] = useState(() => profile?.date_of_birth || '')
  const [selectedGoals, setSelectedGoals] = useState([])
  const [faithDuration, setFaithDuration] = useState('')
  const [dailyCommitment, setDailyCommitment] = useState('')
  const [formError, setFormError] = useState('')
  const [loading, setLoading] = useState(false)

  const canContinueProfile = useMemo(() => {
    const cleanName = displayName.trim()
    if (!cleanName) return false
    if (!dateOfBirth) return true
    const parsed = new Date(dateOfBirth)
    return Number.isFinite(parsed.getTime())
  }, [displayName, dateOfBirth])

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
      cardBg: 'rgba(15,20,45,0.75)',
      cardBorder: '1px solid rgba(255,255,255,0.14)',
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
        path: 'Prayer & Scripture Foundation',
        readingPlan: 'Psalms & Proverbs',
        studyDepth: 'Balanced'
      }
    }
    if (selectedGoals.includes('discipline')) {
      return {
        path: 'Spiritual Disciplines',
        readingPlan: 'New Testament Letters',
        studyDepth: 'Deep'
      }
    }
    if (selectedGoals.includes('identity')) {
      return {
        path: 'Identity in Christ',
        readingPlan: 'Romans & Galatians',
        studyDepth: 'Reflective'
      }
    }
    return {
      path: 'Bible Foundations',
      readingPlan: 'Gospels',
      studyDepth: 'Standard'
    }
  }

  const handleComplete = async () => {
    setLoading(true)
    setFormError('')
    let saveSucceeded = false
    try {
      if (user?.id) {
        // Set local completion flag immediately so route guards don't bounce.
        localStorage.setItem(`onboarding-complete-${user.id}`, 'true')
        localStorage.setItem(userStorageKey(user.id, 'onboarding-complete'), 'true')
      }
      
      // Save to Supabase profile
      if (user?.id) {
        // Keep payload limited to known columns to avoid 400s from missing fields.
        const payload = {
          full_name: displayName.trim(),
          date_of_birth: dateOfBirth || null,
          onboarding_complete: true,
        }
        const { data: updatedRows, error } = await supabase
          .from('profiles')
          .update(payload)
          .eq('id', user.id)
          .select('id, onboarding_complete')

        if (error?.message?.toLowerCase().includes('date_of_birth') || error?.code === '42703') {
          const { date_of_birth: _ignored, ...fallbackPayload } = payload
          const { data: fallbackRows, error: fallbackError } = await supabase
            .from('profiles')
            .update(fallbackPayload)
            .eq('id', user.id)
            .select('id, onboarding_complete')
          if (fallbackError) {
            throw fallbackError
          }
          if (!fallbackRows?.length) {
            throw new Error('Onboarding save failed: no profile row updated.')
          }
        } else if (error) {
          throw error
        } else if (!updatedRows?.length) {
          throw new Error('Onboarding save failed: no profile row updated.')
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
    if (saveSucceeded) {
      onComplete()
    }
  }

  return (
    <>
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 2000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '20px',
        background: 'transparent',
        overflowY: 'auto'
      }}>
        {/* Skip Button */}
        {screen !== 7 && (
          <button
            type="button"
            onClick={handleComplete}
            style={{
              position: 'absolute',
              top: 'max(calc(env(safe-area-inset-top, 0px) + 10px), 56px)',
              right: '20px',
              zIndex: 10,
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.35)',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            Skip
          </button>
        )}

        <div style={{
          maxWidth: '480px',
          width: '100%',
          textAlign: 'center',
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          height: 'auto',
          marginTop: '30vh',
          marginBottom: '40px',
          background: onboardingTheme.cardBg,
          border: onboardingTheme.cardBorder,
          borderRadius: '20px',
          padding: '20px 18px',
          boxShadow: onboardingTheme.mode === 'day'
            ? '0 12px 40px rgba(85, 62, 22, 0.14)'
            : '0 14px 45px rgba(0,0,0,0.35)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}>
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
                Welcome to AbidingAnchor
              </h1>
              <p style={{
                color: onboardingTheme.subtleText,
                fontSize: '13px',
                marginBottom: '8px'
              }}>
                Your personal Bible study companion
              </p>
              <p style={{
                color: onboardingTheme.mode === 'day' ? 'rgba(118,82,34,0.75)' : 'rgba(212,168,67,0.82)',
                fontSize: '11px',
                fontStyle: 'italic',
                marginBottom: '32px'
              }}>
                Abide in me, and I in you — John 15:4
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
                Begin My Journey
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
                STEP 1 OF 5
              </p>
              <h2 style={{
                color: onboardingTheme.cardText,
                fontSize: '22px',
                fontWeight: 700,
                marginBottom: '24px'
              }}>
                Tell us about you
              </h2>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                marginBottom: 0,
                textAlign: 'left',
              }}>
                <label style={{ color: onboardingTheme.mutedText, fontSize: '13px', fontWeight: 600 }}>
                  Display name
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => {
                      setDisplayName(e.target.value)
                      if (formError) setFormError('')
                    }}
                    placeholder="How should we call you?"
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
                  Date of birth (optional)
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
              </div>
              {formError ? (
                <p style={{ marginTop: '10px', color: '#ffb3b3', fontSize: '13px' }}>{formError}</p>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  if (!canContinueProfile) {
                    setFormError('Please provide your display name.')
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
                Continue
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
                STEP 2 OF 5
              </p>
              <h2 style={{
                color: onboardingTheme.cardText,
                fontSize: '22px',
                fontWeight: 700,
                marginBottom: '24px'
              }}>
                What do you want to grow in?
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
                    {goal.icon} {goal.label}
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
                  Continue
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
                STEP 3 OF 5
              </p>
              <h2 style={{
                color: onboardingTheme.cardText,
                fontSize: '22px',
                fontWeight: 700,
                marginBottom: '24px'
              }}>
                How long have you been a believer?
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
                    {duration.icon} {duration.label}
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
                  Continue
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
                STEP 4 OF 5
              </p>
              <h2 style={{
                color: onboardingTheme.cardText,
                fontSize: '22px',
                fontWeight: 700,
                marginBottom: '24px'
              }}>
                How much time can you commit daily?
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
                    {commitment.label}
                    <div style={{
                      fontSize: '13px',
                      fontWeight: 400,
                      color: onboardingTheme.subtleText,
                      marginTop: '4px'
                    }}>
                      {commitment.description}
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
                  Continue
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
                STEP 5 OF 5
              </p>
              <h2 style={{
                color: onboardingTheme.cardText,
                fontSize: '22px',
                fontWeight: 700,
                marginBottom: '24px'
              }}>
                Here's what's waiting for you
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
                        {feature.title}
                      </p>
                      <p style={{
                        color: onboardingTheme.subtleText,
                        fontSize: '13px',
                        margin: 0
                      }}>
                        {feature.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setScreen(7)}
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
                I'm Ready →
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
                Your path is <span style={{ fontStyle: 'italic' }}>ready</span>!
              </h2>
              <p style={{
                color: onboardingTheme.mutedText,
                fontSize: '15px',
                marginBottom: '32px',
                lineHeight: '1.6'
              }}>
                Based on your answers, we've created your personal growth path:
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
                    Recommended Path
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
                    Daily Reading Plan
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
                    Study Depth
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
                onClick={handleComplete}
                disabled={loading}
                style={{
                  background: '#D4A843',
                  color: '#060f26',
                  border: 'none',
                  borderRadius: '16px',
                  padding: '16px',
                  fontSize: '16px',
                  fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  width: '100%'
                }}
              >
                {loading ? 'Setting up your path...' : 'Open Journey'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
