import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { getAvatarUploadExtension } from '../utils/avatarUrl'
import { LANGUAGE_STORAGE_KEY, SUPPORTED_LANGS } from '../i18n.js'
import {
  cancelUniversalReminder,
  persistReminderToSupabase,
  readReminderFromSupabase,
  readReminderLocal,
  requestUniversalNotificationPermission,
  scheduleUniversalReminder,
  writeReminderLocal,
} from '../services/universalNotifications'

const UI_LANG_META = {
  en: { flagIso: 'us', abbr: 'EN', labelKey: 'langEn', fallbackLabel: 'English' },
  es: { flagIso: 'es', abbr: 'ES', labelKey: 'langEs', fallbackLabel: 'Spanish' },
  pt: { flagIso: 'br', abbr: 'PT', labelKey: 'langPt', fallbackLabel: 'Portuguese' },
  fr: { flagIso: 'fr', abbr: 'FR', labelKey: 'langFr', fallbackLabel: 'French' },
  de: { flagIso: 'de', abbr: 'DE', labelKey: 'langDe', fallbackLabel: 'German' },
  tl: { flagIso: 'ph', abbr: 'TL', labelKey: 'langTl', fallbackLabel: 'Filipino' },
  ko: { flagIso: 'kr', abbr: 'KO', labelKey: 'langKo', fallbackLabel: 'Korean' },
  hi: { flagIso: 'in', abbr: 'HI', labelKey: 'langHi', fallbackLabel: 'Hindi' },
  it: { flagIso: 'it', abbr: 'IT', labelKey: 'langIt', fallbackLabel: 'Italian' },
  ru: { flagIso: 'ru', abbr: 'RU', labelKey: 'langRu', fallbackLabel: 'Russian' },
  ro: { flagIso: 'ro', abbr: 'RO', labelKey: 'langRo', fallbackLabel: 'Romanian' },
  zh: { flagIso: 'cn', abbr: 'ZH', labelKey: 'langZh', fallbackLabel: 'Chinese' },
}

const UI_LANG_OPTIONS = SUPPORTED_LANGS
  .map((code) => {
    const meta = UI_LANG_META[code]
    if (!meta) return null
    return { code, ...meta }
  })
  .filter(Boolean)

const BIBLE_TRANSLATION_OPTIONS = [
  { value: 'WEB', labelKey: 'bible.web' },
  { value: 'KJV', labelKey: 'bible.kjv' },
  { value: 'ASV', labelKey: 'bible.asv' },
  { value: 'WEBBE', labelKey: 'bible.webbe' },
  { value: 'BBE', labelKey: 'bible.bbe' },
  { value: 'Darby', labelKey: 'bible.darby' },
]

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
  const [selectedTranslation] = useState('WEB')
  const [uploadStatus, setUploadStatus] = useState('idle') // idle, uploading, success
  const [uploadError, setUploadError] = useState('')
  const [pendingAvatarUrl, setPendingAvatarUrl] = useState(null)
  const [pendingAvatarFile, setPendingAvatarFile] = useState(null)
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState(null)
  const [localAvatarUrl, setLocalAvatarUrl] = useState(null)
  const [localUsername, setLocalUsername] = useState('')
  const [dailyReminderEnabled, setDailyReminderEnabled] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [languageOpen, setLanguageOpen] = useState(false)
  const [translationOpen, setTranslationOpen] = useState(false)
  const [fontSizeOpen, setFontSizeOpen] = useState(false)
  const [publicProfileOpen, setPublicProfileOpen] = useState(false)
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
    if (!feedbackModalOpen && !deleteAccountModalOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [feedbackModalOpen, deleteAccountModalOpen])

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

  // Load daily reminder preferences from localStorage (per user)
  useEffect(() => {
    if (!user?.id) return
    const localPrefs = readReminderLocal(user.id)
    setDailyReminderEnabled(localPrefs.enabled)

    readReminderFromSupabase(user.id).then((cloudPrefs) => {
      if (!cloudPrefs) return
      setDailyReminderEnabled(cloudPrefs.enabled)
      writeReminderLocal(user.id, cloudPrefs)
    }).catch((error) => {
      console.warn('Unable to read reminder preferences from Supabase:', error)
    })
  }, [user?.id])

  const scheduleNotifications = useCallback(async () => {
    try {
      await scheduleUniversalReminder({ time: '08:00', userId: user?.id })
    } catch (error) {
      console.error('Error scheduling notifications:', error)
    }
  }, [user?.id])

  const handleDailyReminderToggle = async () => {
    const newValue = !dailyReminderEnabled
    setDailyReminderEnabled(newValue)
    if (user?.id) {
      writeReminderLocal(user.id, { enabled: newValue, time: '08:00' })
      await persistReminderToSupabase(user.id, { enabled: newValue, time: '08:00' })
    }

    if (newValue) {
      const permission = await requestUniversalNotificationPermission({ userGesture: true })
      if (permission === 'gesture-required') {
        setDailyReminderEnabled(false)
        if (user?.id) writeReminderLocal(user.id, { enabled: false, time: '08:00' })
        return
      }
      if (permission !== 'granted') {
        setDailyReminderEnabled(false)
        if (user?.id) writeReminderLocal(user.id, { enabled: false, time: '08:00' })
        return
      }
      await scheduleNotifications()
    } else {
      try {
        await cancelUniversalReminder()
      } catch (e) {
        console.error('Error canceling reminders:', e)
      }
    }
  }


  const handleSignOut = async () => {
    await signOut()
    navigate('/auth', { replace: true })
  }

  const handleLanguageChange = async (code) => {
    try {
      await i18nHook.changeLanguage(code)
      localStorage.setItem(LANGUAGE_STORAGE_KEY, code)
      setLanguageOpen(false)
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

  const displayName =
    localUsername ||
    profile?.username ||
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    t('common.user')
  const avatarUrl = avatarPreviewUrl || localAvatarUrl || profile?.avatar_url

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
        background: 'var(--card-bg)',
      }}
    >
      <style>{`
        @keyframes settings-avatar-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <section>

        {/* SECTION 1 - PROFILE CARD */}
        <div
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(212,168,67,0.2)',
            borderRadius: '16px',
            backdropFilter: 'blur(12px)',
            padding: '20px',
            marginBottom: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ position: 'relative' }}>
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: '#D4A843',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid #D4A843',
                  cursor: 'pointer',
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
              <p style={{ color: '#ffffff', fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>
                {displayName}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', marginBottom: '8px' }}>
                @{localUsername || 'user'}
              </p>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  background: 'rgba(212,168,67,0.15)',
                  border: '1px solid rgba(212,168,67,0.4)',
                  borderRadius: '50px',
                  fontSize: '12px',
                  color: '#D4A843',
                  paddingLeft: '10px',
                  paddingRight: '10px',
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
                color: '#D4A843',
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
        <p style={{
          fontSize: '11px',
          letterSpacing: '1.5px',
          color: 'rgba(212,168,67,0.7)',
          textTransform: 'uppercase',
          marginBottom: '8px',
          fontWeight: 600,
        }}>
          {t('settings.sectionAccount')}
        </p>
        <div style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(212,168,67,0.2)',
          borderRadius: '16px',
          backdropFilter: 'blur(12px)',
          marginBottom: '24px',
        }}>
          {/* Edit Profile */}
          <button
            type="button"
            onClick={() => navigate('/edit-profile')}
            style={{
              minHeight: '52px',
              display: 'flex',
              alignItems: 'center',
              padding: '0 16px',
              width: '100%',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(212,168,67,0.1)',
              color: '#D4A843',
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              👤
            </div>
            <div style={{ marginLeft: '14px', flex: 1 }}>
              <p style={{ fontSize: '15px', color: '#ffffff', fontWeight: 500, margin: 0 }}>
                {t('settings.editProfile')}
              </p>
            </div>
            <span style={{ color: '#D4A843', fontSize: '18px' }}>›</span>
          </button>
          {/* Notifications */}
          <button
            type="button"
            onClick={() => setNotificationsOpen(true)}
            style={{
              minHeight: '52px',
              display: 'flex',
              alignItems: 'center',
              padding: '0 16px',
              width: '100%',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(212,168,67,0.1)',
              color: '#D4A843',
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              🔔
            </div>
            <div style={{ marginLeft: '14px', flex: 1 }}>
              <p style={{ fontSize: '15px', color: '#ffffff', fontWeight: 500, margin: 0 }}>
                {t('settings.notifications')}
              </p>
            </div>
            <span style={{ color: '#D4A843', fontSize: '18px' }}>›</span>
          </button>
          {/* App Language */}
          <button
            type="button"
            onClick={() => setLanguageOpen(true)}
            style={{
              minHeight: '52px',
              display: 'flex',
              alignItems: 'center',
              padding: '0 16px',
              width: '100%',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(212,168,67,0.1)',
              color: '#D4A843',
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              🌐
            </div>
            <div style={{ marginLeft: '14px', flex: 1 }}>
              <p style={{ fontSize: '15px', color: '#ffffff', fontWeight: 500, margin: 0 }}>
                {t('settings.uiLanguage')}
              </p>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', margin: '3px 0 0 0' }}>
                {(i18nHook.resolvedLanguage || i18nHook.language || 'en').toUpperCase()}
              </p>
            </div>
            <span style={{ color: '#D4A843', fontSize: '18px' }}>›</span>
          </button>
        </div>

        {/* SECTION 3 - READING */}
        <p style={{
          fontSize: '11px',
          letterSpacing: '1.5px',
          color: 'rgba(212,168,67,0.7)',
          textTransform: 'uppercase',
          marginBottom: '8px',
          fontWeight: 600,
        }}>
          {t('settings.sectionReading')}
        </p>
        <div style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(212,168,67,0.2)',
          borderRadius: '16px',
          backdropFilter: 'blur(12px)',
          marginBottom: '24px',
        }}>
          {/* Bible Translation */}
          <button
            type="button"
            onClick={() => setTranslationOpen(true)}
            style={{
              minHeight: '52px',
              display: 'flex',
              alignItems: 'center',
              padding: '0 16px',
              width: '100%',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(212,168,67,0.1)',
              color: '#D4A843',
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              📖
            </div>
            <div style={{ marginLeft: '14px', flex: 1 }}>
              <p style={{ fontSize: '15px', color: '#ffffff', fontWeight: 500, margin: 0 }}>
                {t('settings.bibleTranslation')}
              </p>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', margin: '3px 0 0 0' }}>
                {selectedTranslation}
              </p>
            </div>
            <span style={{ color: '#D4A843', fontSize: '18px' }}>›</span>
          </button>
          {/* Font Size */}
          <button
            type="button"
            onClick={() => setFontSizeOpen(true)}
            style={{
              minHeight: '52px',
              display: 'flex',
              alignItems: 'center',
              padding: '0 16px',
              width: '100%',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(212,168,67,0.1)',
              color: '#D4A843',
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              🔤
            </div>
            <div style={{ marginLeft: '14px', flex: 1 }}>
              <p style={{ fontSize: '15px', color: '#ffffff', fontWeight: 500, margin: 0 }}>
                {t('settings.fontSize')}
              </p>
            </div>
            <span style={{ color: '#D4A843', fontSize: '18px' }}>›</span>
          </button>
          {/* Reading Reminders */}
          <div
            onClick={handleDailyReminderToggle}
            style={{
              minHeight: '52px',
              display: 'flex',
              alignItems: 'center',
              padding: '0 16px',
              width: '100%',
              cursor: 'pointer',
            }}
          >
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(212,168,67,0.1)',
              color: '#D4A843',
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              ⏰
            </div>
            <div style={{ marginLeft: '14px', flex: 1 }}>
              <p style={{ fontSize: '15px', color: '#ffffff', fontWeight: 500, margin: 0 }}>
                {t('settings.dailyReminder')}
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleDailyReminderToggle(); }}
              style={{
                width: '52px',
                height: '28px',
                borderRadius: '14px',
                background: dailyReminderEnabled ? '#D4A843' : 'rgba(255,255,255,0.15)',
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
                left: dailyReminderEnabled ? '27px' : '3px',
                transition: 'left 0.2s ease'
              }} />
            </button>
          </div>
        </div>

        {/* SECTION 4 - COMMUNITY */}
        <p style={{
          fontSize: '11px',
          letterSpacing: '1.5px',
          color: 'rgba(212,168,67,0.7)',
          textTransform: 'uppercase',
          marginBottom: '8px',
          fontWeight: 600,
        }}>
          {t('settings.sectionCommunity')}
        </p>
        <div style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(212,168,67,0.2)',
          borderRadius: '16px',
          backdropFilter: 'blur(12px)',
          marginBottom: '24px',
        }}>
          {/* Public Profile */}
          <button
            type="button"
            onClick={() => setPublicProfileOpen(true)}
            style={{
              minHeight: '52px',
              display: 'flex',
              alignItems: 'center',
              padding: '0 16px',
              width: '100%',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(212,168,67,0.1)',
              color: '#D4A843',
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              🌍
            </div>
            <div style={{ marginLeft: '14px', flex: 1 }}>
              <p style={{ fontSize: '15px', color: '#ffffff', fontWeight: 500, margin: 0 }}>
                {t('settings.publicProfile')}
              </p>
            </div>
            <span style={{ color: '#D4A843', fontSize: '18px' }}>›</span>
          </button>
          {/* Ministry Supporter */}
          <button
            type="button"
            onClick={() => window.open('https://abidinganchor.com/support', '_blank', 'noopener,noreferrer')}
            style={{
              minHeight: '52px',
              display: 'flex',
              alignItems: 'center',
              padding: '0 16px',
              width: '100%',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(212,168,67,0.1)',
              color: '#D4A843',
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              ⭐
            </div>
            <div style={{ marginLeft: '14px', flex: 1 }}>
              <p style={{ fontSize: '15px', color: '#ffffff', fontWeight: 500, margin: 0 }}>
                {t('settings.ministrySupporter')}
              </p>
              {profile?.is_supporter && (
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', margin: '3px 0 0 0' }}>
                  {t('settings.active')}
                </p>
              )}
            </div>
            <span style={{ color: '#D4A843', fontSize: '18px' }}>›</span>
          </button>
        </div>

        {/* SECTION 5 - SUPPORT */}
        <p style={{
          fontSize: '11px',
          letterSpacing: '1.5px',
          color: 'rgba(212,168,67,0.7)',
          textTransform: 'uppercase',
          marginBottom: '8px',
          fontWeight: 600,
        }}>
          {t('settings.sectionSupport')}
        </p>
        <div style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(212,168,67,0.2)',
          borderRadius: '16px',
          backdropFilter: 'blur(12px)',
          marginBottom: '24px',
        }}>
          {/* Share App */}
          <button
            type="button"
            onClick={() => setShareAppOpen(true)}
            style={{
              minHeight: '52px',
              display: 'flex',
              alignItems: 'center',
              padding: '0 16px',
              width: '100%',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(212,168,67,0.1)',
              color: '#D4A843',
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              📤
            </div>
            <div style={{ marginLeft: '14px', flex: 1 }}>
              <p style={{ fontSize: '15px', color: '#ffffff', fontWeight: 500, margin: 0 }}>
                {t('settings.shareApp')}
              </p>
            </div>
            <span style={{ color: '#D4A843', fontSize: '18px' }}>›</span>
          </button>
          {/* Rate Us */}
          <button
            type="button"
            onClick={() => setRateUsOpen(true)}
            style={{
              minHeight: '52px',
              display: 'flex',
              alignItems: 'center',
              padding: '0 16px',
              width: '100%',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(212,168,67,0.1)',
              color: '#D4A843',
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              ⭐
            </div>
            <div style={{ marginLeft: '14px', flex: 1 }}>
              <p style={{ fontSize: '15px', color: '#ffffff', fontWeight: 500, margin: 0 }}>
                {t('settings.rateUs')}
              </p>
            </div>
            <span style={{ color: '#D4A843', fontSize: '18px' }}>›</span>
          </button>
          {/* Contact Support */}
          <button
            type="button"
            onClick={openFeedbackModal}
            style={{
              minHeight: '52px',
              display: 'flex',
              alignItems: 'center',
              padding: '0 16px',
              width: '100%',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(212,168,67,0.1)',
              color: '#D4A843',
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              💬
            </div>
            <div style={{ marginLeft: '14px', flex: 1 }}>
              <p style={{ fontSize: '15px', color: '#ffffff', fontWeight: 500, margin: 0 }}>
                {t('settings.contactSupport')}
              </p>
            </div>
            <span style={{ color: '#D4A843', fontSize: '18px' }}>›</span>
          </button>
          {/* Support the Ministry */}
          <button
            type="button"
            onClick={() => window.open('https://abidinganchor.com/support', '_blank', 'noopener,noreferrer')}
            style={{
              minHeight: '52px',
              display: 'flex',
              alignItems: 'center',
              padding: '0 16px',
              width: '100%',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(212,168,67,0.1)',
              color: '#D4A843',
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              🙏
            </div>
            <div style={{ marginLeft: '14px', flex: 1 }}>
              <p style={{ fontSize: '15px', color: '#ffffff', fontWeight: 500, margin: 0 }}>
                {t('settings.supportMinistry')}
              </p>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', margin: '3px 0 0 0' }}>
                {t('settings.supportMinistryDesc')}
              </p>
            </div>
            <span style={{ color: '#D4A843', fontSize: '18px' }}>›</span>
          </button>
        </div>

        {/* SECTION 6 - ABOUT */}
        <p style={{
          fontSize: '11px',
          letterSpacing: '1.5px',
          color: 'rgba(212,168,67,0.7)',
          textTransform: 'uppercase',
          marginBottom: '8px',
          fontWeight: 600,
        }}>
          {t('settings.sectionAbout')}
        </p>
        <div style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(212,168,67,0.2)',
          borderRadius: '16px',
          backdropFilter: 'blur(12px)',
          marginBottom: '24px',
        }}>
          {/* What's New */}
          <button
            type="button"
            onClick={() => setWhatsNewOpen(true)}
            style={{
              minHeight: '52px',
              display: 'flex',
              alignItems: 'center',
              padding: '0 16px',
              width: '100%',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(212,168,67,0.1)',
              color: '#D4A843',
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              🎉
            </div>
            <div style={{ marginLeft: '14px', flex: 1 }}>
              <p style={{ fontSize: '15px', color: '#ffffff', fontWeight: 500, margin: 0 }}>
                {t('settings.whatsNew')}
              </p>
            </div>
            <span style={{ color: '#D4A843', fontSize: '18px' }}>›</span>
          </button>
          {/* Privacy Policy */}
          <Link
            to="/privacy"
            style={{
              minHeight: '52px',
              display: 'flex',
              alignItems: 'center',
              padding: '0 16px',
              width: '100%',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'none',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(212,168,67,0.1)',
              color: '#D4A843',
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              🔒
            </div>
            <div style={{ marginLeft: '14px', flex: 1 }}>
              <p style={{ fontSize: '15px', color: '#ffffff', fontWeight: 500, margin: 0 }}>
                {t('settings.privacyPolicy')}
              </p>
            </div>
            <span style={{ color: '#D4A843', fontSize: '18px' }}>›</span>
          </Link>
          {/* Terms of Service */}
          <Link
            to="/legal"
            style={{
              minHeight: '52px',
              display: 'flex',
              alignItems: 'center',
              padding: '0 16px',
              width: '100%',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'none',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(212,168,67,0.1)',
              color: '#D4A843',
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              📄
            </div>
            <div style={{ marginLeft: '14px', flex: 1 }}>
              <p style={{ fontSize: '15px', color: '#ffffff', fontWeight: 500, margin: 0 }}>
                {t('settings.termsOfService')}
              </p>
            </div>
            <span style={{ color: '#D4A843', fontSize: '18px' }}>›</span>
          </Link>
          {/* Version */}
          <div style={{
            minHeight: '52px',
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            width: '100%',
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(212,168,67,0.1)',
              color: '#D4A843',
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              ℹ️
            </div>
            <div style={{ marginLeft: '14px', flex: 1 }}>
              <p style={{ fontSize: '15px', color: '#ffffff', fontWeight: 500, margin: 0 }}>
                {t('settings.version')}
              </p>
            </div>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>1.0.0</span>
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
                style={{
                  width: '40px',
                  height: '40px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(212,168,67,0.3)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#D4A843',
                  fontSize: '20px',
                }}
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
                style={{
                  width: '40px',
                  height: '40px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(212,168,67,0.3)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#D4A843',
                  fontSize: '20px',
                }}
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

      {/* Notifications Modal */}
      {notificationsOpen ? (
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
            onClick={() => setNotificationsOpen(false)}
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
                onClick={() => setNotificationsOpen(false)}
                style={{
                  width: '40px',
                  height: '40px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(212,168,67,0.3)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#D4A843',
                  fontSize: '20px',
                }}
              >
                ←
              </button>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <span style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff' }}>
                  Notifications
                </span>
              </div>
              <div style={{ width: '40px' }} />
            </div>
            <div className="px-5 pb-6">
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {/* Row 1: Daily Reminder */}
                <div
                  onClick={handleDailyReminderToggle}
                  style={{
                    minHeight: '52px',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 16px',
                    width: '100%',
                    cursor: 'pointer',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'rgba(212,168,67,0.1)',
                    color: '#D4A843',
                    fontSize: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    🔔
                  </div>
                  <div style={{ marginLeft: '14px', flex: 1 }}>
                    <p style={{ fontSize: '15px', color: '#ffffff', fontWeight: 500, margin: 0 }}>
                      Daily Reminder
                    </p>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', margin: '3px 0 0 0' }}>
                      Get reminded to read the Bible
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleDailyReminderToggle(); }}
                    style={{
                      width: '52px',
                      height: '28px',
                      borderRadius: '14px',
                      background: dailyReminderEnabled ? '#D4A843' : 'rgba(255,255,255,0.15)',
                      border: 'none',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'background 0.2s ease'
                    }}
                  >
                    <div style={{
                      position: 'absolute',
                      top: '2px',
                      left: dailyReminderEnabled ? '26px' : '2px',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: '#ffffff',
                      transition: 'left 0.2s ease'
                    }} />
                  </button>
                </div>

                {/* Row 2: Reminder Time */}
                <div
                  style={{
                    minHeight: '52px',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 16px',
                    width: '100%',
                    cursor: 'pointer',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'rgba(212,168,67,0.1)',
                    color: '#D4A843',
                    fontSize: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    ⏰
                  </div>
                  <div style={{ marginLeft: '14px', flex: 1 }}>
                    <p style={{ fontSize: '15px', color: '#ffffff', fontWeight: 500, margin: 0 }}>
                      Reminder Time
                    </p>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', margin: '3px 0 0 0' }}>
                      08:00 AM
                    </p>
                  </div>
                  <span style={{ color: '#D4A843', fontSize: '18px' }}>›</span>
                </div>

                {/* Row 3: Fellowship Notifications */}
                <div
                  style={{
                    minHeight: '52px',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 16px',
                    width: '100%',
                    cursor: 'pointer',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'rgba(212,168,67,0.1)',
                    color: '#D4A843',
                    fontSize: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    👥
                  </div>
                  <div style={{ marginLeft: '14px', flex: 1 }}>
                    <p style={{ fontSize: '15px', color: '#ffffff', fontWeight: 500, margin: 0 }}>
                      Fellowship Notifications
                    </p>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', margin: '3px 0 0 0' }}>
                      New posts in your group
                    </p>
                  </div>
                  <button
                    type="button"
                    style={{
                      width: '52px',
                      height: '28px',
                      borderRadius: '14px',
                      background: 'rgba(255,255,255,0.15)',
                      border: 'none',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'background 0.2s ease'
                    }}
                  >
                    <div style={{
                      position: 'absolute',
                      top: '2px',
                      left: '2px',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: '#ffffff',
                      transition: 'left 0.2s ease'
                    }} />
                  </button>
                </div>

                {/* Row 4: Prayer Notifications */}
                <div
                  style={{
                    minHeight: '52px',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 16px',
                    width: '100%',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'rgba(212,168,67,0.1)',
                    color: '#D4A843',
                    fontSize: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    🙏
                  </div>
                  <div style={{ marginLeft: '14px', flex: 1 }}>
                    <p style={{ fontSize: '15px', color: '#ffffff', fontWeight: 500, margin: 0 }}>
                      Prayer Notifications
                    </p>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', margin: '3px 0 0 0' }}>
                      Updates on your prayers
                    </p>
                  </div>
                  <button
                    type="button"
                    style={{
                      width: '52px',
                      height: '28px',
                      borderRadius: '14px',
                      background: 'rgba(255,255,255,0.15)',
                      border: 'none',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'background 0.2s ease'
                    }}
                  >
                    <div style={{
                      position: 'absolute',
                      top: '2px',
                      left: '2px',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: '#ffffff',
                      transition: 'left 0.2s ease'
                    }} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* App Language Modal */}
      {languageOpen ? (
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
            onClick={() => setLanguageOpen(false)}
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
                onClick={() => setLanguageOpen(false)}
                style={{
                  width: '40px',
                  height: '40px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(212,168,67,0.3)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#D4A843',
                  fontSize: '20px',
                }}
              >
                ←
              </button>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <span style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff' }}>
                  App Language
                </span>
              </div>
              <div style={{ width: '40px' }} />
            </div>
            <div className="px-5 pb-6">
              <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
                Current: {(i18nHook.resolvedLanguage || i18nHook.language || 'en').toUpperCase()}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {UI_LANG_OPTIONS.map((lang) => {
                  const isSelected = (i18nHook.resolvedLanguage || i18nHook.language || 'en') === lang.code
                  const flagEmojis = {
                    us: '🇺🇸',
                    es: '🇪🇸',
                    br: '🇧🇷',
                    fr: '🇫🇷',
                    de: '🇩🇪',
                    ph: '🇵🇭',
                    kr: '🇰🇷',
                    in: '🇮🇳',
                  }
                  const nativeNames = {
                    en: 'English',
                    es: 'Español',
                    pt: 'Português',
                    fr: 'Français',
                    de: 'Deutsch',
                    tl: 'Filipino',
                    ko: '한국어',
                    hi: 'हिंदी',
                    it: 'Italiano',
                    ru: 'Русский',
                    ro: 'Română',
                    zh: '中文',
                  }
                  const useTextInitials = ['it', 'ru', 'ro', 'zh'].includes(lang.code)
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => handleLanguageChange(lang.code)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '16px',
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                        cursor: 'pointer',
                        background: 'none',
                        border: 'none',
                        width: '100%',
                        textAlign: 'left',
                      }}
                    >
                      {useTextInitials ? (
                        <span style={{
                          fontSize: '14px',
                          fontWeight: 700,
                          color: 'white',
                          width: '32px',
                          height: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'rgba(255,255,255,0.08)',
                          borderRadius: '8px',
                        }}>
                          {lang.abbr}
                        </span>
                      ) : (
                        <span style={{ fontSize: '24px' }}>{flagEmojis[lang.flagIso] || '🌐'}</span>
                      )}
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '16px', color: '#ffffff', fontWeight: 500, margin: 0 }}>
                          {lang.fallbackLabel}
                        </p>
                        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', margin: '3px 0 0 0' }}>
                          {nativeNames[lang.code] || lang.fallbackLabel}
                        </p>
                      </div>
                      {isSelected && (
                        <span style={{ color: '#D4A843', fontSize: '20px', fontWeight: 700 }}>✓</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Bible Translation Modal */}
      {translationOpen ? (
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
            onClick={() => setTranslationOpen(false)}
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
                onClick={() => setTranslationOpen(false)}
                style={{
                  width: '40px',
                  height: '40px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(212,168,67,0.3)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#D4A843',
                  fontSize: '20px',
                }}
              >
                ←
              </button>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <span style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff' }}>
                  Bible Translation
                </span>
              </div>
              <div style={{ width: '40px' }} />
            </div>
            <div className="px-5 pb-6">
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Current: {selectedTranslation}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Font Size Modal */}
      {fontSizeOpen ? (
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
            onClick={() => setFontSizeOpen(false)}
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
                onClick={() => setFontSizeOpen(false)}
                style={{
                  width: '40px',
                  height: '40px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(212,168,67,0.3)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#D4A843',
                  fontSize: '20px',
                }}
              >
                ←
              </button>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <span style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff' }}>
                  Font Size
                </span>
              </div>
              <div style={{ width: '40px' }} />
            </div>
            <div className="px-5 pb-6">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {['Small', 'Medium', 'Large', 'X-Large', 'XX-Large'].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => {
                      localStorage.setItem('bible_font_size', size)
                      setFontSizeOpen(false)
                    }}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px',
                      background: size === 'Medium' ? '#D4A843' : 'rgba(255,255,255,0.06)',
                      border: size === 'Medium' ? 'none' : '1px solid #D4A843',
                      color: size === 'Medium' ? '#0a1428' : '#ffffff',
                      fontWeight: size === 'Medium' ? 700 : 400,
                      fontSize: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Public Profile Modal */}
      {publicProfileOpen ? (
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
            onClick={() => setPublicProfileOpen(false)}
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
                onClick={() => setPublicProfileOpen(false)}
                style={{
                  width: '40px',
                  height: '40px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(212,168,67,0.3)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#D4A843',
                  fontSize: '20px',
                }}
              >
                ←
              </button>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <span style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff' }}>
                  Public Profile
                </span>
              </div>
              <div style={{ width: '40px' }} />
            </div>
            <div className="px-5 pb-6">
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Public profile settings coming soon.
              </p>
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
                style={{
                  width: '40px',
                  height: '40px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(212,168,67,0.3)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#D4A843',
                  fontSize: '20px',
                }}
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
                style={{
                  width: '40px',
                  height: '40px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(212,168,67,0.3)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#D4A843',
                  fontSize: '20px',
                }}
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
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Rate Abiding Anchor on the app store coming soon.
              </p>
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
                onClick={() => setWhatsNewOpen(false)}
                style={{
                  width: '40px',
                  height: '40px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(212,168,67,0.3)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#D4A843',
                  fontSize: '20px',
                }}
              >
                ←
              </button>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <span style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff' }}>
                  What's New
                </span>
              </div>
              <div style={{ width: '40px' }} />
            </div>
            <div className="px-5 pb-6">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 700, color: '#D4A843', margin: '0 0 8px' }}>
                    Version 1.3.0
                  </p>
                  <ul style={{ margin: 0, paddingLeft: '20px', color: 'rgba(255,255,255,0.85)', fontSize: '13px', lineHeight: 1.7 }}>
                    <li>Fixed daily streak calculation and display</li>
                    <li>Added Hindi translations throughout the app</li>
                    <li>Implemented notification settings with toggles</li>
                    <li>Added font size options for Bible reading</li>
                    <li>Implemented native share functionality</li>
                  </ul>
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 700, color: '#D4A843', margin: '0 0 8px' }}>
                    Version 1.2.0
                  </p>
                  <ul style={{ margin: 0, paddingLeft: '20px', color: 'rgba(255,255,255,0.85)', fontSize: '13px', lineHeight: 1.7 }}>
                    <li>Weekly Spiritual Recap with AI summary</li>
                    <li>Wall of Honor for supporters</li>
                    <li>Ministry transparency dashboard</li>
                    <li>Improved onboarding flow</li>
                    <li>Bug fixes and performance improvements</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
