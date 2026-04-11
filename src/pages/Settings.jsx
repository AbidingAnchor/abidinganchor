import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

export default function Settings() {
  const navigate = useNavigate()
  const { user, profile, signOut, refreshProfile } = useAuth()
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [selectedTranslation, setSelectedTranslation] = useState('KJV')
  const [uploadStatus, setUploadStatus] = useState('idle') // idle, uploading, success
  const [uploadError, setUploadError] = useState('')
  const fileInputRef = useRef(null)

  const handleSignOut = async () => {
    await signOut()
    navigate('/auth', { replace: true })
  }

  const handleReplayTutorial = async () => {
    try {
      // Clear from localStorage (do NOT clear tos_agreed)
      localStorage.removeItem('onboarding_complete')
      
      // Clear from Supabase profile
      if (user?.id) {
        await supabase
          .from('profiles')
          .update({ onboarding_complete: false })
          .eq('id', user.id)
      }
      
      // Navigate directly to onboarding route (skips ToS)
      navigate('/onboarding')
    } catch (error) {
      console.error('Error replaying tutorial:', error)
    }
  }

  const handleProfilePictureUpload = async (file) => {
    if (!file || !user?.id) return

    try {
      setUploadStatus('uploading')
      setUploadError('')

      // File type validation
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
      if (!allowedTypes.includes(file.type)) {
        setUploadError('Please choose a JPG or PNG image')
        setUploadStatus('idle')
        return
      }

      // File size validation (max 5MB)
      const maxSize = 5 * 1024 * 1024 // 5MB in bytes
      if (file.size > maxSize) {
        setUploadError('Image must be less than 5MB')
        setUploadStatus('idle')
        return
      }

      // Upload to Supabase
      const filePath = `${user.id}/avatar-${Date.now()}.jpg`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type
        })

      if (uploadError) throw uploadError

      // Get public URL and save to profile
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)
      const avatarUrl = data.publicUrl

      try {
        const { error: updateError } = await supabase.from('profiles')
          .update({ avatar_url: avatarUrl })
          .eq('id', user.id)
        if (updateError) throw updateError
        
        // Refresh profile to get latest avatar_url from Supabase
        await refreshProfile()
      } catch (error) {
        console.error('Profile update error:', error)
        // Continue anyway - avatar is saved, profile update may fail gracefully
      }

      setUploadStatus('success')
      setTimeout(() => setUploadStatus('idle'), 2000)
    } catch (error) {
      console.error('Upload error:', error)
      setUploadError('Failed to upload profile picture. Please try again.')
      setUploadStatus('idle')
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      handleProfilePictureUpload(file)
    }
  }

  const displayName = profile?.full_name || user?.user_metadata?.full_name || 'User'
  const userEmail = user?.email || ''
  const avatarUrl = profile?.avatar_url

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
            <div style={{ position: 'relative' }}>
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: avatarUrl 
                    ? `url(${avatarUrl}) center/cover` 
                    : '#D4A843',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: '32px',
                  fontWeight: 600,
                  boxShadow: '0 2px 8px rgba(212,168,67,0.3)',
                  cursor: 'pointer',
                  border: avatarUrl ? '2px solid rgba(212,168,67,0.4)' : 'none'
                }}
              >
                {!avatarUrl && displayName.charAt(0).toUpperCase()}
              </div>
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  position: 'absolute',
                  bottom: '-4px',
                  right: '-4px',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: '#D4A843',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  border: '2px solid rgba(8,20,50,0.9)',
                  fontSize: '14px'
                }}
              >
                📷
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </div>
            <div>
              <p style={{ color: '#FFFFFF', fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>
                {displayName}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>
                {userEmail}
              </p>
              {uploadStatus === 'uploading' && (
                <p style={{ color: '#D4A843', fontSize: '12px', marginTop: '4px' }}>
                  Uploading...
                </p>
              )}
              {uploadStatus === 'success' && (
                <p style={{ color: '#4ade80', fontSize: '12px', marginTop: '4px' }}>
                  ✓ Profile picture updated!
                </p>
              )}
            </div>
          </div>
          {uploadError && (
            <div style={{
              marginTop: '16px',
              background: 'rgba(255,80,80,0.15)',
              border: '1px solid rgba(255,80,80,0.4)',
              borderRadius: '12px',
              padding: '12px 16px',
              color: 'white',
              fontSize: '14px'
            }}>
              {uploadError}
            </div>
          )}
          <p style={{
            marginTop: '12px',
            color: 'rgba(255,255,255,0.5)',
            fontSize: '12px',
            lineHeight: '1.4'
          }}>
            By uploading a photo you agree to our community guidelines. Inappropriate images will result in account removal.
          </p>
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

        {/* Replay Tutorial */}
        <button
          type="button"
          onClick={handleReplayTutorial}
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
          <span>Replay Tutorial</span>
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>↺</span>
        </button>

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
