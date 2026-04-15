import { LocalNotifications } from '@capacitor/local-notifications'
import i18n from '../i18n.js'

/** IDs 1–7: one scheduled slot per rotating copy (matches Settings daily reminder + startup schedule). */
export const DAILY_REMINDER_LOCAL_IDS = [1, 2, 3, 4, 5, 6, 7]

/** CancelOptions for Capacitor — calling cancel() with no args breaks the web implementation (pending.notifications). */
export function buildCancelDailyRemindersOptions() {
  return {
    notifications: DAILY_REMINDER_LOCAL_IDS.map((id) => ({ id })),
  }
}

export async function cancelDailyReminderSchedules() {
  const opts = buildCancelDailyRemindersOptions()
  if (!opts?.notifications?.length) return
  try {
    await LocalNotifications.cancel(opts)
  } catch (e) {
    console.error('cancelDailyReminderSchedules:', e)
  }
}

/**
 * Ensures notification permission before schedule — required on Android 13+ and avoids scheduling without display rights.
 */
export async function ensureLocalNotificationsReady() {
  try {
    const { display } = await LocalNotifications.checkPermissions()
    if (display === 'granted') return true
    if (display === 'denied') return false
    const { display: next } = await LocalNotifications.requestPermissions()
    return next === 'granted'
  } catch (e) {
    console.error('ensureLocalNotificationsReady:', e)
    return false
  }
}

function assertScheduleOptions(options) {
  if (!options || typeof options !== 'object' || !Array.isArray(options.notifications)) {
    throw new TypeError('LocalNotifications.schedule requires { notifications: [...] }')
  }
}

export async function scheduleLocalNotificationsSafe(options) {
  assertScheduleOptions(options)
  const { notifications } = options
  if (!notifications.length) return
  await LocalNotifications.schedule({ notifications })
}

export async function scheduleDaily() {
  try {
    await cancelDailyReminderSchedules()

    const granted = await ensureLocalNotificationsReady()
    if (!granted) {
      console.warn('Daily notifications not scheduled: permission not granted')
      return
    }

    const notifications = []

    for (let day = 0; day < 7; day++) {
      const now = new Date()
      const scheduledDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + day,
        8,
        0,
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

    await scheduleLocalNotificationsSafe({ notifications })

    console.log('Daily notifications scheduled successfully')
  } catch (error) {
    console.error('Error scheduling daily notifications:', error)
  }
}

export async function requestPermission() {
  return ensureLocalNotificationsReady()
}
