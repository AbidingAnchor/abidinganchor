import { LocalNotifications } from '@capacitor/local-notifications'
import i18n from '../i18n'
import { supabase } from '../lib/supabase'
import { userStorageKey } from '../utils/userStorage'
import { getNotificationPlatform } from '../utils/notificationPlatform'

const SW_SETTINGS_MESSAGE = 'ABIDINGANCHOR_NOTIF_SETTINGS'
const SW_CHECK_MESSAGE = 'ABIDINGANCHOR_CHECK_DAILY_REMINDER'
const PERIODIC_SYNC_TAG = 'abidinganchor-daily-reminder'
const TEST_NOTIFICATION_ID = 99999
const DAILY_REMINDER_LOCAL_IDS = [1, 2, 3, 4, 5, 6, 7]

function normalizeTime(time) {
  if (typeof time !== 'string') return '08:00'
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(time) ? time : '08:00'
}

async function postMessageToServiceWorker(message) {
  if (!('serviceWorker' in navigator)) return false
  const registration = await navigator.serviceWorker.ready
  const worker = registration?.active || navigator.serviceWorker.controller
  if (!worker) return false
  worker.postMessage(message)
  return true
}

export function getReminderStorage(userId) {
  return {
    enabledKey: userStorageKey(userId, 'daily-reminder-enabled'),
    timeKey: userStorageKey(userId, 'reminder-time'),
  }
}

export function readReminderLocal(userId) {
  const { enabledKey, timeKey } = getReminderStorage(userId)
  return {
    enabled: localStorage.getItem(enabledKey) === 'true',
    time: normalizeTime(localStorage.getItem(timeKey) || '08:00'),
  }
}

export function writeReminderLocal(userId, { enabled, time }) {
  const { enabledKey, timeKey } = getReminderStorage(userId)
  localStorage.setItem(enabledKey, String(Boolean(enabled)))
  localStorage.setItem(timeKey, normalizeTime(time))
}

export async function persistReminderToSupabase(userId, { enabled, time }) {
  if (!userId) return
  const payload = {
    daily_reminder_enabled: Boolean(enabled),
    daily_reminder_time: normalizeTime(time),
  }
  const { error } = await supabase.from('profiles').update(payload).eq('id', userId)
  if (error) {
    console.warn('Supabase reminder persistence failed:', error.message)
  }
}

export async function readReminderFromSupabase(userId) {
  if (!userId) return null
  const { data, error } = await supabase
    .from('profiles')
    .select('daily_reminder_enabled,daily_reminder_time')
    .eq('id', userId)
    .maybeSingle()
  if (error || !data) return null
  return {
    enabled: Boolean(data.daily_reminder_enabled),
    time: normalizeTime(data.daily_reminder_time || '08:00'),
  }
}

export async function requestUniversalNotificationPermission({ userGesture = false } = {}) {
  const platform = getNotificationPlatform()
  if (platform.isNativeCapacitor) {
    const { display } = await LocalNotifications.requestPermissions()
    return display === 'granted' ? 'granted' : (display || 'denied')
  }
  if (!platform.isPwaOrBrowser) return 'unsupported'
  if (platform.requiresUserGestureForPermission && !userGesture) return 'gesture-required'
  return Notification.requestPermission()
}

export async function cancelUniversalReminder() {
  const platform = getNotificationPlatform()
  if (platform.isNativeCapacitor) {
    await LocalNotifications.cancel({
      notifications: DAILY_REMINDER_LOCAL_IDS.map((id) => ({ id })),
    })
    return
  }
  if (platform.isPwaOrBrowser) {
    await postMessageToServiceWorker({
      type: SW_SETTINGS_MESSAGE,
      payload: { enabled: false, time: '08:00' },
    })
  }
}

export async function scheduleUniversalReminder({ time, userId }) {
  const platform = getNotificationPlatform()
  const reminderTime = normalizeTime(time)
  if (platform.isNativeCapacitor) {
    await cancelUniversalReminder()
    const notifications = []
    const [hours, minutes] = reminderTime.split(':').map(Number)
    for (let day = 0; day < 7; day++) {
      const now = new Date()
      const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + day, hours, minutes, 0)
      if (at <= now) at.setDate(at.getDate() + 7)
      notifications.push({
        id: day + 1,
        title: i18n.t('settings.notificationTitle'),
        body: i18n.t(`settings.notify${day}`),
        schedule: { at, repeats: true, every: 'day' },
        sound: 'default',
        extra: { route: '/journal' },
      })
    }
    await LocalNotifications.schedule({ notifications })
    return
  }

  if (!platform.isPwaOrBrowser) return
  await postMessageToServiceWorker({
    type: SW_SETTINGS_MESSAGE,
    payload: {
      enabled: true,
      time: reminderTime,
      userId: userId || null,
      title: i18n.t('settings.notificationTitle'),
      body: i18n.t('settings.notify0'),
    },
  })
  await postMessageToServiceWorker({ type: SW_CHECK_MESSAGE })
  const registration = await navigator.serviceWorker.ready
  if ('periodicSync' in registration) {
    try {
      await registration.periodicSync.register(PERIODIC_SYNC_TAG, { minInterval: 24 * 60 * 60 * 1000 })
    } catch {
      // Browsers can deny periodic sync depending on engagement/policies.
    }
  }
}

export async function sendTestNotification() {
  const platform = getNotificationPlatform()
  if (platform.isNativeCapacitor) {
    await LocalNotifications.schedule({
      notifications: [{
        id: TEST_NOTIFICATION_ID,
        title: 'Abiding Anchor Test Notification',
        body: 'Notifications are working on this device.',
        schedule: { at: new Date(Date.now() + 2000) },
      }],
    })
    return true
  }
  if (!platform.isPwaOrBrowser || Notification.permission !== 'granted') return false
  const registration = await navigator.serviceWorker.ready
  await registration.showNotification('Abiding Anchor Test Notification', {
    body: 'Notifications are working on this device.',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
  })
  return true
}
