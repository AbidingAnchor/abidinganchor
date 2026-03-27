import { useEffect, useState } from 'react'
import {
  getNotificationPermissionStatus,
  requestNotificationPermission,
  setNotificationsEnabled,
  syncNotificationSettingsToServiceWorker,
} from '../utils/notifications'

const LEGACY_KEY = 'abidinganchor-notifications'

export default function NotificationSettings() {
  const [permission, setPermission] = useState(() => getNotificationPermissionStatus())

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

    if (allowed) {
      new Notification('AbidingAnchor', {
        body: 'You will now receive daily verse notifications! 🙏',
        icon: '/icon-192x192.png',
      })
      localStorage.setItem(LEGACY_KEY, 'enabled')
    } else {
      localStorage.removeItem(LEGACY_KEY)
      alert('Notifications blocked. Please enable them in your browser settings.')
    }

    await syncNotificationSettingsToServiceWorker()
  }

  return (
    <article className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-md">
      <h3 className="text-sm font-semibold uppercase tracking-[0.14em]" style={{ color: '#D4A843' }}>
        Daily Notifications
      </h3>
      <p className="mt-2 text-xs text-white/75">Permission status: {permission}</p>
      <button type="button" onClick={handleEnable} className="mt-3 rounded-xl px-3 py-2 text-sm font-semibold text-[#1a1a1a]" style={{ background: '#D4A843' }}>
        Enable Daily Notifications 🔔
      </button>
    </article>
  )
}
