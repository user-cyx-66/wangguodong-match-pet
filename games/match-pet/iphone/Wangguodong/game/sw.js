// Generated from every shipped asset. Run npm run build after edits.
'use strict';
const CACHE = 'wangguodong-mobile-555dfededa241a98';
const PREFIX = 'wangguodong-mobile-';
const ASSETS = ["./app.js","./assets/cat-dance.gif","./assets/cat-idle.png","./assets/cat-pounce.gif","./assets/cat-run.gif","./assets/cat-sleep.png","./assets/cat-watch.gif","./audio.js","./config.js","./effects.js","./engine.js","./feel.css","./icons/app-icon.svg","./icons/apple-touch-icon.png","./icons/icon-192.png","./icons/icon-512.png","./icons/maskable-512.png","./index.html","./manifest.webmanifest","./mobile.css","./mobile.js","./style.css"];
const urls = new Set(ASSETS.map(file => new URL(file, self.registration.scope).href));
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS))); });
self.addEventListener('activate', event => { event.waitUntil((async () => { for (const key of await caches.keys()) if (key.startsWith(PREFIX) && key !== CACHE) await caches.delete(key); await self.clients.claim(); })()); });
self.addEventListener('message', event => { if (event.data?.type === 'ACTIVATE_UPDATE') self.skipWaiting(); });
self.addEventListener('fetch', event => { const request = event.request; if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return; if (request.mode === 'navigate') { event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(new URL('index.html', self.registration.scope).href)) || fetch(request))); } else if (urls.has(request.url)) { event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(request)) || fetch(request))); } });
