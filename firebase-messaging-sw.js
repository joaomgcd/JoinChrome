self.importScripts('https://www.gstatic.com/firebasejs/5.9.1/firebase-app.js');
self.importScripts('https://www.gstatic.com/firebasejs/5.9.1/firebase-messaging.js');
self.importScripts('/fcm.js');
self.importScripts('/fcm-client.js');
const fcmClient = new FCMClientImplementation();
fcmClient.initServiceWorker(self);

