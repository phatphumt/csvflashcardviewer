/* Flashcard Viewer service worker - app shell only (decks stay upload-only) */
var APP_CACHE = "fcv-app-v1";
var CDN_CACHE = "fcv-cdn-v1";
var APP_ASSETS = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "icon-192.png",
  "icon-512.png",
  "icon-maskable-512.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(APP_CACHE).then(function (cache) {
      return cache.addAll(APP_ASSETS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== APP_CACHE && k !== CDN_CACHE) return caches.delete(k);
        return Promise.resolve(false);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("message", function (event) {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

function staleWhileRevalidate(request) {
  return caches.open(CDN_CACHE).then(function (cache) {
    return cache.match(request).then(function (cached) {
      var live = fetch(request).then(function (res) {
        if (res && (res.status === 200 || res.type === "opaque")) cache.put(request, res.clone());
        return res;
      }).catch(function () { return cached; });
      return cached || live;
    });
  });
}

self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(function () {
        return caches.match("index.html");
      })
    );
    return;
  }
  if (url.origin !== self.location.origin) {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }
  event.respondWith(
    caches.match(req).then(function (cached) {
      return cached || fetch(req).then(function (res) {
        if (res && res.status === 200) {
          var copy = res.clone();
          caches.open(APP_CACHE).then(function (cache) { cache.put(req, copy); });
        }
        return res;
      });
    })
  );
});
