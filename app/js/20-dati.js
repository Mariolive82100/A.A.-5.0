'use strict';
/* ---------- dati derivati ---------- */
const ultimaChiusura = () => st.chiusure.length ? st.chiusure[st.chiusure.length - 1] : null;
function tuttiMov(){
  const ids = new Set(st.movimenti.map(m => m.id));
  const extra = st.movD.filter(m => !ids.has(m.id)); extra.forEach(m => ids.add(m.id));
  return st.movimenti.concat(extra, Object.values(st.pending).filter(p => !ids.has(p.id))).sort((a,b) => a.t - b.t);
}
function emptyState(){ return {saldi:{}, cassa:{contanti:0, revolut:0}, stock:{}, turni:{}, ultimo:{}, punti:{}, puntiConv:{}, pcaf:{}, pcafConv:{}, pspesa:{}, pbf:{}, pRisc:{}, quote:{}, dovute:{}}; }
const METODI_QUOTA = {contanti:'Contanti', revolut:'Revolut', credito:'Dal credito', esterno:'Già versata'};
function emptyStats(){ return {caffe:{}, snack:{}, euroMid:{}, spese:0, ricariche:0, n:0}; }

function applyMov(S, m, sg){
  sg = sg || 1;
  switch(m.tipo){
    case 'caffe': if(m.stato !== 'annullata'){ add(S.saldi, m.mid, -sg*m.importo); add(S.pcaf, m.mid, sg*(m.pt ?? m.qta)*fx(m)); } break;
    case 'snack': if(m.stato !== 'annullata'){ add(S.saldi, m.mid, -sg*m.importo); add(S.stock, m.pid, -sg*m.qta); add(S.pcaf, m.mid, sg*(m.pt ?? 0)*fx(m)); } break;   // punti snack nel monte "consumi" (pcaf); senza pt (vecchi acquisti) = 0
    case 'ricarica': if(m.stato === 'confermata'){ add(S.saldi, m.mid, sg*m.importo); add(S.cassa, m.metodo, sg*m.importo); } break;
    case 'spesa':
      if(m.stato === 'confermata'){
        S.pspesa = S.pspesa || {}; add(S.pspesa, m.mid, sg*(m.pt ?? PUNTI_SPESA)*fx(m));   // 2 punti per ogni richiesta convalidata, qualunque sia il numero di articoli
        const qc = Number.isInteger(m.quotaCrediti) ? m.quotaCrediti : 0, qd = Number.isInteger(m.quotaDenaro) ? m.quotaDenaro : 0;
        if(qc > 0 && qd > 0 && (m.fonte === 'contanti' || m.fonte === 'revolut')){ add(S.saldi, m.mid, sg*qc); add(S.cassa, m.fonte, -sg*qd); }   // rimborso misto: crediti al collega + denaro dalla cassa
        else if(m.fonte === 'tasca') add(S.saldi, m.mid, sg*m.importo); else if(m.fonte === 'contanti' || m.fonte === 'revolut') add(S.cassa, m.fonte, -sg*m.importo);
      } break;
    case 'uscita': add(S.cassa, m.fonte, -sg*m.importo); break;
    case 'entrata': add(S.cassa, m.fonte, sg*m.importo); break;
    case 'giroconto': add(S.cassa, m.da, -sg*m.importo); add(S.cassa, m.a, sg*m.importo); break;
    // quota annua: l'addebito abbassa il saldo; il pagamento lo riporta su e (se in contanti/Revolut) entra in cassa
    case 'addebito_quota': add(S.saldi, m.mid, -sg*m.importo); S.dovute[m.anno] = S.dovute[m.anno] || {}; add(S.dovute[m.anno], m.mid, sg); break;
    case 'quota':
      if(m.stato && m.stato !== 'confermata') break;   // richiesta in attesa / rifiutata / annullata: nessun effetto contabile
      S.quote[m.anno] = S.quote[m.anno] || {}; add(S.quote[m.anno], m.mid, sg);
      if(typeof m.cred === 'boolean'){
        // modello prepagato: la quota e' un contributo al fondo; i crediti si accreditano solo se il Supervisor lo sceglie (cred)
        if(m.metodo === 'contanti' || m.metodo === 'revolut') add(S.cassa, m.metodo, sg*m.importo);
        if(m.cred) add(S.saldi, m.mid, sg*m.importo);
      } else if(m.metodo === 'contanti' || m.metodo === 'revolut'){ add(S.saldi, m.mid, sg*m.importo); add(S.cassa, m.metodo, sg*m.importo); }
      else if(m.metodo === 'esterno') add(S.saldi, m.mid, sg*m.importo);
      break;   // 'credito': pagata scalando il credito gia' versato, nessun movimento di soldi
    case 'scambio': if(m.stato === 'confermata'){ add(S.saldi, m.daMid, -sg*m.importo); add(S.saldi, m.aMid, sg*m.importo); } break;
    case 'regalo': add(S.saldi, m.daMid, -sg*m.importo); add(S.saldi, m.aMid, sg*m.importo); break;
    case 'ben_fatto': S.pbf = S.pbf || {}; add(S.pbf, m.aMid, sg*(m.pt ?? 2)*fx(m)); break;   // punti al destinatario; chi lo invia non perde nulla
    case 'bonus_podio': S.pbf = S.pbf || {}; add(S.pbf, m.mid, sg*(m.punti || 0)); break;   // bonus podio: solo Tessera Fedeltà, fuori dalla classifica a punti
    case 'riscatto_punti': S.pRisc = S.pRisc || {}; add(S.pRisc, m.mid, sg*m.punti*fx(m)); add(S.saldi, m.mid, sg*m.importo); break;
    case 'riscatto': if(m.stato === 'confermata' || !m.stato){ add(S.saldi, m.mid, -sg*m.importo); add(S.cassa, m.metodo, -sg*m.importo); } break;
    case 'rettifica': add(S.saldi, m.mid, sg*m.importo); break;
    case 'accredito': add(S.saldi, m.mid, sg*m.importo);
      if(m.qmAnno){ S.dovute[m.qmAnno] = S.dovute[m.qmAnno] || {}; add(S.dovute[m.qmAnno], m.mid, -sg); }   // storno di un vecchio addebito di quota
      break;
    case 'caffe_pagato': add(S.pcaf, m.mid, sg*m.qta); if(m.metodo === 'contanti' || m.metodo === 'revolut') add(S.cassa, m.metodo, sg*m.importo); break;   // caffè pagati subito, fuori dall'app: nessun effetto sul saldo
    case 'carico': add(S.stock, m.pid, sg*m.qta); break;
    case 'conversione': add(S.saldi, m.mid, sg*m.importo); add(S.puntiConv, m.mid, sg*m.punti*fx(m)); break;
    case 'conversione_caffe': add(S.saldi, m.mid, sg*m.importo); add(S.pcafConv, m.mid, sg*m.punti*fx(m)); break;
    case 'punti_adj': add(m.kind === 'caffe' ? S.pcaf : S.punti, m.mid, sg*m.punti*fx(m)); break;
    case 'pulizia': (m.mids || []).forEach(x => { add(S.turni, x, sg); add(S.punti, x, sg*ptPulM(m)); if(sg > 0) S.ultimo[x] = Math.max(S.ultimo[x] || 0, m.giorno ? new Date(m.giorno + 'T12:00:00').getTime() : (m.t || 0)); }); break;
    case 'obiettivo': if(m.fase === 'fatto'){ add(S.turni, m.mid, sg); add(S.punti, m.mid, sg*(m.punti || 0)); if(sg > 0) S.ultimo[m.mid] = Math.max(S.ultimo[m.mid] || 0, m.t || 0); } break;   // il «carico» non assegna nulla: i punti arrivano alla conferma
    case 'compito': if(m.stato === 'confermata'){ add(S.turni, m.mid, sg); add(S.punti, m.mid, sg*(m.punti || 0)); if(sg > 0) S.ultimo[m.mid] = Math.max(S.ultimo[m.mid] || 0, m.t || 0); } break;   // i punti arrivano solo alla convalida del Supervisor
    case 'storno': if(m.orig) applyMov(S, m.orig.tipo === 'quota' ? {...m.orig, cred: false} : m.orig, -sg); break;   // annullare una quota non toglie mai crediti: ritorna solo l'eventuale importo in cassa
  }
}
function applyStat(T, m, sg){
  sg = sg || 1;
  if(m.tipo === 'caffe_pagato'){ add(T.caffe, m.mid, sg*m.qta); add(T.euroMid, m.mid, sg*m.importo); }
  else if(m.tipo === 'caffe' && m.stato !== 'annullata'){ add(T.caffe, m.mid, sg*m.qta); add(T.euroMid, m.mid, sg*m.importo); }
  else if(m.tipo === 'snack' && m.stato !== 'annullata'){ add(T.snack, m.pid, sg*m.qta); add(T.euroMid, m.mid, sg*m.importo); }
  else if(m.tipo === 'spesa' && m.stato === 'confermata') T.spese += sg*m.importo;
  else if(m.tipo === 'uscita') T.spese += sg*m.importo;
  else if(m.tipo === 'ricarica' && m.stato === 'confermata') T.ricariche += sg*m.importo;
  else if(m.tipo === 'storno' && m.orig) applyStat(T, m.orig, -sg);
}

let _derCache = null;
function derived(){
  if(_derCache) return _derCache;
  const movs = tuttiMov();
  const last = st.isAdmin ? ultimaChiusura() : null;
  const S = last && last.stato ? JSON.parse(JSON.stringify(last.stato)) : emptyState();
  ['saldi','stock','turni','ultimo','punti','puntiConv','pcaf','pcafConv','pspesa','pbf','pRisc','quote','dovute'].forEach(k => S[k] = S[k] || {});
  S.cassa = S.cassa || {contanti:0, revolut:0};
  if(last && last.stato && scalaDa() && !last.sc) riscala(S);
  if(!st.isAdmin && st.estratto){
    for(const a in (st.estratto.quote || {})) S.quote[a] = {[st.mid]: st.estratto.quote[a]};
    for(const a in (st.estratto.dovute || {})) S.dovute[a] = {[st.mid]: st.estratto.dovute[a]};
  }
  // il collega parte dal proprio saldo all'ultima chiusura (estratto) e somma solo i suoi movimenti
  if(!st.isAdmin && st.estratto){
    // base della chiusura: saldi di tutti e cassa (il registro è trasparente), così i totali del Fondo sono corretti
    if(st.estratto.saldi) S.saldi = {...st.estratto.saldi};
    if(st.estratto.cassa) S.cassa = {contanti: st.estratto.cassa.contanti || 0, revolut: st.estratto.cassa.revolut || 0};
    S.saldi[st.mid] = st.estratto.saldo || 0;
    const mp = st.estratto.mp;   // mappe complete di tutti i colleghi all'ultima chiusura (punti e turni): la classifica resta "di sempre"
    if(mp) ['pcaf','pcafConv','punti','puntiConv','turni','ultimo','pspesa','pbf','pRisc'].forEach(k => { S[k] = {...(mp[k] || {})}; });
    else { S.pcaf = {[st.mid]: st.estratto.pcaf || 0}; S.pcafConv = {[st.mid]: st.estratto.pcafConv || 0}; }
    if(scalaDa() && !st.estratto.sc) riscala(S);
  }
  const T = emptyStats();
  const stornati = new Set();
  movs.forEach(m => { applyMov(S, m); applyStat(T, m); if(m.tipo === 'storno') stornati.add(m.rif); });
  T.n = movs.length;
  _derCache = {S, T, movs, stornati, pendenti: movs.filter(m => m.stato === 'attesa' && m.tipo !== 'scambio'), scambiAttesa: movs.filter(m => m.stato === 'attesa' && m.tipo === 'scambio')};
  return _derCache;
}

const membro = mid => st.membri.find(m => m.id === mid);
const nomeM = mid => { const m = membro(mid); return m ? m.nome + (m.nick ? ` (${m.nick})` : '') : '(sconosciuto)'; };
const nomeBreve = mid => { const m = membro(mid); return m ? (m.nick || m.nome) : ''; };
const validaNome = v => v.length >= 2 && v.length <= 30;
const validaNick = v => v.length <= 20;
const prodotto = pid => st.prodotti.find(p => p.id === pid);
const myName = () => nomeM(st.mid);
const membriAttivi = () => st.membri.filter(m => m.attivo !== false);
const statoQuota = (d, mid, a) => ((d.S.quote[a] || {})[mid] || 0) > 0 ? 'pagata' : ((d.S.dovute[a] || {})[mid] || 0) > 0 ? 'dovuta' : 'nessuna';
const saldo = mid => derived().S.saldi[mid] || 0;
/* modello prepagato: nessuna uscita puo' portare il saldo sotto zero (controllo lato app, doppio sbarramento interfaccia + azione) */
const MSG_CREDITO = 'Credito insufficiente: ricarica per consumare';
/* riscatti in attesa: l'importo e' riservato e non si puo' spendere ne' regalare nel frattempo */
const riservato = mid => derived().pendenti.filter(m => m.tipo === 'riscatto' && m.mid === (mid || st.mid)).reduce((a, m) => a + m.importo, 0);
const puoPagare = (imp, mid) => ((saldo(mid || st.mid) || 0) - riservato(mid || st.mid)) >= imp;
const maxCaffe = () => { const pc = st.gruppo.prezzoCaffe || 0, sd = saldo(st.mid) - riservato(st.mid); return pc > 0 ? Math.max(0, Math.min(30, Math.floor(sd / pc))) : (sd >= 0 ? 30 : 0); };
// quanto posso ancora saldare / riscattare, tolte le operazioni gia' in corso
function debitoLibero(){
  const d = derived(), s = d.S.saldi[st.mid] || 0;
  const inCorso = d.pendenti.filter(m => m.tipo === 'ricarica' && m.mid === st.mid).reduce((a, m) => a + m.importo, 0);
  return Math.max(0, -s - inCorso);
}
const PUNTI_SPESA = 2;
/* regole punti e ricompense (configurabili dai Supervisor, salvate nel documento del gruppo: nessuna lettura in più) */
const cfgN = (k, def) => { const v = st.gruppo && st.gruppo[k]; return Number.isInteger(v) && v >= 0 ? v : def; };
const ptCaffe = () => cfgN('ptCaffe', 10);
const ptBenFatto = () => cfgN('ptBenFatto', 2);
/* interruttori dei punti (admin, nel documento del gruppo): assente = attivo, cosi' i gruppi esistenti non cambiano */
const flagOn = k => !(st.gruppo && st.gruppo[k] === false);
const ptMaster = () => flagOn('ptOn');
const onP = k => ptMaster() && flagOn(k);
const ptCaffeE = () => onP('ptCaffeOn') ? ptCaffe() : 0;
/* snack: punti proporzionali al prezzo (punti per ogni 1,00 €, arrotondati all'intero), calcolati dal prezzo senza impostarli articolo per articolo */
const ptSnackEuro = () => Math.min(100, cfgD('ptSnackEuro', 10));
const ptSnackP = prezzo => onP('ptCaffeOn') ? Math.max(0, Math.round((Number(prezzo) || 0) / 100 * ptSnackEuro())) : 0;
/* podio del mese: bonus ai primi 3 (attivabile dal Supervisor); il bonus entra nella Tessera Fedeltà ma non nella classifica a punti */
const podioOn = () => ptMaster() && !!(st.gruppo && st.gruppo.podioOn === true);
const podioPt = i => Math.min(1000, cfgN('podio' + i, [0, 50, 30, 20][i]));
/* punti spesa (importo in centesimi → euro): proporzionali all'importo (rapporto punti/€ × importo, arrotondati all'intero, con tetto per singola spesa); il rimborso in denaro/crediti resta al 100% */
const cfgD = (k, def) => { const v = st.gruppo && st.gruppo[k]; return typeof v === 'number' && isFinite(v) && v >= 0 ? v : def; };
const ptSpesaEuro = () => Math.min(100, cfgD('ptSpesaEuro', 10)), ptSpesaMax = () => Math.min(1000, cfgN('ptSpesaMax', 500));
const ptSpesaE = imp => ptMaster() ? Math.min(ptSpesaMax(), Math.max(0, Math.round((Number(imp) || 0) / 100 * ptSpesaEuro()))) : 0;
const nDec = x => String(x).replace('.', ',');
const ptBfE = () => onP('ptBfOn') ? ptBenFatto() : 0;
const sogliaPunti = () => Math.max(1, cfgN('sogliaPunti', 500));
const creditiSoglia = () => Math.max(1, cfgN('creditiSoglia', 5));
const bfN = () => Math.max(1, cfgN('bfN', 1));
const bfPeriodo = () => (st.gruppo && st.gruppo.bfPeriodo) === 'mese' ? 'mese' : 'settimana';
/* scala punti ×10: scalaDa = istante del passaggio (scritto dal Supervisor). I movimenti e le chiusure PRECEDENTI si rivalutano solo in memoria:
   caffè, snack, spesa, «Ben fatto», riscatti ×10; i vecchi turni di pulizia valgono PUL_LEGACY (come la nuova «Pulizia generale») */
const PUL_LEGACY = 50;
const scalaDa = () => (st.gruppo && Number.isInteger(st.gruppo.scalaDa)) ? st.gruppo.scalaDa : 0;
const vecchio = m => { const x = scalaDa(); return !!x && (m.t || 0) < x; };
const fx = m => vecchio(m) ? 10 : 1;
const ptPulM = m => m.task ? (m.punti ?? 0) : (vecchio(m) ? PUL_LEGACY : (m.punti ?? PUNTI_DEF));
const legPul = () => Math.max(1, (st.gruppo && st.gruppo.puntiPulizia) || 10);
/* mappe punti di una chiusura/estratto in scala vecchia (senza flag sc): le porta alla scala ×10 */
function riscala(S){
  ['pcaf', 'pcafConv', 'pspesa', 'pbf', 'pRisc', 'puntiConv'].forEach(k => { const o = S[k]; if(o) for(const x in o) o[x] *= 10; });
  if(S.punti) for(const x in S.punti){ const tn = (S.turni && S.turni[x]) || 0; S.punti[x] = tn * PUL_LEGACY + (S.punti[x] - tn * legPul()) * 10; }
}
function riepScala(q){
  if(!scalaDa() || q.sc || !(q.ptC || q.ptP || q.ptS || q.ptB)) return q;
  const x10 = o => { if(!o) return o; const r = {}; for(const k in o) r[k] = o[k] * 10; return r; };
  const tn = q.turni, pP = {}, pPul = {};
  for(const k in (q.ptP || {})){ const t = tn ? (tn[k] || 0) : null; pP[k] = t === null ? q.ptP[k] * 5 : t * PUL_LEGACY + (q.ptP[k] - t * legPul()) * 10; }
  for(const k in (q.pPul || {})){ const t = tn ? (tn[k] || 0) : null; pPul[k] = t === null ? q.pPul[k] * 5 : t * PUL_LEGACY; }
  return {...q, sc: 1, ptC: x10(q.ptC), ptS: x10(q.ptS), ptB: x10(q.ptB), ptP: q.ptP ? pP : q.ptP, pPul: q.pPul ? pPul : q.pPul};
}
const puntiPerCredito = () => (st.gruppo && st.gruppo.puntiPerCredito) || PUNTI_CREDITO_DEF;
const puntiCaffeRate = () => (st.gruppo && st.gruppo.puntiCaffePerCredito) || 30;
const puntiCaffeDisp = (d, mid) => Math.max(0, ((d.S.pcaf || {})[mid] || 0) - ((d.S.pcafConv || {})[mid] || 0));
const ptLordi = (d, mid) => nz(d.S.pcaf, mid) + nz(d.S.punti, mid) + nz(d.S.pspesa, mid) + nz(d.S.pbf, mid);
const ptUsati = (d, mid) => nz(d.S.pcafConv, mid) + nz(d.S.puntiConv, mid) + nz(d.S.pRisc, mid);
const ptDisp = (d, mid) => Math.max(0, ptLordi(d, mid) - ptUsati(d, mid));
const puntiDisp = (d, mid) => Math.max(0, (d.S.punti[mid] || 0) - (d.S.puntiConv[mid] || 0));
function giorniLavorativi(da, a){
  const x = new Date(da), f = new Date(a || Date.now()); x.setHours(12,0,0,0); f.setHours(12,0,0,0);
  let n = 0; while(x < f){ x.setDate(x.getDate() + 1); const w = x.getDay(); if(w !== 0 && w !== 6) n++; } return n;
}
const msDoc = r => r && r.ts && r.ts.toMillis ? r.ts.toMillis() : Date.now();
/* acquisto di crediti da un collega (movimento 'scambio'): i crediti passano solo quando il venditore conferma di aver ricevuto il denaro */
const scambiPerMe = d => d.scambiAttesa.filter(m => m.daMid === st.mid);
const scambiMiei = d => d.scambiAttesa.filter(m => m.mid === st.mid);
const vendibile = (mid, d) => Math.max(0, (saldo(mid) - riservato(mid)) - d.scambiAttesa.filter(m => m.daMid === mid).reduce((a, m) => a + m.importo, 0));
function scambiRicevuti(d){
  const l = scambiPerMe(d); if(!l.length) return '';
  return `<div class="card" id="card-scambi" style="border-color:var(--amber)"><h3><span>🤝 Richieste di acquisto crediti</span><span class="pill red">${l.length}</span></h3>
    ${l.map(m => `<div style="padding:8px 0;border-bottom:1px solid var(--line)"><div style="font-size:13.5px"><b>${esc(nomeM(m.mid))}</b> vuole comprare <b>${m.importo / 100} ${m.importo === 100 ? 'credito' : 'crediti'}</b> da te · pagamento: ${esc(FONTI[m.metodo] || m.metodo)} (fuori dall'app)</div>
      <div class="mut" style="font-size:12px;margin:2px 0 8px">Conferma solo dopo aver ricevuto il denaro: i crediti passano subito a lui.</div>
      <div class="row" style="gap:6px"><button class="btn sm green" id="sc-ok-${m.id}" data-act="scambio-esito" data-id="${m.id}" data-v="confermata">✓ Ho ricevuto il denaro</button><button class="btn sm ghost" data-act="scambio-esito" data-id="${m.id}" data-v="rifiutata">Rifiuta</button></div></div>`).join('')}</div>`;
}
function scambiInviati(d){
  const l = scambiMiei(d); if(!l.length) return '';
  return `<div class="card" id="card-scambi-miei"><h3>${ic('clock','s')} Acquisti in attesa</h3><div class="list">${l.map(m => `<div class="li"><div class="av">🤝</div><div class="grow"><div class="t" style="font-size:13px">${m.importo / 100} ${m.importo === 100 ? 'credito' : 'crediti'} da ${esc(nomeM(m.daMid))} · ${esc(FONTI[m.metodo] || m.metodo)}</div><div class="d">In attesa che ${esc(nomeBreve(m.daMid) || nomeM(m.daMid))} confermi di aver ricevuto il denaro</div></div><button class="btn sm ghost" data-act="annulla-richiesta" data-id="${m.id}">Annulla</button></div>`).join('')}</div></div>`;
}
function creditoLibero(){ return Math.max(0, (derived().S.saldi[st.mid] || 0) - riservato(st.mid)); }

