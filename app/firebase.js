// ============================================================================
// PocketSaletta BETA — simulatore locale di Firebase (solo per le prove in VS Code)
// Sostituisce la libreria Firebase vera: i dati stanno nel server locale (server.js)
// che applica le stesse regole di firestore.rules. In produzione questo file viene
// sostituito dalla libreria Firebase ufficiale.
// ============================================================================
(function(){
  // Ogni scheda con ?tel=N e' un telefono diverso (memoria locale separata)
  const TEL = Math.max(1, parseInt(new URLSearchParams(location.search).get('tel'), 10) || 1);
  window.__TEL = TEL;
  const pre = 't' + TEL + ':';
  const P = Storage.prototype, g = P.getItem, s = P.setItem, r = P.removeItem;
  P.getItem = function(k){ return g.call(this, pre + k); };
  P.setItem = function(k, v){ return s.call(this, pre + k, v); };
  P.removeItem = function(k){ return r.call(this, pre + k); };

  document.addEventListener('DOMContentLoaded', () => {
    const css = document.createElement('style');
    css.textContent = `#beta{position:fixed;right:10px;bottom:calc(76px + env(safe-area-inset-bottom,0px));z-index:70;font:700 11px system-ui,sans-serif}
      #beta>button{background:#7c3aed;color:#fff;border:0;border-radius:99px;padding:6px 11px;box-shadow:0 6px 18px rgba(0,0,0,.4);cursor:pointer}
      #beta div{display:none;position:absolute;right:0;bottom:34px;background:#131b2e;border:1px solid #2e3b58;border-radius:14px;padding:6px;min-width:190px;box-shadow:0 12px 30px rgba(0,0,0,.5)}
      #beta.on div{display:block}
      #beta a{display:block;padding:9px 10px;color:#eef2f9;text-decoration:none;border-radius:9px;font-weight:600;font-size:13px}
      #beta a:hover{background:#18223a}#beta a.red{color:#fb7185}#beta small{display:block;padding:6px 10px 4px;color:#7f8ba3;font-weight:600}`;
    document.head.appendChild(css);
    const b = document.createElement('div'); b.id = 'beta';
    const links = [1,2,3,4].filter(n => n !== TEL).map(n => `<a href="?tel=${n}" target="_blank">📱 Apri telefono ${n}</a>`).join('');
    b.innerHTML = `<button>BETA · tel ${TEL}</button><div><small>Ogni telefono è un collega diverso</small>${links}
      <a href="#" data-x="age">⏩ Invecchia movimenti di 20 min</a><a href="#" class="red" data-x="reset">🗑️ Azzera tutti i dati</a></div>`;
    document.body.appendChild(b);
    b.querySelector('button').onclick = () => b.classList.toggle('on');
    b.querySelector('[data-x="reset"]').onclick = e => { e.preventDefault(); if(!confirm('Cancellare tutti i dati della beta (tutti i telefoni)?')) return; fetch('/db/reset').then(() => { localStorage.clear(); location.reload(); }); };
    b.querySelector('[data-x="age"]').onclick = e => { e.preventDefault(); fetch('/db/age?min=20').then(() => alert('Fatto: ora puoi provare la chiusura del periodo e i movimenti risultano di 20 minuti fa.')); };
  });
})();

// Finto SDK Firebase "compat" (solo le parti usate dall'app), collegato al server di prova
(function(){
  class Timestamp {
    constructor(s, n){ this.seconds = s; this.nanoseconds = n; }
    toMillis(){ return this.seconds*1000 + Math.floor(this.nanoseconds/1e6); }
    static fromMillis(ms){ return new Timestamp(Math.floor(ms/1000), (ms % 1000) * 1e6); }
    static now(){ return Timestamp.fromMillis(Date.now()); }
    valueOf(){ return String(this.seconds).padStart(12,'0') + '.' + String(this.nanoseconds).padStart(9,'0'); }
  }
  const STS = {__sts: 1};
  const dec = v => { if(v && typeof v === 'object'){ if(Array.isArray(v.__ts)) return new Timestamp(v.__ts[0], v.__ts[1]); if(v.__sts) return STS; if(Array.isArray(v)) return v.map(dec); const o = {}; for(const k in v) o[k] = dec(v[k]); return o; } return v; };
  const enc = v => { if(v === STS) return {__sts:1}; if(v instanceof Timestamp) return {__ts:[v.seconds, v.nanoseconds]}; if(v && typeof v === 'object'){ if(Array.isArray(v)) return v.map(enc); const o = {}; for(const k in v){ if(v[k] === undefined) throw new Error('undefined field ' + k); o[k] = enc(v[k]); } return o; } return v; };
  const est = (v, mode) => { if(v === STS) return mode === 'estimate' ? Timestamp.now() : null; if(v && typeof v === 'object' && !(v instanceof Timestamp)){ if(Array.isArray(v)) return v.map(x => est(x, mode)); const o = {}; for(const k in v) o[k] = est(v[k], mode); return o; } return v; };

  let uid = null;
  const server = new Map();   // path -> data
  const local = new Map();    // path -> {data|null, n}
  const listeners = new Set();
  let ready = false, readyCbs = [];
  window.__mock = {server, local, writes: 0, denied: []};

  const view = p => local.has(p) ? local.get(p).data : (server.has(p) ? server.get(p) : null);
  const pendingFor = p => local.has(p);
  function fire(){ listeners.forEach(l => { try { l(); } catch(e){ console.error(e); } }); }

  // ---- diagnostica: la beta funziona solo aperta da http://localhost:8787 con server.js avviato ----
  function blocco(titolo, testo){
    const show = () => {
      if(document.getElementById('beta-err')) return;
      const d = document.createElement('div'); d.id = 'beta-err';
      d.style.cssText = 'position:fixed;inset:0;z-index:99;background:rgba(2,6,23,.92);display:grid;place-items:center;padding:20px;font:15px/1.45 system-ui,sans-serif;color:#eef2f9';
      d.innerHTML = '<div style="max-width:440px;background:#131b2e;border:1px solid #fb7185;border-radius:18px;padding:20px"><div style="font-size:30px">⚠️</div><h2 style="margin:6px 0 10px;font-size:18px">' + titolo + '</h2>' + testo + '</div>';
      document.body.appendChild(d);
    };
    document.body ? show() : document.addEventListener('DOMContentLoaded', show);
  }
  const ISTR = '<ol style="padding-left:20px;margin:10px 0 0"><li>In VS Code apri la <b>cartella</b> <code>pocketsaletta-beta</code> (non solo il file).</li><li>Premi <b>F5</b> oppure scrivi <code>npm start</code> nel terminale.</li><li>Nel terminale deve comparire <i>PocketSaletta BETA in esecuzione</i>.</li><li>Apri <b>http://localhost:8787</b> nel browser.</li></ol>';
  if(location.protocol === 'file:') blocco('Pagina aperta come file', '<p style="margin:0">Hai aperto <code>index.html</code> direttamente. La beta ha bisogno del suo server locale:</p>' + ISTR);
  // Aggiornamenti: ogni mezzo secondo il telefono chiede al server cosa è cambiato.
  // (nessuna connessione permanente: funziona con qualsiasi numero di schede aperte)
  let serverOk = false, since = 0, epoch = null, failures = 0, pollT = null, polling = null;
  function poll(){
    if(polling) return polling;
    clearTimeout(pollT);
    polling = (async () => {
      try {
        const m = await fetch('/db/poll?since=' + since, {cache: 'no-store'}).then(r => r.json());
        failures = 0;
        if(!serverOk){ serverOk = true; const e = document.getElementById('beta-err'); if(e) e.remove(); }
        if(epoch && m.epoch !== epoch){ location.reload(); return; }   // server azzerato o riavviato
        epoch = m.epoch;
        if(m.init){
          server.clear(); m.init.forEach(([k, v]) => server.set(k, dec(v)));
          if(!ready){ ready = true; readyCbs.forEach(f => f()); readyCbs = []; }
          fire();
        } else if(m.changes.length){
          m.changes.forEach(([k, v]) => { if(v === null) server.delete(k); else server.set(k, dec(v)); });
          fire();
        }
        since = m.seq;
      } catch(e){
        if(++failures >= 2 && !serverOk) blocco('Server della beta non raggiungibile', '<p style="margin:0">Questa pagina (' + location.host + ') non riceve dati da <code>server.js</code>. Probabilmente il server non è avviato oppure stai usando Live Server o un altro indirizzo.</p>' + ISTR);
      } finally {
        polling = null;
        pollT = setTimeout(poll, document.hidden ? 3000 : 500);
      }
    })();
    return polling;
  }
  document.addEventListener('visibilitychange', () => { if(!document.hidden) poll(); });
  poll();
  const whenReady = () => new Promise((r, j) => { if(ready) return r(); readyCbs.push(r); setTimeout(() => { if(!ready) j(Object.assign(new Error('unavailable'), {code:'unavailable'})); }, 5000); });

  async function write(ops){
    await whenReady();
    const tok = {};
    ops.forEach(o => {
      const cur = view(o.path);
      let nd = o.op === 'delete' ? null : o.op === 'update' ? {...(cur || {}), ...o.data} : (o.merge && cur ? {...cur, ...o.data} : {...o.data});
      if(nd) for(const k in nd){ const v = nd[k]; if(v && typeof v === 'object' && '__inc' in v) nd[k] = ((cur && cur[k]) || 0) + v.__inc; }
      local.set(o.path, {data: nd, tok});
    });
    fire();
    window.__mock.writes++;
    let r;
    try { r = await fetch('/db/write', {method:'POST', body: JSON.stringify({uid, ops: ops.map(o => ({...o, data: o.data ? enc(o.data) : undefined}))})}).then(r => r.json()); }
    catch(e){ r = {error: 'unavailable'}; }
    if(!r.error){ await poll(); await poll(); }   // riceve subito la versione salvata dal server
    ops.forEach(o => { const l = local.get(o.path); if(l && l.tok === tok) local.delete(o.path); });
    fire();
    if(r.error){ window.__mock.denied.push(r); const e = new Error(r.error); e.code = r.error; throw e; }
  }

  class DocSnap {
    constructor(ref, data, pend){ this.ref = ref; this.id = ref.id; this._d = data; this.exists = data != null; this.metadata = {fromCache: false, hasPendingWrites: pend}; }
    data(o){ return this._d == null ? undefined : est(this._d, o && o.serverTimestamps); }
  }
  class DocRef {
    constructor(p){ this.path = p; this.id = p.split('/').pop(); }
    collection(n){ return new Query(this.path + '/' + n); }
    set(data, o){ return write([{op:'set', path:this.path, data, merge: !!(o && o.merge)}]); }
    update(data){ if(!view(this.path)) return Promise.reject(Object.assign(new Error('not-found'), {code:'not-found'})); return write([{op:'update', path:this.path, data}]); }
    delete(){ return write([{op:'delete', path:this.path}]); }
    async get(){
      await whenReady();
      const r = await fetch('/db/get', {method:'POST', body: JSON.stringify({uid, path: this.path})}).then(r => r.json());
      if(r.error) throw Object.assign(new Error(r.error), {code: r.error});
      return new DocSnap(this, r.data ? dec(r.data) : null, false);
    }
    onSnapshot(a, b, c){
      const cb = typeof a === 'function' ? a : b, err = typeof a === 'function' ? b : c;
      let last = undefined;
      const l = () => { const d = view(this.path); const k = JSON.stringify(enc(d === null ? {} : d)) + (d === null) + pendingFor(this.path); if(k === last) return; last = k; cb(new DocSnap(this, d, pendingFor(this.path))); };
      // permessi di lettura del singolo documento
      let attivo = true;
      fetch('/db/get', {method:'POST', body: JSON.stringify({uid, path: this.path})}).then(r => r.json()).then(r => {
        if(!attivo) return;
        if(r.error){ err && err(Object.assign(new Error(r.error), {code: r.error})); return; }
        whenReady().then(() => { if(attivo){ listeners.add(l); l(); } });
      });
      return () => { attivo = false; listeners.delete(l); };
    }
  }
  const cmp = (a, b) => { if(a instanceof Timestamp && b instanceof Timestamp) return a.valueOf() < b.valueOf() ? -1 : a.valueOf() > b.valueOf() ? 1 : 0; return a < b ? -1 : a > b ? 1 : 0; };
  class Query {
    constructor(p, f, o, lim){ this.path = p; this.f = f || []; this.o = o || []; this.lim = lim; this.id = p.split('/').pop(); }
    doc(id){ return new DocRef(this.path + '/' + (id || Math.random().toString(36).slice(2, 12) + Date.now().toString(36).slice(-4))); }
    add(data){ const r = this.doc(); return r.set(data).then(() => r); }
    where(k, op, v){ return new Query(this.path, this.f.concat([[k, op, v]]), this.o, this.lim); }
    orderBy(k){ return new Query(this.path, this.f, this.o.concat([k]), this.lim); }
    limit(n){ return new Query(this.path, this.f, this.o, n); }
    _docs(){
      const depth = this.path.split('/').length + 1, keys = new Set([...server.keys(), ...local.keys()]);
      let out = [];
      keys.forEach(k => { if(k.startsWith(this.path + '/') && k.split('/').length === depth){ const d = view(k); if(d) out.push([k, d]); } });
      out = out.filter(([, d]) => this.f.every(([k, op, v]) => { const x = d[k]; if(!(x instanceof Timestamp) && v instanceof Timestamp) return false; if(op === '==') return x instanceof Timestamp ? cmp(x, v) === 0 : x === v; if(x === undefined || x === null) return false; const c = cmp(x, v); return op === '>' ? c > 0 : op === '>=' ? c >= 0 : op === '==' ? c === 0 : op === '<' ? c < 0 : true; }));
      this.o.forEach(k => out.sort((a, b) => cmp(a[1][k], b[1][k])));
      if(this.lim) out = out.slice(0, this.lim);
      return out.map(([k, d]) => new DocSnap(new DocRef(k), d, pendingFor(k)));
    }
    async get(){
      await whenReady();
      const r = await fetch('/db/get', {method:'POST', body: JSON.stringify({uid, path: this.path, list: true, filters: this.f.map(([k, o, v]) => [k, o, enc(v)])})}).then(r => r.json());
      if(r.error) throw Object.assign(new Error(r.error), {code: r.error});
      return {docs: this._docs(), metadata: {fromCache: false}};
    }
    onSnapshot(a, b, c){
      const cb = typeof a === 'function' ? a : b, err = typeof a === 'function' ? b : c;
      let last;
      const l = () => { const docs = this._docs(); const k = JSON.stringify(docs.map(d => [d.id, enc(d._d), d.metadata.hasPendingWrites])); if(k === last) return; last = k; cb({docs, metadata: {fromCache: false, hasPendingWrites: docs.some(d => d.metadata.hasPendingWrites)}}); };
      // permesso di lettura verificato dal server con gli stessi filtri della query
      let attivo = true;
      fetch('/db/get', {method:'POST', body: JSON.stringify({uid, path: this.path, list: true, filters: this.f.map(([k, o, v]) => [k, o, enc(v)])})}).then(r => r.json())
        .then(r => { if(!attivo) return; if(r.error) err && err(Object.assign(new Error(r.error), {code: r.error})); else whenReady().then(() => { if(attivo){ listeners.add(l); l(); } }); });
      return () => { attivo = false; listeners.delete(l); };
    }
  }
  const fs = {
    collection: p => new Query(p),
    batch(){ const ops = []; return { set(ref, data, o){ ops.push({op:'set', path: ref.path, data, merge: !!(o && o.merge)}); }, update(ref, data){ ops.push({op:'update', path: ref.path, data}); }, delete(ref){ ops.push({op:'delete', path: ref.path}); }, commit: () => write(ops) }; },
    enablePersistence: () => Promise.resolve()
  };
  const authCbs = [];
  const auth = {
    get currentUser(){ return uid ? {uid} : null; },
    onAuthStateChanged(cb){ authCbs.push(cb); if(uid) cb({uid}); },
    signInAnonymously(){ uid = localStorage.getItem('mock_uid') || ('u' + Math.random().toString(36).slice(2, 10)); localStorage.setItem('mock_uid', uid); setTimeout(() => authCbs.forEach(cb => cb({uid})), 10); return Promise.resolve({user: {uid}}); }
  };
  const firestore = () => fs;
  firestore.FieldValue = {serverTimestamp: () => STS, increment: n => ({__inc: n})};
  firestore.Timestamp = Timestamp;
  window.firebase = {initializeApp: () => ({}), auth: () => auth, firestore};
})();
