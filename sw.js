const CACHE='interval-v0.5.1-3';
const FILES=['./','index.html','styles.css','app.js','engine.js','scoring.js','session.js','manifest.webmanifest','assets/eye.svg','assets/record.svg','assets/severance.svg','assets/x-code.svg','assets/star.svg','assets/motherboard.png','assets/motherboard-a.png','assets/motherboard-b.png','assets/market.png','assets/back.png','assets/Doto-Black.ttf','assets/icon.png','docs/regras.pdf'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('interval-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)));});
