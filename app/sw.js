// Armieri 5.0 service worker: rete prima, copia locale se offline
// su /beta/ la cache ha un nome diverso, cosi' beta e versione ufficiale (stessa origine) non si cancellano a vicenda
const BETA = self.location.pathname.includes('/beta/');
const FAM = BETA ? 'armieri-beta-v' : 'armieri-v';
const CACHE = FAM + '1.82.3';
const FILES = ['./', 'index.html', 'config.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png',
  'css/stile.css', 'css/desktop.css',
  'js/00-base.js', 'js/10-firebase.js', 'js/20-dati.js', 'js/30-ui-base.js', 'js/40-ingresso.js', 'js/41-bar-crediti.js', 'js/42-registro-feed.js', 'js/43-regolamento.js', 'js/44-incarichi-pulizie.js', 'js/45-eventi-statistiche.js', 'js/46-spesa-cassa-quote.js', 'js/47-admin-impostazioni.js', 'js/50-azioni-base.js', 'js/51-azioni-gestione.js', 'js/52-azioni-pin-backup.js', 'js/60-eventi-dom.js', 'js/61-bacheca-ruota.js', 'js/62-navigazione.js', 'js/99-avvio.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith(FAM) && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  const sdk = u.hostname === 'www.gstatic.com' && u.pathname.startsWith('/firebasejs/'); // SDK Firebase: copia locale per l'uso offline
  if (u.origin !== location.origin && !sdk) return; // il resto di Firebase passa diretto
  e.respondWith(
    fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; })
      .catch(() => caches.match(e.request).then(r => r || caches.match('./')))
  );
});
