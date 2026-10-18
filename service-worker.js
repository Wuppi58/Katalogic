"use strict";

const CACHE_NAME = "katalogic-static-v104";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css?v=management-2",
  "./devices.css?v=devices-2",
  "./games.css?v=games-4",
  "./books.css?v=books-2",
  "./films.css?v=films-2",
  "./filaments.css?v=filaments-2",
  "./small-parts.css?v=small-parts-2",
  "./product-recognition.css?v=recognition-5",
  "./pdf-export.js?v=pdf-2",
  "./chart-export.js?v=chart-2",
  "./app.js?v=management-9",
  "./devices.js?v=devices-5",
  "./games.js?v=games-6",
  "./books.js?v=books-6",
  "./films.js?v=films-4",
  "./filaments.js?v=filaments-2",
  "./small-parts.js?v=small-parts-10",
  "./product-recognition.js?v=recognition-8",
  "./manifest.webmanifest",
  "./icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cachedPage = await caches.match(event.request);
        const appShell = cachedPage || await caches.match("./") || await caches.match("./index.html");
        if (!appShell) throw new Error("Katalogic ist noch nicht für die Offline-Nutzung geladen.");
        return appShell;
      })
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
      if (response.ok && requestUrl.pathname.endsWith("/")) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
      }
      return response;
    }))
  );
});
