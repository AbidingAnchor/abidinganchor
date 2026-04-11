import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

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
  const { user } = useAuth()
  const [screen, setScreen] = useState(1)
  const [selectedGoals, setSelectedGoals] = useState([])
  const [faithDuration, setFaithDuration] = useState('')
  const [dailyCommitment, setDailyCommitment] = useState('')
  const [loading, setLoading] = useState(false)

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
    try {
      // Save to localStorage
      localStorage.setItem('onboarding_complete', 'true')
      
      // Save to Supabase profile
      if (user?.id) {
        await supabase
          .from('profiles')
          .update({ onboarding_complete: true })
          .eq('id', user.id)
      }
    } catch (error) {
      console.error('Onboarding save error:', error)
    } finally {
      setLoading(false)
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
        {screen !== 6 && (
          <button
            type="button"
            onClick={handleComplete}
            style={{
              position: 'absolute',
              top: '20px',
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
          marginBottom: '40px'
        }}>
          {/* Progress Dots */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '8px',
            marginBottom: '40px'
          }}>
            {[1, 2, 3, 4, 5, 6].map((s) => (
              <div
                key={s}
                style={{
                  width: screen === s ? '24px' : '8px',
                  height: '8px',
                  borderRadius: screen === s ? '20px' : '50%',
                  background: screen === s ? '#D4A843' : 'rgba(255,255,255,0.15)',
                  transition: 'all 0.3s ease'
                }}
              />
            ))}
          </div>

          {/* Screen 1 - Welcome */}
          {screen === 1 && (
            <div>
              <img 
                src="/images/GoldCross.png"
                alt="Cross"
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
                color: '#FFFFFF',
                fontSize: '24px',
                fontWeight: 700,
                marginBottom: '12px'
              }}>
                Welcome to AbidingAnchor
              </h1>
              <p style={{
                color: 'rgba(255,255,255,0.5)',
                fontSize: '13px',
                marginBottom: '8px'
              }}>
                Your personal Bible study companion
              </p>
              <p style={{
                color: 'rgba(212,168,67,0.6)',
                fontSize: '11px',
                fontStyle: 'italic',
                marginBottom: '32px'
              }}>
                Abide in me, and I in you — John 15:4
              </p>
              <button
                type="button"
                onClick={() => setScreen(2)}
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

          {/* Screen 2 - Growth Goals */}
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
                STEP 1 OF 4
              </p>
              <h2 style={{
                color: '#FFFFFF',
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
                            border: '1px solid rgba(255,255,255,0.08)',
                            color: '#FFFFFF',
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
                  onClick={() => setScreen(3)}
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

          {/* Screen 3 - Faith Duration */}
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
                STEP 2 OF 4
              </p>
              <h2 style={{
                color: '#FFFFFF',
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
                            border: '1px solid rgba(255,255,255,0.08)',
                            color: '#FFFFFF',
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

          {/* Screen 4 - Daily Commitment */}
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
                STEP 3 OF 4
              </p>
              <h2 style={{
                color: '#FFFFFF',
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
                            border: '1px solid rgba(255,255,255,0.08)',
                            color: '#FFFFFF',
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
                    {commitment.label}
                    <div style={{
                      fontSize: '13px',
                      fontWeight: 400,
                      color: 'rgba(255,255,255,0.6)',
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

          {/* Screen 5 - App Tour (NEW) */}
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
                STEP 4 OF 4
              </p>
              <h2 style={{
                color: '#FFFFFF',
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
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
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
                        color: '#FFFFFF',
                        fontSize: '15px',
                        fontWeight: 600,
                        marginBottom: '4px',
                        margin: 0
                      }}>
                        {feature.title}
                      </p>
                      <p style={{
                        color: 'rgba(255,255,255,0.5)',
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
                onClick={() => setScreen(6)}
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

          {/* Screen 6 - Summary */}
          {screen === 6 && (
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
                color: 'rgba(255,255,255,0.7)',
                fontSize: '15px',
                marginBottom: '32px',
                lineHeight: '1.6'
              }}>
                Based on your answers, we've created your personal growth path:
              </p>

              <div style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '16px',
                padding: '24px',
                textAlign: 'left',
                marginBottom: '32px'
              }}>
                <div style={{ marginBottom: '20px' }}>
                  <p style={{
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: '12px',
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    marginBottom: '8px'
                  }}>
                    Recommended Path
                  </p>
                  <p style={{
                    color: '#FFFFFF',
                    fontSize: '18px',
                    fontWeight: 700,
                    margin: 0
                  }}>
                    {getRecommendations().path}
                  </p>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <p style={{
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: '12px',
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    marginBottom: '8px'
                  }}>
                    Daily Reading Plan
                  </p>
                  <p style={{
                    color: '#FFFFFF',
                    fontSize: '16px',
                    fontWeight: 600,
                    margin: 0
                  }}>
                    {getRecommendations().readingPlan}
                  </p>
                </div>

                <div>
                  <p style={{
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: '12px',
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    marginBottom: '8px'
                  }}>
                    Study Depth
                  </p>
                  <p style={{
                    color: '#FFFFFF',
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
                {loading ? 'Setting up your path...' : 'Start My Journey ✦'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
