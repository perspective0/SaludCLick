self.addEventListener('install', (event) => {
  const cacheName = 'saludclick-pwa-v1';
  const appShell = [
    '/offline',
    '/manifest.webmanifest',
    '/saludclick.png',
    '/icons/pwa-192x192.png',
    '/icons/pwa-512x512.png',
    '/icons/pwa-maskable-512x512.png',
  ];

  event.waitUntil(
    caches.open(cacheName).then((cache) =>
      Promise.allSettled(appShell.map((url) => cache.add(url)))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  const currentCache = 'saludclick-pwa-v1';

  event.waitUntil(
    Promise.all([
      caches
        .keys()
        .then((cacheNames) =>
          Promise.all(
            cacheNames
              .filter(
                (cacheName) =>
                  cacheName.startsWith('saludclick-pwa-') &&
                  cacheName !== currentCache
              )
              .map((cacheName) => caches.delete(cacheName))
          )
        ),
      self.clients.claim(),
    ])
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const requestUrl = new URL(request.url);
  if (requestUrl.origin !== self.location.origin) return;
  if (
    requestUrl.pathname.startsWith('/api/') ||
    requestUrl.pathname.startsWith('/uploads/')
  ) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const offlineResponse = await caches.match('/offline');
        return offlineResponse || Response.error();
      })
    );
    return;
  }

  const cacheableDestinations = ['style', 'script', 'image', 'font'];
  if (!cacheableDestinations.includes(request.destination)) return;

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(request).then((networkResponse) => {
        if (!networkResponse.ok) return networkResponse;

        const responseToCache = networkResponse.clone();
        caches
          .open('saludclick-pwa-v1')
          .then((cache) => cache.put(request, responseToCache));

        return networkResponse;
      });
    })
  );
});

self.addEventListener('push', (event) => {
  let payload = {
    title: 'SaludClick',
    body: 'Tienes una nueva notificacion.',
    url: '/',
  };

  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() };
    } catch (error) {
      payload.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icono.png',
      badge: '/icono.png',
      data: {
        url: payload.url || '/',
      },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
