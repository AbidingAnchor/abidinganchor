const ENABLED_KEY = 'abidinganchor-notif-enabled'
const TIME_KEY = 'abidinganchor-notif-time'
const LEGACY_KEY = 'abidinganchor-notifications'

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
  if (!('serviceWorker' in navigator)) return 'unsupported'
  
  const permission = await Notification.requestPermission();
  localStorage.setItem(LEGACY_KEY, permission);
  return permission;
}

export const scheduleLocalNotification = () => {
  // Schedule daily notification using setTimeout
  const now = new Date();
  const next = new Date();
  next.setHours(8, 0, 0, 0); // 8 AM daily
  if (next <= now) next.setDate(next.getDate() + 1);
  
  const msUntilNext = next - now;
  
  setTimeout(() => {
    if (Notification.permission === 'granted') {
      const messages = [
        { title: '🌅 Good Morning!', body: 'Your daily verse is waiting. Start your day with God.' },
        { title: '📖 Daily Devotional', body: 'Your quiet time with God is ready.' },
        { title: '🙏 Time with God', body: 'Don\'t forget your daily Bible reading.' },
        { title: '✝️ AbidingAnchor', body: 'A new verse is waiting for you today.' },
        { title: '🔥 Keep your streak!', body: 'Open the app to continue your reading streak.' },
      ];
      const msg = messages[Math.floor(Math.random() * messages.length)];
      new Notification(msg.title, {
        body: msg.body,
        icon: '/icon-192x192.png',
      });
    }
    // Reschedule for next day
    scheduleLocalNotification();
  }, msUntilNext);
};

export const getNotificationStatus = () => {
  return localStorage.getItem(LEGACY_KEY) || 'default';
};

export async function syncNotificationSettingsToServiceWorker() {
  if (!('serviceWorker' in navigator)) return
  const registration = await navigator.serviceWorker.ready
  if (!registration?.active) return
  registration.active.postMessage({
    type: 'ABIDINGANCHOR_NOTIF_SETTINGS',
    payload: getNotificationSettings(),
  })
}
