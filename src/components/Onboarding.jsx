import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import AppBackground from './AppBackground'

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
      await supabase.from('profiles').upsert({
        id: user.id,
        onboarding_complete: true,
        growth_goals: selectedGoals,
        faith_duration: faithDuration,
        daily_commitment: dailyCommitment
      }, { onConflict: 'id' })
    } catch (error) {
      console.error('Onboarding save error:', error)
    } finally {
      localStorage.setItem('onboarding_complete', 'true')
      setLoading(false)
      onComplete()
    }
  }

  return (
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
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0
      }}>
        <AppBackground />
      </div>
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(8,20,50,0.75)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        zIndex: 1
      }} />
      <div style={{
        maxWidth: '480px',
        width: '100%',
        textAlign: 'center',
        position: 'relative',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        {/* Progress Dots */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '8px',
          marginBottom: '40px'
        }}>
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: screen === s ? '#D4A843' : 'rgba(255,255,255,0.2)',
                transition: 'background 0.3s ease'
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
                height: 'auto',
                margin: '0 auto 24px',
                display: 'block',
                position: 'relative',
                zIndex: 10,
                mixBlendMode: 'screen',
                filter: 'drop-shadow(0 0 15px rgba(212,168,67,0.9)) drop-shadow(0 0 35px rgba(212,168,67,0.6))'
              }}
            />
            <h1 style={{
              color: '#FFFFFF',
              fontSize: '26px',
              fontWeight: 700,
              fontFamily: 'Georgia, serif',
              marginBottom: '12px'
            }}>
              Welcome to AbidingAnchor
            </h1>
            <p style={{
              color: 'rgba(255,255,255,0.6)',
              fontSize: '15px',
              marginBottom: '32px'
            }}>
              Your personal Bible study companion
            </p>
            <button
              type="button"
              onClick={() => setScreen(2)}
              style={{
                background: '#D4A843',
                color: '#0a1a3e',
                border: 'none',
                borderRadius: '12px',
                padding: '16px 48px',
                fontSize: '16px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Begin
            </button>
          </div>
        )}

        {/* Screen 2 - Growth Goals */}
        {screen === 2 && (
          <div>
            <h2 style={{
              color: '#FFFFFF',
              fontSize: '24px',
              fontWeight: 700,
              marginBottom: '8px'
            }}>
              What do you want to grow in?
            </h2>
            <p style={{
              color: 'rgba(255,255,255,0.6)',
              fontSize: '14px',
              marginBottom: '24px'
            }}>
              Choose all that apply
            </p>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              justifyContent: 'center',
              marginBottom: '32px'
            }}>
              {GROWTH_GOALS.map((goal) => (
                <button
                  key={goal.id}
                  type="button"
                  onClick={() => toggleGoal(goal.id)}
                  style={{
                    background: selectedGoals.includes(goal.id) 
                      ? 'rgba(212,168,67,0.2)' 
                      : 'rgba(8,20,50,0.72)',
                    border: selectedGoals.includes(goal.id) 
                      ? '1px solid #D4A843' 
                      : '1px solid rgba(255,255,255,0.2)',
                    color: selectedGoals.includes(goal.id) ? '#D4A843' : '#FFFFFF',
                    borderRadius: '50px',
                    padding: '12px 20px',
                    fontSize: '15px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {goal.icon} {goal.label}
                </button>
              ))}
            </div>
            {selectedGoals.length > 0 && (
              <button
                type="button"
                onClick={() => setScreen(3)}
                style={{
                  background: '#D4A843',
                  color: '#0a1a3e',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '16px 48px',
                  fontSize: '16px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Continue
              </button>
            )}
          </div>
        )}

        {/* Screen 3 - Faith Duration */}
        {screen === 3 && (
          <div>
            <h2 style={{
              color: '#FFFFFF',
              fontSize: '24px',
              fontWeight: 700,
              marginBottom: '24px'
            }}>
              How long have you been a believer?
            </h2>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              marginBottom: '32px'
            }}>
              {FAITH_DURATIONS.map((duration) => (
                <button
                  key={duration.id}
                  type="button"
                  onClick={() => setFaithDuration(duration.id)}
                  style={{
                    background: faithDuration === duration.id 
                      ? 'rgba(212,168,67,0.2)' 
                      : 'rgba(8,20,50,0.72)',
                    border: faithDuration === duration.id 
                      ? '1px solid #D4A843' 
                      : '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    fontSize: '16px',
                    fontWeight: 600,
                    color: faithDuration === duration.id ? '#D4A843' : '#FFFFFF',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    textAlign: 'left'
                  }}
                >
                  {duration.icon} {duration.label}
                </button>
              ))}
            </div>
            {faithDuration && (
              <button
                type="button"
                onClick={() => setScreen(4)}
                style={{
                  background: '#D4A843',
                  color: '#0a1a3e',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '16px 48px',
                  fontSize: '16px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Continue
              </button>
            )}
          </div>
        )}

        {/* Screen 4 - Daily Commitment */}
        {screen === 4 && (
          <div>
            <h2 style={{
              color: '#FFFFFF',
              fontSize: '24px',
              fontWeight: 700,
              marginBottom: '24px'
            }}>
              How much time can you commit daily?
            </h2>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              marginBottom: '32px'
            }}>
              {DAILY_COMMITMENTS.map((commitment) => (
                <button
                  key={commitment.id}
                  type="button"
                  onClick={() => setDailyCommitment(commitment.id)}
                  style={{
                    background: dailyCommitment === commitment.id 
                      ? 'rgba(212,168,67,0.2)' 
                      : 'rgba(8,20,50,0.72)',
                    border: dailyCommitment === commitment.id 
                      ? '1px solid #D4A843' 
                      : '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    fontSize: '16px',
                    fontWeight: 600,
                    color: dailyCommitment === commitment.id ? '#D4A843' : '#FFFFFF',
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
              ))}
            </div>
            {dailyCommitment && (
              <button
                type="button"
                onClick={() => setScreen(5)}
                style={{
                  background: '#D4A843',
                  color: '#0a1a3e',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '16px 48px',
                  fontSize: '16px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Continue
              </button>
            )}
          </div>
        )}

        {/* Screen 5 - Summary */}
        {screen === 5 && (
          <div>
            <h2 style={{
              color: '#D4A843',
              fontSize: '24px',
              fontWeight: 700,
              marginBottom: '16px'
            }}>
              Your path is ready!
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
              background: 'rgba(8,20,50,0.72)',
              border: '1px solid rgba(212,168,67,0.3)',
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
                color: '#0a1a3e',
                border: 'none',
                borderRadius: '12px',
                padding: '16px 48px',
                fontSize: '16px',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? 'Setting up your path...' : 'Start My Journey'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
