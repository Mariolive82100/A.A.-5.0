'use strict';
/* ---------- SFIDE (ex Briefing) ---------- */
const avvisoPuntiOff = () => ptMaster() ? '' : `<div class="banner amber" id="punti-off">${ic('alert')}<div class="grow"><b>Sistema punti disattivato</b><br><span style="font-size:12.5px">Nessun punto viene accreditato: le classifiche mostrano lo storico.</span></div></div>`;
/* riga di un incarico in corso: chi, da quanto, azione coerente con lo stato */
function cpRiga(m, me){
  const chi = x => esc(nomeBreve(x) || nomeM(x)), mio = m.mid === me, g = Math.floor((Date.now() - m.t) / 864e5);
  const eta = g <= 0 ? 'assegnato oggi' : g === 1 ? 'assegnato 1 giorno fa' : `assegnato ${g} giorni fa`;
  const da = m.da && m.da !== m.mid ? ` · estratto da ${chi(m.da)}` : '';
  let az = '';
  if(m._pending || m._local) az = '<span class="pill mut">invio…</span>';
  else if(m.stato === 'assegnato'){
    az = mio ? `<button class="btn sm green" id="btn-cp-fatto-${m.id}" data-act="cp-fatto" data-id="${m.id}">✅ Ho fatto!</button>` : '<span class="pill amber">da svolgere</span>';
    if(can('compiti')) az += ` <button class="btn link" style="padding:0;color:var(--mut)" id="btn-cp-annulla-${m.id}" data-act="cp-annulla" data-id="${m.id}">Annulla</button>`;
  } else if(m.stato === 'attesa'){
    az = cpPuoConv(m)
      ? `<div class="row" style="gap:4px"><button class="btn sm red" data-act="esito" data-id="${m.id}" data-v="rifiutata" aria-label="Rifiuta">✕</button><button class="btn sm green" id="btn-cp-ok-${m.id}" data-act="esito" data-id="${m.id}" data-v="confermata">Convalida</button></div>`
            : `<span class="pill violet">${mio ? 'in attesa di un altro Supervisor o del Creatore' : 'in attesa di convalida'}</span>`;
  }
  return `<div class="li" id="cp-inc-${m.id}"><div class="av">🎯</div>
    <div class="grow"><div class="t" style="white-space:normal;font-weight:700">${esc(m.nome || 'Compito')} · <b>${chi(m.mid)}</b>${mio ? ' <span class="pill violet">tu</span>' : ''}</div>
      <div class="d">+${m.punti || 0} pt · ${eta}${da}${m.stato === 'attesa' ? ' · svolto, da convalidare' : ''}</div></div>
    <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">${az}</div></div>`;
}
/* Sfide FISSE e automatiche (settimanali e mensili): il catalogo vive nel codice, nessuna creazione o modifica manuale e nessuna lettura in più.
   Le classifiche si calcolano in memoria dai movimenti già caricati. I premi sono movimenti 'bonus_podio' (Tessera Fedeltà) con ID unico: nessun doppio accredito.
   Le eventuali voci della vecchia mappa «sfide» nel documento del gruppo vengono ignorate (titoli e punti sono quelli di SF_FISSE). */
const SF_PER = {sett: ['Settimana', '📅', 'Settimanale'], mese: ['Mese', '🗓️', 'Mensile'], sett_c: ['Settimana', '🏁', 'Settimanale'], mese_c: ['Mese', '🏆', 'Mensile']};
const sfBase = k => k ? k.replace('_c', '') : k;   // 'sett_c' → 'sett'
const SF_PAREGGIO = 'In caso di parità vincono tutti i primi (ex aequo).';
const SF_FISSE = {
  sfauto_giro: {id: 'sfauto_giro', nome: '🤝 Il benefattore', per: 'sett', pt: 20, tipo: 'giro',
    descr: 'Vince chi, da lunedì a domenica, offre più giri di caffè: un giro sono 2 o più caffè registrati insieme.', spareggio: 'A parità di giri vince chi ha offerto più caffè in totale. ' + SF_PAREGGIO},
  sfauto_caffe: {id: 'sfauto_caffe', nome: '☕ Re della Caffeina', per: 'sett', pt: 20, tipo: 'caffe',
    descr: 'Vince chi registra più caffè nella settimana (da lunedì a domenica); contano anche i caffè pagati subito, non quelli annullati.', spareggio: SF_PAREGGIO},
  sfauto_ricarica: {id: 'sfauto_ricarica', nome: '🔋 Ricarica Top del Mese', per: 'mese', pt: 30, tipo: 'ricarica',
    descr: 'Vince chi nel mese solare ricarica di più (ricariche convalidate). Per privacy si vede solo l\'ordine dei colleghi, mai gli importi.', spareggio: 'Se due colleghi ricaricano la stessa cifra vincono entrambi (ex aequo).'},
  sfauto_spese: {id: 'sfauto_spese', nome: '🧾 Superstar della Spesa', per: 'mese', pt: 30, tipo: 'spese',
    descr: 'Vince chi nel mese solare registra più spese per il fondo, contando solo quelle convalidate.', spareggio: 'A parità di spese vince chi ha speso di più in totale (l\'importo non viene mostrato). ' + SF_PAREGGIO},
  sfauto_pulizie: {id: 'sfauto_pulizie', nome: '🧹 Mastro Lindo', per: 'mese', pt: 30, tipo: 'pulizie',
    descr: 'Vince chi ottiene più punti pulizia nel mese solare. I punti li assegna solo il Creatore o un admin con «Sfide e Regole» (🎯 Punti extra); contano anche i vecchi turni e compiti convalidati.', spareggio: 'A parità di punti vince chi ha più turni di pulizia. ' + SF_PAREGGIO},
  sfauto_bf: {id: 'sfauto_bf', nome: '👏 Collega del Mese', per: 'mese', pt: 30, tipo: 'benfatto',
    descr: 'Vince chi riceve più «Ben fatto!» nel mese solare.', spareggio: SF_PAREGGIO},
  sfauto_lavoro: {id: 'sfauto_lavoro', nome: '💪 Indefesso', per: 'mese', pt: 40, tipo: 'lavoro',
    descr: 'Vince chi nel mese solare registra più «Lavoro compiuto» con il tasto in Home. Le segnalazioni le verifica l\'admin, che può stornare quelle che non risultano.', spareggio: SF_PAREGGIO}
};
/* animazione a tutto schermo quando si vince una sfida: vittorie dai premi in memoria (movimenti aperti + registro delle chiusure),
   «già vista» solo in localStorage; considera i premi degli ultimi 14 giorni. Nessuna lettura o scrittura su Firestore. */
let vitOpen = false;
function vittoriaCheck(){
  if(vitOpen || !st.mid || !st.ready.mv || !st.ready.m || $('sheet').classList.contains('on')) return;
  const chiave = 'vinte_' + st.gid + '_' + st.mid, viste = LS.get(chiave, []), aw = sfAssegnati(), nuove = [];
  Object.keys(aw).forEach(k => {
    if(!aw[k].includes(st.mid) || viste.includes(k)) return;
    const q = k.split('|'), x = SF_FISSE[q[0]]; if(!x) return;
    const p = sfPerDaKey(q[1]); if(p.fine < Date.now() - 14 * 864e5) return;
    nuove.push({k, x, p, n: aw[k].length});
  });
  if(!nuove.length) return;
  vitOpen = true; LS.set(chiave, viste.concat(nuove.map(v => v.k)).slice(-60));
  const tot = nuove.reduce((a, v) => a + v.x.pt, 0), col = ['#f5a524', '#7c3aed', '#10b981', '#38bdf8', '#f472b6', '#facc15'];
  const conf = Array.from({length: 40}, (_, i) => `<i class="vit-c" style="left:${Math.round(Math.random() * 100)}%;background:${col[i % col.length]};animation-duration:${(2.6 + Math.random() * 2.4).toFixed(2)}s;animation-delay:${(Math.random() * 2.5).toFixed(2)}s"></i>`).join('');
  const el = document.createElement('div');
  el.id = 'vittoria'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Hai vinto una sfida');
  el.innerHTML = `${conf}<div class="vit-box"><div class="vit-medal" aria-hidden="true">🏆</div><h2>${nuove.length === 1 ? 'Hai vinto una sfida!' : 'Hai vinto ' + nuove.length + ' sfide!'}</h2>
    ${nuove.map(v => `<div class="vit-r"><b>${esc(v.x.nome)}</b><span>${esc(v.p.label)}${v.n > 1 ? ' · ex aequo' : ''}</span><i>+${v.x.pt} punti</i></div>`).join('')}
    <p class="hint" style="margin:10px 0 14px">${tot} ${tot === 1 ? 'punto' : 'punti'} nei tuoi punti accumulati</p>
    <button class="btn amber block" id="btn-vittoria-ok" data-act="vittoria-chiudi">Fantastico!</button></div>`;
  document.body.appendChild(el);
  try { if(navigator.vibrate) navigator.vibrate([80, 40, 80]); } catch(e){}
}
let sfSez = null;   // sezione aperta: null = panoramica, 'sett' | 'mese' | 'sett_c' | 'mese_c' (concluse)
let sfDet = null;   // sfida aperta nel dettaglio (classifica completa): null = elenco
const sfLista = per => Object.values(SF_FISSE).filter(x => !per || x.per === per);
const sfConteggio = n => n === 0 ? 'nessuna sfida attiva' : n === 1 ? '1 sfida attiva' : n + ' sfide attive';
/* periodo che contiene `rif`: settimana lunedì–domenica o mese solare (ora locale) */
function sfPeriodo(per, rif){
  const f = dt => dt.toLocaleDateString('it-IT', {day: 'numeric', month: 'short'});
  if(per === 'sett'){
    const a = new Date(rif.getFullYear(), rif.getMonth(), rif.getDate() - ((rif.getDay() + 6) % 7)), b = new Date(a.getFullYear(), a.getMonth(), a.getDate() + 7);
    return {key: 'w' + isoDi(a), da: a.getTime(), a: b.getTime() - 1, fine: b.getTime(), label: 'settimana ' + f(a) + ' – ' + f(new Date(b.getTime() - 1))};
  }
  const a = new Date(rif.getFullYear(), rif.getMonth(), 1), b = new Date(rif.getFullYear(), rif.getMonth() + 1, 1);
  return {key: 'm' + a.getFullYear() + '-' + pad(a.getMonth() + 1), da: a.getTime(), a: b.getTime() - 1, fine: b.getTime(), label: a.toLocaleDateString('it-IT', {month: 'long', year: 'numeric'})};
}
function sfRimanente(fine){
  const ms = Math.max(0, fine - Date.now()), g = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5), m = Math.floor(ms % 36e5 / 6e4);
  return g > 0 ? g + (g === 1 ? ' giorno ' : ' giorni ') + h + ' h' : h > 0 ? h + ' h ' + m + ' min' : Math.max(1, m) + ' min';
}
/* conto alla rovescia compatto (g/h/min) e aggiornamento ogni 30 s dei contatori in pagina: solo testo, nessuna lettura */
function sfCd(fine){
  const ms = Math.max(0, fine - Date.now()), g = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5), m = Math.floor(ms % 36e5 / 6e4);
  return g > 0 ? g + 'g ' + h + 'h' : h > 0 ? h + 'h ' + m + 'm' : Math.max(1, m) + ' min';
}
setInterval(() => { try { document.querySelectorAll('[data-cd]').forEach(e => { e.textContent = '⏳ ' + sfCd(+e.dataset.cd); }); } catch(e){} }, 30000);
const sfPlur = (n, u, p) => n + ' ' + (n === 1 ? u : p);
/* ---- Continuità con la Chiusura Periodo (tutto in memoria, nessuna lettura in più) ----
   Le classifiche si costruiscono da «bucket» per settimana (lunedì–domenica) e per mese solare, per collega:
   settimanali [giri, caffè offerti, caffè, turni, punti pulizia, «Ben fatto»]; mensili [ricariche €, n. spese, spese €, lavori compiuti (Indefesso), turni pulizia, punti pulizia, «Ben fatto»].
   Alla chiusura i bucket dei movimenti archiviati vanno nel riepilogo (riep.sf) insieme ai premi assegnati (riep.aw); in memoria si sommano
   a quelli dei movimenti ancora aperti. Gli storni su movimenti già archiviati entrano con segno negativo nel periodo dell'originale. */
const sfWk = t => { const x = new Date(t); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - (x.getDay() + 6) % 7); return 'w' + isoDi(x); };
const sfMs = t => { const x = new Date(t); return 'm' + x.getFullYear() + '-' + pad(x.getMonth() + 1); };
const sfTc = m => { const e = m.esitoTs; return e && typeof e.toMillis === 'function' ? e.toMillis() : m.t; };
function sfBuckets(list){
  const W = {}, M = {}, byId = {}; list.forEach(m => { byId[m.id] = m; });
  const row = (o, k, mid, n) => { const b = o[k] = o[k] || {}; return mid ? (b[mid] = b[mid] || new Array(n).fill(0)) : new Array(n).fill(0); };
  list.forEach(m => {
    let src = m, sg = 1;
    if(m.tipo === 'storno'){ src = byId[m.rif] || m.orig; sg = -1; if(!src || !src.tipo) return; }
    if(src.tipo === 'storno') return;
    const t = src.t, wk = sfWk(t), tc = sfTc(src);
    if(src.tipo === 'caffe' && src.stato !== 'annullata' && src.qta > 1){ const r = row(W, wk, src.mid, 3); r[0] += sg; r[1] += sg * src.qta; }
    if((src.tipo === 'caffe' || src.tipo === 'caffe_pagato') && src.stato !== 'annullata') row(W, wk, src.mid, 3)[2] += sg * (src.qta || 0);
    if(src.tipo === 'pulizia') (src.mids || []).forEach(x => { const r = row(M, sfMs(t), x, 7); r[4] += sg; r[5] += sg * ptPulM(src); });
    else if((src.tipo === 'compito' && src.stato === 'confermata') || (src.tipo === 'obiettivo' && src.fase === 'fatto')){ const r = row(M, sfMs(t), src.mid, 7); r[4] += sg; r[5] += sg * (src.punti || 0); }
    if(src.tipo === 'bonus_podio' && src.extra && src.sfida === 'sfauto_pulizie'){ const r = row(M, src.perExtra && src.perExtra[0] === 'm' ? src.perExtra : sfMs(t), src.mid, 8); r[7] = (r[7] || 0) + sg * (src.punti || 0); }   // Mastro Lindo: punti pulizia dati dall'admin
    if(src.tipo === 'ben_fatto') row(M, sfMs(t), src.aMid, 7)[6] += sg;
    if(src.tipo === 'lavoro') row(M, sfMs(t), src.mid, 7)[3] += sg;   // Indefesso: lavori compiuti (si somma col segno: lo storno toglie 1 nel mese dell'originale)
    if(src.tipo === 'ricarica' && src.stato === 'confermata') row(M, sfMs(tc), src.mid, 7)[0] += sg * (src.importo || 0);
    if(src.tipo === 'spesa' && src.stato === 'confermata'){ const r = row(M, sfMs(tc), src.mid, 7); r[1] += sg; r[2] += sg * (src.importo || 0); }
  });
  [W, M].forEach(o => Object.keys(o).forEach(k => { Object.keys(o[k]).forEach(i => { if(o[k][i].every(v => !v)) delete o[k][i]; }); if(!Object.keys(o[k]).length) delete o[k]; }));
  return {w: W, m: M, v: 2};
}
/* chiave 'w2026-11-09' / 'm2026-11' → inizio periodo in ms; retention: settimane ~7 settimane, mesi ~4 mesi (bastano per il recupero premi: 4 settimane / 2 mesi) */
const sfKeyMs = k => { const q = k.slice(1).split('-').map(Number); return new Date(q[0], q[1] - 1, q[2] || 1).getTime(); };
const sfOk = k => sfKeyMs(k) >= Date.now() - (k[0] === 'w' ? 49 : 125) * 864e5;
function sfRiepTrim(r){
  if(!r || !r.sf) return r;
  const f = (o, fn) => { const x = {}; Object.keys(o || {}).forEach(k => { if(fn(k)) x[k] = o[k]; }); return x; };
  const out = {...r, sf: {w: f(r.sf.w, sfOk), m: f(r.sf.m, sfOk)}};
  if(r.sf.v) out.sf.v = r.sf.v;
  if(r.aw) out.aw = f(r.aw, k => sfOk(k.split('|')[1]));
  return out;
}
const sfPerDaKey = k => { const q = k.slice(1).split('-').map(Number); return k[0] === 'w' ? sfPeriodo('sett', new Date(q[0], q[1] - 1, q[2])) : sfPeriodo('mese', new Date(q[0], q[1] - 1, 1)); };
let _sfM = {d: null, ch: null, es: null};
function sfInit(){
  const d = derived();
  if(_sfM.d !== d || _sfM.ch !== st.chiusure || _sfM.es !== st.estratto){
    const P = storicoPeriodi(), aw = {};
    const put = (k, mids) => { const a = aw[k] = aw[k] || []; (mids || []).forEach(x => { if(!a.includes(x)) a.push(x); }); };
    P.forEach(r => { if(r.aw) Object.keys(r.aw).forEach(k => put(k, r.aw[k])); });
    const list = tuttiMov(), storn = d.stornati;
    list.forEach(m => { if(m.tipo === 'bonus_podio' && m.sfida && m.periodo && !storn.has(m.id)) put(m.sfida + '|' + m.periodo, [m.mid]); });
    _sfM = {d, ch: st.chiusure, es: st.estratto, P, aw, live: sfBuckets(list), mp: {}};
  }
  return _sfM;
}
/* conteggi per collega del periodo p: chiusure con dettaglio + movimenti aperti; parz = il periodo tocca una chiusura vecchia senza dettaglio */
function sfMerge(p){
  const c = sfInit(); if(c.mp[p.key]) return c.mp[p.key];
  const kind = p.key[0], rows = {}; let parz = false;
  const sum = src => Object.keys(src || {}).forEach(mid => { const a = src[mid], r = rows[mid] = rows[mid] || []; a.forEach((v, i) => { r[i] = (r[i] || 0) + v; }); });
  c.P.forEach(r => { if(r.sf && (kind === 'w' || r.sf.v === 2)) sum((r.sf[kind] || {})[p.key]); else if(r.da < p.a && r.fino > p.da) parz = true; });   // v:2 = mensili con turni e «Ben fatto»
  sum(c.live[kind][p.key]);
  return c.mp[p.key] = {rows, parz};
}
const sfAssegnati = () => sfInit().aw;
/* classifica in memoria di una sfida nel periodo p: righe ordinate {id, pos, v, v2, txt, sub}. Per «ricarica» txt resta vuoto: gli importi non si mostrano mai */
function sfClassifica(tipo, p){
  const att = new Set(membriAttivi().map(m => m.id)), rows = sfMerge(p).rows, righe = [];
  Object.keys(rows).forEach(id => {
    if(!att.has(id)) return;
    const a = rows[id], g = i => a[i] || 0;
    const [v, v2] = tipo === 'giro' ? [g(0), g(1)] : tipo === 'caffe' ? [g(2), 0] : tipo === 'pulizie' ? [g(5) + g(7), g(4)] : tipo === 'benfatto' ? [g(6), 0]
      : tipo === 'ricarica' ? [g(0), 0] : tipo === 'spese' ? [g(1), g(2)] : [g(3), 0];
    if(v > 0) righe.push({id, v, v2});
  });
  righe.forEach(r => {
    r.txt = tipo === 'giro' ? sfPlur(r.v, 'giro', 'giri') : tipo === 'caffe' ? sfPlur(r.v, 'caffè', 'caffè') : tipo === 'pulizie' ? r.v + ' pt'
      : tipo === 'benfatto' ? sfPlur(r.v, 'Ben fatto', 'Ben fatto') : tipo === 'lavoro' ? sfPlur(r.v, 'lavoro', 'lavori') : tipo === 'spese' ? sfPlur(r.v, 'spesa', 'spese') : tipo === 'punti' ? r.v + ' pt' : '';
    r.sub = tipo === 'giro' ? r.v2 + ' caffè offerti' : tipo === 'pulizie' && r.v2 > 0 ? sfPlur(r.v2, 'turno', 'turni') : '';
  });
  righe.sort((a, b) => b.v - a.v || b.v2 - a.v2 || (nomeBreve(a.id) || '').localeCompare(nomeBreve(b.id) || ''));
  righe.forEach(r => { r.pos = 1 + righe.filter(x => x.v > r.v || (x.v === r.v && x.v2 > r.v2)).length; });
  return righe;
}
/* i dati del periodo sono incompleti solo se toccano una chiusura fatta prima del dettaglio per settimana/mese */
const sfParziale = (tipo, p) => sfMerge(p).parz;
/* periodo concluso più recente (settimana o mese appena trascorso) */
function sfPrec(x){
  const o = new Date();
  return x.per === 'sett' ? sfPeriodo('sett', new Date(o.getFullYear(), o.getMonth(), o.getDate() - 7)) : sfPeriodo('mese', new Date(o.getFullYear(), o.getMonth() - 1, 1));
}
/* periodi conclusi con un vincitore e premio ancora da assegnare (solo admin con «Sfide e Regole»; fino a 4 settimane / 2 mesi indietro) */
function sfDaAssegnare(x){
  if(!st.isAdmin || !can('compiti') || !ptMaster() || !x.tipo || !(x.pt > 0)) return [];
  const oggi = new Date(), N = x.per === 'sett' ? 4 : 2, aw = sfAssegnati(), out = [];
  for(let k = 1; k <= N; k++){
    const p = sfPeriodo(x.per, x.per === 'sett' ? new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate() - 7 * k) : new Date(oggi.getFullYear(), oggi.getMonth() - k, 1));
    if(aw[x.id + '|' + p.key]) continue;
    const R = sfClassifica(x.tipo, p); if(!R.length) continue;
    out.push({p, win: R.filter(r => r.pos === 1), parziale: sfParziale(x.tipo, p)});
  }
  return out;
}
const sfNome = id => esc(nomeBreve(id) || nomeM(id));
const sfMed = pos => ['🥇', '🥈', '🥉'][pos - 1] || '🏅';
/* punti della sfida per una riga di classifica: assegnati (premio dato), da assegnare (periodo concluso) o in palio (periodo aperto) */
function sfPtRiga(x, r, conc, aw){
  if(conc && aw && aw.includes(r.id)) return {k: 'ok', t: '+' + x.pt + ' pt assegnati', c: 'green'};
  if(r.pos !== 1 || (conc && aw && aw.length)) return null;
  return conc ? {k: 'da', t: '+' + x.pt + ' pt da assegnare', c: 'amber'} : {k: 'palio', t: '+' + x.pt + ' pt in palio', c: 'sky'};
}
/* premi già assegnati (ultimi 10, raggruppati per sfida e periodo): movimenti aperti + registro delle chiusure (aw) */
function sfPremi(){
  const aw = sfAssegnati(), out = [];
  Object.keys(aw).forEach(k => {
    const q = k.split('|'), x = SF_FISSE[q[0]]; if(!x || !aw[k].length) return;
    const p = sfPerDaKey(q[1]); out.push({sfida: q[0], periodo: q[1], periodoTxt: p.label, titolo: x.nome, punti: x.pt, t: p.fine, mids: aw[k]});
  });
  return out.sort((a, b) => b.t - a.t).slice(0, 10);
}
/* spiegazione della sfida (icona ⓘ): regola, spareggio e premio */
const sfInfo = x => infoBtn(`<b>${esc(x.nome)}</b><br>${esc(x.descr)}<br><br><b>Spareggio:</b> ${esc(x.spareggio)}<br><br><b>Premio:</b> +${x.pt} punti accumulati, assegnati dall'admin a periodo concluso.`);
/* riquadro dell'admin per assegnare il premio di un periodo concluso (solo questa azione resta all'admin) */
function sfBoxE(x, e){
  return `<div class="banner amber" style="margin:8px 0 0;flex-wrap:wrap;gap:8px"><div class="grow">🏁 <b>${esc(e.p.label)}</b> conclusa<br><span style="font-size:12.5px">${e.win.length === 1 ? 'Vincitore' : 'Pari merito'}: ${e.win.map(r => '<b>' + sfNome(r.id) + '</b>').join(', ')} · +${x.pt} pt${e.parziale ? ' · ⚠️ dati parziali (chiusura precedente senza dettaglio)' : ''}</span></div><button class="btn sm amber" id="btn-sf-ass-${x.id}-${e.p.key}" data-act="sf-assegna" data-id="${x.id}" data-k="${e.p.key}">🏆 Assegna</button></div>`;
}
function sfBox(x, escludi){ return sfDaAssegnare(x).filter(e => e.p.key !== escludi).map(e => sfBoxE(x, e)).join(''); }
/* livello 2: card compatta con titolo, ⓘ, punti e la mia posizione; tocco = classifica completa */
function sfCard(x){
  const p = sfPeriodo(x.per, new Date()), R = sfClassifica(x.tipo, p), io = st.mid ? R.find(r => r.id === st.mid) : null;
  const pos = io ? (io.pos <= 3 ? sfMed(io.pos) + ' ' : '') + '#' + io.pos : '—', box = '';
  return `<div class="cp-item" id="sf-item-${x.id}" style="margin-bottom:10px;padding:11px 12px;border-radius:14px;background:var(--bg2,rgba(255,255,255,.04))">
    <div role="button" tabindex="0" id="btn-sf-det-${x.id}" data-act="sf-det" data-id="${x.id}" data-t="corso" style="cursor:pointer">
      <div style="display:flex;align-items:center;gap:8px"><b style="min-width:0">${esc(x.nome)}</b>${sfInfo(x)}<span style="flex:1"></span><span class="pill ${io ? 'amber' : 'mut'}" id="sf-pos-${x.id}" role="img" aria-label="${io ? 'La tua posizione: ' + io.pos : 'Non ancora in classifica'}" title="La tua posizione">${pos}</span><span class="pill violet">+${x.pt} pt</span></div>
      <div class="mut" style="display:flex;justify-content:space-between;gap:8px;margin-top:6px;font-size:12px"><span>⏳ Chiude tra ${sfRimanente(p.fine)}</span><span>Classifica completa ›</span></div>
    </div>${box}</div>`;
}
/* gruppo «concluse»: periodo appena trascorso con vincitore, mio piazzamento e stato del premio; tocco = classifica finale */
function sfCardConc(x){
  const p = sfPrec(x), R = sfClassifica(x.tipo, p), io = st.mid ? R.find(r => r.id === st.mid) : null, win = R.filter(r => r.pos === 1);
  const aw = sfAssegnati()[x.id + '|' + p.key], ass = sfDaAssegnare(x).find(e => e.p.key === p.key);
  const vinc = !R.length ? 'Nessun vincitore' : (win.length > 1 ? 'Pari merito: ' : 'Vincitore: ') + win.map(r => '<b>' + sfNome(r.id) + '</b>').join(', ');
  const pos = io ? (io.pos <= 3 ? sfMed(io.pos) + ' ' : '') + '#' + io.pos : '—';
  const premio = aw && aw.length ? '<span class="pill sky">✅ Premio assegnato</span>' : !R.length ? '' : ass ? '<span class="pill amber">⏳ Da assegnare</span>' : '<span class="pill mut">⏳ In attesa</span>';
  return `<div class="cp-item" id="sf-conc-${x.id}" style="margin-bottom:10px;padding:11px 12px;border-radius:14px;background:var(--bg2,rgba(255,255,255,.04))">
    <div role="button" tabindex="0" id="btn-sf-conc-${x.id}" data-act="sf-det" data-id="${x.id}" data-t="concluso" style="cursor:pointer">
      <div style="display:flex;align-items:center;gap:8px"><b style="min-width:0">${esc(x.nome)}</b>${sfInfo(x)}<span style="flex:1"></span><span class="pill ${io ? 'amber' : 'mut'}" role="img" aria-label="${io ? 'Il tuo piazzamento: ' + io.pos : 'Non eri in classifica'}" title="Il tuo piazzamento">${pos}</span>${premio}</div>
      <div class="mut" style="margin-top:4px;font-size:12px">🏁 ${esc(p.label)}</div>
      <div style="margin-top:6px;font-size:14px">${vinc}</div>
      <div class="mut" style="text-align:right;margin-top:4px;font-size:12px">Classifica finale ›</div>
    </div>${ass ? sfBoxE(x, ass) : ''}${sfBox(x, p.key)}</div>`;
}
/* livello 3: classifica completa della sfida nel periodo corrente */
let sfTab = 'corso';   // scheda della classifica: 'corso' | 'concluso'
function sfDettaglio(x){
  const conc = sfTab === 'concluso', p = conc ? sfPrec(x) : sfPeriodo(x.per, new Date()), R = sfClassifica(x.tipo, p), fuori = membriAttivi().filter(m => !R.some(r => r.id === m.id));
  const primi = R.filter(r => r.pos === 1).length, valori = x.tipo !== 'ricarica', parz = sfParziale(x.tipo, p), pOn = ptMaster();
  const stato = r => conc ? (r.pos === 1 ? (primi > 1 ? '🏆 Vincitore (ex aequo)' : '🏆 Vincitore') : r.pos <= 3 ? '🎖️ Sul podio' : 'Partecipante')
    : r.pos === 1 ? (primi > 1 ? '🥇 In testa (ex aequo)' : '🥇 In testa') : r.pos <= 3 ? '🎖️ Sul podio' : 'In gara';
  const assegnati = sfPremi().filter(e => e.sfida === x.id), aw = conc ? sfAssegnati()[x.id + '|' + p.key] : null, ass = conc ? sfDaAssegnare(x).find(e => e.p.key === p.key) : null;
  const esito = !conc ? '' : aw && aw.length ? `<div class="banner sky" id="sf-premio-ok" style="margin:10px 0 0">✅ <div class="grow"><b>Premio assegnato</b>: ${aw.map(sfNome).join(', ')} · +${x.pt} pt${aw.length > 1 ? ' (ex aequo)' : ''}</div></div>`
    : !R.length ? '<p class="hint" id="sf-nessun-vincitore" style="margin:10px 0 0">Nessun vincitore in questo periodo.</p>'
    : ass ? sfBoxE(x, ass) : '<p class="hint" id="sf-premio-attesa" style="margin:10px 0 0">⏳ Premio in attesa di assegnazione da parte di chi gestisce le sfide.</p>';
  const dd = derived(), awP = sfAssegnati()[x.id + '|' + p.key];
  const lv = x.tipo === 'lavoro' && can('compiti') && !(awP && awP.length) ? dd.movs.filter(m => m.tipo === 'lavoro' && !m._pending && m.t >= p.da && m.t <= p.a && !dd.stornati.has(m.id)).sort((a, b) => b.t - a.t).slice(0, 30) : null;
  const exPuo = !conc && st.isAdmin && can('compiti') && pOn, exStorna = sonoCreatore() || can('cassa');
  const exL = dd.movs.filter(m => m.tipo === 'bonus_podio' && m.extra && m.sfida === x.id && m.perExtra === p.key && !dd.stornati.has(m.id)).sort((a, b) => b.t - a.t).slice(0, 30);
  const extra = exPuo || exL.length ? `<div class="card" id="sf-extra"><h3>🎯 Punti extra${exL.length ? ` <span class="pill violet">${exL.length}</span>` : ''}</h3>
    <p class="hint" style="margin:0 0 8px">${x.tipo === 'pulizie' ? 'In questa sfida i punti li assegna solo chi gestisce le sfide: contano nella graduatoria e vanno nei punti accumulati.' : 'Punti assegnati a mano da chi gestisce le sfide, in aggiunta al premio finale. Vanno nella Tessera Fedeltà.'}</p>
    ${exL.length ? `<div class="list">${exL.map(m => `<div class="li"><div class="av">🎯</div><div class="grow"><div class="t" style="font-size:13.5px;white-space:normal"><b>${sfNome(m.mid)}</b> · +${m.punti || 0} pt${m.causale ? ' · «' + esc(m.causale) + '»' : ''}</div><div class="d">${quando(m.t)}</div></div>${exPuo && exStorna && !m._pending ? `<button class="btn sm ghost" id="btn-sx-storno-${m.id}" data-act="storno" data-id="${m.id}">↩️ Storna</button>` : ''}</div>`).join('')}</div>` : '<div class="empty">Nessun punto extra in questo periodo.</div>'}
    ${exPuo ? `<button class="btn amber block" id="btn-sx-apri" data-act="sf-extra" data-id="${x.id}" style="margin-top:10px">➕ Dai punti extra</button>` : ''}</div>` : '';
  const verifica = lv ? `<div class="card" id="sf-verifica"><h3>🧾 Segnalazioni da verificare${lv.length ? ` <span class="pill violet">${lv.length}</span>` : ''}</h3>
    <p class="hint" style="margin:0 0 8px">Se un lavoro non risulta, stornalo prima di assegnare il premio: la classifica si aggiorna subito.</p>
    ${lv.length ? `<div class="list">${lv.map(m => `<div class="li"><div class="av">🛩️</div><div class="grow"><div class="t" style="font-size:13.5px;white-space:normal"><b>${sfNome(m.mid)}</b>${m.nota ? ' · «' + esc(m.nota) + '»' : ''}</div><div class="d">${quando(m.t)}</div></div><button class="btn sm ghost" id="btn-lv-storno-${m.id}" data-act="storno" data-id="${m.id}">↩️ Storna</button></div>`).join('')}</div>` : '<div class="empty">Nessuna segnalazione in questo periodo.</div>'}</div>` : '';
  return `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 0 8px"><button class="btn link" style="padding:0;margin:0" id="sf-back" data-act="sf-back">← ${SF_PER[sfSez][0]}</button>
    <button class="btn sm ghost" id="btn-sf-img" data-act="sf-img" title="Condividi la classifica come immagine" aria-label="Condividi la classifica come immagine">📤 Condividi</button></div>
  <h2>${esc(x.nome)} ${sfInfo(x)}</h2><p class="sub" style="margin-bottom:8px">+${x.pt} pt in palio · ${conc ? 'classifica finale' : '⏳ chiude tra ' + sfRimanente(p.fine)} · ${esc(p.label)}</p>
  <div class="card" id="sf-dett">
    ${R.length ? `<table><thead><tr><th>#</th><th>Collega</th>${valori ? '<th class="c">Risultato</th>' : ''}<th>Stato</th></tr></thead><tbody>
      ${R.map(r => `<tr><td class="mono">${r.pos <= 3 ? sfMed(r.pos) : r.pos}</td><td><b>${sfNome(r.id)}</b>${r.id === st.mid ? ' <span class="pill amber">tu</span>' : ''}</td>${valori ? `<td class="c mono">${esc(r.txt)}${r.sub ? `<small class="mut"> · ${esc(r.sub)}</small>` : ''}</td>` : ''}<td style="font-size:12.5px">${stato(r)}${(pt => pt ? `<br><span class="pill ${pt.c}" style="margin-top:3px">${pt.t}</span>` : '')(pOn ? sfPtRiga(x, r, conc, aw) : null)}</td></tr>`).join('')}</tbody></table>`
      : '<div class="empty" id="sf-dett-vuoto">Nessuno in classifica per ora.</div>'}
    ${fuori.length && R.length ? `<p class="hint" style="margin:8px 0 0;font-size:12px">Non ${conc ? 'in classifica' : 'ancora in classifica'}: ${fuori.map(m => sfNome(m.id)).join(', ')}.</p>` : ''}
    ${valori ? '' : '<p class="hint" style="margin:8px 0 0;font-size:12px">🔒 Per privacy si vede solo l\'ordine, non gli importi.</p>'}
    ${parz ? '<p class="hint" id="sf-parziale" style="margin:8px 0 0;font-size:12px">⚠️ Dati parziali: il periodo comprende una chiusura fatta prima che le sfide venissero salvate per settimana e mese.</p>' : ''}
    ${esito}${conc ? sfBox(x, p.key) : ''}</div>
  ${extra}
  ${verifica}
  ${assegnati.length ? `<div class="card" id="sf-dett-premi"><h3>🏅 Premi già assegnati</h3>${assegnati.map(e => `<div style="padding:6px 0;border-bottom:1px solid var(--line);font-size:13.5px">${esc(e.periodoTxt || e.periodo || '')}: <b>${e.mids.map(sfNome).join(', ')}</b> · +${e.punti || 0} pt${e.mids.length > 1 ? ' <span class="pill sky">ex aequo</span>' : ''}</div>`).join('')}</div>` : ''}`;
}
function pSfide(d){
  const gest = can('compiti');
  if(!sfSez){
    const aperti = gest ? cpAperti().slice().sort((a, b) => a.t - b.t) : [];
    return `<h2>${ic('trophy')} Sfide</h2><p class="sub" style="margin-bottom:12px">Scegli una scheda: sfide in corso o concluse.</p>
    <p class="mut" style="margin:0 0 6px;font-size:12px;font-weight:800;letter-spacing:.04em;text-transform:uppercase">🔥 In corso</p>
    <div class="card" style="padding:4px 14px"><div class="list" id="sf-panoramica">
      ${['sett', 'mese'].map(k => { const c = /_c$/.test(k), n = sfLista(sfBase(k)).length, da = c && gest ? sfLista(sfBase(k)).reduce((a, y) => a + sfDaAssegnare(y).length, 0) : 0; return `<button class="li" id="sf-btn-${k}" data-act="sf-apri" data-s="${k}" style="width:100%;text-align:left"><div class="av">${SF_PER[k][1]}</div><div class="grow"><div class="t">${SF_PER[k][0]}</div><div class="d">${c ? (n === 1 ? '1 sfida conclusa' : n + ' sfide concluse') : sfConteggio(n)}${da ? ' · 🔔 ' + da + (da === 1 ? ' premio da assegnare' : ' premi da assegnare') : ''}</div></div>${c ? '' : (f => `<span class="pill amber" id="sf-cd-${k}" data-cd="${f}" title="Tempo alla chiusura" style="font-size:13px;font-weight:800;padding:5px 10px;white-space:nowrap">⏳ ${sfCd(f)}</span>`)(sfPeriodo(sfBase(k), new Date()).fine)}<span class="mut" style="font-size:22px;line-height:1" aria-hidden="true">›</span></button>`; }).join('')}
    </div></div>
    <p class="mut" style="margin:16px 0 6px;font-size:12px;font-weight:800;letter-spacing:.04em;text-transform:uppercase">🏁 Concluse</p>
    <div class="card" style="padding:4px 14px"><div class="list" id="sf-panoramica-concluse">
      ${['sett_c', 'mese_c'].map(k => { const c = /_c$/.test(k), n = sfLista(sfBase(k)).length, da = c && gest ? sfLista(sfBase(k)).reduce((a, y) => a + sfDaAssegnare(y).length, 0) : 0; return `<button class="li" id="sf-btn-${k}" data-act="sf-apri" data-s="${k}" style="width:100%;text-align:left"><div class="av">${SF_PER[k][1]}</div><div class="grow"><div class="t">${SF_PER[k][0]}</div><div class="d">${c ? (n === 1 ? '1 sfida conclusa' : n + ' sfide concluse') : sfConteggio(n)}${da ? ' · 🔔 ' + da + (da === 1 ? ' premio da assegnare' : ' premi da assegnare') : ''}</div></div>${c ? '' : (f => `<span class="pill amber" id="sf-cd-${k}" data-cd="${f}" title="Tempo alla chiusura" style="font-size:13px;font-weight:800;padding:5px 10px;white-space:nowrap">⏳ ${sfCd(f)}</span>`)(sfPeriodo(sfBase(k), new Date()).fine)}<span class="mut" style="font-size:22px;line-height:1" aria-hidden="true">›</span></button>`; }).join('')}
    </div></div>
    <div class="card" style="padding:4px 14px;margin-top:16px"><div class="list" id="sf-duelli">
      <div class="li" id="sf-btn-duelli" aria-disabled="true" style="opacity:.55"><div class="av">⚔️</div><div class="grow"><div class="t">Lancia una sfida</div><div class="d">Duelli 1 contro 1</div></div><span class="pill mut">Coming soon</span></div>
    </div></div>
    ${aperti.length ? `<div class="card" id="sf-sospesi" style="margin-top:14px"><h3>📋 Incarichi in sospeso <span class="pill violet">${aperti.length}</span></h3>
      <p class="hint" style="margin:0 0 8px">Compiti del vecchio Briefing ancora da svolgere o da convalidare: convalidali o annullali per chiuderli.</p>
      <div class="list">${aperti.map(m => cpRiga(m, st.mid)).join('')}</div></div>` : ''}`;
  }
  const base = sfBase(sfSez), conc = /_c$/.test(sfSez), x = sfDet && SF_FISSE[sfDet] && SF_FISSE[sfDet].per === base ? SF_FISSE[sfDet] : null;
  if(x) return sfDettaglio(x);
  return `<button class="btn link" style="padding:0;margin:0 0 8px" id="sf-back" data-act="sf-back">← Sfide</button>
  <h2>${SF_PER[sfSez][1]} ${SF_PER[sfSez][0]} <small class="mut" style="font-size:14px;font-weight:600">${conc ? 'scorsa' : 'in corso'}</small></h2><p class="sub" style="margin-bottom:12px">${conc ? 'La settimana o il mese appena trascorsi' : sfConteggio(sfLista(base).length)} · tocca una sfida per la classifica ${conc ? 'finale' : 'completa'}</p>
  ${conc ? '' : avvisoPuntiOff()}
  ${conc ? `<div class="card" id="sf-lista-concluse">${gest && sfLista(base).some(x => sfDaAssegnare(x).length) ? '<p class="hint" style="margin:0 0 8px"><span class="pill amber">🔔 premi da assegnare</span></p>' : ''}${sfLista(base).map(sfCardConc).join('')}</div>`
    : `<div class="card" id="sf-lista">${sfLista(base).map(sfCard).join('')}</div>`}`;
}

