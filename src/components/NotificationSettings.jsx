import { useEffect, useState } from 'react'
import {
  getNotificationPermissionStatus,
  getNotificationSettings,
  requestNotificationPermission,
  saveNotificationTime,
  setNotificationsEnabled,
  syncNotificationSettingsToServiceWorker,
} from '../utils/notifications'

const LEGACY_KEY = 'abidinganchor-notifications'

export default function NotificationSettings() {
  const [permission, setPermission] = useState(() => getNotificationPermissionStatus())
  const [settings, setSettings] = useState(() => getNotificationSettings())
  const [enabled, setEnabled] = useState(() => localStorage.getItem(LEGACY_KEY) === 'enabled')

  useEffect(() => {
    syncNotificationSettingsToServiceWorker()
  }, [])

  const handleEnable = async () => {
    if (!('Notification' in window)) {
      alert('Your browser does not support notifications')
      return
    }

    const result = await requestNotificationPermission()
    setPermission(result)
    const allowed = result === 'granted'
    setNotificationsEnabled(allowed)
    const next = { ...settings, enabled: allowed }
    setSettings(next)

    if (allowed) {
      new Notification('AbidingAnchor', {
        body: 'You will now receive daily verse notifications! 🙏',
        icon: '/icon-192x192.png',
      })
      localStorage.setItem(LEGACY_KEY, 'enabled')
      setEnabled(true)
    } else {
      setEnabled(false)
      localStorage.removeItem(LEGACY_KEY)
      alert('Notifications blocked. Please enable them in your browser settings.')
    }

    await syncNotificationSettingsToServiceWorker()
  }

  const handleTimeChange = async (time) => {
    saveNotificationTime(time)
    const next = { ...settings, time }
    setSettings(next)
    await syncNotificationSettingsToServiceWorker()
  }

  return (
    <article className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-md">
      <h3 className="text-sm font-semibold uppercase tracking-[0.14em]" style={{ color: '#D4A843' }}>
        Daily Verse Notifications
      </h3>
      <p className="mt-2 text-xs text-white/75">Permission status: {permission}</p>
      <button type="button" onClick={handleEnable} className="mt-3 rounded-xl px-3 py-2 text-sm font-semibold text-[#1a1a1a]" style={{ background: '#D4A843' }}>
        {enabled ? 'Notifications On ✅' : 'Enable Notifications 🔔'}
      </button>
      {settings.enabled ? (
        <p className="mt-2 text-sm text-[#D4A843]">🔔 You&apos;ll receive today&apos;s verse each morning</p>
      ) : null}
      <div className="mt-3 flex items-center gap-2 text-sm text-white/85">
        <span>Time preference:</span>
        <select
          value={settings.time}
          onChange={(e) => handleTimeChange(e.target.value)}
          className="rounded-lg border border-white/20 bg-black/20 px-2 py-1 text-white"
        >
          <option value="morning">morning (8am)</option>
          <option value="evening">evening (8pm)</option>
        </select>
      </div>
    </article>
  )
}
