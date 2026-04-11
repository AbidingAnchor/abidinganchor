import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { appendAvatarCacheBust, getAvatarUploadExtension } from '../utils/avatarUrl'

export default function Settings() {
  const navigate = useNavigate()
  const { user, profile, signOut, refreshProfile } = useAuth()
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [selectedTranslation, setSelectedTranslation] = useState('KJV')
  const [uploadStatus, setUploadStatus] = useState('idle') // idle, uploading, success
  const [uploadError, setUploadError] = useState('')
  const [pendingAvatarUrl, setPendingAvatarUrl] = useState(null)
  const [pendingAvatarFile, setPendingAvatarFile] = useState(null)
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState(null)
  const [localAvatarUrl, setLocalAvatarUrl] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    const loadAvatar = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) return
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .maybeSingle()
      if (data?.avatar_url) setLocalAvatarUrl(data.avatar_url)
    }
    loadAvatar()
  }, [])

  useEffect(() => {
    if (
      pendingAvatarUrl &&
      profile?.avatar_url &&
      profile.avatar_url === pendingAvatarUrl
    ) {
      setPendingAvatarUrl(null)
    }
  }, [pendingAvatarUrl, profile?.avatar_url])

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl)
    }
  }, [avatarPreviewUrl])

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

  const validateAvatarFile = (file) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
    ]
    const ext = getAvatarUploadExtension(file)
    const extAllowed = ['jpg', 'png', 'webp', 'gif'].includes(ext)
    const mimeOk = file.type ? allowedTypes.includes(file.type) : false
    if (!mimeOk && !extAllowed) {
      return 'Please choose a JPG, PNG, WebP, or GIF image'
    }
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return 'Image must be less than 5MB'
    }
    return null
  }

  const clearAvatarPreview = () => {
    if (avatarPreviewUrl) {
      URL.revokeObjectURL(avatarPreviewUrl)
    }
    setAvatarPreviewUrl(null)
    setPendingAvatarFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSaveAvatarPhoto = async () => {
    const file = pendingAvatarFile
    const blobUrlToRevoke = avatarPreviewUrl
    if (!file || !user?.id) return

    try {
      setUploadStatus('uploading')
      setUploadError('')

      const ext = getAvatarUploadExtension(file)
      const filePath = `${user.id}/avatar-${Date.now()}.${ext}`
      const contentTypeByExt = {
        jpg: 'image/jpeg',
        png: 'image/png',
        webp: 'image/webp',
        gif: 'image/gif',
      }
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type || contentTypeByExt[ext] || 'image/jpeg',
        })

      if (uploadError) throw uploadError

      // Get public URL and save to profile
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)
      const avatarUrl = data.publicUrl
      setPendingAvatarUrl(avatarUrl)

      const { data: updatedRow, error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', user.id)
        .select()
        .single()
      if (updateError) throw updateError

      await refreshProfile(updatedRow)
      setLocalAvatarUrl(avatarUrl)

      if (blobUrlToRevoke) URL.revokeObjectURL(blobUrlToRevoke)
      setAvatarPreviewUrl(null)
      setPendingAvatarFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      setUploadStatus('success')
      setTimeout(() => setUploadStatus('idle'), 2500)
    } catch (error) {
      console.error('Upload error:', error)
      setPendingAvatarUrl(null)
      setUploadError('Failed to upload profile picture. Please try again.')
      setUploadStatus('idle')
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const err = validateAvatarFile(file)
    if (err) {
      setUploadError(err)
      setUploadStatus('idle')
      e.target.value = ''
      return
    }

    setUploadError('')
    setUploadStatus('idle')
    if (avatarPreviewUrl) {
      URL.revokeObjectURL(avatarPreviewUrl)
    }
    setPendingAvatarFile(file)
    setAvatarPreviewUrl(URL.createObjectURL(file))
  }

  const displayName = profile?.full_name || user?.user_metadata?.full_name || 'User'
  const userEmail = user?.email || ''
  const serverRawAvatarUrl = pendingAvatarUrl ?? localAvatarUrl ?? profile?.avatar_url
  const avatarDisplayUrl = useMemo(() => {
    if (avatarPreviewUrl) return avatarPreviewUrl
    return appendAvatarCacheBust(serverRawAvatarUrl)
  }, [avatarPreviewUrl, serverRawAvatarUrl])
  const hasAvatarImage = Boolean(avatarPreviewUrl || serverRawAvatarUrl)

  return (
    <div className="content-scroll" style={{ padding: '0 16px', paddingTop: '110px', paddingBottom: '110px', maxWidth: '680px', margin: '0 auto', width: '100%' }}>
      <style>{`
        @keyframes settings-avatar-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
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
                  background: '#D4A843',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(212,168,67,0.3)',
                  cursor: 'pointer',
                  border: hasAvatarImage ? '2px solid rgba(212,168,67,0.4)' : 'none',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: '32px',
                    fontWeight: 600,
                    zIndex: 0,
                  }}
                >
                  {displayName.charAt(0).toUpperCase()}
                </span>
                {avatarDisplayUrl ? (
                  <img
                    src={avatarDisplayUrl}
                    alt="Profile"
                    onError={(e) => {
                      e.target.style.display = 'none'
                    }}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      borderRadius: '50%',
                      zIndex: 1,
                    }}
                  />
                ) : null}
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
              {uploadStatus === 'success' && (
                <p style={{ color: '#4ade80', fontSize: '12px', marginTop: '4px' }}>
                  Profile photo saved!
                </p>
              )}
            </div>
          </div>
          {pendingAvatarFile && (
            <div
              style={{
                marginTop: '16px',
                padding: '14px 16px',
                background: 'rgba(8,20,50,0.5)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(212,168,67,0.25)',
                borderRadius: '12px',
                display: 'flex',
                gap: '12px',
              }}
            >
              <button
                type="button"
                disabled={uploadStatus === 'uploading'}
                onClick={() => {
                  clearAvatarPreview()
                  setUploadError('')
                }}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1px solid #D4A843',
                  background: 'transparent',
                  color: '#D4A843',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: uploadStatus === 'uploading' ? 'not-allowed' : 'pointer',
                  opacity: uploadStatus === 'uploading' ? 0.5 : 1,
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={uploadStatus === 'uploading'}
                onClick={handleSaveAvatarPhoto}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: 'none',
                  background: '#D4A843',
                  color: '#0a1432',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: uploadStatus === 'uploading' ? 'not-allowed' : 'pointer',
                  opacity: uploadStatus === 'uploading' ? 0.85 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                {uploadStatus === 'uploading' && (
                  <span
                    aria-hidden
                    style={{
                      width: '18px',
                      height: '18px',
                      border: '2px solid rgba(10,20,50,0.25)',
                      borderTopColor: '#0a1432',
                      borderRadius: '50%',
                      animation: 'settings-avatar-spin 0.7s linear infinite',
                    }}
                  />
                )}
                Save Photo
              </button>
            </div>
          )}
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
