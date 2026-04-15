/* eslint-disable no-restricted-globals */
/** Bump on each deploy to drop old state caches */
const CACHE_VERSION = 'v3';
const NOTIF_CACHE_NAME = `abidinganchor-notif-cache-${CACHE_VERSION}`;

const precacheManifest = self.__WB_MANIFEST || [];

function normalizeTime(time) {
  if (typeof time !== 'string') return '08:00';
  const match = time.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  return match ? time : '08:00';
}

function getLocalTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isReminderDue(reminderTime) {
  const [hours, minutes] = normalizeTime(reminderTime).split(':').map(Number);
  const now = new Date();
  const target = new Date(now);
  target.setHours(hours, minutes, 0, 0);
  return now >= target;
}

async function readNotifState() {
  const cache = await caches.open(NOTIF_CACHE_NAME);
  const res = await cache.match('/notif-state');
  if (!res) return { enabled: false, reminderTime: '08:00', lastDate: null, userId: null, title: null, body: null };
  try {
    const raw = await res.json();
    return {
      enabled: Boolean(raw?.enabled),
      reminderTime: normalizeTime(raw?.reminderTime || raw?.time || '08:00'),
      lastDate: typeof raw?.lastDate === 'string' ? raw.lastDate : null,
      userId: raw?.userId || null,
      title: typeof raw?.title === 'string' ? raw.title : null,
      body: typeof raw?.body === 'string' ? raw.body : null,
    };
  } catch {
    return { enabled: false, reminderTime: '08:00', lastDate: null, userId: null, title: null, body: null };
  }
}

async function writeNotifState(state) {
  const cache = await caches.open(NOTIF_CACHE_NAME);
  await cache.put('/notif-state', new Response(JSON.stringify(state), {
    headers: { 'content-type': 'application/json' },
  }));
}

async function maybeSendDailyVerseNotification() {
  const state = await readNotifState();
  if (!state.enabled || !isReminderDue(state.reminderTime)) return;
  const today = getLocalTodayKey();
  if (state.lastDate === today) return;

  await self.registration.showNotification(state.title || '✝️ Abiding Anchor — Daily Reminder', {
    body: state.body || 'Your daily verse is ready. Open Abiding Anchor and spend time in God’s Word.',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    data: { url: '/' },
  });
  await writeNotifState({ ...state, lastDate: today });
}

self.addEventListener('install', (event) => {
  const urls = precacheManifest.map((entry) => entry.url).filter(Boolean);
  event.waitUntil(caches.open(NOTIF_CACHE_NAME).then((cache) => cache.addAll(urls)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('abidinganchor-notif-cache-') && k !== NOTIF_CACHE_NAME).map((k) => caches.delete(k)));
    await maybeSendDailyVerseNotification();
    if (!self.__abidingAnchorReminderInterval) {
      self.__abidingAnchorReminderInterval = setInterval(() => {
        maybeSendDailyVerseNotification().catch(() => {});
      }, 60 * 1000);
    }
  })());
  self.clients.claim();
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'ABIDINGANCHOR_NOTIF_SETTINGS') {
    const enabled = !!event.data?.payload?.enabled;
    const reminderTime = normalizeTime(event.data?.payload?.time);
    const userId = event.data?.payload?.userId || null;
    const title = typeof event.data?.payload?.title === 'string' ? event.data.payload.title : null;
    const body = typeof event.data?.payload?.body === 'string' ? event.data.payload.body : null;
    event.waitUntil((async () => {
      const prev = await readNotifState();
      await writeNotifState({ ...prev, enabled, reminderTime, userId, title, body });
      await maybeSendDailyVerseNotification();
    })());
  } else if (event.data?.type === 'ABIDINGANCHOR_CHECK_DAILY_REMINDER') {
    event.waitUntil(maybeSendDailyVerseNotification());
  }
});

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'abidinganchor-daily-reminder') {
    event.waitUntil(maybeSendDailyVerseNotification());
  }
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'abidinganchor-daily-reminder-sync') {
    event.waitUntil(maybeSendDailyVerseNotification());
  }
});

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'AbidingAnchor';
  const options = {
    body: data.body || 'Your daily verse is ready 🙏',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    data: { url: data.url || '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || '/'));
});
