'use strict';
/* ---------- Firebase ---------- */
let db = null, unsubs = [], movUnsub = null, movUnsubD = null, lastCutoffKey = null;
const TS = () => firebase.firestore.FieldValue.serverTimestamp();
const G = () => db.collection('saletta').doc(st.gid);
const C = n => G().collection(n);

function initFirebase(){
  const cfgOk = FIREBASE_CONFIG && (FIREBASE_CONFIG.demo || (FIREBASE_CONFIG.apiKey && !/INCOLLA|YOUR_|XXXX/i.test(FIREBASE_CONFIG.apiKey + (FIREBASE_CONFIG.projectId || ''))));
  if(!cfgOk || typeof firebase === 'undefined'){ st.sync = 'nocfg'; render(); return; }
  firebase.initializeApp(FIREBASE_CONFIG);
  db = firebase.firestore();
  db.enablePersistence({synchronizeTabs: true}).catch(() => {});
  firebase.auth().onAuthStateChanged(u => {
    if(!u) return;
    st.uid = u.uid;
    if(st.gid) connect(st.gid); else { st.sync = 'ok'; render(); }
  });
  firebase.auth().signInAnonymously().catch(e => { st.sync = 'err'; st.syncErr = e.code || e.message; render(); });
}

function onErr(e){ console.error(e); st.sync = 'err'; st.syncErr = e.code || e.message; render(); }
/* st.isAdmin = ha un ruolo di gestione (Supervisor con documento admin, oppure Creatore). Cosa può fare lo dice can(permesso). */
Object.defineProperty(st, 'isAdmin', {configurable: true, enumerable: true, get(){ return !!st.admDoc || sonoCreatore(); }, set(v){ st.admDoc = !!v; }});
function setSync(s){
  if(!s || !s.metadata) return;
  st.sync = s.metadata.fromCache ? (navigator.onLine ? 'conn' : 'off') : 'ok';
}

function disconnect(){
  unsubs.forEach(u => u()); unsubs = [];
  stopData();
  modeKey = null;
  _derCache = null;
  Object.assign(st, {pinDoc:undefined, gruppo:null, membri:[], prodotti:[], eventi:[], chiusure:[], estratto:null, movimenti:[], pending:{}, admins:[], utenti:[], richiesta:null, richieste:[], reqAdmin:null, richAdmin:[], riscatti:[], acquisti:[], buste:[], listaSpesa:[], spesaSel:{}, movD:[], isAdmin:false, ready:{}, archivio:null});
}

function connect(gid){
  disconnect();
  st.gid = gid;
  const g = db.collection('saletta').doc(gid);
  const docs = s => s.docs.map(d => ({id: d.id, ...d.data({serverTimestamps:'estimate'})}));
  // includeMetadataChanges: senza, dopo il primo snapshot dalla cache lo stato restava grigio finché i dati non cambiavano
  unsubs.push(g.onSnapshot({includeMetadataChanges: true}, s => {
    if(!s.exists){
      if(!s.metadata.fromCache){ toast('Il gruppo non esiste più su questo codice', 'err'); A['esci-gruppo'](true); }
      return;
    }
    st.gruppo = {id: s.id, ...s.data()}; st.ready.g = true; setSync(s); if(st.ready.a && st.ready.u) syncMode(); render();
  }, onErr));
  unsubs.push(g.collection('richieste').doc(st.uid).onSnapshot(s => {
    st.richiesta = s.exists ? s.data() : null; st.ready.r = true; render();
  }, onErr));
  unsubs.push(g.collection('utenti').doc(st.uid).onSnapshot(s => {
    if(s.exists){ st.mid = s.data().mid; LS.set('mid', st.mid); }
    else if(!s.metadata.fromCache){ st.mid = null; LS.del('mid'); }
    st.ready.u = true;
    if(!s.metadata.hasPendingWrites) syncMode();   // aspetta che il server abbia registrato il collegamento telefono → collega
    render();
  }, onErr));
  unsubs.push(g.collection('admin').doc(st.uid).onSnapshot(s => {
    const era = st.admDoc;
    st.admDoc = s.exists && !s.metadata.hasPendingWrites ? true : (s.exists && era);
    if(!s.exists) st.admDoc = false;
    st.ready.a = true; syncMode(); render();
  }, onErr));
}

/* Dati riservati: il Supervisor scarica registro, chiusure e anagrafica telefoni;
   il collega scarica solo i propri movimenti e il proprio estratto (saldo all'ultima chiusura). */
let dataUnsubs = [], modeKey = null;
function stopData(){
  dataUnsubs.forEach(u => u()); dataUnsubs = [];
  if(movUnsub){ movUnsub(); movUnsub = null; }
  if(movUnsubD){ movUnsubD(); movUnsubD = null; }
  lastCutoffKey = null;
  if(perleUnsub){ perleUnsub(); perleUnsub = null; } perleKey = '';
}
let retryT = null, retryN = 0;
const onDataErr = e => {
  if(!/permission/i.test(e.code || e.message)) return onErr(e);
  // di solito succede durante un cambio di ruolo o appena scelto il nome: riprova qualche volta
  console.warn('permesso negato, riprovo', e);
  clearTimeout(retryT);
  if(retryN++ < 5) retryT = setTimeout(() => { modeKey = null; syncMode(); render(); }, 1500 * retryN);
};
function syncMode(){
  if(!st.ready.a || !st.ready.u) return;
  const key = st.isAdmin ? 'admin' : (st.mid ? 'user:' + st.mid : 'none');
  if(key === modeKey) return;
  modeKey = key;
  if(key === 'admin' || key.startsWith('user')) setTimeout(() => { if(modeKey === key) retryN = 0; }, 20000);
  stopData();
  Object.assign(st, {pinDoc:undefined, chiusure:[], estratto:null, movimenti:[], movD:[], riscatti:[], acquisti:[], buste:[], listaSpesa:[], admins:[], utenti:[], richieste:[], richAdmin:[], archivio:null, arcMov:null, arcLoading:false});
  st.ready.mv = false; _derCache = null;
  if(key === 'none'){ Object.assign(st, {membri:[], prodotti:[], eventi:[]}); st.ready.m = false; return; }
  // dati comuni, leggibili solo da chi è già stato accettato nel gruppo
  const docs = s => s.docs.map(d => ({id: d.id, ...d.data({serverTimestamps:'estimate'})}));
  dataUnsubs.push(C('membri').onSnapshot(s => { st.membri = docs(s).sort((a,b) => a.nome.localeCompare(b.nome, 'it')); st.ready.m = true; render(); }, onDataErr));
  if(st.mid) dataUnsubs.push(C('segretiMembri').doc(st.mid).onSnapshot(s => {   // PIN personale: serve solo sapere se esiste ed è temporaneo
    if(s.exists) st.pinDoc = {temporaneo: s.data().temporaneo === true};
    else if(!s.metadata.fromCache) st.pinDoc = null;
    render();
  }, () => {}));
  dataUnsubs.push(C('prodotti').onSnapshot(s => { st.prodotti = docs(s); render(); }, onDataErr));
  let evA = [], evB = [];   // compleanni (ricorrenti) + ultimi 30 per data: mai l'intera collezione
  const evMerge = () => { const mp = new Map(); evA.concat(evB).forEach(e => mp.set(e.id, e)); st.eventi = [...mp.values()]; render(); };
  dataUnsubs.push(C('eventi').where('tipo', '==', 'compleanno').limit(30).onSnapshot(s => { evA = docs(s); evMerge(); }, onDataErr));
  dataUnsubs.push(C('eventi').orderBy('data', 'desc').limit(30).onSnapshot(s => { evB = docs(s); evMerge(); }, onDataErr));
  // lista della spesa: articoli da comprare / in rimborso, più gli ultimi 30 acquistati (nessun indice composito)
  let lsAtt = [], lsSto = [];
  const lsMerge = () => { st.listaSpesa = lsAtt.concat(lsSto); render(); };
  dataUnsubs.push(C('listaSpesa').where('stato', 'in', ['da_comprare', 'in_rimborso']).onSnapshot(s => { lsAtt = docs(s); lsMerge(); }, onDataErr));
  dataUnsubs.push(C('listaSpesa').orderBy('acquistoTs', 'desc').limit(30).onSnapshot(s => { lsSto = docs(s).filter(x => x.stato === 'acquistato'); lsMerge(); }, onDataErr));
  if(key === 'admin'){
    dataUnsubs.push(C('chiusure').orderBy('fino').onSnapshot(s => {
      st.chiusure = s.docs.map(d => ({id: d.id, ...d.data()})); _derCache = null;
      const last = ultimaChiusura(), k = last ? last.id : '-';
      if(k !== lastCutoffKey){ lastCutoffKey = k; subMovimenti(last ? last.fino : firebase.firestore.Timestamp.fromMillis(0), null); }
      render();
    }, onDataErr));
    dataUnsubs.push(C('admin').onSnapshot(s => { st.admins = s.docs.map(d => ({id: d.id, ...d.data({serverTimestamps:'estimate'})})); render(); }, onDataErr));
    dataUnsubs.push(C('utenti').onSnapshot(s => { st.utenti = s.docs.map(d => ({id: d.id, ...d.data()})); render(); }, onDataErr));
    dataUnsubs.push(C('richieste').onSnapshot(s => { st.richieste = s.docs.map(d => ({id: d.id, ...d.data({serverTimestamps:'estimate'})})).filter(r => r.stato === 'attesa'); render(); }, onDataErr));
  } else if(st.mid){
    const mid = st.mid;
    dataUnsubs.push(C('estratti').doc(mid).onSnapshot(s => {
      st.estratto = s.exists ? s.data() : null; _derCache = null;
      const k = st.estratto ? st.estratto.chiusura : '-';
      if(k !== lastCutoffKey){ lastCutoffKey = k; subMovimenti(st.estratto ? st.estratto.fino : firebase.firestore.Timestamp.fromMillis(0), mid); }
      render();
    }, onDataErr));
  }
}

function subMovimenti(cutoff, mid){
  if(movUnsub) movUnsub();
  if(movUnsubD){ movUnsubD(); movUnsubD = null; }
  st.ready.mv = false; st.movD = [];
  mid = null;   // registro trasparente: tutti i membri leggono tutti i movimenti
  if(mid){   // scambi di crediti indirizzati a me
    movUnsubD = C('movimenti').where('dest', '==', mid).where('ts', '>', cutoff).orderBy('ts').onSnapshot(s => {
      st.movD = s.docs.map(d => { const x = d.data({serverTimestamps:'estimate'}); return {id: d.id, ...x, _ts: x.ts || null, t: x.ts ? x.ts.toMillis() : (x.cts || Date.now()), _local: d.metadata.hasPendingWrites}; });
      _derCache = null; render();
    }, onDataErr);
  }
  let q = C('movimenti');
  if(mid) q = q.where('mid', '==', mid);
  movUnsub = q.where('ts', '>', cutoff).orderBy('ts').onSnapshot(s => {
    st.movimenti = s.docs.map(d => {
      const x = d.data({serverTimestamps:'estimate'});
      return {id: d.id, ...x, _ts: x.ts || null, t: x.ts ? x.ts.toMillis() : (x.cts || Date.now()), _local: d.metadata.hasPendingWrites};
    });
    for(const id of Object.keys(st.pending)) if(st.movimenti.some(m => m.id === id)) delete st.pending[id];
    st.ready.mv = true; _derCache = null; render();
  }, onDataErr);
}

window.addEventListener('online', () => { if(st.sync === 'off') st.sync = 'conn'; render(); });
window.addEventListener('offline', () => { st.sync = 'off'; render(); });

