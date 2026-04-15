import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { userStorageKey } from '../utils/userStorage'
import { getAvatarUploadExtension } from '../utils/avatarUrl'
import i18n, { LANGUAGE_STORAGE_KEY } from '../i18n.js'
import {
  cancelUniversalReminder,
  persistReminderToSupabase,
  readReminderFromSupabase,
  readReminderLocal,
  requestUniversalNotificationPermission,
  scheduleUniversalReminder,
  sendTestNotification,
  writeReminderLocal,
} from '../services/universalNotifications'
import { getNotificationPlatform } from '../utils/notificationPlatform'

const UI_LANG_OPTIONS = [
  { code: 'en', flagIso: 'us', abbr: 'EN', labelKey: 'langEn' },
  { code: 'es', flagIso: 'es', abbr: 'ES', labelKey: 'langEs' },
  { code: 'pt', flagIso: 'br', abbr: 'PT', labelKey: 'langPt' },
  { code: 'fr', flagIso: 'fr', abbr: 'FR', labelKey: 'langFr' },
  { code: 'de', flagIso: 'de', abbr: 'DE', labelKey: 'langDe' },
]

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
  const [selectedTranslation, setSelectedTranslation] = useState('WEB')
  const [uploadStatus, setUploadStatus] = useState('idle') // idle, uploading, success
  const [uploadError, setUploadError] = useState('')
  const [pendingAvatarUrl, setPendingAvatarUrl] = useState(null)
  const [pendingAvatarFile, setPendingAvatarFile] = useState(null)
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState(null)
  const [localAvatarUrl, setLocalAvatarUrl] = useState(null)
  const [localUsername, setLocalUsername] = useState('')
  const [dailyReminderEnabled, setDailyReminderEnabled] = useState(false)
  const [reminderTime, setReminderTime] = useState('08:00')
  const [draftReminderTime, setDraftReminderTime] = useState('08:00')
  const [reminderTimeConfirmOpen, setReminderTimeConfirmOpen] = useState(false)
  const [reminderToastText, setReminderToastText] = useState('')
  const [reminderToastVisible, setReminderToastVisible] = useState(false)
  const [reminderPermissionMessage, setReminderPermissionMessage] = useState('')
  const [testNotifRunning, setTestNotifRunning] = useState(false)
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
  const reminderToastTimerRef = useRef(null)
  const fileInputRef = useRef(null)
  const notifPlatform = getNotificationPlatform()

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

  const showReminderToast = useCallback((message) => {
    setReminderToastText(message)
    setReminderToastVisible(true)
    if (reminderToastTimerRef.current) clearTimeout(reminderToastTimerRef.current)
    reminderToastTimerRef.current = setTimeout(() => {
      setReminderToastVisible(false)
      reminderToastTimerRef.current = null
    }, 2200)
  }, [])

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
      if (reminderToastTimerRef.current) clearTimeout(reminderToastTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!feedbackModalOpen && !deleteAccountModalOpen && !reminderTimeConfirmOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [feedbackModalOpen, deleteAccountModalOpen, reminderTimeConfirmOpen])

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
    setReminderTime(localPrefs.time)

    readReminderFromSupabase(user.id).then((cloudPrefs) => {
      if (!cloudPrefs) return
      setDailyReminderEnabled(cloudPrefs.enabled)
      setReminderTime(cloudPrefs.time)
      writeReminderLocal(user.id, cloudPrefs)
    }).catch((error) => {
      console.warn('Unable to read reminder preferences from Supabase:', error)
    })
  }, [user?.id])

  useEffect(() => {
    setDraftReminderTime(reminderTime)
  }, [reminderTime])

  useEffect(() => {
    if (!dailyReminderEnabled) setReminderTimeConfirmOpen(false)
  }, [dailyReminderEnabled])

  const scheduleNotifications = useCallback(async (timeOverride) => {
    try {
      const timeStr = timeOverride ?? reminderTime
      await scheduleUniversalReminder({ time: timeStr, userId: user?.id })
      setReminderPermissionMessage('')
      showReminderToast(`Reminder set for ${formatTimeForReminderConfirm(timeStr)} ✓`)
    } catch (error) {
      console.error('Error scheduling notifications:', error)
      setReminderPermissionMessage('Please enable notifications in your device settings to receive reminders.')
    }
  }, [reminderTime, user?.id])

  const handleDailyReminderToggle = async () => {
    const newValue = !dailyReminderEnabled
    setDailyReminderEnabled(newValue)
    if (user?.id) {
      writeReminderLocal(user.id, { enabled: newValue, time: reminderTime })
      await persistReminderToSupabase(user.id, { enabled: newValue, time: reminderTime })
    }

    if (newValue) {
      const permission = await requestUniversalNotificationPermission({ userGesture: true })
      if (permission === 'gesture-required') {
        setReminderPermissionMessage('Tap again to allow notifications. iOS requires a user action to grant permission.')
        setDailyReminderEnabled(false)
        if (user?.id) writeReminderLocal(user.id, { enabled: false, time: reminderTime })
        return
      }
      if (permission !== 'granted') {
        setReminderPermissionMessage('Please enable notifications in your device settings to receive reminders.')
        setDailyReminderEnabled(false)
        if (user?.id) writeReminderLocal(user.id, { enabled: false, time: reminderTime })
        return
      }
      await scheduleNotifications()
    } else {
      try {
        await cancelUniversalReminder()
        setReminderPermissionMessage('')
      } catch (e) {
        console.error('Error canceling reminders:', e)
      }
    }
  }

  const formatTimeForReminderConfirm = (hhmm) => {
    const parts = hhmm.split(':').map(Number)
    const h = parts[0] ?? 8
    const m = parts[1] ?? 0
    const d = new Date()
    d.setHours(h, m, 0, 0)
    return d.toLocaleTimeString(i18nHook.language, { hour: 'numeric', minute: '2-digit' })
  }

  const handleReminderTimeInputChange = (e) => {
    setDraftReminderTime(e.target.value)
    setReminderTimeConfirmOpen(true)
  }

  const confirmReminderTime = async () => {
    const next = draftReminderTime
    setReminderTime(next)
    if (user?.id) {
      writeReminderLocal(user.id, { enabled: dailyReminderEnabled, time: next })
      await persistReminderToSupabase(user.id, { enabled: dailyReminderEnabled, time: next })
    }
    setReminderTimeConfirmOpen(false)
    if (dailyReminderEnabled) {
      await scheduleNotifications(next)
    } else {
      showReminderToast(`Reminder set for ${formatTimeForReminderConfirm(next)} ✓`)
    }
  }

  const cancelReminderTimeConfirm = () => {
    setDraftReminderTime(reminderTime)
    setReminderTimeConfirmOpen(false)
  }

  const handleSendTestNotification = async () => {
    setTestNotifRunning(true)
    try {
      const permission = await requestUniversalNotificationPermission({ userGesture: true })
      if (permission !== 'granted') {
        setReminderPermissionMessage('Please enable notifications in your device settings to receive reminders.')
        return
      }
      const sent = await sendTestNotification()
      if (sent) showReminderToast('Test notification sent ✓')
    } catch (error) {
      console.error('Failed to send test notification:', error)
      setReminderPermissionMessage('Please enable notifications in your device settings to receive reminders.')
    } finally {
      setTestNotifRunning(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/auth', { replace: true })
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

  const handleReplayTutorial = async () => {
    try {
      // Clear from localStorage (do NOT clear tos_agreed)
      if (user?.id) localStorage.removeItem(userStorageKey(user.id, 'onboarding-complete'))
      
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
  const userEmail = user?.email || ''
  const avatarUrl = avatarPreviewUrl || localAvatarUrl || profile?.avatar_url
  const hasAvatarImage = Boolean(avatarPreviewUrl || localAvatarUrl || profile?.avatar_url)

  return (
    <div
      className="content-scroll content-scroll--nav-clear"
      style={{
        padding: '0 16px',
        paddingTop: '8px',
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
      <section className="space-y-4">
        <header className="space-y-2">
          <p className="text-section-header">{t('settings.sectionLabel')}</p>
          <h1 className="text-page-title">{t('settings.pageTitle')}</h1>
        </header>

        {/* User Profile Card */}
        <div className="glass-panel" style={{
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
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: '#D4A843',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  border: '2px solid var(--glass-border-hover)',
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
              <p style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>
                {displayName}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>
                {userEmail}
              </p>
              {uploadStatus === 'success' && (
                <p style={{ color: '#4ade80', fontSize: '12px', marginTop: '4px' }}>
                  {t('settings.profilePhotoSaved')}
                </p>
              )}
            </div>
          </div>
          {pendingAvatarFile && (
            <div
              className="glass-panel"
              style={{
                marginTop: '16px',
                padding: '14px 16px',
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
              color: 'var(--text-primary)',
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
            {t('settings.guidelines')}
          </p>
        </div>

        {/* Edit Profile Option */}
        <button
          type="button"
          onClick={() => navigate('/edit-profile')}
          className="glass-panel"
          style={{
            width: '100%',
            borderRadius: '16px',
            padding: '16px 20px',
            color: 'var(--text-primary)',
            fontSize: '16px',
            fontWeight: 500,
            cursor: 'pointer',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <span>{t('settings.editProfile')}</span>
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>›</span>
        </button>

        {/* Bible Translation Preference */}
        <div className="glass-panel" style={{
          borderRadius: '16px',
          padding: '16px 20px'
        }}>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginBottom: '8px' }}>
            {t('settings.bibleTranslation')}
          </p>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', marginBottom: '12px', lineHeight: 1.45 }}>
            {t('settings.bibleTranslationHint')}
          </p>
          <select
            value={selectedTranslation}
            onChange={(e) => setSelectedTranslation(e.target.value)}
            className="glass-input-field settings-bible-translation-select"
            style={{
              width: '100%',
              borderRadius: '12px',
              padding: '12px',
              fontSize: '16px',
              cursor: 'pointer',
            }}
          >
            {BIBLE_TRANSLATION_OPTIONS.map(({ value, labelKey }) => (
              <option key={value} value={value}>
                {t(labelKey)}
              </option>
            ))}
          </select>
        </div>

        {/* App language */}
        <div
          className="glass-panel"
          style={{
            borderRadius: '16px',
            padding: '16px 20px',
          }}
        >
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '14px', marginBottom: '8px', fontWeight: 600 }}>
            {t('settings.uiLanguage')}
          </p>
          <p
            style={{
              color: 'rgba(255,255,255,0.55)',
              fontSize: '12px',
              marginBottom: '14px',
              lineHeight: 1.45,
            }}
          >
            {t('settings.uiLanguageNote')}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'flex-start' }}>
            {UI_LANG_OPTIONS.map(({ code, flagIso, abbr, labelKey }) => {
              const active = (i18nHook.resolvedLanguage || i18nHook.language || 'en')
                .toLowerCase()
                .startsWith(code)
              return (
                <button
                  type="button"
                  key={code}
                  aria-label={t(`settings.${labelKey}`)}
                  title={t(`settings.${labelKey}`)}
                  onClick={async () => {
                    try {
                      localStorage.setItem(LANGUAGE_STORAGE_KEY, code)
                    } catch {
                      /* ignore */
                    }
                    await i18n.changeLanguage(code)
                    if (dailyReminderEnabled) await scheduleNotifications()
                  }}
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    minWidth: '88px',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: active ? '2px solid #D4A843' : '1px solid rgba(255,255,255,0.15)',
                    background: active ? 'rgba(212,168,67,0.15)' : 'rgba(255,255,255,0.06)',
                    cursor: 'pointer',
                  }}
                >
                  <span
                    className="inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-white/25"
                    aria-hidden
                  >
                    <img
                      src={`https://flagcdn.com/24x18/${flagIso}.png`}
                      alt=""
                      width={24}
                      height={18}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  </span>
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      lineHeight: 1.15,
                    }}
                  >
                    {abbr}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Daily Reminder */}
        <div className="glass-panel" style={{
          borderRadius: '16px',
          padding: '20px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px'
          }}>
            <div>
              <p style={{ color: '#FFFFFF', fontSize: '16px', fontWeight: 500, marginBottom: '4px' }}>
                {t('settings.dailyReminder')}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>
                {t('settings.dailyReminderDesc')}
              </p>
            </div>
            <button
              type="button"
              onClick={handleDailyReminderToggle}
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

          {notifPlatform.isIos && !notifPlatform.isStandalonePwa ? (
            <p
              style={{
                marginBottom: '10px',
                color: '#D4A843',
                fontSize: '13px',
                lineHeight: 1.4,
              }}
            >
              Add to Home Screen for notifications to work.
            </p>
          ) : null}

          {reminderPermissionMessage ? (
            <p
              style={{
                marginBottom: '10px',
                color: '#fbbf24',
                fontSize: '13px',
                lineHeight: 1.4,
              }}
            >
              {reminderPermissionMessage}
            </p>
          ) : null}
          
          {dailyReminderEnabled && (
            <div>
              <style>
                {`
                  .settings-reminder-time-input {
                    color-scheme: light;
                    width: 100%;
                    border-radius: 12px;
                    padding: 12px 14px;
                    font-size: 16px;
                    cursor: pointer;
                    background: rgba(255, 255, 255, 0.9);
                    border: 1px solid rgba(24, 38, 69, 0.75);
                    color: #142447;
                    box-shadow: inset 0 1px 0 rgba(255,255,255,0.35);
                    -webkit-text-fill-color: #142447;
                  }
                  .settings-reminder-time-input::placeholder {
                    color: rgba(20, 36, 71, 0.72);
                    opacity: 1;
                  }
                  .settings-reminder-time-input::-webkit-calendar-picker-indicator {
                    cursor: pointer;
                    opacity: 1;
                    width: 24px;
                    height: 24px;
                    filter: none;
                    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23D4A843' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='9'/%3E%3Cpath d='M12 7v5l3 2'/%3E%3C/svg%3E");
                    background-size: contain;
                    background-repeat: no-repeat;
                    background-position: center;
                  }
                  .settings-reminder-time-input::-webkit-datetime-edit-fields-wrapper { padding: 0; }
                  .settings-reminder-time-input::-webkit-datetime-edit-text { color: rgba(20, 36, 71, 0.7); padding: 0 3px; }
                  .settings-reminder-time-input::-webkit-datetime-edit-hour-field,
                  .settings-reminder-time-input::-webkit-datetime-edit-minute-field,
                  .settings-reminder-time-input::-webkit-datetime-edit-ampm-field {
                    color: #142447;
                  }
                  .settings-reminder-time-input:focus {
                    outline: none;
                    border-color: rgba(24, 38, 69, 0.95);
                    box-shadow: 0 0 0 2px rgba(24, 38, 69, 0.2);
                  }
                `}
              </style>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginBottom: '8px' }}>
                {t('settings.reminderTime')}
              </p>
              <input
                type="time"
                className="settings-reminder-time-input"
                value={draftReminderTime}
                onChange={handleReminderTimeInputChange}
              />
            </div>
          )}

          <button
            type="button"
            onClick={handleSendTestNotification}
            disabled={testNotifRunning}
            style={{
              marginTop: dailyReminderEnabled ? '12px' : '0',
              width: '100%',
              borderRadius: '12px',
              border: '1px solid #D4AF37',
              background: '#D4AF37',
              color: '#1a1a1a',
              padding: '10px 12px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: testNotifRunning ? 'wait' : 'pointer',
              opacity: testNotifRunning ? 0.75 : 1,
            }}
          >
            {testNotifRunning ? 'Sending test notification...' : 'Send Test Notification'}
          </button>
        </div>

        {/* Replay Tutorial */}
        <button
          type="button"
          onClick={handleReplayTutorial}
          className="glass-panel"
          style={{
            width: '100%',
            borderRadius: '16px',
            padding: '16px 20px',
            color: 'var(--text-primary)',
            fontSize: '16px',
            fontWeight: 500,
            cursor: 'pointer',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <span>{t('settings.replayTutorial')}</span>
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>↺</span>
        </button>

        {/* Feedback */}
        <div>
          <p className="text-section-header" style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span aria-hidden>{'\u{1F4AC}'}</span>
            <span>Feedback</span>
          </p>
          <button
            type="button"
            onClick={openFeedbackModal}
            className="glass-panel"
            style={{
              width: '100%',
              borderRadius: '16px',
              padding: '16px 20px',
              color: 'var(--text-primary)',
              fontSize: '16px',
              fontWeight: 500,
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>Send Feedback</span>
            <span style={{ color: 'rgba(255,255,255,0.4)' }}>→</span>
          </button>
        </div>

        {/* Legal & Privacy */}
        <div>
          <p className="text-section-header" style={{ marginBottom: '10px' }}>
            Legal & Privacy
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Link
              to="/legal"
              className="glass-panel"
              style={{
                width: '100%',
                borderRadius: '16px',
                padding: '16px 20px',
                color: 'var(--text-primary)',
                fontSize: '16px',
                fontWeight: 500,
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                textDecoration: 'none',
                boxSizing: 'border-box',
              }}
            >
              <span>{t('header.legalPage')}</span>
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>→</span>
            </Link>
            <Link
              to="/privacy"
              className="glass-panel"
              style={{
                width: '100%',
                borderRadius: '16px',
                padding: '16px 20px',
                color: 'var(--text-primary)',
                fontSize: '16px',
                fontWeight: 500,
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                textDecoration: 'none',
                boxSizing: 'border-box',
              }}
            >
              <span>{t('header.privacyPolicy')}</span>
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>→</span>
            </Link>
          </div>
        </div>

        {/* About AbidingAnchor */}
        <div className="glass-panel" style={{
          borderRadius: '16px',
          padding: '20px'
        }}>
          <p style={{ color: '#D4A843', fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>
            {t('settings.aboutTitle')}
          </p>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '14px', lineHeight: '1.6', marginBottom: '8px' }}>
            {t('settings.aboutBody')}
          </p>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '14px', lineHeight: '1.6' }}>
            {t('settings.aboutVersion')}
          </p>
        </div>

        {/* Sign Out Button */}
        <button
          type="button"
          onClick={handleSignOut}
          style={{
            width: '100%',
            background: 'rgba(255,80,80,0.9)',
            border: 'none',
            borderRadius: '16px',
            padding: '16px',
            color: 'var(--text-primary)',
            fontSize: '16px',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          {t('settings.signOut')}
        </button>

        <button
          type="button"
          onClick={() => {
            setDeleteAccountError('')
            setDeleteAccountModalOpen(true)
          }}
          style={{
            width: '100%',
            marginTop: '12px',
            background: 'rgba(90, 45, 45, 0.55)',
            border: '1px solid rgba(140, 80, 80, 0.45)',
            borderRadius: '16px',
            padding: '16px',
            color: 'var(--text-primary)',
            fontSize: '16px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {t('settings.deleteAccount')}
        </button>
      </section>

      <div
        aria-live="polite"
        style={{
          position: 'fixed',
          left: '50%',
          bottom: '96px',
          transform: `translateX(-50%) translateY(${reminderToastVisible ? '0' : '10px'})`,
          opacity: reminderToastVisible ? 1 : 0,
          transition: 'opacity 0.2s ease, transform 0.2s ease',
          pointerEvents: 'none',
          zIndex: 10060,
          background: '#D4A843',
          color: '#0a1432',
          fontWeight: 700,
          fontSize: '14px',
          borderRadius: '999px',
          padding: '10px 16px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.28)',
          border: '1px solid rgba(255,255,255,0.35)',
          whiteSpace: 'nowrap',
        }}
      >
        {reminderToastText}
      </div>

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
            {feedbackSuccess ? (
              <div className="px-5 py-10 text-center">
                <p
                  id="settings-feedback-success"
                  className="text-base font-semibold leading-relaxed"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Thank you! Feedback sent {'\u{1F64F}'}
                </p>
              </div>
            ) : (
              <div className="px-5 pb-6 pt-5">
                <h2
                  id="settings-feedback-title"
                  className="m-0 text-lg font-semibold leading-snug"
                  style={{ color: 'var(--gold, #D4A843)' }}
                >
                  Send Feedback {'\u{1F4AC}'}
                </h2>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
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

      {reminderTimeConfirmOpen ? (
        <div
          className="fixed inset-0 z-[10050] flex items-center justify-center p-4"
          style={{ background: 'var(--glass-scrim)' }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-reminder-confirm-title"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default border-0"
            style={{ background: 'transparent' }}
            aria-label={t('common.close')}
            onClick={cancelReminderTimeConfirm}
          />
          <div
            className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl shadow-2xl"
            style={{
              background: 'var(--modal-bg)',
              border: '1px solid rgba(212, 168, 67, 0.35)',
              boxShadow: 'var(--glass-shadow)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 pb-6 pt-5">
              <h2
                id="settings-reminder-confirm-title"
                className="m-0 text-lg font-semibold leading-snug"
                style={{ color: 'var(--gold, #D4A843)' }}
              >
                {t('settings.reminderConfirmTitle', {
                  time: formatTimeForReminderConfirm(draftReminderTime),
                })}
              </h2>
              <button
                type="button"
                onClick={confirmReminderTime}
                className="mt-5 w-full rounded-xl border py-3 text-base font-semibold transition"
                style={{
                  border: '1px solid rgba(212, 168, 67, 0.55)',
                  background: '#D4A843',
                  color: '#0a1432',
                }}
              >
                {t('settings.reminderConfirm')}
              </button>
              <button
                type="button"
                onClick={cancelReminderTimeConfirm}
                className="mt-3 w-full rounded-xl border py-3 text-base font-medium transition"
                style={{
                  borderColor: 'var(--glass-border)',
                  background: 'transparent',
                  color: 'var(--text-primary)',
                }}
              >
                {t('settings.reminderCancel')}
              </button>
            </div>
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
            <div className="px-5 pb-6 pt-5">
              <h2
                id="settings-delete-account-title"
                className="m-0 text-lg font-semibold leading-snug"
                style={{ color: 'var(--gold, #D4A843)' }}
              >
                {t('settings.deleteAccountConfirmTitle')}
              </h2>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
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
    </div>
  )
}
