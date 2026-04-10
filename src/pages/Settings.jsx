import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Settings() {
  const navigate = useNavigate()
  const { user, profile, signOut } = useAuth()
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [selectedTranslation, setSelectedTranslation] = useState('KJV')

  const handleSignOut = async () => {
    await signOut()
    navigate('/auth', { replace: true })
  }

  const displayName = profile?.full_name || user?.user_metadata?.full_name || 'User'
  const userEmail = user?.email || ''

  return (
    <div className="content-scroll" style={{ padding: '0 16px', paddingTop: '110px', paddingBottom: '110px', maxWidth: '680px', margin: '0 auto', width: '100%' }}>
      <section className="space-y-4">
        <header className="space-y-2">
          <p className="text-section-header">Settings</p>
          <h1 className="text-page-title">Account Settings</h1>
        </header>

        {/* User Profile Card */}
        <div style={{
          background: 'rgba(8,20,50,0.72)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(212,168,67,0.25)',
          borderRadius: '16px',
          padding: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: '#D4A843',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '24px',
              fontWeight: 600,
              boxShadow: '0 2px 8px rgba(212,168,67,0.3)'
            }}>
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p style={{ color: '#FFFFFF', fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>
                {displayName}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>
                {userEmail}
              </p>
            </div>
          </div>
        </div>

        {/* Edit Profile Option */}
        <button
          type="button"
          onClick={() => {}}
          style={{
            width: '100%',
            background: 'rgba(8,20,50,0.72)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(212,168,67,0.25)',
            borderRadius: '16px',
            padding: '16px 20px',
            color: '#FFFFFF',
            fontSize: '16px',
            fontWeight: 500,
            cursor: 'pointer',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <span>Edit Profile</span>
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>›</span>
        </button>

        {/* Bible Translation Preference */}
        <div style={{
          background: 'rgba(8,20,50,0.72)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(212,168,67,0.25)',
          borderRadius: '16px',
          padding: '16px 20px'
        }}>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginBottom: '12px' }}>
            Bible Translation
          </p>
          <select
            value={selectedTranslation}
            onChange={(e) => setSelectedTranslation(e.target.value)}
            style={{
              width: '100%',
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(212,168,67,0.3)',
              borderRadius: '12px',
              padding: '12px',
              color: '#FFFFFF',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            <option value="KJV">King James Version (KJV)</option>
            <option value="ESV">English Standard Version (ESV)</option>
            <option value="NIV">New International Version (NIV)</option>
            <option value="NLT">New Living Translation (NLT)</option>
          </select>
        </div>

        {/* Notifications Toggle */}
        <div style={{
          background: 'rgba(8,20,50,0.72)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(212,168,67,0.25)',
          borderRadius: '16px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <p style={{ color: '#FFFFFF', fontSize: '16px', fontWeight: 500, marginBottom: '4px' }}>
              Notifications
            </p>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>
              Daily reminders and updates
            </p>
          </div>
          <button
            type="button"
            onClick={() => setNotificationsEnabled(!notificationsEnabled)}
            style={{
              width: '52px',
              height: '28px',
              borderRadius: '14px',
              background: notificationsEnabled ? '#D4A843' : 'rgba(255,255,255,0.15)',
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
              transition: 'background 0.2s ease'
            }}
          >
            <div style={{
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              background: '#FFFFFF',
              position: 'absolute',
              top: '3px',
              left: notificationsEnabled ? '27px' : '3px',
              transition: 'left 0.2s ease'
            }} />
          </button>
        </div>

        {/* About AbidingAnchor */}
        <div style={{
          background: 'rgba(8,20,50,0.72)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(212,168,67,0.25)',
          borderRadius: '16px',
          padding: '20px'
        }}>
          <p style={{ color: '#D4A843', fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>
            About AbidingAnchor
          </p>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '14px', lineHeight: '1.6', marginBottom: '8px' }}>
            AbidingAnchor is a faith-based application designed to help you grow in your spiritual journey through Bible reading, prayer, journaling, and community.
          </p>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '14px', lineHeight: '1.6' }}>
            Version 1.0.0 • Built with ❤️ as a ministry
          </p>
        </div>

        {/* Privacy Policy and Terms of Service */}
        <div style={{
          background: 'rgba(8,20,50,0.72)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(212,168,67,0.25)',
          borderRadius: '16px',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <button
            type="button"
            onClick={() => navigate('/privacy-policy')}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.85)',
              fontSize: '15px',
              cursor: 'pointer',
              textAlign: 'left',
              padding: 0
            }}
          >
            Privacy Policy
          </button>
          <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)' }} />
          <button
            type="button"
            onClick={() => navigate('/terms-of-service')}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.85)',
              fontSize: '15px',
              cursor: 'pointer',
              textAlign: 'left',
              padding: 0
            }}
          >
            Terms of Service
          </button>
        </div>

        {/* Sign Out Button */}
        <button
          type="button"
          onClick={handleSignOut}
          style={{
            width: '100%',
            background: 'rgba(255,80,80,0.9)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: 'none',
            borderRadius: '16px',
            padding: '16px',
            color: '#FFFFFF',
            fontSize: '16px',
            fontWeight: 700,
            cursor: 'pointer',
            marginTop: '8px'
          }}
        >
          Sign Out
        </button>
      </section>
    </div>
  )
}
