const CACHE = "fmb-v1";
const ASSETS = [
  "./","./index.html",
  "./css/style.css",
  "./js/firebaseconfig.js",
  "./js/i18n.js",
  "./js/app.js",
  "./manifest.webmanifest",
  "./assets/icon-192.png","./assets/icon-512.png","./assets/icon-maskable-512.png","./assets/favicon-32.png"
];
self.addEventListener("install", (e)=>{ e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))); });
self.addEventListener("activate", (e)=>{ e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))); });
self.addEventListener("fetch", (e)=>{ e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))); });
