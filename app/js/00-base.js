'use strict';
/* =====================================================================
   Armieri 5.0 — app condivisa con Firebase (Firestore + accesso anonimo)
   ===================================================================== */
const MAXOP = 50000, CAFFE_PER_KG = 130, MAX_REGALO = 20;   // MAX_REGALO: crediti (= euro) per collega e per regalo; deve coincidere con firestore.rules (2000 centesimi)
const PUNTI_DEF = 1, PUNTI_CREDITO_DEF = 3, SUSS_GIORNI = 7;
const FIREBASE_CONFIG = window.FIREBASE_CONFIG || null;
const SOGLIA_SCORTA = 2;          // giacenza sotto cui un articolo e' "da ricomprare"
const ANNULLA_MIN = 10;           // minuti per annullare un caffe'/snack preso per sbaglio
const CHIUSURA_SOGLIA_MOV = 250, CHIUSURA_SOGLIA_GG = 30;   // il banner in Home consiglia la chiusura sopra questi valori
const CHIUSURA_RECENTE_GG = 15, CHIUSURA_MIN_NUOVI = 5;   // sotto questi valori una nuova chiusura chiede una doppia conferma
const CHIUSURA_MARGINE = 15 * 60000; // i movimenti degli ultimi 15 minuti restano nel periodo aperto
const ARCHIVIO_CHUNK = 1500;
const LAVORO_ICO = '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true" style="color:#7dd3fc;display:inline-block;vertical-align:-4px"><path d="M12 1.5l1.3 5.2.6 3.6 7.6 5.7v2.4l-7.4-2.3-.4 3.3 2.2 1.8V23L12 22.2 8.2 23v-1.6l2.2-1.8-.4-3.3-7.5 2.3v-2.4l7.6-5.7.6-3.6z"/></svg>';
const PID_CAFFE = 'caffe';        // articolo speciale: scorta di buste di caffe'

/* ---------- utilita' ---------- */
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ic = (n, cls='') => `<svg class="i ${cls}"><use href="#i-${n}"/></svg>`;
const LS = {
  get(k, d){ try{ const v = localStorage.getItem('ps_'+k); return v == null ? d : JSON.parse(v); }catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem('ps_'+k, JSON.stringify(v)); }catch(e){} },
  del(k){ try{ localStorage.removeItem('ps_'+k); }catch(e){} }
};
/* PIN personale: nell'app e nel database c'è solo l'hash (PBKDF2-SHA256, salato con codice gruppo + collega), mai il PIN in chiaro */
async function hashPin(pin, gid, mid){
  if(!(window.crypto && crypto.subtle)) throw new Error('crypto-assente');
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(String(pin)), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode('armieri:' + gid + ':' + mid), iterations: 100000}, key, 256);
  return Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
}
const pinOk = v => /^\d{6}$/.test(String(v || ''));
const errIngresso = (e, permesso) => {
  const c = (e && (e.code || e.message)) || '';
  if(e && e.message === 'crypto-assente') return 'Apri l\'app da https o da localhost per usare il PIN';
  if(!navigator.onLine || /unavailable|network|offline|deadline/i.test(c)) return 'Connessione assente o instabile: riprova tra poco';
  if(/permission/i.test(c)) return permesso || 'Operazione non consentita';
  return 'Errore (' + errMsg(e) + ')';
};
const pinErr = e => e && e.message === 'crypto-assente' ? 'Apri l\'app da https o da localhost per usare il PIN' : /permission/i.test((e && (e.code || e.message)) || '') ? 'PIN non accettato' : 'Errore (' + errMsg(e) + ')';
const eur = c => (c < 0 ? '-' : '') + (Math.abs(c||0)/100).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2}) + ' €';
const eurS = c => (c > 0 ? '+' : '') + eur(c);
function parseEuro(v){
  if(v == null) return NaN;
  const s = String(v).trim().replace(/\s|€/g,'').replace(/\.(?=\d{3}(\D|$))/g,'').replace(',', '.');
  if(!/^-?\d+(\.\d{0,2})?$/.test(s)) return NaN;
  return Math.round(parseFloat(s) * 100);
}
const pad = n => String(n).padStart(2,'0');
function dataOra(ms){ const d = new Date(ms); return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`; }
function quando(ms){
  if(!ms) return '';
  const diff = Date.now() - ms, d = new Date(ms), oggi = new Date();
  if(diff < 60000) return 'ora';
  if(diff < 3600000) return Math.floor(diff/60000) + ' min fa';
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if(d.toDateString() === oggi.toDateString()) return 'oggi ' + hm;
  const ieri = new Date(oggi); ieri.setDate(oggi.getDate()-1);
  if(d.toDateString() === ieri.toDateString()) return 'ieri ' + hm;
  return `${pad(d.getDate())}/${pad(d.getMonth()+1)}` + (d.getFullYear() !== oggi.getFullYear() ? '/'+String(d.getFullYear()).slice(2) : '') + ' ' + hm;
}
function clean(o){ const r = {}; for(const k in o){ if(o[k] !== undefined) r[k] = o[k]; } return r; }
function add(o, k, v){ o[k] = (o[k] || 0) + v; }
function newCode(){
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', b = new Uint8Array(12);
  crypto.getRandomValues(b);
  const s = Array.from(b, x => A[x % A.length]).join('');
  return s.slice(0,4) + '-' + s.slice(4,8) + '-' + s.slice(8,12);
}
function normCode(v){
  const s = String(v||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
  if(s.length !== 12) return null;
  return s.slice(0,4) + '-' + s.slice(4,8) + '-' + s.slice(8,12);
}
const anno = () => String(new Date().getFullYear());
const dMese = ms => new Date(ms).toLocaleDateString('it-IT', {day: 'numeric', month: 'short'}).replace('.', '');
const dtLocal = ms => { const d = new Date(ms); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const oggiISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; };
const FONTI = {contanti:'Contanti in sala', revolut:'Conto Revolut', tasca:'Di tasca propria'};
function errMsg(e){
  const c = (e && (e.code || e.message)) || String(e);
  if(/permission/i.test(c)) return 'permesso negato';
  if(/unavailable|network|offline/i.test(c)) return 'nessuna connessione';
  return c;
}

/* ---------- stato ---------- */
const st = {
  page: LS.get('page','bar'), buste: [], uid: null, gid: LS.get('gid', null), mid: LS.get('mid', null),
  gruppo: null, membri: [], prodotti: [], eventi: [], chiusure: [], movimenti: [], pending: {},
  admins: [], utenti: [], admDoc: false,
  ready: {}, sync: 'conn', syncErr: '', entry: null, busy: false,
  caffeQta: 1, riscSel: {}, riscMet: 'contanti', invSort: {k:'nome', asc:true}, feedFiltro: 'tutti', statPeriodo: 'corrente', salPer: 'mese', rpPer: 'oggi', rpDa: '', rpA: '', salDa: '', salA: '', scSel: null, listaSpesa: [], spesaSel: {}, arcMov: null, arcLoading: false,
  archivio: null, skipInstall: false, installata: false
};

