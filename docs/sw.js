// App-shell cache so the app opens without internet. Firestore keeps its own offline copy of the data.
const CACHE = "farm-ledger-v7";
const SHELL = ["./", "index.html", "config.js", "manifest.webmanifest", "icon-192.png", "apple-touch-icon.png"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  const sameOrigin = u.origin === self.location.origin;
  const sdk = u.hostname === "www.gstatic.com" && u.pathname.startsWith("/firebasejs/");
  const fonts = u.hostname === "fonts.googleapis.com" || u.hostname === "fonts.gstatic.com";
  if (!sameOrigin && !sdk && !fonts) return; // Firestore/Auth traffic goes straight to the network
  if (sdk || fonts) {
    // versioned files: cache first
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => {
      const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return res;
    })));
    return;
  }
  // own files: network first so updates show up, cache when offline
  e.respondWith(fetch(e.request).then(res => {
    const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return res;
  }).catch(() => caches.match(e.request).then(r => r || caches.match("index.html"))));
});
