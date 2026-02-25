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

    if (
        url.hostname.includes('router.project-osrm.org') ||
        url.hostname.includes('routing.openstreetmap.de') ||
        url.hostname.includes('photon.komoot.io') ||
        url.hostname.includes('nominatim.openstreetmap.org') ||
        url.hostname.includes('api.maptiler.com')
    ) {
        return;
    }

    if (TILE_URLS.some(domain => url.hostname.includes(domain))) {
        event.respondWith(
            caches.open(TILE_CACHE).then((cache) => {
                return cache.match(event.request).then((response) => {
                    if (response) {
                        return response;
                    }
                    return fetch(event.request).then((networkResponse) => {
                        if (!networkResponse || networkResponse.status !== 200) {
                            return networkResponse;
                        }

                        const responseToCache = networkResponse.clone();
                        caches.open(TILE_CACHE).then((cache) => {
                            cache.put(event.request, responseToCache);
                        });

                        return networkResponse;
                    }).catch((error) => {
                        console.error('Fetching failed:', error);
                        throw error;
                    });
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

   
    const urlStr = url.toString();
    if (
        urlStr.includes('localhost') || 
        urlStr.includes('ngrok') ||
        urlStr.includes('@vite') || 
        urlStr.includes('@react-refresh') || 
        urlStr.includes('node_modules') || 
        url.port === '3000'
    ) {
         return; 
    }

    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request).catch((err) => {
       
                if (event.request.mode === 'navigate') {
                    return caches.match('/');
                }
                throw err;
            });
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
                        fetch(url, { priority: 'low' }).then(res => {
                            if (res.status === 200) cache.put(url, res);
                        }).catch(() => {
                            // Suppress prefetch errors
                        });
                    }
                }).catch(() => {});
            });
        }).catch(() => {});
    }
});
