'use strict';
/* ---------- tesoreria / home amministratore ---------- */
const fondoNoto = () => st.isAdmin || !st.estratto || !!st.estratto.cassa;
function tesoro(d){
  const c = d.S.cassa || {contanti:0, revolut:0};
  const cassa = (c.contanti || 0) + (c.revolut || 0);
  let cred = 0, deb = 0;
  Object.keys(d.S.saldi).forEach(k => { const v = d.S.saldi[k] || 0; if(v > 0) cred += v; else deb += -v; });
  return {cassa, cont: c.contanti || 0, rev: c.revolut || 0, cred, deb, netto: cassa - cred + deb};
}
/* ---------- registro movimenti, notifiche ---------- */
const tms = x => x && x.toMillis ? x.toMillis() : (typeof x === 'number' ? x : 0);
function saldoDisp(d){ const s = d.S.saldi[st.mid] || 0; return s > 0 ? creditoLibero() : s; }
function pRegistro(d){ return pFeed(d); }
/* storico delle richieste gia' decise (accettate, rifiutate, annullate): solo dati gia' in memoria, nessuna lettura in piu' */
function storicoRichieste(d){
  const me = st.mid, adm = st.isAdmin, N = st.storicoN || 30;
  const src = (adm && st.arcMov ? st.arcMov : []).concat(d.movs);
  const st_ = new Set(src.filter(m => m.tipo === 'storno').map(m => m.rif));
  const list = src.filter(m => ['spesa', 'ricarica', 'riscatto', 'scambio', 'quota'].includes(m.tipo) && ['confermata', 'rifiutata', 'annullata'].includes(m.stato) && (adm || [m.mid, m.dest, m.daMid, m.aMid].includes(me)))
    .map(m => ({m, t: tms(m.esitoTs) || m.t || 0})).sort((a, b) => b.t - a.t);
  const righe = list.slice(0, N).map(({m, t}) => { const x = descMov(m);
    const pill = m.stato === 'confermata' ? (st_.has(m.id) ? '<span class="pill red">stornata</span>' : '<span class="pill green">accettata</span>') : m.stato === 'rifiutata' ? '<span class="pill red">rifiutata</span>' : '<span class="pill mut">annullata</span>';
    return `<div class="li"><div class="av">${x.ic}</div><div class="grow"><div class="t" style="white-space:normal;font-size:13.5px">${x.t}</div><div class="d">${quando(t)}${m.esitoDa ? ' · da ' + esc(m.esitoDa) : ''}</div></div>${pill}</div>`; }).join('');
  return `<div class="card" id="storico-richieste"><h3><span>${ic('clock','s')} Storico richieste</span><span class="mut" style="font-size:11px;text-transform:none;letter-spacing:0">${list.length}</span></h3>
    ${list.length ? `<div class="list">${righe}</div>` : '<div class="empty">Nessuna richiesta accettata o rifiutata.</div>'}
    ${list.length > N ? `<button class="btn sm block ghost" style="margin-top:8px" data-act="storico-altre">Mostra altre ${Math.min(30, list.length - N)}</button>` : ''}
    ${adm ? (st.arcMov ? '<p class="hint" style="margin:8px 0 0">Il dettaglio dei periodi chiusi è incluso.</p>' : `<button class="btn sm block ghost" style="margin-top:8px" data-act="carica-arc-mov" ${st.arcLoading ? 'disabled' : ''}>${st.arcLoading ? 'Carico…' : 'Includi i periodi chiusi (legge l\'archivio)'}</button>`) : '<p class="hint" style="margin:8px 0 0">Mostra le richieste dall\'ultima chiusura di periodo.</p>'}</div>`;
}
const notifSeen = () => LS.get('notifSeen_' + st.mid, 0);
function notifiche(d){
  const me = st.mid, out = [];
  if(!me || !d) return out;
  d.movs.forEach(m => {
    const t = tms(m.esitoTs) || m.t || 0, ok = m.stato === 'confermata';
    if(m.tipo === 'spesa' && m.mid === me && m.esitoDa && (ok || m.stato === 'rifiutata')) out.push({t, e: ok ? '✅' : '❌', x: `La tua spesa «${esc(m.descr || '')}» (${eur(m.importo)}) è stata ${ok ? 'approvata' : 'rifiutata'}`});
    else if(m.tipo === 'ricarica' && m.mid === me && m.esitoDa && (ok || m.stato === 'rifiutata')) out.push({t, e: ok ? '✅' : '❌', x: `Il tuo pagamento di ${eur(m.importo)} è stato ${ok ? 'approvato' : 'rifiutato'}`});
    else if(m.tipo === 'quota' && m.mid === me && m.esitoDa && (ok || m.stato === 'rifiutata')) out.push({t, e: ok ? '✅' : '❌', x: `La tua quota fondo ${esc(m.anno)} (${eur(m.importo)}) è stata ${ok ? 'confermata' : 'rifiutata'}`});
    else if(m.tipo === 'accredito' && m.mid === me) out.push({t, e: '🎁', x: `Accredito ricevuto: ${eur(m.importo)} di crediti${m.causale ? ' · ' + esc(m.causale) : ''}`});
    else if(m.tipo === 'conversione' && m.mid === me) out.push({t, e: '🔄', x: `Hai convertito ${m.punti} Punti Pulizia in ${eur(m.importo)} di crediti`});
    else if(m.tipo === 'conversione_caffe' && m.mid === me) out.push({t, e: '☕', x: `Hai riscattato ${m.punti} Punti Caffè in ${eur(m.importo)} di crediti`});
    else if(m.tipo === 'riscatto' && m.mid === me && (ok || m.stato === 'rifiutata' || !m.stato)) out.push({t, e: m.stato === 'rifiutata' ? '❌' : '🏦', x: m.stato === 'rifiutata' ? `La tua richiesta di riscatto di ${eur(m.importo)} è stata rifiutata` : `Il Fondo Gruppo ti ha liquidato ${eur(m.importo)}`});
    else if(m.tipo === 'ben_fatto' && m.aMid === me) out.push({t, e: '👏', x: `${esc(nomeM(m.daMid))} ti dice «Ben fatto!»: «${esc(m.msg || '')}» ${(m.pt ?? 2) ? `(+${(m.pt ?? 2) * fx(m)} punti)` : ''}`});
    else if(m.tipo === 'riscatto_punti' && m.mid === me) out.push({t, e: '⭐', x: `Hai riscattato ${m.punti * fx(m)} punti: +${eur(m.importo)} di crediti`});
    else if(m.tipo === 'regalo' && m.aMid === me) out.push({t, e: m.trasf ? '🤝' : '🎁', x: `${esc(nomeM(m.daMid))} ti ha ${m.trasf ? 'ceduto' : 'regalato'} ${eur(m.importo)} di crediti${m.msg ? ' · «' + esc(m.msg) + '»' : ''}`});
    else if(m.tipo === 'compito' && m.mid === me){
      const nm = esc(m.nome || 'Compito');
      if(m.stato === 'confermata') out.push({t, e: '✅', x: `Compito «${nm}» convalidato: +${m.punti || 0} punti`});
      else if(m.stato === 'rifiutata') out.push({t, e: '❌', x: `Compito «${nm}» non convalidato: nessun punto`});
      else if(m.stato === 'annullata') out.push({t, e: '↩️', x: `L'incarico «${nm}» è stato annullato da un Supervisor`});
      else out.push({t: m.t || 0, e: '🎯', x: `Ti è stato assegnato il compito «${nm}» (+${m.punti || 0} punti)`});
    }
    else if(m.tipo === 'scambio'){
      if(m.stato === 'confermata' && m.daMid === me) out.push({t, e: '🤝', x: `${esc(nomeM(m.aMid))} ha comprato ${eur(m.importo)} dei tuoi crediti`});
      else if(m.stato === 'confermata' && m.aMid === me) out.push({t, e: '🤝', x: `Hai ricevuto ${eur(m.importo)} di crediti da ${esc(nomeM(m.daMid))}: ricezione confermata`});
      else if(m.stato === 'rifiutata' && m.mid === me) out.push({t, e: '❌', x: `${esc(nomeM(m.dest))} ha rifiutato lo scambio di ${eur(m.importo)}`});
    }
  });
  return out.sort((a, b) => b.t - a.t).slice(0, 40);
}
/* ---------- giacenze (copia pubblica, aggiornata dai Supervisor) ---------- */
const giacSent = {};
/* i colleghi calcolano il Totale Fondo dall'estratto: il Supervisor completa gli estratti vecchi con saldi e cassa dell'ultima chiusura */
let estrSent = '';
function sincronizzaEstratti(){
  const last = ultimaChiusura();
  if(!(can('sistema') || canAccessi()) || st.sync !== 'ok' || modeKey !== 'admin' || !last || !last.stato || estrSent === last.id) return;
  estrSent = last.id;
  const ls = last.stato, mp = {};
  ['pcaf','pcafConv','punti','puntiConv','turni','ultimo','pspesa','pbf','pRisc'].forEach(k => { mp[k] = ls[k] || {}; });
  mp.bf = last.bf || {};
  const dati = {saldi: ls.saldi || {}, cassa: ls.cassa || {contanti:0, revolut:0}, mp, sc: last.sc ? 1 : 0, storico: storicoDaChiusure()};
  st.membri.forEach(m => C('estratti').doc(m.id).update(dati).catch(() => {}));
}
function sincronizzaGiacenze(d){
  if(!st.isAdmin || st.sync !== 'ok' || !st.ready.mv || modeKey !== 'admin') return;
  st.prodotti.forEach(p => {
    const v = d.S.stock[p.id] || 0, car = Number(p.caricati) || 0, ven = Math.max(0, car - Math.max(0, v)), k = p.id + ':' + v + ':' + car;
    if((p.giacenza !== v || (car > 0 && p.venduti !== ven)) && !giacSent[k]){ giacSent[k] = 1; C('prodotti').doc(p.id).set(car > 0 ? {giacenza: v, venduti: ven} : {giacenza: v}, {merge: true}).catch(() => { delete giacSent[k]; }); }
  });
}
const giacenza = (d, p) => st.isAdmin ? (d.S.stock[p.id] || 0) : (typeof p.giacenza === 'number' ? p.giacenza : 1);

/* buste di caffe' in scorta = buste caricate dal Supervisor (articolo speciale 'caffe'); nessuna apertura manuale */
const prodCaffe = () => prodotto(PID_CAFFE);
function busteCaricate(d){
  const p = prodCaffe(); if(!p) return 0;
  return st.isAdmin ? (d.S.stock[p.id] || 0) : (typeof p.giacenza === 'number' ? p.giacenza : 0);
}
const busteDisp = d => Math.max(0, busteCaricate(d));
/* ---------- scorta caffe' in grani (kg) e lotti di snack/bibite: base del Tasso di Onesta' ---------- */
const grCaffe = () => String(Math.round(10000 / resaKg()) / 10).replace('.', ',');   // grammi stimati per caffè = 1000 ÷ tazzine per kg
const resaKg = () => { const v = Number(st.gruppo && st.gruppo.resaKg); return v >= 1 && v <= 500 ? v : CAFFE_PER_KG; };
const cicloCaffe = () => { const c = st.gruppo && st.gruppo.caffeCiclo; return c && typeof c === 'object' ? c : null; };
const r3 = x => Math.round(x * 1000) / 1000;
/* ciclo attivo: kg caricati dall'avvio; i caffe' registrati (giri inclusi) sono quelli dei movimenti gia' in memoria dall'avvio del ciclo (nessuna lettura in piu') */
/* REGISTRO CAFFÈ: lista cronologica (campo caffeReg del gruppo, max 150 righe) di acquisti (tp 'a', kg aggiunti) e rilevazioni (tp 'r', kg pesati).
   Rimanenza stimata e Tasso di Onestà derivano solo da qui; i cicli vecchi (caffeCiclo) vengono letti come registro virtuale finché non si scrive. Zero letture extra. */
const REG_MAX = 150;
const nuovoIdReg = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);
function regCaffe(){
  const g = st.gruppo || {};
  let raw = [];
  if(Array.isArray(g.caffeReg)) raw = g.caffeReg;
  else { const c = cicloCaffe(), kg = c ? Number(c.kg) || 0 : 0, da = c ? Number(c.da) || 0 : 0, ki = c ? Number(c.kgIniz) || 0 : 0;
    if(kg > 0 && da > 0){ const base = ki > 0 && ki <= kg ? ki : kg; raw = [{id: 'v0', t: da, tp: 'r', kg: base, nt: 'Ciclo precedente'}]; if(kg - base > 0.0005) raw.push({id: 'v1', t: da + 1, tp: 'a', kg: r3(kg - base), nt: 'Acquisti del ciclo precedente'}); } }
  return raw.filter(e => e && typeof e === 'object' && Number(e.t) > 0 && (e.tp === 'a' || e.tp === 'r') && Number(e.kg) >= 0)
    .map((e, i) => ({id: String(e.id || 'x' + i), t: Number(e.t), tp: e.tp, kg: Number(e.kg), nt: typeof e.nt === 'string' ? e.nt : '', au: typeof e.au === 'string' ? e.au : ''}))
    .sort((x, y) => x.t - y.t);
}
function contaCaffe(d, da, a){
  const X = aggConChiusi(d, {da, a, label: 'Registro caffè'}, 'on');
  return {n: Math.max(0, Math.round(sumo(X.G.caffe))), parz: X.parziali.length};
}
let _scMemo = {};
function statoCaffe(d){
  const g = st.gruppo || {}, resa = resaKg(), u = st.arcMov ? st.arcMov.length : -1, m = _scMemo;
  if(m.v !== undefined && m.d === d && m.a === g.caffeReg && m.b === g.caffeCiclo && m.r === resa && m.u === u) return m.v;
  const v = calcolaCaffe(d, resa); _scMemo = {d, a: g.caffeReg, b: g.caffeCiclo, r: resa, u, v}; return v;
}
function calcolaCaffe(d, resa){
  const reg = regCaffe(); if(!reg.length) return null;
  const righe = [], stor = []; let base = null, acq = 0, hk = 0, hc = 0, ult = null, ultReale = null;
  /* acquisti prima di qualsiasi rilevazione: giacenza di partenza ipotizzata a 0 kg subito prima del primo acquisto */
  if(reg[0].tp === 'a') base = {kg: 0, t: reg[0].t, zero: true};
  reg.forEach(e => {
    if(e.tp === 'a'){
      const zero = !!(base && base.zero && e === reg[0]);
      acq += e.kg; stor.push({t: e.t, tp: 'acq', k: e.kg}); righe.push({...e, zero});
      return;
    }
    ultReale = {t: e.t, kg: e.kg};
    if(!base){ base = {kg: e.kg, t: e.t}; acq = 0; righe.push({...e, iniz: true}); return; }
    const cons = r3(base.kg + acq - e.kg), neg = cons < -0.0005, c = neg ? 0 : Math.max(0, cons), att = Math.round(c * resa), X = contaCaffe(d, base.t, e.t - 1);
    const p = !neg && att > 0 ? Math.round(Math.min(999, X.n / att * 100) * 10) / 10 : null;
    righe.push({...e, cons: c, neg, reg: X.n, att, p, da: base.t});
    stor.push({t: e.t, kg: e.kg, k: c, c: X.n, a: att, p});
    if(p != null) ult = p; hk += c; hc += X.n;
    base = {kg: e.kg, t: e.t}; acq = 0;
  });
  let kg = 0, da = 0, regs = 0, parz = 0;
  if(base){ kg = r3(base.kg + acq); da = base.t; const X = contaCaffe(d, da, Infinity); regs = X.n; parz = X.parz; }
  const cap = Math.round(kg * resa);
  return {attivo: !!base && kg > 0, ult, ultReale, stor, righe, kg, kgIniz: base ? base.kg : 0, da, hk: r3(hk), hc, resa, registrati: regs, capienza: cap, restTz: Math.max(0, cap - regs), restKg: Math.max(0, kg - regs / resa),
    pct: cap > 0 ? regs / cap * 100 : null, parz, capChiusi: Math.round(hk * resa)};
}
/* lotto di un articolo: caricati = pezzi del lotto in corso; lotto.{hc,ha} = pezzi caricati / ammanco dei lotti gia' chiusi.
   Il lotto in corso si consolida quando la giacenza digitale arriva a 0 oppure il Supervisor attiva «Esaurito» (ammanco = pezzi ancora a sistema) */
function statoProd(d, p){
  const l = p.lotto && typeof p.lotto === 'object' ? p.lotto : {}, hc = Number(l.hc) || 0, ha = Number(l.ha) || 0;
  const gia = Math.max(0, giacenza(d, p)), car = Number(p.caricati) || 0, es = p.esaurito === true, chiuso = car > 0 && (es || gia <= 0);
  const cT = hc + (chiuso ? car : 0), aT = Math.min(cT, ha + (chiuso && es ? gia : 0));
  return {car, gia, es, chiuso, cT, aT, reg: Math.max(0, car - gia), ammanco: es ? gia : 0, pct: cT > 0 ? Math.max(0, Math.min(100, (cT - aT) / cT * 100)) : null};
}
const prodListino = () => st.prodotti.filter(p => p.id !== PID_CAFFE && p.categoria !== 'fondo' && p.attivo !== false);
/* ---------- descrizione movimenti ---------- */
function descMov(m){
  const n = esc(nomeM(m.mid));
  switch(m.tipo){
    case 'caffe': return {ic:'☕', t: m.qta > 1 ? `${n} ha offerto un giro di ${m.qta} caffè` : `${n} ha preso un caffè`, a: -m.importo};
    case 'caffe_pagato': return {ic:'☕', t: `${n} ha pagato ${m.qta > 1 ? m.qta + ' caffè' : 'un caffè'} subito${m.metodo === 'contanti' || m.metodo === 'revolut' ? ' · ' + FONTI[m.metodo] : ''}`, a: 0, cassa: m.metodo === 'contanti' || m.metodo === 'revolut'};
    case 'snack': { const p = prodotto(m.pid); return {ic: esc((p && p.emoji) || m.emoji || '🍫'), t: `${n} ha preso ${m.qta > 1 ? m.qta + ' × ' : ''}${esc((p && p.nome) || m.nome || 'snack')}`, a: -m.importo}; }
    case 'ricarica': return {ic:'💰', t: `${m.fondo ? 'Quota fondo' : 'Ricarica crediti'} da ${n} · ${FONTI[m.metodo] || m.metodo}`, a: m.importo, cassa: true};
    case 'scambio': return m.aMid === m.mid
      ? {ic:'🤝', t: `${esc(nomeM(m.aMid))} compra ${eur(m.importo)} di crediti da ${esc(nomeM(m.daMid))} (paga fuori dall'app)`, a: 0, neutro: m.importo}
      : {ic:'🔄', t: `${esc(nomeM(m.daMid))} vende ${eur(m.importo)} di crediti a ${esc(nomeM(m.aMid))}${m.causale ? ': ' + esc(m.causale) : ''}`, a: 0, neutro: m.importo};
    case 'regalo': { const msg = m.msg ? ` · «${esc(m.msg)}»` : '', io = true;
      return {ic: m.trasf ? '🤝' : '🎁', t: `${esc(nomeM(m.daMid))} ${m.trasf ? 'ha ceduto (scambio)' : 'ha regalato'} ${eur(m.importo)} a ${esc(nomeM(m.aMid))}${msg}`, ...(io && m.daMid === st.mid ? {a: -m.importo} : io && m.aMid === st.mid ? {a: m.importo} : {a: 0, neutro: m.importo})}; }
    case 'ben_fatto': return {ic:'👏', t: `${esc(nomeM(m.daMid))} dice «Ben fatto!» a ${esc(nomeM(m.aMid))}: «${esc(m.msg || '')}» ${(m.pt ?? 2) ? `(+${(m.pt ?? 2) * fx(m)} punti)` : ''}`, a: 0};
    case 'bonus_podio': if(m.sfida) return {ic:'🏆', t: `Sfida «${esc(m.titolo || 'Sfida')}»${m.periodoTxt ? ' (' + esc(m.periodoTxt) + ')' : ''}: ${n} vince, +${m.punti || 0} punti`, a: 0};
      return {ic:['🥇','🥈','🥉'][(m.pos || 1) - 1] || '🏅', t: `Podio del mese ${esc(m.mese || '')}: ${n} (${m.pos || '?'}° posto, +${m.punti || 0} punti)`, a: 0};
    case 'riscatto_punti': return {ic:'⭐', t: `${n} riscatta ${m.punti * fx(m)} Punti Collega Modello`, a: m.importo};
    case 'riscatto': return {ic:'🏦', t: `Riscatto di ${n} · ${m.stato === 'attesa' ? 'richiesto al Fondo' : 'pagato dalla cassa'} (${FONTI[m.metodo] || m.metodo})`, a: -m.importo, cassa: true};
    case 'spesa': { const mx = spesaMista(m); return {ic:'🧾', t: `Spesa di ${n}: ${esc(m.descr || '')} · ${mx ? 'rimborso misto (' + mx + ')' : m.fonte === 'denaro' ? 'rimborso in denaro' : m.fonte === 'tasca' ? 'rimborso in crediti' : 'pagata da ' + (FONTI[m.fonte] || m.fonte)}`, ...(mx ? {a: m.quotaCrediti} : m.fonte === 'tasca' ? {a: m.importo} : {a: 0, neutro: m.importo}), cassa: mx ? true : m.fonte !== 'tasca'}; }
    case 'uscita': return {ic:'💸', t: `Uscita: ${esc(m.causale || '')} · ${FONTI[m.fonte]}`, a: -m.importo, cassa: true};
    case 'entrata': return {ic:'📥', t: `Entrata: ${esc(m.causale || '')} · ${FONTI[m.fonte]}`, a: m.importo, cassa: true};
    case 'giroconto': return {ic:'🔁', t: `Giroconto ${FONTI[m.da]} → ${FONTI[m.a]}`, a: 0, neutro: m.importo, cassa: true};
    case 'quota':
      if(m.stato === 'attesa') return {ic:'⏳', t: `Quota ${esc(m.anno)} di ${n} in attesa di conferma · ${METODI_QUOTA[m.metodo] || m.metodo}`, a: 0};
      if(m.stato === 'rifiutata' || m.stato === 'annullata') return {ic:'🛡️', t: `Quota ${esc(m.anno)} di ${n} ${m.stato === 'rifiutata' ? 'rifiutata' : 'annullata'}`, a: 0};
      return typeof m.cred === 'boolean'
      ? {ic:'🛡️', t: `Quota ${esc(m.anno)} pagata da ${n} · ${METODI_QUOTA[m.metodo] || m.metodo} · ${m.cred ? 'accreditata anche come crediti' : 'solo contributo al fondo'}`, a: m.cred ? m.importo : 0, cassa: ['contanti','revolut'].includes(m.metodo)}
      : {ic:'🛡️', t: `Quota ${esc(m.anno)} pagata da ${n} · ${METODI_QUOTA[m.metodo] || m.metodo}`, a: ['contanti','revolut','esterno'].includes(m.metodo) ? m.importo : 0, cassa: ['contanti','revolut'].includes(m.metodo)};
    case 'addebito_quota': return {ic:'🧾', t: `Quota fondo ${esc(m.anno)} addebitata a ${n}`, a: -m.importo};
    case 'accredito': return {ic:'🎁', t: `Credito accreditato a ${n}${m.causale ? ': ' + esc(m.causale) : ''}`, a: m.importo};
    case 'rettifica': return {ic:'✏️', t: `Rettifica saldo di ${n}${m.causale ? ': ' + esc(m.causale) : ''}`, a: m.importo};
    case 'carico': { const p = prodotto(m.pid);
      if(m.pid === PID_CAFFE) return {ic:'📦', t: `Buste di caffè ${m.qta > 0 ? '+' : ''}${m.qta}`, a: 0};
      return {ic:'📦', t: `Giacenza ${esc((p && p.nome) || m.nome || '')} ${m.qta > 0 ? '+' : ''}${m.qta} pz`, a: 0}; }
    case 'compito': { const o = esc(m.nome || 'Compito'), c = esc(nomeM(m.mid)); return {ic:'🎯', t: m.stato === 'confermata' ? `Compito svolto e convalidato: ${o} · ${c} (+${m.punti || 0} punti)` : m.stato === 'attesa' ? `Compito svolto, da convalidare: ${o} · ${c} (+${m.punti || 0} punti)` : `Compito assegnato: ${o} · ${c}`, a: 0}; }
    case 'obiettivo': { const o = esc(m.nome || 'Obiettivo'); return {ic:'🎯', t: m.fase === 'fatto' ? `Obiettivo completato: ${o} · ${esc(nomeM(m.mid))} (+${m.punti || 0} punti)` : `Obiettivo preso in carico: ${o} · ${esc(nomeM(m.mid))}`, a: 0}; }
    case 'pulizia': { const lab = {macc: 'Pulizia macchinetta', secchio: 'Secchio svuotato', sala: 'Pulizia generale'}[m.task] || 'Pulizie'; return {ic:'✨', t: `${lab}: ${(m.mids||[]).map(x => esc(nomeM(x))).join(', ')} (+${ptPulM(m)} punti a testa)`, a: 0}; }
    case 'conversione': return {ic:'🔄', t: `${n} converte ${m.punti} Punti Pulizia in crediti`, a: m.importo};
    case 'conversione_caffe': return {ic:'☕', t: `${n} converte ${m.punti} Punti Caffè in crediti`, a: m.importo};
    case 'punti_adj': return {ic:'🏅', t: `Punti ${m.kind === 'caffe' ? 'Consumi' : 'Pulizia'} di ${n}: ${m.punti > 0 ? '+' : ''}${m.punti * fx(m)}${m.causale ? ' · ' + esc(m.causale) : ''}`, a: 0};
    case 'lavoro': return {ic:'🛩️', t: `${n} ha segnalato un lavoro compiuto${m.nota ? ' · «' + esc(m.nota) + "»" : ''}`, a: 0};
    case 'storno': { const o = m.orig ? descMov(m.orig) : {t:''}; return {ic:'↩️', t: `Storno di: ${o.t}`, a: o.a ? -o.a : 0, cassa: o.cassa}; }
  }
  return {ic:'•', t: m.tipo, a: 0};
}

function puoStornare(m, d){
  return (m.tipo === 'lavoro' ? can('compiti') : can('cassa')) && !m._pending && m.tipo !== 'storno' && !d.stornati.has(m.id)
    && !['assegnato','attesa','rifiutata','annullata'].includes(m.stato);
}

function righeMov(list, d, opt){
  opt = opt || {};
  if(!list.length) return `<div class="empty">Nessun movimento.</div>`;
  return `<div class="list">${list.map(m => {
    const x = descMov(m);
    const annullato = m.stato === 'annullata' || m.stato === 'rifiutata' || d.stornati.has(m.id);
    const pill = m._pending || m._local ? `<span class="pill mut">invio…</span>`
      : m.stato === 'attesa' ? `<span class="pill amber">in attesa</span>`
      : m.stato === 'rifiutata' ? `<span class="pill red">rifiutata</span>`
      : m.stato === 'annullata' ? `<span class="pill mut">annullata</span>`
      : d.stornati.has(m.id) ? `<span class="pill red">stornato</span>` : '';
    const amt = x.neutro ? `<span class="tx2">${eur(x.neutro)}</span>` : x.a ? `<span class="${x.a > 0 ? 'green' : 'red'}">${eurS(x.a)}</span>` : '';
    const annullabile = !opt.noAct && m.uid === st.uid && ['caffe','snack'].includes(m.tipo) && !m.stato && !m._pending && !d.stornati.has(m.id) && Date.now() - m.t < ANNULLA_MIN*60000;
    const autore = m.autore && m.amid !== m.mid ? ` · da ${esc(m.autore)}` : '';
    return `<div class="li">
      <div class="av">${x.ic}</div>
      <div class="grow"><div class="t ${annullato ? 'strike' : ''}" style="font-weight:600;font-size:13.5px;white-space:normal">${x.t}</div>
        <div class="d">${quando(m.t)}${opt.compact ? '' : autore}${m.esitoDa && m.stato !== 'attesa' ? ` · ${m.stato} da ${esc(m.esitoDa)}` : ''}</div></div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
        <div class="amt mono ${annullato ? 'strike' : ''}">${amt}</div>${pill}
        ${annullabile ? `<button class="btn link" style="padding:0" data-act="annulla-consumo" data-id="${m.id}">Annulla</button>` : ''}
        ${!opt.noAct && !opt.compact && puoStornare(m, d) ? `<button class="btn link mut" style="padding:0;color:var(--mut)" data-act="storno" data-id="${m.id}">↩️ Storna</button>` : ''}
        ${!opt.noAct && st.isAdmin && (m.tipo === 'compito' ? can('compiti') : can('inbox')) && m.stato === 'attesa' && m.tipo !== 'scambio' && !opt.compact ? `<div class="row" style="gap:4px"><button class="btn sm red" data-act="esito" data-id="${m.id}" data-v="rifiutata">✕</button><button class="btn sm green" data-act="${m.tipo === 'spesa' && (m.fonte === 'denaro' || m.fonte === 'misto') ? 'paga-spesa' : m.tipo === 'riscatto' ? 'riscatto-paga' : 'esito'}" data-id="${m.id}" data-v="confermata">✓</button></div>` : ''}
      </div></div>`;
  }).join('')}</div>`;
}

/* ---------- FEED ---------- */
/* elenco del registro: filtro + ricerca per collega (nome o nickname) su tutti i colleghi coinvolti nel movimento */
const TIPI_ENTRATE = ['ricarica', 'entrata', 'quota', 'caffe_pagato'], TIPI_USCITE = ['spesa', 'uscita', 'riscatto'], TIPI_ALTRI = ['giroconto', 'storno', 'rettifica', 'accredito', 'addebito_quota', 'scambio', 'riscatto_punti', 'conversione', 'conversione_caffe'];
const FEED_ADM = [['tutti', 'Tutti'], ['entrate', 'Entrate'], ['uscite', 'Uscite'], ['altri', 'Giroconti & storni'], ['consumi', 'Consumi'], ['attesa', 'In attesa']];
function feedLista(d){
  const adm = st.isAdmin;
  const f = adm && !FEED_ADM.some(x => x[0] === st.feedFiltro) ? 'tutti' : st.feedFiltro, me = st.mid;
  const mio = m => m.mid === me || m.dest === me || m.daMid === me || m.aMid === me || (m.mids || []).includes(me);
  const cassaTipi = ['caffe_pagato','spesa','uscita','entrata','giroconto','ricarica','riscatto','quota','addebito_quota','accredito','rettifica'];
  let list = d.movs.slice().reverse();
  let rp = null;
  if(adm){
    rp = rpRange(st.rpPer);
    list = (st.arcMov || []).slice().reverse().concat(list).filter(m => m.t >= rp.da && m.t <= rp.a);
    if(f === 'entrate') list = list.filter(m => TIPI_ENTRATE.includes(m.tipo));
    if(f === 'uscite') list = list.filter(m => TIPI_USCITE.includes(m.tipo));
    if(f === 'altri') list = list.filter(m => TIPI_ALTRI.includes(m.tipo));
    if(f === 'consumi') list = list.filter(m => ['caffe', 'snack'].includes(m.tipo));
    if(f === 'attesa') list = list.filter(m => m.stato === 'attesa');
  } else {
    if(f === 'miei') list = list.filter(mio);
    if(f === 'bar') list = list.filter(m => ['caffe','snack'].includes(m.tipo));
    if(f === 'cassa') list = list.filter(m => descMov(m).cassa || cassaTipi.includes(m.tipo));
    if(f === 'attesa') list = list.filter(m => m.stato === 'attesa');
  }
  const q = (st.feedQ || '').trim().toLowerCase();
  if(q){
    const nq = norm(q);
    const hit = id => { const m = id && membro(id); return !!m && norm(m.nome + ' ' + (m.nick || '')).includes(nq); };
    const txt = m => norm(String(descMov(m).t).replace(/<[^>]*>/g, ' ') + ' ' + [m.causale, m.descr, m.msg, ...(m.articoliNomi || [])].filter(Boolean).join(' '));
    list = list.filter(m => [m.mid, m.dest, m.daMid, m.aMid, ...(m.mids || []), m.orig && m.orig.mid].some(hit) || txt(m).includes(nq));
  }
  const info = q ? `${list.length} ${list.length === 1 ? 'movimento' : 'movimenti'} per «${esc(st.feedQ.trim())}»` : (adm ? `${list.length} ${list.length === 1 ? 'movimento' : 'movimenti'} · ${esc(rp.label)}` : '');
  return (info ? `<div class="mut" style="font-size:12px;margin:0 0 8px">${info}</div>` : '') + (list.length ? righeMov(list.slice(0, 300), d) : '<div class="empty">Nessun movimento nel periodo scelto.</div>');
}
/* entrate/uscite di cassa del periodo dai movimenti gia' in memoria (storni inclusi) */
function cassaRange(r){
  const R = {inC: 0, inR: 0, spese: 0, uscite: 0, risc: 0};
  const inc = (met, v) => { if(met === 'revolut') R.inR += v; else if(met === 'contanti') R.inC += v; };
  const pass = (m, sg) => {
    switch(m.tipo){
      case 'ricarica': if(m.stato === 'confermata') inc(m.metodo, sg * m.importo); break;
      case 'quota': if(!m.stato || m.stato === 'confermata') inc(m.metodo, sg * m.importo); break;
      case 'entrata': inc(m.fonte, sg * m.importo); break;
      case 'caffe_pagato': inc(m.metodo, sg * m.importo); break;
      case 'spesa': if(m.stato === 'confermata') R.spese += sg * m.importo; break;
      case 'uscita': R.uscite += sg * m.importo; break;
      case 'riscatto': if(m.stato === 'confermata' || !m.stato) R.risc += sg * m.importo; break;
      case 'storno': if(m.orig) pass(m.orig, -sg); break;
    }
  };
  (st.isAdmin && st.arcMov ? st.arcMov : []).concat(tuttiMov()).filter(m => m.t >= r.da && m.t <= r.a).forEach(m => pass(m, 1));
  return R;
}
/* selettore periodo (condiviso): chips + date personalizzate */
function periodoChips(r, act, opz){
  return `<div class="chips" id="${act}-chips">${opz.map(([v, l]) => `<button id="${act}-${v}" class="${r.p === v ? 'on' : ''}" data-act="${act}" data-v="${v}">${l}</button>`).join('')}</div>
    ${r.p === 'custom' ? `<div class="grid2" style="margin:0 0 10px"><label class="f" style="margin:0"><span>Dal</span><input class="in" type="date" id="rp-da" value="${esc(st.rpDa || '')}" data-chg="rp-data"></label><label class="f" style="margin:0"><span>Al</span><input class="in" type="date" id="rp-a" value="${esc(st.rpA || '')}" data-chg="rp-data"></label></div>` : ''}`;
}
const hintArc = r => { const last = ultimaChiusura(); return !st.arcMov && last && r.da < last.fino.toMillis() ? `<p class="hint" style="margin:0 0 8px">Il periodo scelto parte prima dell'ultima chiusura: i movimenti archiviati non sono caricati. <button class="btn sm ghost" data-act="carica-arc-mov" ${st.arcLoading ? 'disabled' : ''}>${st.arcLoading ? 'Carico…' : 'Includi l\'archivio'}</button></p>` : ''; };
function pFeed(d){
  const f = st.feedFiltro;
  const last = ultimaChiusura(), adm = st.isAdmin;
  const chipsH = adm
    ? `<div class="chips" id="feed-tipi">${FEED_ADM.map(([v, l]) => `<button id="feed-${v}" class="${(FEED_ADM.some(x => x[0] === f) ? f : 'tutti') === v ? 'on' : ''}" data-act="feed-filtro" data-v="${v}">${l}</button>`).join('')}</div>`
    : `<div class="chips">${[['tutti','Tutti'],['miei','Miei'],['bar','Caffè & Snack'],['cassa','Cassa & Spese'],['attesa','In attesa']].map(([v,l]) => `<button class="${f===v?'on':''}" data-act="feed-filtro" data-v="${v}">${l}</button>`).join('')}</div>`;
  let testa;
  if(adm){
    const r = rpRange(st.rpPer), C = cassaRange(r), c = d.S.cassa, tot = (c.contanti || 0) + (c.revolut || 0), t = tesoro(d);
    const uscTot = C.spese + C.uscite + C.risc;
    testa = `<div class="card" id="cassa-dash"><h3><span>💶 Cruscotto di cassa</span><span class="mut" style="font-weight:500;text-transform:none;letter-spacing:0">${esc(r.label)}</span></h3>
    ${periodoChips(r, 'rp-per', RP_PER)}
    <div class="grid2" style="margin-bottom:8px">
      <div class="stat"><small>💰 Giacenza cassa (adesso)</small><b class="mono amber" id="r-fondo-tot" style="font-size:28px;line-height:1.2">${eur(tot)}</b><small>Contanti ${eur(c.contanti || 0)} · Revolut ${eur(c.revolut || 0)}</small></div>
      <div class="stat"><small>🏦 Fondo netto (adesso)</small><b class="mono ${t.netto < 0 ? 'red' : 'green'}" id="cd-netto" style="font-size:28px;line-height:1.2">${eur(t.netto)}</b><small>cassa − crediti + debiti</small></div>
      <div class="stat"><small>📥 Entrate del periodo</small><b class="mono green" id="cd-in">${eur(C.inC + C.inR)}</b><small>Contanti ${eur(C.inC)} · Revolut ${eur(C.inR)}</small></div>
      <div class="stat"><small>📤 Uscite del periodo</small><b class="mono red" id="cd-out">${eur(uscTot)}</b><small>Spese ${eur(C.spese)} · Uscite ${eur(C.uscite)} · Riscatti ${eur(C.risc)}</small></div>
      <div class="stat cd-wide"><small>🧾 Totale pagato</small><b class="mono amber" id="cd-pagato">${eur(consumiRange(r).tot)}</b><small>Caffè e snack pagati dai colleghi nel periodo</small></div></div>
    ${can('cassa') ? `<div class="grid2 cd-tes" id="cd-tesoreria" style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:8px">
      <button class="btn green" id="btn-cassa-entrata" data-act="cassa-op" data-v="entrata">${ic('in','s')} Entrata cassa</button>
      <button class="btn" id="btn-cassa-giro" data-act="cassa-op" data-v="giroconto">${ic('repeat','s')} Giroconto</button></div>
    <div class="grid2" style="gap:8px;margin-bottom:8px">
      <button class="btn sm ghost rvsw ${revolutOn() ? 'on' : ''}" id="sw-revolut" role="switch" aria-checked="${revolutOn()}" data-act="revolut-toggle" title="${revolutOn() ? 'I colleghi possono scegliere Revolut per ricariche e riscatti' : 'Ricariche e riscatti dei colleghi solo in contanti'}">📱 Canale Revolut: <b>${revolutOn() ? 'attivo' : 'sospeso'}</b></button>
      <button class="btn sm ghost" id="btn-cassa-corr" data-act="cassa-corr">${ic('edit','s')} Correggi saldo cassa</button></div>` : ''}
    ${hintArc(r)}
    ${infoBtn(`Entrate: ricariche convalidate, quote versate, entrate di cassa e caffè pagati subito. Uscite: spese convalidate (anche quelle anticipate e rimborsate), uscite di cassa e riscatti pagati. I giroconti tra contanti e Revolut non contano. Giacenza e fondo netto sono sempre lo stato di adesso. Gli storni correggono i totali.`, 'Come funziona')}
    <button class="btn block ghost" style="margin-top:8px" data-act="rendiconto">${ic('share','s')} Condividi rendiconto di cassa (immagine)</button></div>`;
  } else {
    testa = `<div class="stat" style="margin:0 0 12px"><small>Saldo disponibile del fondo</small><b class="mono amber" id="r-fondo-tot" style="font-size:28px;line-height:1.2">${fondoNoto() ? eur(tesoro(d).cassa) : '—'}</b></div>`;
  }
  return `<h2>${ic('receipt')} Cassa e registro ${infoBtn(`Il saldo è la cassa comune (contanti + conto). Qui sotto tutta la storia del fondo, visibile a tutti${last ? ' · dal ' + dataOra(last.fino.toMillis()) : ''}.`)}</h2>
  ${testa}
  ${chipsH}
  <label class="f" style="margin:0 0 10px"><span>Cerca per collega o causale</span><div class="row" style="gap:6px"><input class="in" id="feed-q" type="search" inputmode="search" autocomplete="off" placeholder="Nome, nickname o causale…" data-chg="feed-q" value="${esc(st.feedQ || '')}" style="flex:1"><button class="btn sm ghost" id="feed-q-x" data-act="feed-q-x" ${st.feedQ ? '' : 'hidden'}>✕</button></div></label>
  <div class="card" id="feed-list">${feedLista(d)}</div>
  ${st.isAdmin && st.chiusure.length ? `<div class="card"><h3>${ic('archive','s')} Periodi chiusi</h3>
    ${st.archivio ? st.archivio.map(a => `<div style="margin-bottom:10px"><div class="mut" style="font-size:12px;margin:4px 0">${esc(a.label)}</div>${righeMov(a.movimenti.slice().reverse(), {stornati:new Set(a.movimenti.filter(m=>m.tipo==='storno').map(m=>m.rif))}, {noAct:true})}</div>`).join('')
      : `<button class="btn block" data-act="carica-archivio">${ic('archive','s')} Mostra lo storico dei periodi chiusi</button>`}
  </div>` : ''}`;
}

