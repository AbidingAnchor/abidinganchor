import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { userStorageKey } from '../utils/userStorage'
import { scheduleUniversalReminder, cancelUniversalReminder, requestUniversalNotificationPermission, persistReminderToSupabase, readReminderFromSupabase, readReminderLocal, writeReminderLocal } from '../services/universalNotifications'
import { supabase } from '../lib/supabase'

const settingsBackButtonStyle = {
  position: 'absolute',
  left: '12px',
  top: '24px',
  background: 'none',
  border: 'none',
  color: '#1A1A1A',
  fontSize: '24px',
  fontWeight: 600,
  cursor: 'pointer',
  padding: 0,
  zIndex: 10,
}

export default function NotificationsSettings() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [dailyReminderEnabled, setDailyReminderEnabled] = useState(false)
  const [dailyReminderTime, setDailyReminderTime] = useState('08:00')

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

  // Load daily reminder time from localStorage
  useEffect(() => {
    const savedTime = localStorage.getItem('dailyReminderTime')
    if (savedTime) {
      setDailyReminderTime(savedTime)
    }
  }, [])

  const handleDailyReminderToggle = async () => {
    if (typeof Notification === 'undefined') {
      setDailyReminderEnabled(false)
      return
    }
    try {
      const newValue = !dailyReminderEnabled
      setDailyReminderEnabled(newValue)
      if (user?.id) {
        writeReminderLocal(user.id, { enabled: newValue, time: dailyReminderTime })
        await persistReminderToSupabase(user.id, { enabled: newValue, time: dailyReminderTime })
      }

      if (newValue) {
        const permission = await requestUniversalNotificationPermission({ userGesture: true })
        if (permission === 'granted') {
          await scheduleUniversalReminder({ time: dailyReminderTime, userId: user?.id })
        } else {
          console.error('Notification permission not granted:', permission)
          setDailyReminderEnabled(false)
          if (user?.id) writeReminderLocal(user.id, { enabled: false, time: dailyReminderTime })
          return
        }
      } else {
        try {
          await cancelUniversalReminder()
        } catch (e) {
          console.error('Error canceling reminders:', e)
        }
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error)
      setDailyReminderEnabled(false)
      if (user?.id) writeReminderLocal(user.id, { enabled: false, time: dailyReminderTime })
      return
    }
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
      toast.style.opacity = '0'
      toast.style.transition = 'opacity 0.3s ease'
      setTimeout(() => toast.remove(), 300)
    }, 2000)
  }, [])

  return (
    <div className="content-scroll min-h-screen px-4 pt-6" style={{ paddingBottom: '160px', background: 'var(--app-bg, #F0E8D4)' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        marginBottom: 8,
        position: 'relative',
      }}>
        <button
          type="button"
          onClick={() => navigate('/settings')}
          style={settingsBackButtonStyle}
          aria-label={t('common.back')}
        >
          ←
        </button>
        <div style={{ flex: 1, minWidth: 0, textAlign: 'center', padding: '0 8px' }}>
          <h2
            id="settings-notifications-title"
            className="notifications-settings-page-title"
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 700,
              color: '#1A1A1A',
            }}
          >
            Notifications
          </h2>
          <p
            className="notifications-settings-hero-subtitle"
            style={{
              margin: '8px 0 24px',
              color: '#8B6200',
              fontSize: 13,
              textAlign: 'center',
            }}
          >
            Stay connected to your daily walk
          </p>
        </div>
        <div style={{ width: 36, flexShrink: 0 }} aria-hidden />
      </div>

      <p
        className="notifications-settings-section-label"
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: '#8B6200',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          marginBottom: 8,
          marginTop: 0,
        }}
      >
        Reminders
      </p>

      <div
        className="notifications-settings-row"
        style={{
          background: '#F0E8D4',
          borderRadius: 16,
          border: '1px solid rgba(212,168,67,0.2)',
          padding: '16px',
          marginBottom: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
          <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }} aria-hidden>🔔</span>
          <div style={{ minWidth: 0 }}>
            <p className="notifications-settings-row-title" style={{ fontSize: 15, fontWeight: 600, color: '#1A1A1A', margin: 0 }}>Daily Reminder</p>
            <p className="notifications-settings-row-sub" style={{ fontSize: 12, color: '#6B6B6B', margin: '4px 0 0' }}>Get reminded to read the Bible</p>
          </div>
        </div>
        <button
          type="button"
          className="notifications-settings-toggle"
          onClick={handleDailyReminderToggle}
          aria-label={dailyReminderEnabled ? 'Disable daily reminder' : 'Enable daily reminder'}
          style={{
            width: 52,
            height: 28,
            borderRadius: 14,
            background: dailyReminderEnabled ? '#D4A843' : 'rgba(26,26,26,0.12)',
            border: 'none',
            cursor: 'pointer',
            position: 'relative',
            flexShrink: 0,
            transition: 'background 0.2s ease',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 2,
              left: dailyReminderEnabled ? 26 : 2,
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: '#ffffff',
              transition: 'left 0.2s ease',
            }}
          />
        </button>
      </div>

      <div
        className="notifications-settings-row"
        style={{
          background: '#F0E8D4',
          borderRadius: 16,
          border: '1px solid rgba(212,168,67,0.2)',
          padding: '16px',
          marginBottom: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
          <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }} aria-hidden>⏰</span>
          <div style={{ minWidth: 0 }}>
            <p className="notifications-settings-row-title" style={{ fontSize: 15, fontWeight: 600, color: '#1A1A1A', margin: 0 }}>Reminder Time</p>
            <input type="time" value={dailyReminderTime} onChange={(e) => { setDailyReminderTime(e.target.value); localStorage.setItem('dailyReminderTime', e.target.value); }} style={{ background: 'transparent', border: 'none', color: '#6B6B6B', fontSize: '12px', cursor: 'pointer', padding: 0, margin: '4px 0 0' }} />
          </div>
        </div>
        <span className="notifications-settings-row-chevron" style={{ color: '#1A1A1A', fontSize: 18, flexShrink: 0 }} aria-hidden>›</span>
      </div>

      <p
        className="notifications-settings-section-label"
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: '#8B6200',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          marginBottom: 8,
          marginTop: 16,
        }}
      >
        Community
      </p>

      <div
        className="notifications-settings-row"
        style={{
          background: '#F0E8D4',
          borderRadius: 16,
          border: '1px solid rgba(212,168,67,0.2)',
          padding: '16px',
          marginBottom: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
          <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }} aria-hidden>👥</span>
          <div style={{ minWidth: 0 }}>
            <p className="notifications-settings-row-title" style={{ fontSize: 15, fontWeight: 600, color: '#1A1A1A', margin: 0 }}>Fellowship Notifications</p>
            <p className="notifications-settings-row-sub" style={{ fontSize: 12, color: '#6B6B6B', margin: '4px 0 0' }}>New posts in your group</p>
          </div>
        </div>
        <button
          type="button"
          className="notifications-settings-toggle"
          onClick={() => showComingSoonToast('Coming soon')}
          style={{
            width: 52,
            height: 28,
            borderRadius: 14,
            background: 'rgba(26,26,26,0.12)',
            border: 'none',
            cursor: 'pointer',
            position: 'relative',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 2,
              left: 2,
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: '#ffffff',
            }}
          />
        </button>
      </div>

      <div
        className="notifications-settings-row"
        style={{
          background: '#F0E8D4',
          borderRadius: 16,
          border: '1px solid rgba(212,168,67,0.2)',
          padding: '16px',
          marginBottom: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
          <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }} aria-hidden>🙏</span>
          <div style={{ minWidth: 0 }}>
            <p className="notifications-settings-row-title" style={{ fontSize: 15, fontWeight: 600, color: '#1A1A1A', margin: 0 }}>Prayer Notifications</p>
            <p className="notifications-settings-row-sub" style={{ fontSize: 12, color: '#6B6B6B', margin: '4px 0 0' }}>When someone prays for your request</p>
          </div>
        </div>
        <button
          type="button"
          className="notifications-settings-toggle"
          onClick={() => showComingSoonToast('Coming soon')}
          style={{
            width: 52,
            height: 28,
            borderRadius: 14,
            background: 'rgba(26,26,26,0.12)',
            border: 'none',
            cursor: 'pointer',
            position: 'relative',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 2,
              left: 2,
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: '#ffffff',
            }}
          />
        </button>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
