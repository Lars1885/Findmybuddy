const CACHE_NAME = "fmb-cache-v1";
const ASSETS = [
  "/",
  "/index.html",
  "/intro.html",
  "/create.html",
  "/join.html",
  "/group.html",
  "/map.html",
  "/menu.html",
  "/photo.html",
  "/style.css",
  "/js/app.js",
  "/js/firebase.js",
  "/js/group.js",
  "/js/map.js",
  "/js/photo.js",
  "/js/menu.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((res) => res || fetch(event.request))
  );
});