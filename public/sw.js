// El Borj service worker: makes the site installable as an app and shows a simple page when
// the phone is offline. It caches nothing else: a news site must always show fresh pages.
const OFFLINE = `<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>البرج</title>
<body style="margin:0;background:#f5f1e8;color:#17140f;font:20px/1.7 serif;display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center;padding:24px">
<div><p style="font-size:44px;margin:0">البرج</p><p>لا يوجد اتصال بالإنترنت.<br>أعد المحاولة عند عودة الاتصال.</p>
<p><button onclick="location.reload()" style="font:inherit;padding:8px 20px;border:1px solid #17140f;background:none">إعادة المحاولة</button></p></div></body></html>`;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return; // pictures, scripts, API: straight to the network
  event.respondWith(
    fetch(event.request).catch(() => new Response(OFFLINE, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })),
  );
});
