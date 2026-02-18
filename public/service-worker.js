const CACHE_NAME = 'optimap-v2';
const TILE_CACHE = 'optimap-tiles-v1';
const TILE_URLS = [
    'tile.openstreetmap.org',
    'basemaps.cartocdn.com'
];

const STATIC_ASSETS = [
    '/',
    '/manifest.json',
    '/icons/icon-192.jpg',
    '/icons/icon-512.jpg'
];

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
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME && cacheName !== TILE_CACHE) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    if (TILE_URLS.some(domain => url.hostname.includes(domain))) {
        event.respondWith(
            caches.open(TILE_CACHE).then((cache) => {
                return cache.match(event.request).then((response) => {
                    if (response) {
                        return response;
                    }
                    return fetch(event.request).then((networkResponse) => {
                        if (networkResponse && networkResponse.status === 200) {
                            cache.put(event.request, networkResponse.clone());
                        }
                        return networkResponse;
                    }).catch(() => {});
                });
            })
        );
        return;
    }

    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request).catch(() => {
                return caches.match('/');
            })
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'PREFETCH_TILES') {
        const urls = event.data.urls;
        caches.open(TILE_CACHE).then((cache) => {
            urls.forEach(url => {
                cache.match(url).then(response => {
                    if (!response) {
                        fetch(url).then(res => {
                            if (res.status === 200) cache.put(url, res);
                        }).catch(() => {});
                    }
                });
            });
        });
    }
});
