/** Bump on each deploy to drop old asset caches */
const CACHE_VERSION = 'v2';
const CACHE_NAME = `abidinganchor-${CACHE_VERSION}`;
const NOTIF_CACHE_NAME = 'abidinganchor-notif-cache';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

const DAILY_VERSES = [
  { text: 'For God so loved the world, that he gave his one and only Son, that whoever believes in him should not perish, but have eternal life.' },
  { text: 'Now faith is assurance of things hoped for, proof of things not seen.' },
  { text: 'I can do all things through Christ, who strengthens me.' },
  { text: 'The peace of God, which surpasses all understanding, will guard your hearts and your thoughts in Christ Jesus.' },
  { text: 'Trust in the Lord with all your heart, and do not lean on your own understanding.' },
];

async function readNotifState() {
  const cache = await caches.open(NOTIF_CACHE_NAME);
  const res = await cache.match('/notif-state');
  if (!res) return { enabled: false, time: 'morning', lastDate: null };
  try {
    return await res.json();
  } catch {
    return { enabled: false, time: 'morning', lastDate: null };
  }
}

async function writeNotifState(state) {
  const cache = await caches.open(NOTIF_CACHE_NAME);
  await cache.put('/notif-state', new Response(JSON.stringify(state), { headers: { 'content-type': 'application/json' } }));
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

async function maybeSendDailyVerseNotification() {
  const state = await readNotifState();
  if (!state.enabled) return;
  const today = getTodayKey();
  if (state.lastDate === today) return;

  const index = Math.floor(Date.now() / 86400000) % DAILY_VERSES.length;
  const body = DAILY_VERSES[index].text.slice(0, 100);
  await self.registration.showNotification('✝️ AbidingAnchor — Daily Verse', {
    body,
    icon: '/icon-192x192.png',
    data: { url: '/' },
  });
  await writeNotifState({ ...state, lastDate: today });
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      const keep = new Set([CACHE_NAME, NOTIF_CACHE_NAME]);
      await Promise.all(
        keys
          .filter((key) => !keep.has(key))
          .map((key) => caches.delete(key))
      );
      await maybeSendDailyVerseNotification();
    })()
  );
  self.clients.claim();
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'ABIDINGANCHOR_NOTIF_SETTINGS') {
    const enabled = !!event.data?.payload?.enabled;
    const time = event.data?.payload?.time === 'evening' ? 'evening' : 'morning';
    event.waitUntil((async () => {
      const prev = await readNotifState();
      await writeNotifState({ ...prev, enabled, time });
    })());
  }
});

self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'AbidingAnchor';
  const options = {
    body: data.body || 'Your daily verse is ready 🙏',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' }
  };
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});

function isHtmlNavigationRequest(request) {
  if (request.mode === 'navigate' || request.destination === 'document') return true;
  const accept = request.headers.get('accept') || '';
  return accept.includes('text/html');
}

self.addEventListener('fetch', (event) => {
  // Network first for Bible API calls
  if (event.request.url.includes('bible-api.com')) {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match(event.request)
      )
    );
    return;
  }
  // Network-first for HTML (SPA shell / index) so deploys are not stuck on stale index.html
  if (isHtmlNavigationRequest(event.request)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          if (response.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }
  // Cache first for static assets
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, clone);
        });
        return response;
      });
    })
  );
});
