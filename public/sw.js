// This is a simple service worker for push notifications
self.addEventListener("push", (event) => {
  const data = event.data.json()

  const options = {
    body: data.text,
    icon: "/icon.png",
    badge: "/badge.png",
    data: {
      url: self.location.origin,
    },
  }

  event.waitUntil(self.registration.showNotification(data.title || "New Message", options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({type: 'window'}).then((clientList) => {
      if (clientList.length > 0) {
        return clientList[0].focus();  
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow(event.notification.data.url);\)
  );
});

