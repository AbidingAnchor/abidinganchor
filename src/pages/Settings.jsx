import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { useThemeBackgroundType } from '../hooks/useThemeBackgroundType'
import { useNameStyle, SHIMMER_KEYFRAMES } from '../hooks/useNameStyle'
import { getAvatarBorderStyle, SUPPORTER_BORDER_KEYFRAMES } from '../utils/supporterBorder'
import { supabase } from '../lib/supabase'
import OfflineManager from '../components/OfflineManager'
import { getAvatarUploadExtension } from '../utils/avatarUrl'
import { LANGUAGE_STORAGE_KEY } from '../i18n.js'
import {
  readThemePreferenceFromStorage,
  writeThemePreferenceToStorage,
  readManualThemePreference,
  writeManualThemePreference,
  clearManualThemePreference,
  emitThemePreferenceChanged,
} from '../utils/themePreferenceStorage'

const FEEDBACK_TYPES = [
  { id: 'bug', label: '🐛 Bug Report' },
  { id: 'suggestion', label: '💡 Suggestion' },
  { id: 'praise', label: '🙌 Praise' },
  { id: 'other', label: '💬 Other' },
]

const FEEDBACK_MAX_LEN = 500
export default function Settings() {
  const { t, i18n: i18nHook } = useTranslation()
  const navigate = useNavigate()
  const { user, profile, signOut, refreshProfile } = useAuth()
  const skyPeriod = useThemeBackgroundType()
  const dayTheme = skyPeriod === 'day' || skyPeriod === 'morning' || skyPeriod === 'afternoon'
  const nameStyle = useNameStyle(profile?.supporter_tier, profile?.name_color)
  const [uploadStatus, setUploadStatus] = useState('idle') // idle, uploading, success
  const [uploadError, setUploadError] = useState('')
  const [pendingAvatarUrl, setPendingAvatarUrl] = useState(null)
  const [pendingAvatarFile, setPendingAvatarFile] = useState(null)
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState(null)
  const [localAvatarUrl, setLocalAvatarUrl] = useState(null)
  const [localUsername, setLocalUsername] = useState('')
  const [offlineBibleOpen, setOfflineBibleOpen] = useState(false)
  const [shareAppOpen, setShareAppOpen] = useState(false)
  const [rateUsOpen, setRateUsOpen] = useState(false)
  const [whatsNewOpen, setWhatsNewOpen] = useState(false)
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false)
  const [feedbackType, setFeedbackType] = useState('suggestion')
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false)
  const [feedbackSuccess, setFeedbackSuccess] = useState(false)
  const [feedbackSubmitError, setFeedbackSubmitError] = useState('')
  const [deleteAccountModalOpen, setDeleteAccountModalOpen] = useState(false)
  const [deleteAccountSubmitting, setDeleteAccountSubmitting] = useState(false)
  const [deleteAccountError, setDeleteAccountError] = useState('')
  const [themePreference, setThemePreference] = useState('auto')
  const avatarBorderStyle = getAvatarBorderStyle(profile?.supporter_tier, profile?.profile_border)
  const feedbackSuccessTimerRef = useRef(null)
  const fileInputRef = useRef(null)

  const openFeedbackModal = () => {
    setFeedbackType('suggestion')
    setFeedbackText('')
    setFeedbackSuccess(false)
    setFeedbackSubmitError('')
    setFeedbackModalOpen(true)
  }

  const closeFeedbackModal = () => {
    if (feedbackSuccessTimerRef.current) {
      clearTimeout(feedbackSuccessTimerRef.current)
      feedbackSuccessTimerRef.current = null
    }
    setFeedbackModalOpen(false)
    setFeedbackSubmitting(false)
    setFeedbackSuccess(false)
    setFeedbackSubmitError('')
  }


  const submitFeedback = async () => {
    const webhook = import.meta.env.VITE_DISCORD_FEEDBACK_WEBHOOK_URL
    const trimmed = feedbackText.trim()
    if (!trimmed) return
    if (!webhook || typeof webhook !== 'string') {
      setFeedbackSubmitError('Feedback is not available right now. Please try again later.')
      console.error('VITE_DISCORD_FEEDBACK_WEBHOOK_URL is not set')
      return
    }
    const typeLabel = FEEDBACK_TYPES.find((x) => x.id === feedbackType)?.label || feedbackType
    setFeedbackSubmitError('')
    setFeedbackSubmitting(true)
    try {
      const res = await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [
            {
              title: '\u{1F4EC} New App Feedback',
              color: 0xd4a843,
              fields: [
                { name: '\u{1F4CB} Type', value: typeLabel, inline: true },
                { name: '\u{1F4F1} Platform', value: 'Web/PWA', inline: true },
                {
                  name: '\u{1F464} User',
                  value: `${user?.email || 'Unknown'}\nID: ${user?.id || 'Unknown'}`,
                  inline: true,
                },
                {
                  name: '\u{1F464} Username',
                  value: profile?.username || profile?.display_name || 'No username set',
                  inline: true,
                },
                { name: '\u{1F4AC} Message', value: trimmed.slice(0, FEEDBACK_MAX_LEN) },
              ],
              footer: { text: 'Abiding Anchor Feedback' },
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      })
      if (!res.ok) throw new Error(`Discord webhook ${res.status}`)
      setFeedbackSuccess(true)
      setFeedbackSubmitting(false)
      if (feedbackSuccessTimerRef.current) clearTimeout(feedbackSuccessTimerRef.current)
      feedbackSuccessTimerRef.current = setTimeout(() => {
        feedbackSuccessTimerRef.current = null
        closeFeedbackModal()
      }, 2000)
    } catch (e) {
      console.error('Feedback submit failed:', e)
      setFeedbackSubmitting(false)
      setFeedbackSubmitError('Could not send feedback. Please try again.')
    }
  }

  useEffect(() => {
    return () => {
      if (feedbackSuccessTimerRef.current) clearTimeout(feedbackSuccessTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!feedbackModalOpen && !deleteAccountModalOpen && !offlineBibleOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [feedbackModalOpen, deleteAccountModalOpen, offlineBibleOpen])

  useEffect(() => {
    if (!user?.id) return
    const loadAvatar = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url, username')
        .eq('id', user.id)
        .maybeSingle()
      if (data?.avatar_url) setLocalAvatarUrl(data.avatar_url)
      setLocalUsername(data?.username || '')
    }
    loadAvatar()
  }, [user?.id])

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

  // Load theme preference — manual selection takes priority over auto
  useEffect(() => {
    const manualPref = readManualThemePreference()
    const savedPreference = manualPref || readThemePreferenceFromStorage()
    setThemePreference(savedPreference || 'auto')
  }, [])

  const handleThemePreferenceChange = (value) => {
    setThemePreference(value)
    writeThemePreferenceToStorage(value)
    if (value === 'auto') {
      clearManualThemePreference()
    } else {
      writeManualThemePreference(value)
    }
    emitThemePreferenceChanged()
  }


  const handleSignOut = async () => {
    await signOut()
    navigate('/auth', { replace: true })
  }

  const handleLanguageChange = async (code) => {
    try {
      await i18nHook.changeLanguage(code)
      localStorage.setItem(LANGUAGE_STORAGE_KEY, code)
      // Show toast
      const toast = document.createElement('div')
      toast.textContent = 'Language updated'
      toast.style.cssText = `
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(212, 168, 67, 0.95);
        color: #0a1432;
        padding: 12px 24px;
        border-radius: 12px;
        font-size: 14px;
        font-weight: 600;
        z-index: 10060;
        animation: fadeInUp 0.3s ease;
      `
      document.body.appendChild(toast)
      setTimeout(() => {
        toast.remove()
      }, 2500)
    } catch (error) {
      console.error('Language change error:', error)
    }
  }

  const handleConfirmDeleteAccount = async () => {
    setDeleteAccountError('')
    setDeleteAccountSubmitting(true)
    try {
      const { error } = await supabase.rpc('delete_user')
      if (error) {
        console.error('delete_user RPC:', error)
        setDeleteAccountError(error.message || t('settings.deleteAccountError'))
        return
      }
      try {
        await signOut()
      } catch {
        /* session may already be invalid */
      }
      setDeleteAccountModalOpen(false)
      navigate('/auth', { replace: true })
    } catch (e) {
      console.error(e)
      setDeleteAccountError(t('settings.deleteAccountError'))
    } finally {
      setDeleteAccountSubmitting(false)
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
      return t('settings.imageTypeError')
    }
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return t('settings.imageSizeError')
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
      setUploadError(t('settings.uploadErrorGeneric'))
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

  const nightRowStyle = dayTheme ? null : {
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(15, 20, 45, 0.88)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderTop: '1px solid rgba(212,175,55,0.2)',
    borderRight: '1px solid rgba(212,175,55,0.2)',
    borderBottom: '1px solid rgba(212,175,55,0.2)',
    borderLeft: '4px solid rgba(212,175,55,0.35)',
    borderRadius: '14px',
    padding: '14px 16px',
    marginBottom: '8px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
    width: '100%',
    cursor: 'pointer',
    boxSizing: 'border-box',
    textAlign: 'left',
  }

  const displayName =
    localUsername ||
    profile?.username ||
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    t('common.user')
  const avatarUrl = avatarPreviewUrl || localAvatarUrl || profile?.avatar_url
  const settingsBackButtonStyle = {
    width: '36px',
    height: '36px',
    background: 'rgba(212,168,67,0.15)',
    border: '1px solid rgba(212,168,67,0.3)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: '#1A1A1A',
    fontSize: '18px',
  }

  const showComingSoonToast = useCallback((message = 'Coming soon') => {
    const toast = document.createElement('div')
    toast.textContent = message
    toast.style.cssText = `
      position: fixed;
      bottom: 100px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(212, 168, 67, 0.95);
      color: #1A1A1A;
      padding: 12px 24px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      z-index: 10060;
      animation: fadeInUp 0.3s ease;
    `
    document.body.appendChild(toast)
    setTimeout(() => toast.remove(), 2500)
  }, [])

  return (
    <div
      className="content-scroll content-scroll--nav-clear"
      style={{
        padding: '60px 16px 120px',
        maxWidth: '680px',
        margin: '0 auto',
        width: '100%',
        minHeight: '100dvh',
        boxSizing: 'border-box',
      }}
    >
      <style>{`
        @keyframes settings-avatar-spin {
          to { transform: rotate(360deg); }
        }
        ${SHIMMER_KEYFRAMES}
        ${SUPPORTER_BORDER_KEYFRAMES}
        .st-row {
          display: flex; align-items: center;
          padding: 14px 16px;
          border-top: 1px solid rgba(212,175,55,0.2);
          border-right: 1px solid rgba(212,175,55,0.2);
          border-bottom: 1px solid rgba(212,175,55,0.2);
          border-left: 4px solid rgba(212,175,55,0.35);
          border-radius: 14px;
          margin-bottom: 8px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.2);
          background: rgba(15,20,45,0.85) !important;
          backdrop-filter: blur(12px) !important;
          -webkit-backdrop-filter: blur(12px) !important;
          width: 100%; cursor: pointer; box-sizing: border-box; text-align: left;
        }
        .st-row-day {
          display: flex; align-items: center;
          padding: 14px 16px;
          border-top: 1px solid rgba(180,140,60,0.3);
          border-right: 1px solid rgba(180,140,60,0.3);
          border-bottom: 1px solid rgba(180,140,60,0.3);
          border-left: 4px solid rgba(180,140,60,0.5);
          border-radius: 14px;
          margin-bottom: 8px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.08);
          background: rgba(255,252,240,0.85);
          width: 100%; cursor: pointer; box-sizing: border-box; text-align: left;
        }
        .st-icon {
          width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center; font-size: 18px;
        }
        .st-label { font-size: 15px; font-weight: 600; color: rgba(255,255,255,0.9); margin: 0; }
        .st-label-day { font-size: 15px; font-weight: 600; color: #1C1008; margin: 0; }
        .st-sub { font-size: 12px; color: rgba(255,255,255,0.45); margin: 3px 0 0 0; }
        .st-sub-day { font-size: 12px; color: rgba(100,70,20,0.6); margin: 3px 0 0 0; }
        .st-chevron { color: rgba(212,175,55,0.5); font-size: 20px; }
        .st-select {
          background: rgba(15,20,45,0.8); backdrop-filter: blur(8px);
          border: 1px solid rgba(212,175,55,0.35); border-radius: 10px;
          color: #E8D5A3; font-weight: 500; padding: 8px 28px 8px 12px;
          width: 100%; margin-top: 6px; appearance: none; -webkit-appearance: none; font-size: 13px;
          cursor: pointer;
        }
        .st-select-day {
          background: rgba(255,252,240,0.9);
          border: 1px solid rgba(180,140,60,0.4); border-radius: 10px;
          color: #1C1008; font-weight: 500; padding: 8px 28px 8px 12px;
          width: 100%; margin-top: 6px; appearance: none; -webkit-appearance: none; font-size: 13px;
          cursor: pointer;
        }
        .st-select-wrap { position: relative; }
        .st-select-wrap::after {
          content: '\u25bc'; position: absolute; right: 10px; top: 50%;
          transform: translateY(-50%); color: rgba(212,175,55,0.7);
          font-size: 10px; pointer-events: none;
        }
        .st-section-hdr { display: flex; align-items: center; margin-top: 24px; margin-bottom: 10px; }
      `}</style>
      <section>

        {/* SECTION 1 - PROFILE CARD */}
        <div
          style={dayTheme ? {
            borderTop: '1px solid rgba(212,175,55,0.45)',
            borderRight: '1px solid rgba(212,175,55,0.45)',
            borderBottom: '1px solid rgba(212,175,55,0.45)',
            borderLeft: '4px solid rgba(212,175,55,0.6)',
            borderRadius: '20px',
            boxShadow: '0 0 30px rgba(212,175,55,0.12), 0 4px 20px rgba(0,0,0,0.3)',
            padding: '16px',
            marginBottom: '24px',
          } : {
            background: 'rgba(15, 20, 45, 1.0)',
            borderTop: '1px solid rgba(212,175,55,0.35)',
            borderRight: '1px solid rgba(212,175,55,0.35)',
            borderBottom: '1px solid rgba(212,175,55,0.35)',
            borderLeft: '4px solid rgba(212,175,55,0.6)',
            borderRadius: '20px',
            padding: '16px',
            boxShadow: '0 0 30px rgba(212,175,55,0.12), 0 4px 20px rgba(0,0,0,0.3)',
            marginBottom: '8px',
            isolation: 'isolate',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ position: 'relative' }}>
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: '#D4A843',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid rgba(212,175,55,0.6)',
                  boxShadow: '0 0 16px rgba(212,175,55,0.4)',
                  cursor: 'pointer',
                  ...avatarBorderStyle,
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
                    fontSize: '24px',
                    fontWeight: 600,
                    zIndex: 0,
                  }}
                >
                  {displayName.charAt(0).toUpperCase()}
                </span>
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={t('common.profile')}
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
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: '#D4A843',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  border: '2px solid rgba(212,168,67,0.4)',
                  fontSize: '12px'
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
            <div style={{ flex: 1 }}>
              <p style={{ color: '#D4AF37', fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>
                <span style={nameStyle}>{displayName}</span>
              </p>
              <p style={{ color: 'rgba(212,175,55,0.6)', fontSize: '13px', marginBottom: '8px' }}>
                @{localUsername || 'user'}
              </p>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(180,100,0,0.2))',
                  border: '1px solid rgba(212,175,55,0.5)',
                  borderRadius: '999px',
                  fontSize: '12px',
                  color: '#FFD700',
                  fontWeight: 600,
                  paddingLeft: '12px',
                  paddingRight: '12px',
                  paddingTop: '4px',
                  paddingBottom: '4px',
                }}
              >
                🔥 {Math.max(0, Number(profile?.reading_streak) || 0)} {t('settings.dayStreak')}
              </div>
            </div>
            <div
              onClick={() => navigate('/edit-profile')}
              style={{
                color: 'rgba(212,175,55,0.6)',
                fontSize: '24px',
                cursor: 'pointer',
                padding: '8px',
              }}
            >
              ›
            </div>
          </div>
          {pendingAvatarFile && (
            <div
              className="settings-avatar-wrap"
              style={{
                marginTop: '16px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(212,168,67,0.2)',
                borderRadius: '12px',
                padding: '14px 16px',
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
                {t('common.cancel')}
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
                {t('settings.savePhoto')}
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
              color: '#ffffff',
              fontSize: '14px'
            }}>
              {uploadError}
            </div>
          )}
        </div>

        {/* SECTION 2 - ACCOUNT */}
        <div className="st-section-hdr">
          <div style={{ width: '20px', height: '2px', background: 'rgba(212,175,55,0.4)', marginRight: '8px', flexShrink: 0 }} />
          <p style={{ fontSize: '11px', letterSpacing: '0.2em', color: 'rgba(212,175,55,0.7)', textTransform: 'uppercase', fontWeight: 700, margin: 0, fontFamily: 'Georgia, serif', whiteSpace: 'nowrap' }}>{t('settings.sectionAccount')}</p>
          <div style={{ flex: 1, height: '1px', background: 'rgba(212,175,55,0.15)', marginLeft: '8px' }} />
        </div>
        <div style={{ marginBottom: '8px' }}>
          {/* Edit Profile */}
          <button
            type="button"
            className={dayTheme ? 'st-row-day' : ''}
            style={nightRowStyle || undefined}
            onClick={() => navigate('/edit-profile')}
          >
            <div className="st-icon" style={{ background: 'linear-gradient(135deg, #4A90D9, #2C5F8A)' }}>👤</div>
            <div style={{ marginLeft: '14px', flex: 1 }}>
              <p className={dayTheme ? 'st-label-day' : 'st-label'}>{t('settings.editProfile')}</p>
            </div>
            <span className="st-chevron">›</span>
          </button>
          {/* Notifications */}
          <button
            type="button"
            className={dayTheme ? 'st-row-day' : ''}
            style={nightRowStyle || undefined}
            onClick={() => navigate('/notifications-settings')}
          >
            <div className="st-icon" style={{ background: 'linear-gradient(135deg, #D4A843, #8B6914)' }}>🔔</div>
            <div style={{ marginLeft: '14px', flex: 1 }}>
              <p className={dayTheme ? 'st-label-day' : 'st-label'}>{t('settings.notifications')}</p>
            </div>
            <span className="st-chevron">›</span>
          </button>
          {/* App Language */}
          <div
            className={dayTheme ? 'st-row-day' : ''}
            style={dayTheme ? { alignItems: 'flex-start' } : { ...nightRowStyle, alignItems: 'flex-start' }}
          >
            <div className="st-icon" style={{ background: 'linear-gradient(135deg, #43A89A, #2C6B64)', marginTop: '2px' }}>🌐</div>
            <div style={{ marginLeft: '14px', flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <p className={dayTheme ? 'st-label-day' : 'st-label'}>{t('settings.uiLanguage')}</p>
              <div className="st-select-wrap">
              <select
                value={(i18nHook.resolvedLanguage || i18nHook.language || 'en').split('-')[0]}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className={dayTheme ? 'st-select-day' : 'st-select'}
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="hi">Hindi</option>
                <option value="pt">Portuguese</option>
                <option value="de">German</option>
                <option value="zh">Chinese (Simplified)</option>
                <option value="ko">Korean</option>
                <option value="ru">Russian</option>
                <option value="it">Italian</option>
                <option value="tl">Tagalog</option>
                <option value="ro">Romanian</option>
              </select>
              </div>
            </div>
          </div>
          {/* Theme Preference */}
          <div
            className={dayTheme ? 'st-row-day' : ''}
            style={nightRowStyle || undefined}
          >
            <div className="st-icon" style={{ background: 'linear-gradient(135deg, #9B59B6, #6C3483)' }}>🌅</div>
            <div style={{ marginLeft: '14px', flex: 1 }}>
              <p className={dayTheme ? 'st-label-day' : 'st-label'}>Theme</p>
            </div>
            <div className="st-select-wrap" style={{ minWidth: '110px' }}>
            <select
              value={themePreference}
              onChange={(e) => handleThemePreferenceChange(e.target.value)}
              className={dayTheme ? 'st-select-day' : 'st-select'}
              style={{ marginTop: 0 }}
            >
              <option value="auto">Auto</option>
              <option value="day">Day</option>
              <option value="evening">Evening</option>
              <option value="night">Night</option>
            </select>
            </div>
          </div>
        </div>

        {/* SECTION 3 - READING */}
        <div className="st-section-hdr">
          <div style={{ width: '20px', height: '2px', background: 'rgba(212,175,55,0.4)', marginRight: '8px', flexShrink: 0 }} />
          <p style={{ fontSize: '11px', letterSpacing: '0.2em', color: 'rgba(212,175,55,0.7)', textTransform: 'uppercase', fontWeight: 700, margin: 0, fontFamily: 'Georgia, serif', whiteSpace: 'nowrap' }}>{t('settings.sectionReading')}</p>
          <div style={{ flex: 1, height: '1px', background: 'rgba(212,175,55,0.15)', marginLeft: '8px' }} />
        </div>
        <div style={{ marginBottom: '8px' }}>
          {/* Offline Bible */}
          <button
            type="button"
            className={dayTheme ? 'st-row-day' : ''}
            style={nightRowStyle || undefined}
            onClick={() => setOfflineBibleOpen(true)}
          >
            <div className="st-icon" style={{ background: 'linear-gradient(135deg, #E74C3C, #922B21)' }}>📥</div>
            <div style={{ marginLeft: '14px', flex: 1, textAlign: 'left' }}>
              <p className={dayTheme ? 'st-label-day' : 'st-label'}>Offline Bible</p>
              <p className={dayTheme ? 'st-sub-day' : 'st-sub'}>Download Bible books to read without internet</p>
            </div>
            <span className="st-chevron">›</span>
          </button>
        </div>

        {/* SECTION 4 - COMMUNITY */}
        <div className="st-section-hdr">
          <div style={{ width: '20px', height: '2px', background: 'rgba(212,175,55,0.4)', marginRight: '8px', flexShrink: 0 }} />
          <p style={{ fontSize: '11px', letterSpacing: '0.2em', color: 'rgba(212,175,55,0.7)', textTransform: 'uppercase', fontWeight: 700, margin: 0, fontFamily: 'Georgia, serif', whiteSpace: 'nowrap' }}>{t('settings.sectionCommunity')}</p>
          <div style={{ flex: 1, height: '1px', background: 'rgba(212,175,55,0.15)', marginLeft: '8px' }} />
        </div>
        <div style={{ marginBottom: '8px' }}>
          {/* Public Profile */}
          <button
            type="button"
            className={dayTheme ? 'st-row-day' : ''}
            style={nightRowStyle || undefined}
            onClick={() => showComingSoonToast('Coming Soon')}
          >
            <div className="st-icon" style={{ background: 'linear-gradient(135deg, #27AE60, #1A6B3C)' }}>🌍</div>
            <div style={{ marginLeft: '14px', flex: 1 }}>
              <p className={dayTheme ? 'st-label-day' : 'st-label'}>{t('settings.publicProfile')}</p>
            </div>
            <span className="st-chevron">›</span>
          </button>
        </div>

        {/* SECTION 5 - SUPPORT */}
        <div className="st-section-hdr">
          <div style={{ width: '20px', height: '2px', background: 'rgba(212,175,55,0.4)', marginRight: '8px', flexShrink: 0 }} />
          <p style={{ fontSize: '11px', letterSpacing: '0.2em', color: 'rgba(212,175,55,0.7)', textTransform: 'uppercase', fontWeight: 700, margin: 0, fontFamily: 'Georgia, serif', whiteSpace: 'nowrap' }}>{t('settings.sectionSupport')}</p>
          <div style={{ flex: 1, height: '1px', background: 'rgba(212,175,55,0.15)', marginLeft: '8px' }} />
        </div>
        <div style={{ marginBottom: '8px' }}>
          {/* Share App */}
          <button
            type="button"
            className={dayTheme ? 'st-row-day' : ''}
            style={nightRowStyle || undefined}
            onClick={() => setShareAppOpen(true)}
          >
            <div className="st-icon" style={{ background: 'linear-gradient(135deg, #D4AF37, #8B6914)' }}>📤</div>
            <div style={{ marginLeft: '14px', flex: 1 }}>
              <p className={dayTheme ? 'st-label-day' : 'st-label'}>{t('settings.shareApp')}</p>
            </div>
            <span className="st-chevron">›</span>
          </button>
          {/* Rate Us */}
          <button
            type="button"
            className={dayTheme ? 'st-row-day' : ''}
            style={nightRowStyle || undefined}
            onClick={() => setRateUsOpen(true)}
          >
            <div className="st-icon" style={{ background: 'linear-gradient(135deg, #F59E0B, #B45309)' }}>⭐</div>
            <div style={{ marginLeft: '14px', flex: 1 }}>
              <p className={dayTheme ? 'st-label-day' : 'st-label'}>{t('settings.rateUs')}</p>
            </div>
            <span className="st-chevron">›</span>
          </button>
          {/* Contact Support */}
          <button
            type="button"
            className={dayTheme ? 'st-row-day' : ''}
            style={nightRowStyle || undefined}
            onClick={openFeedbackModal}
          >
            <div className="st-icon" style={{ background: 'linear-gradient(135deg, #6366F1, #4338CA)' }}>💬</div>
            <div style={{ marginLeft: '14px', flex: 1 }}>
              <p className={dayTheme ? 'st-label-day' : 'st-label'}>{t('settings.contactSupport')}</p>
            </div>
            <span className="st-chevron">›</span>
          </button>
        </div>

        {/* SECTION 6 - ABOUT */}
        <div className="st-section-hdr">
          <div style={{ width: '20px', height: '2px', background: 'rgba(212,175,55,0.4)', marginRight: '8px', flexShrink: 0 }} />
          <p style={{ fontSize: '11px', letterSpacing: '0.2em', color: 'rgba(212,175,55,0.7)', textTransform: 'uppercase', fontWeight: 700, margin: 0, fontFamily: 'Georgia, serif', whiteSpace: 'nowrap' }}>{t('settings.sectionAbout')}</p>
          <div style={{ flex: 1, height: '1px', background: 'rgba(212,175,55,0.15)', marginLeft: '8px' }} />
        </div>
        <div style={{ marginBottom: '8px' }}>
          {/* What's New */}
          <button
            type="button"
            className={dayTheme ? 'st-row-day' : ''}
            style={nightRowStyle || undefined}
            onClick={() => setWhatsNewOpen(true)}
          >
            <div className="st-icon" style={{ background: 'linear-gradient(135deg, #6366F1, #4338CA)' }}>📢</div>
            <div style={{ marginLeft: '14px', flex: 1 }}>
              <p className={dayTheme ? 'st-label-day' : 'st-label'}>{t('settings.whatsNew')}</p>
            </div>
            <span className="st-chevron">›</span>
          </button>
          {/* Privacy Policy */}
          <Link
            to="/privacy"
            className={dayTheme ? 'st-row-day' : ''}
            style={dayTheme ? { textDecoration: 'none' } : { ...nightRowStyle, textDecoration: 'none' }}
          >
            <div className="st-icon" style={{ background: 'linear-gradient(135deg, #475569, #2D3748)' }}>🔒</div>
            <div style={{ marginLeft: '14px', flex: 1 }}>
              <p className={dayTheme ? 'st-label-day' : 'st-label'}>{t('settings.privacyPolicy')}</p>
            </div>
            <span className="st-chevron">›</span>
          </Link>
          {/* Terms of Service */}
          <Link
            to="/legal"
            className={dayTheme ? 'st-row-day' : ''}
            style={dayTheme ? { textDecoration: 'none' } : { ...nightRowStyle, textDecoration: 'none' }}
          >
            <div className="st-icon" style={{ background: 'linear-gradient(135deg, #10B981, #065F46)' }}>📄</div>
            <div style={{ marginLeft: '14px', flex: 1 }}>
              <p className={dayTheme ? 'st-label-day' : 'st-label'}>{t('settings.termsOfService')}</p>
            </div>
            <span className="st-chevron">›</span>
          </Link>
          {/* Version */}
          <div className={dayTheme ? 'st-row-day' : ''} style={nightRowStyle || undefined}>
            <div className="st-icon" style={{ background: 'linear-gradient(135deg, #6B7280, #374151)' }}>ℹ️</div>
            <div style={{ marginLeft: '14px', flex: 1 }}>
              <p className={dayTheme ? 'st-label-day' : 'st-label'}>{t('settings.version')}</p>
            </div>
            <span style={{ color: 'rgba(212,175,55,0.4)', fontSize: '14px' }}>1.0.0</span>
          </div>
        </div>

        {/* SIGN OUT BUTTON */}
        <button
          type="button"
          onClick={handleSignOut}
          style={{
            width: '100%',
            minHeight: '52px',
            background: 'rgba(220,50,50,0.12)',
            border: '1px solid rgba(220,50,50,0.3)',
            borderRadius: '12px',
            color: '#ff6b6b',
            fontSize: '16px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: 'pointer',
            marginBottom: '24px',
          }}
        >
          🚪 {t('settings.signOut')}
        </button>
      </section>

      {feedbackModalOpen ? (
        <div
          className="fixed inset-0 z-[10050] flex items-center justify-center p-4"
          style={{ background: 'var(--glass-scrim)' }}
          role="dialog"
          aria-modal="true"
          aria-labelledby={feedbackSuccess ? 'settings-feedback-success' : 'settings-feedback-title'}
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default border-0"
            style={{ background: 'transparent' }}
            aria-label={t('common.close')}
            onClick={() => !feedbackSubmitting && closeFeedbackModal()}
          />
          <div
            className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl shadow-2xl"
            style={{
              background: 'var(--modal-bg)',
              border: '1px solid var(--glass-border)',
              boxShadow: 'var(--glass-shadow)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '20px',
              paddingTop: '8px',
            }}>
              <button
                type="button"
                onClick={closeFeedbackModal}
                style={settingsBackButtonStyle}
              >
                ←
              </button>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <span style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff' }}>
                  Contact Support
                </span>
              </div>
              <div style={{ width: '40px' }} />
            </div>
            {feedbackSuccess ? (
              <div className="px-5 pb-6 text-center">
                <p
                  id="settings-feedback-success"
                  className="text-base font-semibold leading-relaxed"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Thank you! Feedback sent {'\u{1F64F}'}
                </p>
              </div>
            ) : (
              <div className="px-5 pb-6">
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  Help us improve Abiding Anchor {'\u{1F64F}'}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {FEEDBACK_TYPES.map(({ id, label }) => {
                    const active = feedbackType === id
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setFeedbackType(id)}
                        className="rounded-full border px-3 py-2 text-xs font-medium transition"
                        style={{
                          borderColor: active ? 'var(--gold-border, rgba(212,168,67,0.55))' : 'var(--glass-border)',
                          background: active ? 'var(--gold-glow, rgba(212,168,67,0.2))' : 'var(--input-bg, rgba(255,255,255,0.06))',
                          color: 'var(--text-primary)',
                        }}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>

                <label className="mt-4 block">
                  <span className="sr-only">Feedback message</span>
                  <textarea
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value.slice(0, FEEDBACK_MAX_LEN))}
                    maxLength={FEEDBACK_MAX_LEN}
                    rows={5}
                    placeholder="Share your thoughts..."
                    className="w-full resize-none rounded-xl px-3 py-3 text-sm outline-none"
                    style={{
                      background: 'var(--input-bg)',
                      border: '1px solid var(--input-border)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </label>
                <p className="mt-1 text-right text-xs" style={{ color: 'var(--text-muted)' }}>
                  {feedbackText.length}/{FEEDBACK_MAX_LEN}
                </p>

                {feedbackSubmitError ? (
                  <p className="mt-3 text-sm" style={{ color: '#f87171' }}>
                    {feedbackSubmitError}
                  </p>
                ) : null}

                <button
                  type="button"
                  disabled={feedbackSubmitting || !feedbackText.trim()}
                  onClick={submitFeedback}
                  className="mt-4 w-full rounded-xl border-0 py-3 text-base font-semibold transition disabled:opacity-50"
                  style={{
                    background: 'var(--btn-primary-bg)',
                    color: 'var(--btn-primary-text)',
                  }}
                >
                  {feedbackSubmitting ? 'Sending…' : 'Submit'}
                </button>
                <button
                  type="button"
                  disabled={feedbackSubmitting}
                  onClick={closeFeedbackModal}
                  className="mt-3 w-full rounded-xl border py-3 text-base font-medium transition disabled:opacity-50"
                  style={{
                    borderColor: 'var(--glass-border)',
                    background: 'transparent',
                    color: 'var(--text-primary)',
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {deleteAccountModalOpen ? (
        <div
          className="fixed inset-0 z-[10050] flex items-center justify-center p-4"
          style={{ background: 'var(--glass-scrim)' }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-delete-account-title"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default border-0"
            style={{ background: 'transparent' }}
            aria-label={t('common.close')}
            onClick={() => !deleteAccountSubmitting && setDeleteAccountModalOpen(false)}
          />
          <div
            className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl shadow-2xl"
            style={{
              background: 'var(--modal-bg)',
              border: '1px solid var(--glass-border)',
              boxShadow: 'var(--glass-shadow)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '20px',
              paddingTop: '8px',
            }}>
              <button
                type="button"
                onClick={() => setDeleteAccountModalOpen(false)}
                style={settingsBackButtonStyle}
              >
                ←
              </button>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <span style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff' }}>
                  Delete Account
                </span>
              </div>
              <div style={{ width: '40px' }} />
            </div>
            <div className="px-5 pb-6">
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {t('settings.deleteAccountConfirmBody')}
              </p>
              {deleteAccountError ? (
                <p className="mt-3 text-sm" style={{ color: '#f87171' }}>
                  {deleteAccountError}
                </p>
              ) : null}
              <button
                type="button"
                disabled={deleteAccountSubmitting}
                onClick={handleConfirmDeleteAccount}
                className="mt-5 w-full rounded-xl border py-3 text-base font-semibold transition disabled:opacity-50"
                style={{
                  border: '1px solid rgba(140, 80, 80, 0.55)',
                  background: 'rgba(120, 55, 55, 0.65)',
                  color: 'var(--text-primary)',
                }}
              >
                {deleteAccountSubmitting ? t('settings.deleteAccountDeleting') : t('settings.deleteAccountConfirmButton')}
              </button>
              <button
                type="button"
                disabled={deleteAccountSubmitting}
                onClick={() => setDeleteAccountModalOpen(false)}
                className="mt-3 w-full rounded-xl border py-3 text-base font-medium transition disabled:opacity-50"
                style={{
                  borderColor: 'var(--glass-border)',
                  background: 'transparent',
                  color: 'var(--text-primary)',
                }}
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Offline Bible Modal */}
      {offlineBibleOpen ? (
        <div
          className="fixed inset-0 z-[10050] flex items-center justify-center p-4"
          style={{ background: 'var(--glass-scrim)' }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-offline-bible-title"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default border-0"
            style={{ background: 'transparent' }}
            aria-label={t('common.close')}
            onClick={() => setOfflineBibleOpen(false)}
          />
          <div
            className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl shadow-2xl"
            style={{
              background: 'var(--app-bg, var(--modal-bg))',
              border: '1px solid var(--glass-border)',
              boxShadow: 'var(--glass-shadow)',
              maxHeight: '85dvh',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '10px',
              paddingTop: '8px',
              paddingLeft: '12px',
              paddingRight: '12px',
            }}>
              <button
                type="button"
                onClick={() => setOfflineBibleOpen(false)}
                style={settingsBackButtonStyle}
              >
                ←
              </button>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <span id="settings-offline-bible-title" style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff' }}>
                  Offline Bible
                </span>
              </div>
              <div style={{ width: '40px' }} />
            </div>
            <div style={{ maxHeight: 'calc(85dvh - 56px)', overflowY: 'auto' }}>
              <OfflineManager />
            </div>
          </div>
        </div>
      ) : null}

      {/* Share App Modal */}
      {shareAppOpen ? (
        <div
          className="fixed inset-0 z-[10050] flex items-center justify-center p-4"
          style={{ background: 'var(--glass-scrim)' }}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default border-0"
            style={{ background: 'transparent' }}
            aria-label={t('common.close')}
            onClick={() => setShareAppOpen(false)}
          />
          <div
            className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl shadow-2xl"
            style={{
              background: 'var(--modal-bg)',
              border: '1px solid var(--glass-border)',
              boxShadow: 'var(--glass-shadow)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '20px',
              paddingTop: '8px',
            }}>
              <button
                type="button"
                onClick={() => setShareAppOpen(false)}
                style={settingsBackButtonStyle}
              >
                ←
              </button>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <span style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff' }}>
                  Share App
                </span>
              </div>
              <div style={{ width: '40px' }} />
            </div>
            <div className="px-5 pb-6">
              <button
                type="button"
                onClick={async () => {
                  const shareData = {
                    title: 'Abiding Anchor',
                    text: "I've been using Abiding Anchor for Bible study and prayer. It's free forever and has no ads! Check it out:",
                    url: 'https://www.abidinganchor.com'
                  }
                  
                  try {
                    if (navigator.share) {
                      await navigator.share(shareData)
                    } else {
                      await navigator.clipboard.writeText(shareData.url)
                      const toast = document.createElement('div')
                      toast.textContent = 'Link copied to clipboard!'
                      toast.style.cssText = `
                        position: fixed;
                        bottom: 100px;
                        left: 50%;
                        transform: translateX(-50%);
                        background: rgba(212, 168, 67, 0.95);
                        color: #0a1432;
                        padding: 12px 24px;
                        border-radius: 12px;
                        font-size: 14px;
                        font-weight: 600;
                        z-index: 10060;
                        animation: fadeInUp 0.3s ease;
                      `
                      document.body.appendChild(toast)
                      setTimeout(() => toast.remove(), 2500)
                    }
                    setShareAppOpen(false)
                  } catch (error) {
                    console.error('Share error:', error)
                  }
                }}
                style={{
                  width: '100%',
                  minHeight: '52px',
                  background: '#D4A843',
                  border: '1px solid #D4A843',
                  borderRadius: '12px',
                  color: '#0a1428',
                  fontSize: '16px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                }}
              >
                📤 Share Now
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Rate Us Modal */}
      {rateUsOpen ? (
        <div
          className="fixed inset-0 z-[10050] flex items-center justify-center p-4"
          style={{ background: 'var(--glass-scrim)' }}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default border-0"
            style={{ background: 'transparent' }}
            aria-label={t('common.close')}
            onClick={() => setRateUsOpen(false)}
          />
          <div
            className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl shadow-2xl"
            style={{
              background: 'var(--modal-bg)',
              border: '1px solid var(--glass-border)',
              boxShadow: 'var(--glass-shadow)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '20px',
              paddingTop: '8px',
            }}>
              <button
                type="button"
                onClick={() => setRateUsOpen(false)}
                style={settingsBackButtonStyle}
              >
                ←
              </button>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <span style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff' }}>
                  Rate Us
                </span>
              </div>
              <div style={{ width: '40px' }} />
            </div>
            <div className="px-5 pb-6">
              <button
                type="button"
                onClick={() => window.open('https://play.google.com/store/apps/details?id=com.abideapp.bible', '_blank')}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  background: 'rgba(212, 168, 67, 0.2)',
                  border: '1px solid rgba(212, 168, 67, 0.5)',
                  borderRadius: '12px',
                  color: '#D4A843',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                }}
              >
                <span style={{ fontSize: '20px' }}>⭐</span>
                Rate on Google Play Store
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* What's New Modal */}
      {whatsNewOpen ? (
        <div
          className="fixed inset-0 z-[10050] flex items-center justify-center p-4"
          style={{ background: 'var(--glass-scrim)' }}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default border-0"
            style={{ background: 'transparent' }}
            aria-label={t('common.close')}
            onClick={() => setWhatsNewOpen(false)}
          />
          <div
            className="whats-new-modal relative z-10 w-full max-w-md rounded-2xl shadow-2xl"
            style={{
              background: 'transparent',
              border: '1px solid var(--glass-border)',
              boxShadow: 'var(--glass-shadow)',
              maxHeight: '85dvh',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="whats-new-modal__sky-gradient"
              aria-hidden
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 0,
                background: `
                  linear-gradient(
                    to bottom,
                    #B8D9F0 0%,
                    #87CEEB 30%,
                    #D4EEFF 60%,
                    #FFF5E6 100%
                  )
                `,
              }}
            />
            <div
              className="whats-new-modal__sky-glow"
              aria-hidden
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 0,
                background: 'radial-gradient(ellipse at 75% 8%, rgba(255, 240, 150, 0.55) 0%, transparent 45%)',
              }}
            />
            <div style={{ position: 'relative', zIndex: 1, overflowY: 'auto', maxHeight: '85dvh', WebkitOverflowScrolling: 'touch' }}>
              <div
                className="whats-new-modal__header"
                style={{
                  position: 'relative',
                  zIndex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  marginBottom: '12px',
                  paddingTop: '72px',
                }}
              >
              <button
                type="button"
                onClick={() => setWhatsNewOpen(false)}
                style={{
                  ...settingsBackButtonStyle,
                  position: 'absolute',
                  left: '12px',
                  top: '24px',
                }}
              >
                ←
              </button>
              <span style={{ fontSize: '32px', lineHeight: 1, marginBottom: '8px' }}>🎉</span>
              <span
                className="whats-new-modal__title"
                style={{ fontSize: '28px', fontWeight: 700, color: '#1A1A1A', textAlign: 'center' }}
              >
                What&apos;s New
              </span>
              <span
                className="whats-new-modal__tagline"
                style={{ color: '#8B6200', textAlign: 'center', fontSize: '14px', marginTop: '4px' }}
              >
                AbidingAnchor keeps getting better 🙏
              </span>
            </div>
            <div className="px-5 pb-6" style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[
                  {
                    version: '1.3.0',
                    latest: true,
                    items: [
                      'Fixed daily streak calculation and display',
                      'Added Hindi translations throughout the app',
                      'Implemented notification settings with toggles',
                      'Added font size options for Bible reading',
                      'Implemented native share functionality',
                    ],
                  },
                  {
                    version: '1.2.0',
                    latest: false,
                    items: [
                      'Weekly Spiritual Recap with AI summary',
                      'Wall of Honor for supporters',
                      'Ministry transparency dashboard',
                      'Improved onboarding flow',
                      'Bug fixes and performance improvements',
                    ],
                  },
                ].map((entry) => (
                  <div
                    key={entry.version}
                    className="whats-new-changelog-card"
                    style={{
                      position: 'relative',
                      background: '#F0E8D4',
                      borderRadius: '20px',
                      border: '1.5px solid rgba(212,168,67,0.35)',
                      padding: '20px',
                      marginBottom: '16px',
                    }}
                  >
                    {entry.latest ? (
                      <span
                        className="whats-new-latest-badge"
                        style={{
                          position: 'absolute',
                          top: '10px',
                          right: '10px',
                          background: '#D4A843',
                          color: '#1A1A1A',
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '3px 10px',
                          borderRadius: '50px',
                        }}
                      >
                        LATEST
                      </span>
                    ) : null}
                    <span
                      className="whats-new-version-pill"
                      style={{
                        background: '#D4A843',
                        color: '#1A1A1A',
                        borderRadius: '50px',
                        padding: '4px 14px',
                        fontSize: '12px',
                        fontWeight: 700,
                        display: 'inline-block',
                        marginBottom: '12px',
                      }}
                    >
                      Version {entry.version}
                    </span>
                    <div>
                      {entry.items.map((item, index) => (
                        <div
                          key={item}
                          className="whats-new-changelog-row"
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '8px',
                            padding: '6px 0',
                            borderBottom: index === entry.items.length - 1 ? 'none' : '1px solid rgba(212,168,67,0.15)',
                          }}
                        >
                          <span className="whats-new-item-bullet" style={{ color: '#D4A843', flexShrink: 0 }}>✦</span>
                          <span style={{ color: '#1A1A1A', fontSize: '14px' }}>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
