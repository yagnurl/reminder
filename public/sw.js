self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      if (allClients.length > 0) {
        const client = allClients[0];
        client.focus();
        client.postMessage({ type: "FOCUS_FROM_NOTIFICATION" });
      } else {
        await self.clients.openWindow("/");
      }
    })()
  );
});
