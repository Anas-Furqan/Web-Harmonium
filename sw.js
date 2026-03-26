// Service Worker for Web Harmonium PWA

const CACHE_NAME = 'webharmonium-v1';

const PRECACHE_URLS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/css/main.css',
    '/css/keyboard.css',
    '/css/controls.css',
    '/css/tutorial.css',
    '/js/app.js',
    '/js/config.js',
    '/js/utils/EventBus.js',
    '/js/utils/StateManager.js',
    '/js/audio/AudioEngine.js',
    '/js/keyboard/KeyboardRenderer.js',
    '/js/keyboard/KeyboardController.js',
    '/js/keyboard/KeyHighlighter.js',
    '/tutorials/index.json',
    '/tutorials/practice/scales.json'
];

// Install: precache essential resources
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Precaching app shell');
                return cache.addAll(PRECACHE_URLS);
            })
            .then(() => self.skipWaiting())
            .catch(err => console.error('Precache failed:', err))
    );
});

// Activate: clean old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys
                    .filter(key => key !== CACHE_NAME)
                    .map(key => {
                        console.log('Deleting old cache:', key);
                        return caches.delete(key);
                    })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch: cache-first for static assets, network-first for tutorials
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // Skip chrome-extension and other non-http(s) requests
    if (!url.protocol.startsWith('http')) return;

    // Network-first for tutorial JSON files (they may update)
    if (url.pathname.includes('/tutorials/') && url.pathname.endsWith('.json')) {
        event.respondWith(networkFirst(event.request));
        return;
    }

    // Cache-first for everything else
    event.respondWith(cacheFirst(event.request));
});

// Cache-first strategy
async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) {
        return cached;
    }

    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        console.error('Fetch failed:', error);
        // Return offline fallback if available
        return caches.match('/index.html');
    }
}

// Network-first strategy
async function networkFirst(request) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        console.log('Network failed, trying cache:', request.url);
        const cached = await caches.match(request);
        return cached || new Response('Offline', { status: 503 });
    }
}

// Listen for messages from the app
self.addEventListener('message', event => {
    if (event.data === 'skipWaiting') {
        self.skipWaiting();
    }
});
