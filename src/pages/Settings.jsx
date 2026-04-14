import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { userStorageKey } from '../utils/userStorage'
import { getAvatarUploadExtension } from '../utils/avatarUrl'
import { LocalNotifications } from '@capacitor/local-notifications'
import i18n, { LANGUAGE_STORAGE_KEY } from '../i18n.js'

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
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false)
  const [feedbackType, setFeedbackType] = useState('suggestion')
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false)
  const [feedbackSuccess, setFeedbackSuccess] = useState(false)
  const [feedbackSubmitError, setFeedbackSubmitError] = useState('')
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
    if (!feedbackModalOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [feedbackModalOpen])

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
    const savedEnabled = localStorage.getItem(userStorageKey(user.id, 'daily-reminder-enabled'))
    const savedTime = localStorage.getItem(userStorageKey(user.id, 'reminder-time'))

    if (savedEnabled !== null) {
      setDailyReminderEnabled(savedEnabled === 'true')
    }
    if (savedTime) {
      setReminderTime(savedTime)
    }
  }, [user?.id])

  const scheduleNotifications = useCallback(async () => {
    try {
      await LocalNotifications.cancel()

      const [hours, minutes] = reminderTime.split(':').map(Number)
      const notifications = []
      
      for (let day = 0; day < 7; day++) {
        const now = new Date()
        const scheduledDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() + day,
          hours,
          minutes,
          0
        )
        
        if (scheduledDate <= now) {
          scheduledDate.setDate(scheduledDate.getDate() + 7)
        }
        
        notifications.push({
          id: day + 1,
          title: i18n.t('settings.notificationTitle'),
          body: i18n.t(`settings.notify${day}`),
          schedule: {
            at: scheduledDate,
            repeats: true,
            every: 'day',
          },
          sound: 'default',
          smallIcon: 'ic_stat_icon_config_sample',
          largeIcon: 'ic_launcher',
          extra: {
            route: '/journal',
          },
        })
      }
      
      await LocalNotifications.schedule({ notifications })
    } catch (error) {
      console.error('Error scheduling notifications:', error)
    }
  }, [reminderTime])

  const handleDailyReminderToggle = async () => {
    const newValue = !dailyReminderEnabled
    setDailyReminderEnabled(newValue)
    if (user?.id) localStorage.setItem(userStorageKey(user.id, 'daily-reminder-enabled'), newValue.toString())
    
    if (newValue) {
      await scheduleNotifications()
    } else {
      await LocalNotifications.cancel()
    }
  }

  const handleTimeChange = async (e) => {
    const newTime = e.target.value
    setReminderTime(newTime)
    if (user?.id) localStorage.setItem(userStorageKey(user.id, 'reminder-time'), newTime)
    
    if (dailyReminderEnabled) {
      await scheduleNotifications()
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/auth', { replace: true })
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
    <div className="content-scroll" style={{ padding: '0 16px', paddingTop: '110px', paddingBottom: '110px', maxWidth: '680px', margin: '0 auto', width: '100%' }}>
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
          
          {dailyReminderEnabled && (
            <div>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginBottom: '8px' }}>
                {t('settings.reminderTime')}
              </p>
              <input
                type="time"
                value={reminderTime}
                onChange={handleTimeChange}
                style={{
                  width: '100%',
                  borderRadius: '12px',
                  padding: '12px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid ' + (dailyReminderEnabled ? 'rgba(212,168,67,0.4)' : 'rgba(255,255,255,0.12)'),
                  color: 'var(--text-primary)',
                  fontSize: '16px',
                  cursor: 'pointer'
                }}
              />
            </div>
          )}
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
    </div>
  )
}
