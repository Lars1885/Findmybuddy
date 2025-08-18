// /sw.js – meget simpel cache af statiske filer
const CACHE = "fmb-v1";
const ASSETS = [
  "/", "/index.html",
  "/css/style.css",
  "/js/app.js", "/js/i18n.js", "/js/firebaseconfig.js",
  "/assets/icon-192.png", "/assets/favicon-32.png"
];

self.addEventListener("install", e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener("activate", e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=>k!==CACHE && caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("fetch", e=>{
  const req = e.request;
  e.respondWith(
    caches.match(req).then(m=> m || fetch(req).catch(()=> caches.match("/index.html")))
  );
});
