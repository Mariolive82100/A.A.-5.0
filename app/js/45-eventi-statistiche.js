'use strict';
/* ---------- EVENTI ---------- */
function prossimaData(ev){
  if(ev.tipo !== 'compleanno') return ev.data;
  const [y,m,dd] = ev.data.split('-').map(Number), oggi = oggiISO();
  let a = new Date().getFullYear();
  let s = `${a}-${pad(m)}-${pad(dd)}`;
  if(s < oggi) s = `${a+1}-${pad(m)}-${pad(dd)}`;
  return s;
}
/* tipi di evento: [emoji, etichetta, icona, rgb, colore testo]. Usati sia nei banner della Home sia nella pagina Eventi */
const EV_TIPI = {
  compleanno: ['🎂', 'Compleanno', 'cake', '244,114,182', '#fbcfe8'],
  nascita:    ['👶', 'Nascita', 'sparkles', '56,189,248', '#bae6fd'],
  cerimonia:  ['🎓', 'Matrimonio / Laurea', 'sparkles', '167,139,250', '#ddd6fe'],
  festa:      ['🎉', 'Festa', 'sparkles', '52,211,153', '#a7f3d0'],
  altro:      ['🗓️', 'Ricorrenza', 'calendar', '245,165,36', '#fde68a']
};
const evTipo = t => EV_TIPI[t] || EV_TIPI.altro;
function giorniA(iso){ const [y,m,d] = iso.split('-').map(Number); const t = new Date(y, m-1, d), o = new Date(); o.setHours(0,0,0,0); return Math.round((t - o) / 86400000); }
const backHome = () => `<button class="btn link" style="padding:0;margin:0 0 8px" data-act="go" data-p="bar">← Home</button>`;
const backSaletta = () => `<button class="btn link" style="padding:0;margin:0 0 8px" data-act="go" data-p="saletta">← Saletta</button>`;
/* lista della spesa: articoli ancora da comprare (badge su pulsanti e schede) */
const nSpesa = () => (st.listaSpesa || []).filter(x => x.stato === 'da_comprare').length;
const badgeSpesa = () => nSpesa() ? `<span class="tb tbi" id="badge-spesa">${nSpesa()}</span>` : '';
const badgeSpesaAbs = () => nSpesa() ? `<span class="tb" id="badge-spesa" style="top:10px;right:14px;min-width:22px;height:22px;font-size:12px">${nSpesa()}</span>` : '';
function pSaletta(d){
  return `<h2>${ic('sparkles')} Saletta</h2><p class="sub">Spesa, scorte e un po' di svago.</p>
  <div class="grid2" style="gap:12px">
    <button class="gbtn sm" id="sal-spesa" data-act="go" data-p="spesa"><span class="em">🛒</span>Lista della spesa<small>${nSpesa() ? nSpesa() + (nSpesa() === 1 ? ' cosa da comprare' : ' cose da comprare') : 'tutto a posto'}</small>${badgeSpesaAbs()}</button>
    <button class="gbtn sm" id="sal-inventario" data-act="go" data-p="inventario"><span class="em">📦</span>Inventario</button>
    <button class="gbtn sm" id="sal-gioco" data-act="go" data-p="gioco"><span class="em">🎲</span>Chi paga il caffè?</button>
    <button class="gbtn sm" id="sal-ruota" data-act="go" data-p="ruota"><span class="em">☕</span>Ruota del Barista<small>Chi fa i caffè?</small></button>
    <button class="gbtn sm" id="sal-perle" data-act="go" data-p="perle"><span class="em">💬</span>Bacheca delle Perle<small>${perleNuova() ? 'Nuova perla!' : 'Frasi celebri'}</small>${perleNuova() ? '<span class="tb" id="badge-perle" style="top:10px;right:14px;min-width:22px;height:22px;font-size:11px;padding:0 6px">Nuova</span>' : ''}</button>
  </div>`;
}


const A = {};   // tabella delle azioni (data-act)

/* ---------- Statistiche saletta (colleghi): classifica e andamento caffè per periodo ---------- */
const isoDi = dt => `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}`;
function rangeSal(){
  const o = new Date(), y = o.getFullYear(), m = o.getMonth(), p = st.salPer;
  const ini = dt => { dt.setHours(0,0,0,0); return dt.getTime(); }, fine = dt => { dt.setHours(23,59,59,999); return dt.getTime(); };
  if(p === 'oggi') return {da: ini(new Date(y, m, o.getDate())), a: Infinity, label: 'Oggi'};
  if(p === 'settimana'){ const dow = (o.getDay() + 6) % 7; return {da: ini(new Date(y, m, o.getDate() - dow)), a: Infinity, label: 'Questa settimana'}; }
  if(p === 'anno') return {da: ini(new Date(y, 0, 1)), a: Infinity, label: 'Quest\'anno'};
  if(p === 'custom'){
    const da = st.salDa ? ini(new Date(st.salDa + 'T00:00:00')) : 0, a = st.salA ? fine(new Date(st.salA + 'T00:00:00')) : Infinity;
    return {da, a, label: (st.salDa ? st.salDa.split('-').reverse().join('/') : 'inizio') + ' → ' + (st.salA ? st.salA.split('-').reverse().join('/') : 'oggi')};
  }
  return {da: ini(new Date(y, m, 1)), a: Infinity, label: 'Questo mese'};
}
async function caricaArcMov(){
  st.arcLoading = true;
  try { const s = await C('archivio').get(); st.arcMov = []; s.docs.forEach(d => st.arcMov.push(...(d.data().movimenti || []))); }
  catch(e){ st.arcMov = []; }
  st.arcLoading = false; render();
}
/* ---------- Classifica e statistiche ----------
   Tutto si calcola in memoria dai movimenti già caricati (nessuna lettura aggiuntiva da Firestore):
   periodo corrente = movimenti dall'ultima chiusura; periodi chiusi = riepiloghi salvati nell'estratto (storico). */
const STORICO_MAX = 24;
const nz = (o, k) => (o && o[k]) || 0;
const sumo = o => o ? Object.values(o).reduce((a, b) => a + b, 0) : 0;
const fCons = m => ((m.tipo === 'caffe' || m.tipo === 'caffe_pagato' || m.tipo === 'snack') && m.stato !== 'annullata') ? (m.qta || 0) : 0;
const fSpese = m => (m.tipo === 'spesa' && m.stato === 'confermata') ? (m.importo || 0) : 0;
const fTurni = m => m.tipo === 'pulizia' ? (m.mids || []).length : (m.tipo === 'obiettivo' && m.fase === 'fatto') || (m.tipo === 'compito' && m.stato === 'confermata') ? 1 : 0;
const fRic = m => (m.tipo === 'ricarica' && m.stato === 'confermata') ? (m.importo || 0) : 0;

/* serie nel periodo: per ora (oggi), per giorno (fino a ~3 mesi), per mese (oltre) */
function serieGen(tutti, r, f){
  const now = Date.now(), fine = Math.min(r.a, now);
  let inizio = r.da;
  if(!inizio){ const ts = tutti.map(m => m.t).filter(Boolean); inizio = ts.length ? Math.min(...ts) : now; }
  if(inizio > fine) inizio = fine;
  const giorni = (fine - inizio) / 864e5;
  const g = (st.salPer === 'oggi' || giorni <= 1.5) ? 'ora' : giorni > 92 ? 'mese' : 'giorno';
  const keyOf = t => { const x = new Date(t); return g === 'ora' ? `${isoDi(x)}T${pad(x.getHours())}` : g === 'giorno' ? isoDi(x) : `${x.getFullYear()}-${pad(x.getMonth()+1)}`; };
  const cur = new Date(inizio);
  if(g === 'ora') cur.setMinutes(0, 0, 0); else if(g === 'giorno') cur.setHours(0, 0, 0, 0); else { cur.setDate(1); cur.setHours(0, 0, 0, 0); }
  const dueAnni = new Date(inizio).getFullYear() !== new Date(fine).getFullYear();
  const buck = [], idx = {};
  while(cur.getTime() <= fine && buck.length < 400){
    const k = keyOf(cur.getTime());
    const lab = g === 'ora' ? pad(cur.getHours()) : g === 'giorno' ? `${pad(cur.getDate())}/${pad(cur.getMonth()+1)}`
      : cur.toLocaleDateString('it-IT', {month: 'short'}) + (dueAnni ? ' ' + String(cur.getFullYear()).slice(2) : '');
    const full = g === 'ora' ? `${pad(cur.getDate())}/${pad(cur.getMonth()+1)} ore ${pad(cur.getHours())}`
      : g === 'giorno' ? cur.toLocaleDateString('it-IT', {weekday: 'short', day: 'numeric', month: 'short'})
      : cur.toLocaleDateString('it-IT', {month: 'long', year: 'numeric'});
    idx[k] = buck.length; buck.push({lab, full, n: 0});
    if(g === 'ora') cur.setHours(cur.getHours() + 1); else if(g === 'giorno') cur.setDate(cur.getDate() + 1); else cur.setMonth(cur.getMonth() + 1);
  }
  tutti.forEach(m => {
    let v, t = m.t;
    if(m.tipo === 'storno'){ if(!m.orig) return; v = -f(m.orig); if(m.orig.t >= r.da && m.orig.t <= r.a) t = m.orig.t; } else v = f(m);
    if(!v) return;
    const i = idx[keyOf(t)]; if(i !== undefined) buck[i].n += v;
  });
  buck.forEach(b => { b.n = Math.max(0, b.n); });
  return {g, buck};
}
/* grafico a barre generico: una serie, un asse, tocca una barra per il dettaglio, tabella dati a scomparsa */
function graficoBarre(S, o){
  const buck = S.buck, N = buck.length, unita = {ora: 'ora', giorno: 'giorno', mese: 'mese', periodo: 'periodo', weekday: 'giorno della settimana', misto: 'periodo e giorno'}[S.g];
  const fmt = o.fmt || (v => String(v)), ax = o.ax || (v => v);
  const tot = buck.reduce((a, b) => a + b.n, 0), max = Math.max(0, ...buck.map(b => b.n));
  if(!tot) return `<div class="empty">${o.vuoto}</div>`;
  const W = 600, H = 210, ml = 34, mr = 6, mt = 10, mb = 26, iw = W - ml - mr, ih = H - mt - mb;
  const raw = max / 4, mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = Math.max(1, [1, 2, 5, 10].map(s => s * mag).find(s => s >= raw)), yMax = step * Math.ceil(max / step);
  const slot = iw / N, bw = Math.max(1.5, Math.min(28, slot - 2)), every = Math.ceil(N / 7);
  let cum = 0, grid = '', bars = '', xl = '';
  for(let t = 0; t <= yMax; t += step){
    const y = mt + ih - t / yMax * ih;
    grid += `<line class="gl" x1="${ml}" x2="${W - mr}" y1="${y}" y2="${y}"/><text x="${ml - 4}" y="${y + 3}" text-anchor="end">${ax(t)}</text>`;
  }
  const sel = st.scSel && st.scSel.c === o.c && st.scSel.i < N ? st.scSel.i : null;
  let selInfo = null;
  buck.forEach((b, i) => {
    cum += b.n;
    const x = ml + i * slot + (slot - bw) / 2, h = b.n / yMax * ih, y = mt + ih - h, r = Math.min(4, bw / 2, h);
    if(b.n > 0) bars += `<path d="M${x} ${mt + ih}V${y + r}Q${x} ${y} ${x + r} ${y}H${x + bw - r}Q${x + bw} ${y} ${x + bw} ${y + r}V${mt + ih}Z" fill="${o.col}" ${sel === i ? '' : 'fill-opacity=".85"'} ${sel === i ? 'stroke="var(--tx)" stroke-width="1.5"' : ''}/>`;
    bars += `<rect class="hit" data-act="sc-pick" data-c="${o.c}" data-i="${i}" x="${ml + i * slot}" y="${mt}" width="${slot}" height="${ih}"><title>${esc(b.full)}: ${esc(fmt(b.n))} (totale ${esc(fmt(cum))})</title></rect>`;
    if(i % every === 0) xl += `<text x="${ml + i * slot + slot / 2}" y="${H - 8}" text-anchor="middle">${esc(b.lab)}</text>`;
    if(sel === i) selInfo = {b, cum};
  });
  const info = selInfo ? `<b>${esc(selInfo.b.full)}</b>: ${esc(fmt(selInfo.b.n))} · totale finora <b>${esc(fmt(selInfo.cum))}</b>` : `Tocca una barra per il dettaglio · totale <b>${esc(fmt(tot))}</b>`;
  const righe = buck.filter(b => b.n > 0), cap = unita.charAt(0).toUpperCase() + unita.slice(1);
  return `<div class="sc-info">${info}</div>
    <svg class="sc" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.nome)} per ${unita}, totale ${esc(fmt(tot))}">${grid}${bars}${xl}</svg>
    <p class="hint" style="margin:6px 0 0">${esc(o.nome)} per ${unita}.</p>
    <details style="margin-top:6px"><summary class="mut" style="cursor:pointer;font-size:12.5px;padding:4px 2px">Tabella dei dati</summary>
      <table><thead><tr><th>${cap}</th><th class="r">${esc(o.nome)}</th></tr></thead><tbody>${righe.map(b => `<tr><td>${esc(b.full)}</td><td class="r mono">${esc(fmt(b.n))}</td></tr>`).join('')}</tbody></table></details>`;
}
A['sc-pick'] = ds => { const i = Number(ds.i); st.scSel = (st.scSel && st.scSel.c === ds.c && st.scSel.i === i) ? null : {c: ds.c, i}; render(); };

/* aggregazione di una lista di movimenti (periodo corrente, oppure movimenti da archiviare alla chiusura) */
function nuovoAgg(){ return {ptC:{}, ptP:{}, ptS:{}, ptB:{}, caffe:{}, snack:{}, euro:{}, spese:{}, speseN:{}, turni:{}, pPul:{}, regDati:{}, bfRic:{}, tot:{ric:0, quote:0, regali:0, regaliN:0, speseTot:0, speseCassa:0, riscatti:0, entrate:0, uscite:0, giro:0}}; }
function aggMov(G, m, sg){
  sg = sg || 1; const t = G.tot;
  switch(m.tipo){
    case 'caffe': case 'caffe_pagato': if(m.stato !== 'annullata'){ if(m.tipo === 'caffe') add(G.ptC, m.mid, sg*(m.pt ?? m.qta)*fx(m)); add(G.caffe, m.mid, sg*m.qta); add(G.euro, m.mid, sg*m.importo); } break;
    case 'snack': if(m.stato !== 'annullata'){ add(G.snack, m.mid, sg*m.qta); add(G.euro, m.mid, sg*m.importo); add(G.ptC, m.mid, sg*(m.pt ?? 0)*fx(m)); } break;
    case 'spesa': if(m.stato === 'confermata'){ add(G.ptS, m.mid, sg*(m.pt ?? PUNTI_SPESA)*fx(m)); add(G.spese, m.mid, sg*m.importo); add(G.speseN, m.mid, sg); t.speseTot += sg*m.importo; if(m.fonte === 'contanti' || m.fonte === 'revolut') t.speseCassa += sg*(Number.isInteger(m.quotaDenaro) && m.quotaDenaro > 0 ? m.quotaDenaro : m.importo); } break;
    case 'pulizia': (m.mids || []).forEach(x => { add(G.turni, x, sg); add(G.pPul, x, sg*ptPulM(m)); add(G.ptP, x, sg*ptPulM(m)); }); break;
    case 'compito': if(m.stato === 'confermata'){ add(G.turni, m.mid, sg); add(G.pPul, m.mid, sg*(m.punti || 0)); add(G.ptP, m.mid, sg*(m.punti || 0)); } break;
    case 'obiettivo': if(m.fase === 'fatto'){ add(G.turni, m.mid, sg); add(G.pPul, m.mid, sg*(m.punti || 0)); add(G.ptP, m.mid, sg*(m.punti || 0)); } break;
    case 'ricarica': if(m.stato === 'confermata') t.ric += sg*m.importo; break;
    case 'quota': if((!m.stato || m.stato === 'confermata') && (m.metodo === 'contanti' || m.metodo === 'revolut')) t.quote += sg*m.importo; break;
    case 'regalo': if(!m.trasf){ t.regali += sg*m.importo; t.regaliN += sg; add(G.regDati, m.daMid, sg*m.importo); } break;
    case 'ben_fatto': add(G.bfRic, m.aMid, sg); add(G.ptB, m.aMid, sg*(m.pt ?? 2)*fx(m)); break;
    case 'punti_adj': add(m.kind === 'caffe' ? G.ptC : G.ptP, m.mid, sg*m.punti*fx(m)); break;
    case 'bonus_podio': if(m.extra && m.sfida === 'sfauto_pulizie') add(G.ptP, m.mid, sg*(m.punti || 0)); break;   // Mastro Lindo: i punti dell'admin contano nella classifica punti del mese e nel Podio
    case 'riscatto': if(m.stato === 'confermata' || !m.stato) t.riscatti += sg*m.importo; break;
    case 'entrata': t.entrate += sg*m.importo; break;
    case 'uscita': t.uscite += sg*m.importo; break;
    case 'giroconto': t.giro += sg*m.importo; break;
    case 'storno': if(m.orig) aggMov(G, m.orig, -sg); break;
  }
}
function aggrega(list){ const G = nuovoAgg(); list.forEach(m => aggMov(G, m)); return G; }
let _aggC = {d: null, k: ''}, _aggCl = {d: null, k: ''}, _aggHd = {d: null, k: ''}, _aggOn = {d: null, k: ''}, _aggSf = {d: null, k: ''}, _aggPw = {d: null, k: ''};
function aggRange(d, r, slot){
  const k = [r.da, r.a, st.arcMov ? st.arcMov.length : -1, new Date().toDateString()].join('|');
  const c = slot === 'cl' ? _aggCl : slot === 'hd' ? _aggHd : slot === 'on' ? _aggOn : slot === 'sf' ? _aggSf : slot === 'pw' ? _aggPw : _aggC;
  if(c.d === d && c.k === k) return c;
  const tutti = (st.isAdmin && st.arcMov ? st.arcMov : []).concat(tuttiMov()).filter(m => m.t >= r.da && m.t <= r.a);
  const n = {d, k, r, tutti, G: aggrega(tutti)};
  if(slot === 'cl') _aggCl = n; else if(slot === 'hd') _aggHd = n; else if(slot === 'on') _aggOn = n; else if(slot === 'sf') _aggSf = n; else if(slot === 'pw') _aggPw = n; else _aggC = n;
  return n;
}
function aggPeriodo(d){ return aggRange(d, rangeSal(), 'st'); }
/* periodo della classifica punti: settimana in corso (da lunedì) o "sempre" = cumulato */
function clPerKey(){ return st.clP === 'sempre' ? 'sempre' : 'settimana'; }
function clRange(){
  const o = new Date(), y = o.getFullYear(), m = o.getMonth(), p = clPerKey();
  const ini = dt => { dt.setHours(0, 0, 0, 0); return dt.getTime(); };
  if(p === 'sempre') return {da: 0, a: Infinity, label: 'Classifica generale di sempre'};
  const dow = (o.getDay() + 6) % 7; return {da: ini(new Date(y, m, o.getDate() - dow)), a: Infinity, label: 'Questa settimana'};
}
/* classifica della settimana (da lunedì a domenica): corrente o scorsa, tutto in memoria dai movimenti già caricati */
const lunediDi = dt => { const x = new Date(dt); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - (x.getDay() + 6) % 7); return x; };
const settKey = x => `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
function classSett(d, prev){
  const lun = lunediDi(new Date()), ini = new Date(lun); if(prev) ini.setDate(ini.getDate() - 7);
  const dom = new Date(ini); dom.setDate(dom.getDate() + 6);
  const dm = x => `${pad(x.getDate())}/${pad(x.getMonth() + 1)}`, label = `Settimana dal ${dm(ini)} al ${dm(dom)}`;
  const G = aggConChiusi(d, {da: ini.getTime(), a: prev ? lun.getTime() - 1 : Infinity, label}, prev ? 'pw' : 'hd').G;
  const righe = membriAttivi().map(m => ({id: m.id, nome: nomeBreve(m.id) || m.nome, tot: nz(G.ptC, m.id) + nz(G.ptP, m.id) + nz(G.ptS, m.id) + nz(G.ptB, m.id)}));
  righe.sort((a, b) => b.tot - a.tot || a.nome.localeCompare(b.nome));
  return {key: settKey(ini), label, righe};
}
const PREMI_DAL = '2026-11-16';   // lunedì della prima settimana con i premi in crediti: si riscatta dal lunedì successivo
/* premio della settimana scorsa per il collegato: sul podio con almeno 1 punto e premio impostato; «fatto» se già riscattato */
function premioSett(d){
  if(!st.mid || !ptMaster() || !st.ready.mv || !st.ready.m) return null;
  if(Date.now() < lunediDi(new Date()).getTime() + 60000) return null;   // il premio si riscatta solo a settimana scaduta: dal lunedì alle 00:01
  const P = classSett(d, true), i = P.righe.findIndex(x => x.id === st.mid);
  if(P.key < PREMI_DAL) return null;   // le settimane precedenti all'introduzione dei premi non danno diritto a nulla
  if(i < 0 || i > 2 || P.righe[i].tot <= 0) return null;
  const importo = premioPos(i + 1); if(importo <= 0) return null;
  const id = `pp_${P.key}_${st.mid}`;
  return {pos: i + 1, key: P.key, id, importo, label: P.label, medal: ['🥇', '🥈', '🥉'][i], fatto: !!LS.get(id + '_' + st.gid) || tuttiMov().some(m => m.id === id)};
}
/* scheda della Home: punti della settimana con la posizione; a settimana chiusa, se sono sul podio, il pulsante «Riscatta premio» */
function homeSett(d){
  const C = classSett(d, false), i = C.righe.findIndex(x => x.id === st.mid); if(i < 0) return '';
  const me = C.righe[i], ps = premioSett(d);
  const pos = me.tot <= 0 ? '🏁 In gara' : `${i < 3 ? ['🥇', '🥈', '🥉'][i] + ' ' : ''}${i + 1}° su ${C.righe.length}`;
  const bott = !ps ? '' : ps.fatto ? `<div class="sett-ok" id="sett-premio-ok">✅ Premio della settimana scorsa riscattato: ${ps.medal} +${eur(ps.importo)}</div>`
    : `<button class="btn premio-btn block big" id="btn-riscatta-premio" data-act="riscatta-premio">🏆 Riscatta premio · ${ps.medal} ${eur(ps.importo)}</button>`;
  return `<div class="tessera sett" id="home-sett"><button type="button" class="sett-main" id="sett-vai" data-act="go" data-p="classifiche" aria-label="Punti della settimana: ${me.tot}, posizione: ${pos}"><div class="between" style="font-size:13px"><b>📅 Questa settimana</b><span class="pill ${i < 3 && me.tot > 0 ? 'amber' : 'mut'}">${pos}</span></div><div style="margin-top:6px"><b class="mono amber" style="font-size:28px;line-height:1.1">${me.tot}</b> <small class="mut">punti</small></div></button>${bott}</div>`;
}
/* storico dei periodi chiusi: i colleghi lo leggono dal proprio estratto, il Supervisor lo ricava dalle chiusure (nessuna lettura in più) */
function riepDaChiusura(c){
  if(c.riep) return c.riep;
  const T = c.stats || {};
  return {id: c.id, da: c.da && c.da.toMillis ? c.da.toMillis() : 0, fino: c.fino.toMillis(), n: c.n || 0, legacy: true, caffe: T.caffe || {}, snack: null, euro: T.euroMid || {}, spese: null, speseN: null, turni: null, pPul: null, tot: {ric: T.ricariche || 0, speseTot: T.spese || 0}};
}
const storicoDaChiusure = () => st.chiusure.map(riepDaChiusura).sort((a, b) => a.fino - b.fino).slice(-STORICO_MAX).map(riepScala);
const storicoPeriodi = () => st.isAdmin ? storicoDaChiusure() : ((st.estratto && st.estratto.storico) || []).slice().sort((a, b) => a.fino - b.fino).map(riepScala);
const dBreve = ms => new Date(ms).toLocaleDateString('it-IT', {day: '2-digit', month: '2-digit', year: '2-digit'});
const riepLabel = p => (p.da ? dBreve(p.da) : 'inizio') + ' → ' + dBreve(p.fino);

/* ---------- Continuità tra periodi chiusi e periodo aperto (tutto in memoria, nessuna lettura in più) ----------
   Regola: nei totali e nei grafici entrano solo i periodi chiusi compresi INTERAMENTE nell'intervallo scelto. */
const AGG_MAPS = ['ptC', 'ptP', 'ptS', 'ptB', 'caffe', 'snack', 'euro', 'spese', 'speseN', 'turni', 'pPul', 'regDati', 'bfRic'];
/* scomposizione settimanale di gruppo salvata nel riepilogo: [lunedì ms, consumi, turni, spese, ricariche] */
function serieSett(list, lo){
  const w = {}, fs = [fCons, fTurni, fSpese, fRic];
  const mon = t => { const x = new Date(t); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - (x.getDay() + 6) % 7); return x.getTime(); };
  list.forEach(m => {
    let src = m, sg = 1, t = m.t;
    if(m.tipo === 'storno'){ if(!m.orig) return; src = m.orig; sg = -1; t = m.orig.t >= lo ? m.orig.t : m.t; }
    const k = mon(t);
    fs.forEach((f, i) => { const v = f(src); if(v){ (w[k] = w[k] || [0, 0, 0, 0])[i] += sg * v; } });
  });
  return Object.keys(w).map(Number).sort((a, b) => a - b).map(k => [k].concat(w[k]));
}
function aggConChiusi(d, r, slot){
  const base = aggRange(d, r, slot), usa = !(st.isAdmin && st.arcMov), P = usa ? storicoPeriodi() : [];
  const L = P.filter(p => p.da >= (r.da || 0) && p.fino <= r.a);
  const out = {r, tutti: base.tutti, G: base.G, L, usa, cut: P.length ? P[P.length - 1].fino : 0,
    parziali: P.filter(p => p.fino > r.da && p.da < r.da), parz: L.some(p => p.legacy || p.snack == null), noPt: L.some(p => !p.ptC)};
  if(!L.length) return out;
  const G = nuovoAgg(), mer = (dst, src) => { if(src) Object.keys(src).forEach(k => { if(typeof src[k] === 'number') add(dst, k, src[k]); }); };
  AGG_MAPS.forEach(k => { mer(G[k], base.G[k]); L.forEach(p => mer(G[k], p[k])); });
  Object.keys(G.tot).forEach(k => { G.tot[k] = (base.G.tot[k] || 0) + L.reduce((a, p) => a + ((p.tot && p.tot[k]) || 0), 0); });
  out.G = G; return out;
}
const aggPeriodoC = d => aggConChiusi(d, rangeSal(), 'st');
function noteChiusi(c){
  if(!c.usa) return '';
  const o = [];
  if(c.L.length) o.push(`Includo ${c.L.length} ${c.L.length === 1 ? 'periodo chiuso' : 'periodi chiusi'} compresi interamente nell'intervallo${c.parz ? ' (alcuni con dati parziali)' : ''}.`);
  if(c.parziali.length) o.push(`Il periodo chiuso ${riepLabel(c.parziali[0])} inizia prima dell'intervallo scelto e non è incluso.`);
  return o.length ? `<p class="hint" style="margin:0 0 10px" id="nota-chiusi">${o.join(' ')}</p>` : '';
}
/* serie di gruppo continua: barre dei periodi chiusi inclusi (settimanali se disponibili, altrimenti una per periodo) + serie normale del periodo aperto */
function serieCont(c, f, idx, legacy){
  const r = c.r, ini = c.usa ? Math.max(r.da || 0, c.cut) : r.da;
  const S = serieGen(c.tutti, {da: ini, a: r.a}, f);
  if(!c.L.length) return S;
  const dm = ms => { const x = new Date(ms); return `${pad(x.getDate())}/${pad(x.getMonth() + 1)}`; };
  const pre = [];
  c.L.forEach(p => {
    if(p.ser && p.ser.length) p.ser.forEach(w => pre.push({lab: dm(w[0]), full: 'Settimana dal ' + dm(w[0]) + ' (periodo chiuso)', n: Math.max(0, w[1 + idx] || 0)}));
    else pre.push({lab: dm(p.fino), full: riepLabel(p) + ' (periodo chiuso)', n: Math.max(0, legacy(p))});
  });
  return {g: 'misto', buck: pre.concat(S.buck)};
}

function rankList(items, fmt, vuoto){
  items = items.filter(x => x.v > 0).sort((a, b) => b.v - a.v || nomeM(a.id).localeCompare(nomeM(b.id)));
  if(!items.length) return `<div class="empty">${vuoto}</div>`;
  const max = items[0].v;
  return items.map((x, i) => `<div style="margin-bottom:9px"><div class="between" style="font-size:13px"><span><span class="mut mono">${i+1}.</span> ${esc(nomeM(x.id))}${x.id === st.mid ? ' <span class="pill amber">tu</span>' : ''}${x.sub ? ` <span class="mut" style="font-size:11.5px">${x.sub}</span>` : ''}</span><b class="mono">${fmt(x.v)}</b></div><div class="bar"><i style="width:${Math.round(x.v / max * 100)}%"></i></div></div>`).join('');
}
const rigaTot = (e, l, v, sub) => `<div class="between" style="padding:7px 0;border-bottom:1px solid var(--line);font-size:13.5px"><span>${e} ${l}${sub ? ` <span class="mut" style="font-size:11.5px">${sub}</span>` : ''}</span><b class="mono">${v}</b></div>`;
const nonDisp = '<div class="hint">Dato non disponibile per i periodi chiusi prima della versione 1.10.0.</div>';

/* ---------- Classifica punti: scheda personale, podio, righe compatte, titoli onorari ----------
   Tutto in memoria: righe da derived()/aggRange, conteggi dai movimenti già caricati e dallo storico dell'estratto. */
const CL_CAT = [['c', '☕', 'Consumi'], ['p', '🎯', 'Sfide'], ['s', '🧾', 'Spese'], ['b', '👏', 'Ben fatto']];
const CL_KEYS = ['tot', 'c', 'p', 's', 'b'];
function aggiornaPillola(d, av){
  const hd = $('hdr'); if(!hd) return;
  /* premi in crediti del podio settimanale, sempre sott'occhio (nascosti se nessun premio e' impostato o se i punti sono disattivati) */
  const pz = $('hdr-prize'), pr = premiPodio(), premi = (!av && st.mid && ptMaster()) ? [1, 2, 3].filter(i => pr[i - 1] > 0).map(i => `${['🥇', '🥈', '🥉'][i - 1]} ${eur(pr[i - 1])}`) : [];
  if(pz){ pz.classList.toggle('hidden', !premi.length); hd.classList.toggle('hasprize', !!premi.length); if(premi.length){ pz.innerHTML = premi.join('<span class="pz-s"> · </span>'); pz.title = 'In palio ogni settimana'; } }
  const op = $('hdr-onesta'), iO = (op && !av && st.mid && st.page === 'bar') ? onestaIndici(d) : null;
  if(op){ op.classList.toggle('hidden', !iO); hd.classList.toggle('hasonesta', !!iO); if(iO){ op.className = 'onpill ' + (iO.g == null ? 'mut' : onCls(iO.g)); op.innerHTML = '🛡️ ' + onPill(iO.g); op.title = 'Tasso di Onestà (caffè + snack e bibite)'; } }
}
function clRighe(d){
  const r = clRange(), M = aggConChiusi(d, r, 'cl'), G = M.G;
  const righe = membriAttivi().map(m => { const c = nz(G.ptC, m.id), p = nz(G.ptP, m.id), s = nz(G.ptS, m.id), b = nz(G.ptB, m.id); return {m, nome: nomeBreve(m.id) || m.nome, c, p, s, b, tot: c + p + s + b}; });
  const pos = {}; righe.slice().sort((a, b) => b.tot - a.tot || a.nome.localeCompare(b.nome)).forEach((x, i) => { pos[x.m.id] = i + 1; });
  return {r, righe, pos, M};
}
/* conteggi per i titoli: periodo scelto, oppure "sempre" = ultimi periodi chiusi (estratto/chiusure) + periodo aperto */
function clConteggi(d, r){
  const sommaIn = (dst, src) => { Object.keys(src || {}).forEach(k => add(dst, k, src[k] || 0)); };
  const out = {caffe: {}, turni: {}, speseN: {}, bf: {}};
  const G = r ? aggConChiusi(d, r, 'cl').G : aggRange(d, {da: 0, a: Infinity}, 'cl').G;
  sommaIn(out.caffe, G.caffe); sommaIn(out.turni, G.turni); sommaIn(out.speseN, G.speseN); sommaIn(out.bf, G.bfRic);
  if(!r && !(st.isAdmin && st.arcMov)) storicoPeriodi().forEach(p => { sommaIn(out.caffe, p.caffe); sommaIn(out.turni, p.turni); sommaIn(out.speseN, p.speseN); sommaIn(out.bf, p.bfRic); });
  return out;
}
function clTitoli(d, r, pc0){
  const C = clConteggi(d, r), pc = pc0 || clPerKey();
  const bfNome = pc === 'sempre' ? 'Collega di Sempre' : 'Collega della Settimana';
  const def = [['caffe', '☕', 'Re della Caffeina', 'caffè'], ['turni', '🎯', 'Mastro Lindo', 'turni'], ['speseN', '🧾', 'Superstar della Spesa', 'acquisti'], ['bf', '👏', bfNome, '«Ben fatto»']];
  const att = membriAttivi();
  return def.map(([k, e, nome, u]) => {
    const vals = att.map(m => ({id: m.id, v: Math.max(0, nz(C[k], m.id))})), max = Math.max(0, ...vals.map(x => x.v));
    return {k, e, nome, u, v: max, mids: max > 0 ? vals.filter(x => x.v === max).map(x => x.id) : []};
  });
}
function clHero(righe, pos, T, r){
  const me = righe.find(x => x.m.id === st.mid); if(!me) return '';
  const byTot = righe.slice().sort((a, b) => b.tot - a.tot || a.nome.localeCompare(b.nome)), rk = pos[me.m.id], n = righe.length;
  let msg;
  if(!me.tot) msg = '🚀 Registra un consumo, un compito o una spesa per entrare in classifica.';
  else if(rk === 1){ const s = byTot[1]; msg = !s ? '🏆 Sei l\'unico in classifica!' : me.tot > s.tot ? `🏆 Sei in testa con ${me.tot - s.tot} ${me.tot - s.tot === 1 ? 'punto' : 'punti'} di vantaggio su ${esc(s.nome)}.` : `🏆 Sei in testa a pari punti con ${esc(s.nome)}: un punto in più e li stacchi.`; }
  else if(rk <= 3){ const su = byTot[rk - 2], x = Math.max(1, su.tot - me.tot + 1); msg = `🎖️ Sei sul podio! Ti ${x === 1 ? 'manca 1 punto' : 'mancano ' + x + ' punti'} per superare ${esc(su.nome)}.`; }
  else { const t3 = byTot[2], x = Math.max(1, t3.tot - me.tot + 1); msg = `🎯 Ti ${x === 1 ? 'manca 1 punto' : 'mancano ' + x + ' punti'} per entrare sul podio (superare ${esc(t3.nome)}).`; }
  const miei = T.filter(t => t.mids.includes(me.m.id));
  return `<div class="card hero" id="cl-hero">
    <div class="between"><span class="herotag">La mia scheda</span><span class="pill mut">${esc(r ? r.label : 'Sempre')}</span></div>
    <div class="hero-main"><div class="hero-pos">${rk <= 3 ? ['🥇', '🥈', '🥉'][rk - 1] + ' ' : ''}#${rk}<small> su ${n}</small></div><div class="hero-tot"><b>${me.tot}</b><small>punti</small></div></div>
    <div class="hero-grid">${CL_CAT.map(([k, e, l]) => `<div><span>${e}</span><b>${me[k]}</b><small>${l}</small></div>`).join('')}</div>
    <p class="hero-msg" id="cl-hero-msg">${msg}</p>
    ${miei.length ? `<div class="hero-tit">${miei.map(t => `<span class="pill amber">${t.e} ${esc(t.nome)}</span>`).join(' ')}</div>` : ''}
  </div>`;
}
/* ---------- Tasso di Onestà: caffè in grani (kg × resa) + singoli snack/bibite (pezzi caricati nel lotto), nella scheda Statistiche ---------- */
const kgTxt = kg => String(Math.round(kg * 100) / 100).replace('.', ',');
const onCls = pct => pct >= 85 ? 'green' : pct < 70 ? 'red' : 'amber';
const onCol = pct => pct >= 85 ? 'var(--green)' : pct < 70 ? 'var(--red)' : 'var(--amber)';
const pctTxt = pct => String(Math.round(pct * 10) / 10).replace('.', ',') + '%';
/* indici del Tasso di Onestà calcolati sui dati già in memoria: caffè (ciclo/busta in corso, altrimenti cicli conclusi), snack e bibite, aggregato */
function onestaIndici(d){
  const S = statoCaffe(d);
  const pcCh = S && S.capChiusi > 0 ? Math.min(100, S.hc / S.capChiusi * 100) : null;
  const caffe = S && S.ult != null ? Math.min(100, S.ult) : pcCh;
  let num = 0, den = 0, nIn = 0, dIn = 0;
  if(pcCh != null){ num += Math.min(S.hc, S.capChiusi); den += S.capChiusi; }
  let sN = 0, sD = 0;
  prodListino().forEach(p => { const t = statoProd(d, p); if(t.pct != null){ num += t.cT - t.aT; den += t.cT; sN += t.cT - t.aT; sD += t.cT; } else if(t.car > 0){ nIn += t.reg; dIn += t.car; } });
  const snack = sD > 0 ? sN / sD * 100 : dIn > 0 ? Math.min(100, nIn / dIn * 100) : null;
  return {caffe, snack, g: den > 0 ? num / den * 100 : null, S, pcCh};
}
const onPill = v => v == null ? 'n/d' : pctTxt(v);
function pCaffeReg(d){
  const S = statoCaffe(d), ad = can('inventario'), righe = S ? S.righe.slice().reverse() : [], mostra = st.regTutte ? righe : righe.slice(0, 30);
  const riga = r => {
    let tit, dx, det;
    if(r.tp === 'a'){ tit = '🛒 Acquisto'; dx = `<b class="mono">+${kgTxt(r.kg)} kg</b>`; det = r.zero ? 'Primo acquisto: giacenza di partenza ipotizzata a 0 kg' : 'Kg aggiunti alla scorta'; }
    else if(r.iniz){ tit = '⚖️ Rilevazione iniziale'; dx = `<b class="mono">${kgTxt(r.kg)} kg</b>`; det = 'Punto di partenza: il tasso nasce dalla rilevazione successiva'; }
    else { tit = '⚖️ Rilevazione'; dx = `<b class="mono">${kgTxt(r.kg)} kg</b>`;
      det = r.neg ? 'Scorta pesata superiore all\'attesa: tasso non calcolato (controlla gli acquisti)' : `Consumati ${kgTxt(r.cons)} kg · ${r.reg} caffè pagati su ${r.att} attesi${r.p == null ? '' : ` · tasso <b class="${onCls(r.p)}">${pctTxt(r.p)}</b>`}`; }
    return `<div class="li" ${ad ? `data-act="caffe-reg-edit" data-id="${esc(r.id)}" style="cursor:pointer"` : ''}><div class="grow"><div class="t" style="font-size:14px">${tit} <span class="tx2" style="font-weight:500">· ${dBr(r.t)} ${oraBr(r.t)}</span></div><div class="d">${det}${r.nt ? ` · ${esc(r.nt)}` : ''}${r.au ? ` · ${esc(r.au)}` : ''}</div></div>${dx}</div>`;
  };
  const lv = S && S.attivo ? caffeLivello(S) : null;
  return `<button class="btn link" style="padding:0;margin:0 0 8px" data-act="go" data-p="inventario">← Inventario</button><h2>📒 Registro caffè</h2>
  <div class="card" id="reg-riepilogo"><h3><span>Situazione stimata</span></h3>
    ${S && S.attivo ? `<div class="mono ${lv.cls}" id="reg-rest" style="font-size:14px;font-weight:700">${scortaRighe(S).st1}</div><div class="bar"><i style="width:${lv.pct}%;background:${lv.col}"></i></div>
    <div class="mono tx2" id="reg-reale" style="font-size:13px;font-weight:600;margin-top:4px">${scortaRighe(S).st2}</div>
    <p class="hint" style="margin:6px 0 0">Riferimento: <b>${kgTxt(S.kg)} kg</b> (ultima rilevazione ${dBr(S.da)} ${oraBr(S.da)} più acquisti successivi) · ${S.registrati} caffè pagati da allora.</p>
    <p class="hint" style="margin:4px 0 0">Ultimo Tasso di Onestà: <b class="${S.ult == null ? '' : onCls(S.ult)}">${S.ult == null ? 'in attesa di una seconda rilevazione' : pctTxt(S.ult)}</b></p>` : '<p class="hint" style="margin:0">Nessuna scorta: registra una prima <b>rilevazione</b> (peso del caffè in grani) per iniziare.</p>'}
    ${ad ? `<button class="btn amber block" id="btn-reg-nuova" style="margin-top:10px" data-act="caffe-reg-nuova">${ic('plus', 's')} Nuova registrazione</button>` : '<p class="hint" style="margin:8px 0 0">Il registro lo aggiornano il Creatore e i Supervisor con permesso Inventario.</p>'}
  </div>
  <div class="card" id="reg-lista"><h3><span>Movimentazioni e rilevazioni</span><b class="mono tx2">${righe.length}/${REG_MAX}</b></h3>
    ${mostra.length ? `<div class="list">${mostra.map(riga).join('')}</div>` : '<p class="hint" style="margin:0">Registro vuoto.</p>'}
    ${righe.length > 30 ? `<button class="btn sm block ghost" id="btn-reg-tutte" style="margin-top:8px" data-act="caffe-reg-tutte">${st.regTutte ? 'Mostra solo le ultime 30' : `Mostra tutte (${righe.length})`}</button>` : ''}
    <p class="hint" style="margin:8px 0 0">Oltre ${REG_MAX} righe le più vecchie vengono assorbite. Il tasso si calcola tra rilevazioni consecutive: kg consumati (rilevazione precedente + acquisti − kg pesati) × ${resaKg()} caffè/kg contro i caffè pagati nell'intervallo.</p>
  </div>`;
}
function pOnesta(d){
  const I = onestaIndici(d), S = I.S, riga = (nome, v, nota) => `<div class="onr" style="margin-bottom:12px"><div class="between" style="font-size:15px"><span>${nome}</span><b class="mono ${v == null ? 'mut' : onCls(v)}">${onPill(v)}</b></div>${v == null ? '' : `<div class="bar"><i style="width:${v}%;background:${onCol(v)}"></i></div>`}<p class="hint" style="margin:4px 0 0">${nota}</p></div>`;
  const storico = S && S.stor.length ? `<div class="list" id="on-storico-lista">${S.stor.slice().reverse().map(x => x.tp === 'acq' ? `<div class="li"><div class="grow"><div class="t" style="font-size:13.5px">${dBr(x.t)} · acquisto caffè</div><div class="d">Aggiunti ${kgTxt(Number(x.k) || 0)} kg alla scorta (nessun controllo)</div></div><b class="mono mut">+${kgTxt(Number(x.k) || 0)} kg</b></div>` : `<div class="li"><div class="grow"><div class="t" style="font-size:13.5px">${dBr(x.t)} · scorta rilevata <b class="mono">${kgTxt(Number(x.kg) || 0)} kg</b></div><div class="d">${Number(x.c) || 0} caffè registrati su ${Number(x.a) || 0} attesi (${kgTxt(Number(x.k) || 0)} kg consumati)</div></div><b class="mono ${x.p == null ? 'mut' : onCls(Number(x.p))}">${x.p == null ? 'n/d' : pctTxt(Number(x.p))}</b></div>`).join('')}</div>` : '<p class="hint" style="margin:0">Ancora nessun controllo: il primo tasso arriva alla seconda rilevazione della scorta.</p>';
  const scorta = S && S.attivo ? `<div class="between" style="font-size:14px"><span class="tx2">Scorta iniziale rilevata</span><b class="mono">${kgTxt(S.kg)} kg · ${dBr(S.da)}</b></div>
    <div class="between" style="font-size:14px;margin-top:4px"><span class="tx2">Rimanenza stimata attuale</span><b class="mono" id="on-rest">${kgTxt(S.restKg)} kg · ${S.registrati} ${S.registrati === 1 ? 'caffè pagato' : 'caffè pagati'} dal controllo</b></div>
    <div class="between" style="font-size:14px;margin:4px 0 10px"><span class="tx2">Ultimo tasso calcolato</span><b class="mono ${S.ult == null ? 'mut' : onCls(S.ult)}">${S.ult == null ? 'in attesa' : pctTxt(S.ult)}</b></div>` : '<p class="hint" style="margin:0 0 10px">Nessuna scorta rilevata: il Supervisor la imposta dall\'Inventario.</p>';
  return `${backHome()}<h2>🛡️ Tasso di Onestà</h2>
  <div class="card" id="on-riepilogo"><h3><span>Riepilogo</span></h3>
    ${riga('🛡️ <b>Aggregato</b> (caffè + snack e bibite)', I.g, I.g == null ? 'Disponibile appena un ciclo di caffè o un lotto di snack si conclude.' : 'Media ponderata sui cicli e lotti conclusi.')}
    ${riga('☕ <b>Caffè</b>', I.caffe, I.caffe == null ? 'In attesa prossima rilevazione: il tasso nasce dal confronto tra due pesate della scorta.' : 'Ultimo controllo' + (S && S.stor.filter(x => x.tp !== 'acq').length ? ' del ' + dBr(S.stor.filter(x => x.tp !== 'acq').pop().t) : '') + ': caffè registrati ÷ caffè attesi dal consumo reale in kg.')}
    ${riga('🍫 <b>Snack e bibite</b>', I.snack, 'Pezzi registrati rispetto ai pezzi caricati nei lotti conclusi (se nessun lotto è concluso, nel lotto in corso).')}
  </div>
  <div class="card" id="on-regole"><h3><span>Come si legge</span></h3>
    <div class="row" style="gap:8px;flex-wrap:wrap;margin-bottom:8px"><span class="pill green">🟢 85% o più: tutto in ordine</span><span class="pill amber">🟡 70–85%: qualcosa manca</span><span class="pill red">🔴 sotto 70%: ammanchi</span></div>
    <p class="hint" style="margin:0">Caffè: caffè registrati (giri offerti inclusi) ÷ (kg caricati × ${resaKg()} caffè/kg). Snack e bibite: pezzi registrati ÷ pezzi caricati. Più il valore è vicino al 100%, più le scorte consumate corrispondono ai consumi registrati. Calcolato sui dati già caricati: nessuna lettura in più.</p></div>
  <div class="card" id="on-storico"><h3><span>Scorta caffè e storico controlli</span></h3>${scorta}${storico}</div>
  ${cardOnesta(d)}
  <button class="btn block ghost" data-act="go" data-p="bar" style="margin-top:4px">← Torna alla Home</button>`;
}
function cardOnesta(d){
  const S = statoCaffe(d), resa = resaKg(), righe = [];
  let num = 0, den = 0;
  // ☕ caffè in grani: cicli chiusi (consolidati) + ciclo in corso (indicativo finché i chicchi non finiscono)
  const pcCh = S && S.capChiusi > 0 ? Math.min(100, S.hc / S.capChiusi * 100) : null;
  if(pcCh != null){ num += Math.min(S.hc, S.capChiusi); den += S.capChiusi; }
  let det = '';
  if(S && S.attivo) det = `Scorta rilevata <b>${kgTxt(S.kg)} kg</b> il ${dBr(S.da)} · <b>${S.registrati}</b> caffè pagati da allora · rimanenza stimata ${kgTxt(S.restKg)} kg. Il tasso si aggiorna alla prossima rilevazione reale.`;
  else det = S && S.hk > 0 ? 'Nessuna scorta in corso: il Supervisor rileva la scorta dall\'Inventario.' : 'Nessuna scorta rilevata: il Supervisor la imposta dall\'Inventario.';
  if(S && S.attivo && S.parz) det += ' Il periodo attraversa una chiusura: i caffè del periodo chiuso a metà non sono inclusi.';
  if(pcCh != null) det = `Controlli conclusi: <b>${S.hc}</b> caffè su <b>${S.capChiusi}</b> attesi (${kgTxt(S.hk)} kg consumati). ` + det;
  const pcShow = S && S.ult != null ? Math.min(100, S.ult) : pcCh;
  righe.push(`<div class="onr" id="on-caffe" style="font-size:14px"><div class="between"><span>☕ <b>Caffè in grani</b></span><b class="mono ${pcShow == null ? 'mut' : onCls(pcShow)}">${pcShow == null ? 'in attesa' : pctTxt(pcShow)}</b></div>
    ${pcShow == null ? '' : `<div class="bar"><i style="width:${pcShow}%;background:${onCol(pcShow)}"></i></div>`}<p class="hint" style="margin:4px 0 0">${det}</p></div>`);
  // 🍫 / 🥤 singoli articoli
  prodListino().slice().sort((a, b) => (a.nome || '').localeCompare(b.nome || '')).forEach(p => {
    const t = statoProd(d, p); if(t.pct != null){ num += t.cT - t.aT; den += t.cT; }
    let dt;
    if(t.cT > 0) dt = `<b>${t.cT - t.aT}</b> pezzi registrati su <b>${t.cT}</b> caricati${t.es ? ` · ⚠️ esaurito con ${t.ammanco} ${t.ammanco === 1 ? 'pezzo' : 'pezzi'} a sistema` : ''}`;
    else if(t.car > 0) dt = `Lotto in corso: ${t.reg} su ${t.car} pezzi registrati. L'indice si consolida a giacenza 0 o con «Esaurito».`;
    else dt = 'In attesa del primo carico dopo l\'avvio del nuovo conteggio.';
    righe.push(`<div class="onr" style="font-size:14px"><div class="between"><span>${esc(p.emoji || '🍫')} <b>${esc(p.nome)}</b></span><b class="mono ${t.pct == null ? 'mut' : onCls(t.pct)}">${t.pct == null ? 'n/d' : pctTxt(t.pct)}</b></div>
      ${t.pct == null ? '' : `<div class="bar"><i style="width:${t.pct}%;background:${onCol(t.pct)}"></i></div>`}<p class="hint" style="margin:4px 0 0">${dt}</p></div>`);
  });
  const g = den > 0 ? num / den * 100 : null;
  const info = infoBtn(`Indice globale: media ponderata tra caffè in grani e prodotti confezionati (peso = caffè teorici e pezzi caricati nei cicli/lotti conclusi). Caffè: caffè registrati (giri offerti inclusi) ÷ (kg caricati × ${resa} caffè/kg), valutato quando il Supervisor azzera il ciclo. Snack e bibite: pezzi registrati ÷ pezzi caricati, valutato quando la giacenza arriva a 0 o il Supervisor segna «Esaurito» (i pezzi ancora a sistema sono l'ammanco). Verde da 85%, giallo 70–84%, rosso sotto 70%. Nessuna lettura aggiuntiva.`, 'Come funziona');
  return `<div class="card" id="cl-onesta"><h3><span>🛡️ Tasso di Onestà</span><b class="mono ${g == null ? 'mut' : onCls(g)}" id="cl-onesta-pct">${g == null ? 'n/d' : pctTxt(g)}</b></h3>
    <p class="hint" style="margin:0 0 8px">${g == null ? 'Indice globale della saletta: disponibile appena un ciclo di caffè o un lotto di snack si conclude.' : 'Indice globale della saletta (caffè + snack e bibite)'}</p>
    ${g == null ? '' : `<div class="bar" style="margin:0 0 10px"><i style="width:${g}%;background:${onCol(g)}"></i></div>`}
    ${righe.join('<div style="height:10px"></div>')}${info}</div>`;
}
/* totali aggregati della sala per il tipo di punti scelto */
function clSala(righe, key, G){
  const tot = k => righe.reduce((a, x) => a + x[k], 0), nn = o => Math.max(0, sumo(o));
  const lab = {tot: 'Totale punti', c: 'Punti caffè', p: 'Punti sfide', s: 'Punti spesa', b: 'Punti «Ben fatto»'}[key];
  const det = {
    tot: `<div class="hero-grid" style="margin-top:8px">${CL_CAT.map(([k, e, l]) => `<div><span>${e}</span><b>${tot(k)}</b><small>${l}</small></div>`).join('')}</div>`,
    c: `<p class="hint" style="margin:6px 0 0">☕ ${nn(G.caffe)} caffè · 🍫 ${nn(G.snack)} snack registrati dalla saletta</p>`,
    p: `<p class="hint" style="margin:6px 0 0">🎯 ${nn(G.turni)} ${nn(G.turni) === 1 ? 'turno svolto' : 'turni svolti'}</p>`,
    s: `<p class="hint" style="margin:6px 0 0">🧾 ${nn(G.speseN)} ${nn(G.speseN) === 1 ? 'spesa convalidata' : 'spese convalidate'} · ${eur(Math.max(0, G.tot.speseTot || 0))} anticipati per la saletta</p>`,
    b: `<p class="hint" style="margin:6px 0 0">👏 ${nn(G.bfRic)} «Ben fatto» scambiati tra colleghi</p>`}[key];
  return `<div class="sala" id="cl-sala"><div class="between"><span class="sala-l">${lab} della saletta</span><b class="sala-v mono" id="cl-sala-v">${tot(key)}</b></div>${det}</div>`;
}
/* "I miei consumi" nel periodo corrente: solo movimenti già in memoria */
function viewMiei(c){
  const me = st.mid; if(!me) return '<div class="card"><div class="empty">Profilo collega non disponibile.</div></div>';
  const r = c.r, G = c.G, att = membriAttivi();
  const mine = c.tutti.filter(m => m.tipo === 'storno' ? (m.orig && m.orig.mid === me) : m.mid === me);
  const caffe = Math.max(0, nz(G.caffe, me)), snack = Math.max(0, nz(G.snack, me)), euro = nz(G.euro, me);
  const tutti = att.reduce((a, m) => a + Math.max(0, nz(G.caffe, m.id) + nz(G.snack, m.id)), 0), media = att.length ? Math.round(tutti / att.length * 10) / 10 : 0;
  const ri = c.usa ? {da: Math.max(r.da || 0, c.cut), a: r.a} : r;
  const S = serieGen(mine, ri, fCons), giorni = S.g === 'giorno' ? S.buck.filter(b => b.n > 0).length : null;
  const gg = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'], gl = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
  const wd = gg.map((lab, i) => ({lab, full: gl[i], n: 0}));
  mine.forEach(m => { let v, t = m.t; if(m.tipo === 'storno'){ if(!m.orig) return; v = -fCons(m.orig); if(m.orig.t >= ri.da && m.orig.t <= ri.a) t = m.orig.t; } else v = fCons(m); if(!v) return; wd[(new Date(t).getDay() + 6) % 7].n += v; });
  wd.forEach(b => { b.n = Math.max(0, b.n); });
  return `<div class="card" id="miei-consumi"><h3><span>👤 I miei consumi</span><b class="mono amber">${caffe + snack}</b></h3>
    <div class="grid3"><div class="stat"><small>☕ Caffè</small><b class="mono">${caffe}</b></div><div class="stat"><small>🍫 Snack</small><b class="mono">${snack}</b></div><div class="stat"><small>💶 Spesi</small><b class="mono">${eur(euro)}</b></div></div>
    <p class="hint" style="margin:8px 0 0">${giorni != null ? `Hai consumato in <b>${giorni}</b> ${giorni === 1 ? 'giorno' : 'giorni'} del periodo. ` : ''}Media del gruppo: <b>${media}</b> consumazioni a testa · tu: <b>${caffe + snack}</b>.${c.usa && c.cut > (r.da || 0) ? ` I totali includono i periodi chiusi indicati sopra; i grafici partono dall'ultima chiusura (${dBreve(c.cut)}).` : ''}</p></div>
  <div class="card"><h3><span>📈 Quando consumo</span></h3>${graficoBarre(S, {c: 'miei', nome: 'Consumazioni', col: 'var(--amber)', vuoto: 'Nessun consumo tuo in questo periodo.'})}</div>
  <div class="card"><h3><span>📆 Nei giorni della settimana</span></h3>${graficoBarre({g: 'weekday', buck: wd}, {c: 'miei-wd', nome: 'Consumazioni', col: 'var(--sky)', vuoto: 'Nessun consumo tuo in questo periodo.'})}</div>`;
}
function clIo(righe, c){
  const me = righe.find(x => x.m.id === st.mid);
  if(!me) return '<div class="card"><div class="empty">Profilo collega non disponibile.</div></div>';
  const tot = k => righe.reduce((a, x) => a + x[k], 0), quota = (a, b) => b > 0 ? Math.round(a / b * 100) + '%' : '–';
  return `<div class="card" id="cl-contributo"><h3><span>🤝 Il mio contributo alla saletta</span></h3>
    <table><thead><tr><th>Punti</th><th class="c">Miei</th><th class="c">Saletta</th><th class="c">Quota</th></tr></thead><tbody>
    ${CL_CAT.map(([k, e, l]) => `<tr><td>${e} ${l}</td><td class="c mono"><b>${me[k]}</b></td><td class="c mono">${tot(k)}</td><td class="c mono">${quota(me[k], tot(k))}</td></tr>`).join('')}
    <tr><td><b>Totale</b></td><td class="c mono"><b>${me.tot}</b></td><td class="c mono">${tot('tot')}</td><td class="c mono">${quota(me.tot, tot('tot'))}</td></tr></tbody></table></div>
  ${viewMiei(c)}`;
}
function clClassifica(d, R, T, c){
  const {r, righe, pos, M} = R;
  const k0 = st.clSort && st.clSort.k, key = CL_KEYS.includes(k0) ? k0 : 'tot';
  const ord = righe.slice().sort((a, b) => b[key] - a[key] || b.tot - a.tot || a.nome.localeCompare(b.nome));
  const bdg = mid => { const e = T.filter(t => t.mids.includes(mid)).map(t => t.e).join(''); return e ? `<span class="rk-bdg">${e}</span>` : ''; };
  const chips = [['tot', 'Totale punti'], ['c', '☕ Punti caffè'], ['p', '🎯 Punti sfide']].concat(righe.some(x => x.s > 0) || key === 's' ? [['s', '🧾 Punti spesa']] : [], [['b', '👏 Punti «Ben fatto»']]);   // «Punti spesa» solo se nel periodo ci sono punti storici
  const chipsH = `<div class="chips" id="cl-chips">${chips.map(([v, l]) => `<button id="cl-chip-${v}" class="${key === v ? 'on' : ''}" data-act="cl-chip" data-k="${v}">${l}</button>`).join('')}</div>`;
  const podio = ord.filter(x => x[key] > 0).slice(0, 3), rest = ord.slice(podio.length);
  const col = (x, i) => !x ? '<div class="pc"></div>' : `<div class="pc ${x.m.id === st.mid ? 'me' : ''}"><div class="md">${['🥇', '🥈', '🥉'][i]}</div><div class="pn">${esc(x.nome)}</div><div class="pb">${bdg(x.m.id)}${x.m.id === st.mid ? '<span class="pill amber">Tu</span>' : ''}</div><div class="pv">${x[key]}</div><div class="ps" style="height:${[92, 70, 54][i]}px">${i + 1}</div></div>`;
  const podioH = podio.length ? `<div class="pod" id="cl-podio">${col(podio[1], 1)}${col(podio[0], 0)}${col(podio[2], 2)}</div>` : `<div class="empty">Nessun punto in questa categoria nel periodo.</div>`;
  const riga = (x, i) => `<div class="rk ${x.m.id === st.mid ? 'me' : ''} ${x[key] ? '' : 'z'}"><div class="n">${podio.length + i + 1}</div><div class="nm"><div class="nt"><b class="nn">${esc(x.nome)}</b>${x.m.id === st.mid ? '<span class="pill amber">Tu</span>' : ''}${bdg(x.m.id)}</div>
      <div class="mi"><span>☕ ${x.c}</span><span>🎯 ${x.p}</span><span>🧾 ${x.s}</span><span>👏 ${x.b}</span></div></div>
      <div class="v">${x[key]}${key !== 'tot' ? `<small>tot ${x.tot}</small>` : ''}</div></div>`;
  const P = storicoPeriodi(), arc = st.isAdmin && P.length && P[P.length - 1].fino > r.da;
  const podioCard = `<div class="card"><h3><span>🏆 Podio e classifica punti</span></h3>${chipsH}${clSala(righe, key, M.G)}
    ${righe.length ? `${podioH}<div id="cl-lista">${rest.map(riga).join('')}</div>` : '<div class="empty">Nessun collega.</div>'}
    ${infoBtn(`Tocca un filtro per ordinare. Caffè: ${ptCaffe()} per caffè, ${nDec(ptSnackEuro())} per ogni 1,00 € di snack. Sfide: i punti delle sfide (per esempio Mastro Lindo), assegnati dal Creatore o dagli admin. Ben fatto: ${ptBenFatto()} per ogni riconoscimento ricevuto. Sono i punti guadagnati nel periodo scelto in alto (comprese eventuali rettifiche).`, 'Come funziona')}
    ${arc ? (st.arcMov ? '<p class="hint" style="margin:6px 0 0">Il dettaglio dei periodi chiusi è incluso.</p>' : `<button class="btn sm block ghost" style="margin-top:8px" data-act="carica-arc-mov" ${st.arcLoading ? 'disabled' : ''}>${st.arcLoading ? 'Carico…' : 'Includi il dettaglio dei periodi chiusi (legge l\'archivio)'}</button>`) : ''}</div>
  `;
  return {podio: podioCard};
}
function pClassifiche(d){
  const mod = st.clMod === 'stat' ? 'stat' : (st.clMod === 'arc' && st.isAdmin) ? 'arc' : 'classifica';
  const sw = `<div id="cl-mod" style="display:grid;grid-template-columns:repeat(${st.isAdmin ? 3 : 2},1fr);gap:${st.isAdmin ? 6 : 8}px;margin:0 0 12px">
    <button id="cl-mod-classifica" class="btn block ${mod === 'classifica' ? 'amber' : 'ghost'}" style="${st.isAdmin ? 'padding-left:6px;padding-right:6px;font-size:14px' : ''}" data-act="cl-mod" data-v="classifica">🏆 Classifica</button>
    <button id="cl-mod-stat" class="btn block ${mod === 'stat' ? 'amber' : 'ghost'}" style="${st.isAdmin ? 'padding-left:6px;padding-right:6px;font-size:14px' : ''}" data-act="cl-mod" data-v="stat">📊 Statistiche</button>
    ${st.isAdmin ? `<button id="cl-mod-arc" class="btn block ${mod === 'arc' ? 'amber' : 'ghost'}" style="padding-left:6px;padding-right:6px;font-size:14px" data-act="cl-mod" data-v="arc">📦 Archivio</button>` : ''}</div>`;
  return `<h2>${ic('chart')} Classifica e statistiche</h2>${sw}${mod === 'stat' ? pStatConsumi(d) : mod === 'arc' ? pArchivio() : pClassificaPunti(d)}`;
}
A['cl-mod'] = ds => { st.clMod = ds.v === 'stat' ? 'stat' : (ds.v === 'arc' && st.isAdmin) ? 'arc' : 'classifica'; st.scSel = null; render(); };
/* --- modalità «Statistiche»: pagamenti/consumi (caffè e snack) per ambito e periodo, tutto dai movimenti già in memoria --- */
const SC_PER = [['ieri', 'Ieri'], ['oggi', 'Oggi'], ['settimana', 'Questa settimana'], ['mese', 'Questo mese']];
const scPer = () => SC_PER.some(x => x[0] === st.scP) ? st.scP : 'oggi';
function scRange(){
  const p = scPer();
  if(p === 'ieri'){ const o = new Date(), da = new Date(o.getFullYear(), o.getMonth(), o.getDate() - 1).getTime(); return {p, da, a: new Date(o.getFullYear(), o.getMonth(), o.getDate()).getTime() - 1, label: `Ieri (${dBr(da)})`}; }
  return rpRange(p);
}
const scChips = (id, act, cur, opz) => `<div class="chips" id="${id}">${opz.map(([v, l]) => `<button id="${act}-${v}" class="${cur === v ? 'on' : ''}" data-act="${act}" data-v="${v}">${l}</button>`).join('')}</div>`;
function pStatConsumi(d){
  const amb = st.scA === 'io' ? 'io' : 'saletta', r = scRange(), io = amb === 'io';
  const R = consumiRange(r, io ? st.mid : null), Rs = io ? consumiRange(r) : R;
  const ultima = ultimaChiusura(), cut = st.isAdmin ? (ultima ? ultima.fino.toMillis() : 0) : (st.estratto && st.estratto.fino && st.estratto.fino.toMillis ? st.estratto.fino.toMillis() : 0);
  const nota = st.isAdmin ? hintArc(r) : (cut && r.da < cut ? `<p class="hint" style="margin:0 0 8px" id="sc-nota">Il periodo comprende movimenti archiviati con l'ultima chiusura (${dBr(cut)}): non sono inclusi.</p>` : '');
  const filtri = `<div class="card" id="sc-filtri">
    ${scChips('sc-amb', 'sc-amb', amb, [['saletta', '👥 Saletta'], ['io', '👤 I miei pagamenti']])}
    <div style="margin-top:8px">${scChips('sc-per', 'sc-per', scPer(), SC_PER)}</div>
    <p class="sub" style="margin:8px 0 0">${esc(r.label)}</p></div>`;
  const tot = `<div class="card" id="sc-riepilogo"><h3><span>${io ? '👤 I miei pagamenti' : '☕ Pagamenti e consumi della saletta'}</span></h3>${nota}
    <div class="grid2" style="margin-bottom:8px">
      <div class="stat"><small>☕ Caffè</small><b class="mono amber" id="sc-caffe">${R.caffe}</b><small>${eur(R.caffeE)}</small></div>
      <div class="stat"><small>🍫 Snack e bibite</small><b class="mono" id="sc-snack">${R.snack}</b><small>${eur(R.snackE)}</small></div></div>
    ${io ? `<div class="stat"><small>Totale pagato</small><b class="mono green" id="sc-tot" style="font-size:26px">${eur(R.tot)}</b></div>` : ''}
    ${!io && st.isAdmin ? `<button class="btn amber block big" style="margin-top:10px" id="btn-st-img" data-act="st-img">📸 Condividi Resoconto Consumi (Immagine)</button>` : ''}</div>`;
  if(io){
    const pos = Rs.righe.findIndex(x => x.mid === st.mid), MAXL = 30, lista = R.mov.slice().sort((a, b) => b.t - a.t);
    const nomeP = m => m.tipo === 'snack' ? '🍫 ' + esc((prodotto(m.pid) || {}).nome || 'Snack') : m.tipo === 'caffe_pagato' ? '☕ Caffè (pagato subito)' : '☕ Caffè';
    return filtri + tot + `<div class="card" id="sc-miei"><h3><span>I miei movimenti</span>${pos >= 0 ? `<span class="pill amber">${pos + 1}° su ${Rs.righe.length} per spesa</span>` : ''}</h3>
      ${lista.length ? `<div class="list">${lista.slice(0, MAXL).map(m => `<div class="li"><div class="grow"><div class="t" style="font-size:13.5px">${nomeP(m)}${m.qta > 1 ? ` ×${m.qta}` : ''}</div><div class="d">${quando(m.t)}</div></div><b class="mono">${eur(m.importo || 0)}</b></div>`).join('')}</div>
        ${lista.length > MAXL ? `<p class="hint" style="margin:6px 0 0">…e altri ${lista.length - MAXL} movimenti nel periodo.</p>` : ''}`
        : '<div class="empty">Nessun pagamento nel periodo scelto.</div>'}</div>`;
  }
  return filtri + tot + `<div class="card" id="sc-classifica"><h3><span>🏅 Classifica pagamenti</span></h3>
    ${R.righe.length ? `<table><thead><tr><th>#</th><th>Collega</th><th class="c">☕</th><th class="c">🍫</th><th class="c">Pagato</th></tr></thead><tbody>
      ${R.righe.map((x, i) => `<tr><td class="mono">${['🥇', '🥈', '🥉'][i] || i + 1}</td><td><b>${esc(x.nome)}</b>${x.mid === st.mid ? ' <span class="pill amber">tu</span>' : ''}</td><td class="c mono">${x.c}</td><td class="c mono">${x.s}</td><td class="c mono"><b>${eur(x.e)}</b></td></tr>`).join('')}
      </tbody></table>` : '<div class="empty">Nessun pagamento nel periodo scelto.</div>'}
    ${infoBtn(`Pagamenti di caffè e snack/bibite nel periodo scelto, in ordine di importo. Calcolati sui movimenti già caricati: nessuna lettura aggiuntiva.`, 'Come funziona')}</div>`;
}
A['sc-amb'] = ds => { st.scA = ds.v === 'io' ? 'io' : 'saletta'; render(); };
A['sc-per'] = ds => { if(!SC_PER.some(x => x[0] === ds.v)) return; st.scP = ds.v; render(); };
function pClassificaPunti(d){
  const avvPunti = avvisoPuntiOff();
  const amb = st.clAmb === 'io' ? 'io' : 'saletta', per = clPerKey();
  const R = clRighe(d), r = R.r, c = R.M, T = clTitoli(d, r);
  const chip = (act, cur, v, l) => `<button id="${act}-${v}" class="${cur === v ? 'on' : ''}" data-act="${act}" data-v="${v}">${l}</button>`;
  const filtri = `<div class="card" id="cl-filtri">
    <div class="chips" id="cl-amb">${chip('cl-amb', amb, 'saletta', '👥 Saletta')}${chip('cl-amb', amb, 'io', '👤 Io')}</div>
    <div class="chips" id="cl-per" style="margin-top:8px">${chip('cl-per', per, 'settimana', '📅 Questa settimana')}${chip('cl-per', per, 'sempre', '🏆 Di sempre')}</div>
    ${per === 'settimana' && premiPodio().some(x => x > 0) ? `<p class="hint" id="cl-premi" style="margin:8px 0 0">In palio a fine settimana: ${[1, 2, 3].filter(i => premioPos(i) > 0).map(i => ['🥇', '🥈', '🥉'][i - 1] + ' ' + eur(premioPos(i))).join(' · ')}</p>` : ''}
    <p class="sub" style="margin:8px 0 0">${esc(r.label)}${st.isAdmin ? '' : ' · dati dall\'ultima chiusura di periodo'}</p>
    ${noteChiusi(c)}${c.noPt ? '<p class="hint">Alcuni periodi chiusi inclusi non hanno il dettaglio dei punti (disponibile dalle chiusure fatte con la 1.14.1): i loro punti non sono conteggiati.</p>' : ''}</div>`;
  if(amb === 'io') return `${avvPunti}${filtri}${clHero(R.righe, R.pos, T, r)}
  ${clIo(R.righe, c)}`;
  const Z = clClassifica(d, R, T, c);
  return `${avvPunti}${filtri}<div class="cl-grid">${'<div class="clg-h">' + clHero(R.righe, R.pos, T, r) + '</div>'}<div class="clg-p">${Z.podio}</div></div>`;
}
A['cl-amb'] = ds => { st.clAmb = ds.v === 'io' ? 'io' : 'saletta'; st.scSel = null; render(); };
A['cl-per'] = ds => { st.clP = ds.v === 'sempre' ? 'sempre' : 'settimana'; st.scSel = null; render(); };
A['cl-chip'] = ds => { st.clSort = {k: CL_KEYS.includes(ds.k) ? ds.k : 'tot', dir: -1}; render(); };
A['carica-arc-mov'] = () => { if(!st.arcLoading && !st.arcMov) caricaArcMov(); };

