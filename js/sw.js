// Bevidst tom i testfasen (vi registrerer den ikke fra index.html)
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => self.clients.claim());
self.addEventListener('fetch', () => {});
