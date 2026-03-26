const ENABLED_KEY = 'abidinganchor-notif-enabled'
const TIME_KEY = 'abidinganchor-notif-time'

export function getNotificationPermissionStatus() {
  if (!('Notification' in window)) return 'unsupported'
  return Notification.permission
}

export function getNotificationSettings() {
  return {
    enabled: localStorage.getItem(ENABLED_KEY) === 'true',
    time: localStorage.getItem(TIME_KEY) || 'morning',
  }
}

export function saveNotificationTime(time) {
  localStorage.setItem(TIME_KEY, time === 'evening' ? 'evening' : 'morning')
}

export function setNotificationsEnabled(enabled) {
  localStorage.setItem(ENABLED_KEY, enabled ? 'true' : 'false')
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported'
  return Notification.requestPermission()
}

export async function syncNotificationSettingsToServiceWorker() {
  if (!('serviceWorker' in navigator)) return
  const registration = await navigator.serviceWorker.ready
  if (!registration?.active) return
  registration.active.postMessage({
    type: 'ABIDINGANCHOR_NOTIF_SETTINGS',
    payload: getNotificationSettings(),
  })
}
