'use strict';
/* ---------- avvio ---------- */
(function boot(){
  const h = location.hash.replace(/^#/, ''), q = new URLSearchParams(location.search).get('g');
  const raw = q || (h.match(/g=([A-Za-z0-9-]+)/) || [])[1] || (normCode(h) ? h : '');   // link: ?g=CODICE, #g=CODICE oppure #CODICE
  const c = raw ? normCode(raw) : null;
  if(c && !st.gid){ LS.set('invito', c); st.entry = 'join'; st.autoJoin = c; }
  if(raw){ const sp = new URLSearchParams(location.search); sp.delete('g'); history.replaceState(null, '', location.pathname + (sp.toString() ? '?' + sp : '')); }
  if('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
  render();
  initFirebase();
})();
