// Sunrise Realty Service Worker v5.0
const CACHE = 'sunrise-v5';
const STATIC = [
  './', './index.html', './manifest.json', './icon-192.png', './icon-512.png',
  './css/style.css',
  './js/config.js', './js/utils.js', './js/loader.js', './js/auth.js',
  './js/data.js', './js/render.js', './js/forms.js', './js/admin.js', './js/main.js'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC).catch(()=>{})));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  if(e.request.method!=='GET') return;
  const url = new URL(e.request.url);
  // Don't cache Google Apps Script API calls
  if(url.hostname.includes('script.google.com')) return;
  e.respondWith(
    fetch(e.request)
      .then(res => { const c=res.clone(); caches.open(CACHE).then(cache=>cache.put(e.request,c)); return res; })
      .catch(() => caches.match(e.request))
  );
});
