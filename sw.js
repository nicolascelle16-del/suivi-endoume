/* Suivi joueurs US Endoume : service worker minimal.
   Réseau d'abord pour la page (toujours la dernière version), copie de secours hors connexion.
   Les données (Firebase) ne passent jamais par ce cache. */
const CACHE = "endoume-v1";
const BASE = ["./", "./index.html", "./manifest.json", "./assets/endoume-logo.png", "./assets/icone-192.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(BASE)).catch(() => {})); self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); } return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match("./index.html"))));
});
