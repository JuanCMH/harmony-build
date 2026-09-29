// public/service-worker.js
// @ts-check

/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

const sw = /** @type { ServiceWorkerGlobalScope & typeof globalThis } */ (globalThis);

sw.addEventListener('install', () => {
  // Activa la nueva versión inmediatamente
  sw.skipWaiting();
});

sw.addEventListener('activate', (event) => {
  event.waitUntil(
    // Elimina cualquier cache residual de versiones anteriores
    caches.keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => sw.clients.claim())
  );
});
