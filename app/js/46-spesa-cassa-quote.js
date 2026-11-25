'use strict';
/* ---------- Lista della spesa collaborativa ---------- */
function pSpesa(d){
  const ls = st.listaSpesa || [];
  const attivi = ls.filter(x => x.stato === 'da_comprare').sort((a, b) => tms(a.ts) - tms(b.ts));
  const miei = ls.filter(x => x.stato === 'in_rimborso' && x.acquirenteMid === st.mid);
  const altri = ls.filter(x => x.stato === 'in_rimborso' && x.acquirenteMid !== st.mid);
  const storico = ls.filter(x => x.stato === 'acquistato').sort((a, b) => tms(b.acquistoTs) - tms(a.acquistoTs)).slice(0, 30);
  const sel = attivi.filter(x => st.spesaSel[x.id]);
  const riga = x => {
    const on = !!st.spesaSel[x.id], puoDel = x.richiestoDa === st.mid || st.isAdmin;
    return `<div class="li" style="${on ? 'border-color:var(--green)' : ''}"><button class="li grow" style="flex:1;padding:0;text-align:left;border:0" data-act="spesa-compra" data-id="${x.id}" aria-label="Segna come comprato">
      <div class="av">☐</div><div class="grow"><div class="t" style="white-space:normal;font-size:14px">${esc(x.nome)}</div><div class="d">${esc(nomeBreve(x.richiestoDa) || '(sconosciuto)')} · ${x.ts ? quando(tms(x.ts)) : 'ora'}</div></div></button>
      ${puoDel ? `<button class="iconbtn" style="width:32px;height:32px" data-act="spesa-del" data-id="${x.id}" aria-label="Elimina">${ic('trash','s')}</button>` : ''}</div>`;
  };
  return `${backHome()}<h2>🛒 Lista della spesa ${infoBtn(`Promemoria condiviso di ciò che manca in saletta. Tocca un articolo quando l'hai comprato per toglierlo dall'elenco. Se hai anticipato dei soldi, chiedi il rimborso da ➕ Ricarica in Home.`)}</h2>
  <div class="card"><div class="row" style="gap:8px;align-items:flex-end"><label class="f" style="flex:1;margin:0"><span>Cosa serve?</span><input class="in" id="sp-nome" maxlength="60" placeholder="es. Caffè in grani" autocomplete="off"></label>
    <button class="btn amber" id="btn-spesa-add" data-act="spesa-aggiungi">${ic('plus','s')} Aggiungi</button></div></div>
  <div class="card"><h3><span>Da comprare</span><b class="mono amber">${attivi.length}</b></h3>
    ${attivi.length ? `<div class="list">${attivi.map(riga).join('')}</div>` : '<div class="empty">Niente da comprare. 🎉</div>'}
    ${infoBtn(`Tocca un articolo per segnarlo come comprato. Se accanto a «Acquistati di recente» ti sei sbagliato, puoi rimetterlo in lista. Per farti rimborsare una spesa usa 💰 Riscatta o rimborso → Rimborso spesa.`, 'Come funziona')}
  </div>
  ${miei.length ? `<div class="card"><h3><span>${ic('clock','s')} I tuoi in rimborso</span><b class="mono">${miei.length}</b></h3><div class="list">${miei.map(x => { const orfano = st.ready.mv && !d.movs.some(m => m.id === x.richiestaId && m.stato !== 'annullata' && m.stato !== 'rifiutata'); return `<div class="li"><div class="av">⏳</div><div class="grow"><div class="t" style="white-space:normal;font-size:13.5px">${esc(x.nome)}</div><div class="d">${orfano ? 'richiesta non inviata' : 'in attesa di convalida'}</div></div>${orfano ? `<button class="btn sm ghost" data-act="spesa-rilascia" data-id="${x.id}">Rimetti in lista</button>` : ''}</div>`; }).join('')}</div>
    <p class="hint" style="margin:8px 0 0">Per annullare la richiesta vai in Notifiche → In attesa.</p></div>` : ''}
  ${altri.length ? `<div class="card"><h3><span>In rimborso (altri colleghi)</span><b class="mono">${altri.length}</b></h3><div class="list">${altri.map(x => `<div class="li"><div class="av">⏳</div><div class="grow"><div class="t" style="white-space:normal;font-size:13.5px">${esc(x.nome)}</div><div class="d">preso da ${esc(nomeBreve(x.acquirenteMid) || '—')}</div></div></div>`).join('')}</div></div>` : ''}
  ${storico.length ? `<details class="card"><summary class="mut" style="cursor:pointer;font-size:13px">Acquistati di recente (${storico.length})</summary><div class="list" style="margin-top:8px">${storico.map(x => `<div class="li"><div class="av">✅</div><div class="grow"><div class="t" style="white-space:normal;font-size:13.5px">${esc(x.nome)}</div><div class="d">${esc(nomeBreve(x.acquirenteMid) || '—')} · ${x.acquistoTs ? quando(tms(x.acquistoTs)) : ''}</div></div>${(st.isAdmin || x.acquirenteMid === st.mid) ? `<button class="btn sm ghost" data-act="spesa-annulla-acq" data-id="${x.id}">Rimetti in lista</button>` : ''}</div>`).join('')}</div></details>` : ''}`;
}
A['spesa-rilascia'] = ds => aggiornaArticoli({articoli: [ds.id]}, false);
A['spesa-compra'] = ds => {
  C('listaSpesa').doc(ds.id).update({stato: 'acquistato', acquirenteMid: st.mid, acquistoTs: TS()})
    .then(() => toast('Segnato come comprato ✓')).catch(e => toast('Non aggiornato (' + errMsg(e) + ')', 'err'));
};
A['spesa-annulla-acq'] = ds => {
  const del = firebase.firestore.FieldValue.delete();
  C('listaSpesa').doc(ds.id).update({stato: 'da_comprare', acquirenteMid: del, acquistoTs: del})
    .then(() => toast('Rimesso in lista')).catch(e => toast('Non aggiornato (' + errMsg(e) + ')', 'err'));
};
A['spesa-aggiungi'] = () => {
  const nome = val('sp-nome').replace(/\s+/g, ' ');
  if(nome.length < 2 || nome.length > 60) return toast('Scrivi cosa serve (2-60 caratteri)', 'err');
  if((st.listaSpesa || []).some(x => x.stato === 'da_comprare' && x.nome.toLowerCase() === nome.toLowerCase())) return toast('È già in lista', 'err');
  C('listaSpesa').add({nome, stato: 'da_comprare', richiestoDa: st.mid, ts: TS()}).catch(e => toast('Non aggiunto (' + errMsg(e) + ')', 'err'));
  const i = $('sp-nome'); if(i) i.value = '';
  toast('Aggiunto alla lista');
};
A['spesa-del'] = ds => {
  const x = (st.listaSpesa || []).find(y => y.id === ds.id); if(!x) return;
  if(!confirm(`Eliminare «${x.nome}» dalla lista?`)) return;
  delete st.spesaSel[ds.id];
  C('listaSpesa').doc(ds.id).delete().catch(e => toast('Non eliminato (' + errMsg(e) + ')', 'err'));
};
/* esito della spesa: gli articoli diventano acquistati (convalida) o tornano in lista (rifiuto / annullo) */
function aggiornaArticoli(m, ok){
  if(!m || !Array.isArray(m.articoli) || !m.articoli.length) return;
  const b = db.batch(), del = firebase.firestore.FieldValue.delete();
  m.articoli.forEach(id => {
    const r = C('listaSpesa').doc(id);
    if(ok) b.update(r, {stato: 'acquistato', acquistoTs: TS()});
    else b.update(r, {stato: 'da_comprare', acquirenteMid: del, richiestaId: del});
  });
  b.commit().catch(e => toast('Articoli non aggiornati (' + errMsg(e) + ')', 'err'));
}


/* ---------- Chi paga il caffè?: chi indovina il numero paga il caffè (si gioca passandosi il telefono) ---------- */
const GIOCO0 = () => ({fase:'setup', min:1, max:500, sel:null, ord:[], i:0, secret:0, lo:1, hi:500, dlo:1, dhi:500, ultimo:null, storia:[], perde:null});
function giocoSt(){ if(!st.gioco) st.gioco = GIOCO0(); if(!st.gioco.sel) st.gioco.sel = {}; return st.gioco; }   // all'apertura nessuno e' spuntato
function pGioco(d){
  const g = giocoSt(), nome = id => esc(nomeBreve(id) || nomeM(id));
  const head = `${backSaletta()}<h2>🎲 Chi paga il caffè? ${infoBtn('Si sceglie un numero segreto: a turno ognuno prova a indovinarlo. Chi lo indovina perde e paga il caffè! Si gioca passandosi il telefono.')}</h2>`;
  if(g.fase === 'setup'){
    return `${head}
    <div class="card"><h3>Numero massimo</h3>
      <label class="f" style="margin:0"><span>Il numero segreto va da 1 a…</span><select class="in mono" id="gm-max">${[100, 500, 1000].map(v => `<option value="${v}" ${g.max === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label></div>
    <div class="card"><h3><span>Chi gioca <span class="mut" style="text-transform:none;letter-spacing:0">(${Object.values(g.sel).filter(Boolean).length} scelti)</span></span><span class="row" style="gap:6px"><button class="btn sm ghost" id="gm-tutti" data-act="gioco-tutti" data-v="1">Tutti</button><button class="btn sm ghost" id="gm-nessuno" data-act="gioco-tutti" data-v="0">Nessuno</button></span></h3>${cercaBox('gm-lista')}<div class="list" id="gm-lista">${membriAttivi().map(m => `<button class="li" data-q="${qMem(m)}" data-act="gioco-toggle" data-id="${m.id}" style="width:100%;text-align:left;${g.sel[m.id] ? 'border-color:var(--green)' : ''}"><div class="av">${g.sel[m.id] ? '☑' : '☐'}</div><div class="grow"><div class="t" style="font-size:13.5px">${esc(nomeM(m.id))}</div></div></button>`).join('')}</div>${cercaVuoto('gm-lista')}</div>
    <button class="btn amber block big" id="gm-start" data-act="gioco-start">Inizia la partita</button>`;
  }
  if(g.fase === 'play'){
    const cur = g.ord[g.i], u = g.ultimo;
    return `${head}<div class="card" style="text-align:center">
      <small class="mut">Intervallo corrente</small>
      <div class="mono amber" id="gm-range" style="font-size:30px;font-weight:800">[${g.dlo} – ${g.dhi}]</div>
      ${g.dlo > g.min || g.dhi < g.max ? '<div class="mut" style="font-size:11.5px">gli estremi sono già stati provati: il numero è tra i due</div>' : ''}
      ${u ? `<div id="gm-hint" class="gm-hint ${u.dir}" style="margin:12px 0"><span class="gm-arrow">${u.dir === 'su' ? '⬆️' : '⬇️'}</span><b>${u.dir === 'su' ? 'Troppo basso' : 'Troppo alto'}</b><div class="mut" style="font-size:12px">${nome(u.mid)} ha provato ${u.n}</div></div>` : '<div class="mut" style="margin:12px 0;font-size:13px">Nessun tentativo ancora</div>'}
      <div class="mut" style="font-size:12px">Tocca a</div>
      <div id="gm-turno" style="font-size:24px;font-weight:800;margin-bottom:8px">${nome(cur)}</div>
      <input class="in mono" id="gm-n" inputmode="numeric" placeholder="il tuo numero" style="text-align:center;font-size:20px" autofocus>
      <button class="btn amber block big" style="margin-top:10px" id="gm-prova" data-act="gioco-prova">Prova</button></div>
    ${g.storia.length ? `<div class="card"><h3>Tentativi</h3><div class="list">${g.storia.slice().reverse().map(t => `<div class="li"><div class="grow"><div class="t" style="font-size:13px">${nome(t.mid)}: <b class="mono">${t.n}</b></div></div><span class="pill ${t.dir === 'su' ? 'amber' : 'sky'}">${t.dir === 'su' ? '⬆ troppo basso' : '⬇ troppo alto'}</span></div>`).join('')}</div></div>` : ''}
    <button class="btn link" data-act="gioco-reset">Annulla partita</button>`;
  }
  const conf = Array.from({length: 26}, (_, k) => `<span style="left:${(k * 37) % 100}%;animation-delay:${((k * 13) % 20) / 10}s;font-size:${18 + (k * 7) % 16}px">${['☕','🎉','✨','🍪','🥳'][k % 5]}</span>`).join('');
  return `${head}<div class="card gm-final" id="gm-fine"><div class="gm-conf">${conf}</div>
    <div class="gm-cup">☕</div>
    <div class="mut" style="font-size:13px">Il numero era <b class="mono amber">${g.secret}</b> · ${g.storia.length} tentativi</div>
    <div class="gm-loser" id="gm-perde">${nome(g.perde)}</div>
    <div style="font-size:20px;font-weight:800">paga il caffè! 😄</div></div>
    <button class="btn amber block big" id="gm-ruota" data-act="gioco-ruota" style="margin-bottom:10px">🎡 E chi fa i caffè? Ruota del Barista</button>
    <div class="grid2"><button class="btn ghost" id="gm-ancora" data-act="gioco-ancora">Rigioca</button><button class="btn ghost" data-act="gioco-reset">Cambia giocatori</button></div>`;
}
/* ---------- CASSA ---------- */
function pCassa(d){
  const c = d.S.cassa, tot = (c.contanti||0) + (c.revolut||0);
  let cred = 0, deb = 0;
  st.membri.forEach(m => { const s = d.S.saldi[m.id] || 0; if(s > 0) cred += s; else deb += s; });
  const netto = tot - cred - deb;
  const movC = d.movs.filter(m => descMov(m).cassa || (m.tipo === 'spesa')).reverse();
  return `<h2>${ic('wallet')} Registro cassa</h2><p class="sub">Liquidità del fondo e movimenti contabili.</p>
  <div class="grid3" style="margin-bottom:10px">
    <div class="stat"><small>Revolut</small><b class="mono sky" style="font-size:18px">${eur(c.revolut||0)}</b></div>
    <div class="stat"><small>Contanti</small><b class="mono green" style="font-size:18px">${eur(c.contanti||0)}</b></div>
    <div class="stat"><small>Totale</small><b class="mono" id="cassa-totale" style="font-size:23px">${eur(tot)}</b></div>
  </div>
  <div class="card">
    <div class="between" style="font-size:13px;margin-bottom:6px"><span class="tx2">Crediti prepagati dei colleghi</span><b class="mono">${eur(cred)}</b></div>
    <div class="between" style="font-size:13px;margin-bottom:6px"><span class="tx2">Debiti dei colleghi (da incassare)</span><b class="mono red">${eur(-deb)}</b></div>
    <div class="between" style="font-size:14px;border-top:1px solid var(--line);padding-top:8px"><span><b>Fondo netto</b><div class="mut" style="font-size:11px">cassa − crediti + debiti</div></span><b class="mono ${netto < 0 ? 'red' : 'amber'}" style="font-size:16px">${eur(netto)}</b></div>
  </div>
  ${can('cassa') ? `<div class="grid2" style="margin-bottom:12px">
    <button class="btn sm green" data-act="cassa-op" data-v="entrata">${ic('in','s')} Entrata</button>
    <button class="btn sm" data-act="cassa-op" data-v="giroconto">${ic('repeat','s')} Giroconto</button></div>
    <button class="btn sm block" style="margin:-4px 0 12px" data-act="cassa-corr">${ic('edit','s')} Correggi saldo (contanti / Revolut)</button>`
    : `<div class="banner sky">${ic('lock')}<div>Entrate, giroconti e storni li registrano il Creatore e i Supervisor autorizzati. Se hai preso soldi dalla cassa per fare la spesa chiedi il rimborso da <b>💰 Riscatta o rimborso → Rimborso spesa</b> in Home.</div></div>`}
  <div class="card"><h3>Movimenti di cassa</h3>${righeMov(movC.slice(0, 200), d)}</div>`;
}

/* ---------- INVENTARIO ---------- */
/* livello della scorta stimata: percentuale rispetto alla scorta rilevata (acquisti inclusi) e colore semaforo */
/* righe impilate: quantità stimata attuale e ultima quantità reale rilevata */
function scortaRighe(S){
  const st1 = `Stimata: ${kgTxt(S.restKg)} kg • ~${S.restTz} caffè`, u = S.ultReale;
  const st2 = u ? `Reale: ${kgTxt(u.kg)} kg • ~${Math.round(u.kg * S.resa)} caffè (${dMese(u.t)})` : 'Reale: nessuna rilevazione';
  return {st1, st2};
}
function caffeLivello(S){
  const pct = S && S.kg > 0 ? Math.max(0, Math.min(100, S.restKg / S.kg * 100)) : 0, low = S && S.restKg <= 1;
  const rosso = low || pct < 15, giallo = pct < 40;
  return {pct, cls: rosso ? 'red' : giallo ? 'amber' : 'green', col: rosso ? 'var(--red)' : giallo ? 'var(--amber)' : 'var(--green)'};
}
function cardCaffeScorta(d, ad){
  const pcf = (st.gruppo && st.gruppo.prezzoCaffe) || 0, S = statoCaffe(d), resa = resaKg();
  const prezzo = ad ? `<div class="row" style="align-items:flex-end;gap:8px"><label class="f" style="flex:1;margin:0"><span>Prezzo tazzina €</span><input class="in mono" id="mg-caffe" inputmode="decimal" value="${(pcf / 100).toFixed(2).replace('.', ',')}"></label><button class="btn sm amber" id="btn-prezzo-caffe" data-act="salva-prezzo-caffe">Salva</button></div>`
    : `<div class="between"><span class="tx2">Prezzo a tazzina</span><b class="mono amber">${eur(pcf)}</b></div>`;
  let corpo;
  if(S && S.attivo){
    const lv = caffeLivello(S);
    corpo = `<div class="between" style="margin-top:12px;font-size:14px"><span class="mono ${lv.cls}" id="caffe-rest" style="font-weight:700">${scortaRighe(S).st1}</span></div>
      <div class="bar"><i style="width:${lv.pct}%;background:${lv.col}"></i></div>
      <div class="mono tx2" id="caffe-reale" style="font-size:13px;font-weight:600;margin-top:4px">${scortaRighe(S).st2}</div>
      <p class="hint" style="margin:6px 0 0">Scorta iniziale rilevata: <b>${kgTxt(S.kg)} kg</b> il ${dBr(S.da)} · ${S.registrati} caffè pagati da allora (${resa} per kg, giri offerti inclusi)${S.parz ? ' · il periodo attraversa una chiusura: i caffè del periodo chiuso a metà non sono inclusi' : ''}.</p>
      <p class="hint" style="margin:4px 0 0" id="caffe-ult">Ultimo Tasso di Onestà: <b class="${S.ult == null ? '' : onCls(S.ult)}">${S.ult == null ? 'in attesa prossima rilevazione' : pctTxt(S.ult)}</b></p>
      `;
  } else {
    corpo = `<p class="hint" style="margin:12px 0 0">Nessuna scorta di caffè in grani rilevata.${ad ? '' : ' La scorta la imposta un Supervisor.'}</p>`;
  }
  return `<div class="card" id="inv-caffe"><h3><span>${ic('bean', 's')} Caffè in grani</span></h3>${prezzo}${corpo}
    <button class="btn sm amber block" id="btn-caffe-reg" style="margin-top:10px" data-act="go" data-p="caffereg">📒 Registro caffè${S && S.righe.length ? ` (${S.righe.length})` : ''}</button></div>`;
}
function pInventario(d){
  const ad = can('inventario');
  const k = st.invSort.k, asc = st.invSort.asc ? 1 : -1;
  const v = p => k === 'stock' ? giacenza(d, p) : k === 'prezzo' ? p.prezzo : k === 'categoria' ? p.categoria : (p.nome||'').toLowerCase();
  const list = st.prodotti.filter(p => p.id !== PID_CAFFE && p.categoria !== 'fondo' && (ad || p.attivo !== false)).sort((a,b) => (a.attivo === false) - (b.attivo === false) || (v(a) > v(b) ? asc : v(a) < v(b) ? -asc : 0));
  const th = (key, l, cls='') => `<th class="s ${cls}" data-act="inv-sort" data-k="${key}">${l}${k === key ? (st.invSort.asc ? ' ↑' : ' ↓') : ''}</th>`;
  const S = statoCaffe(d);
  const ric = prodListino().filter(p => p.esaurito === true || giacenza(d, p) <= SOGLIA_SCORTA).map(p => `${esc(p.emoji || '')} ${esc(p.nome)}${p.esaurito === true ? ' <span class="pill red">esaurito</span>' : ''}`);
  if(S && S.attivo && S.restKg <= 1) ric.unshift(`☕ Caffè in grani <span class="pill red">${kgTxt(S.restKg)} kg</span>`);
  return `${backSaletta()}<div class="between" style="margin-bottom:14px"><div><h2>${ic('package')} Inventario & listino</h2><p class="sub" style="margin:0">Prezzi, giacenze e scorta del caffè</p></div>
    ${ad ? `<button class="btn sm" style="background:#0d9488;border:0;color:#fff" data-act="prodotto" data-id="">${ic('plus','s')} Nuovo</button>` : ''}</div>
  <div class="banner sky">${ic('info')}<div>Materiali di consumo (palette, zucchero, bicchieri, detersivi…) non si contano: sono spese generali, aggiungili alla <b>Lista della spesa</b> come promemoria e, se li anticipi, chiedi il <b>Rimborso spesa</b> dalla Home.</div></div>
  ${!ad ? `<div class="banner sky">${ic('lock')}<div>Prezzi, giacenze e scorte li modificano solo il Creatore e i Supervisor.</div></div>` : ''}
  ${ric.length ? `<div class="card" id="inv-ricomprare"><h3><span>🛒 Da ricomprare</span></h3><div style="display:flex;flex-wrap:wrap;gap:6px 14px;font-size:13.5px">${ric.map(x => `<span>${x}</span>`).join('')}</div></div>` : ''}
  ${cardCaffeScorta(d, ad)}
  <div class="card" style="padding:6px 8px;overflow-x:auto">
  <table><thead><tr>${th('nome','Articolo')}${th('prezzo','Prezzo','r')}${th('stock','Giacenza','c')}</tr></thead><tbody>
    ${list.map(p => { const sk = giacenza(d, p), es = p.esaurito === true, T = statoProd(d, p); return `<tr class="${p.attivo === false ? 'strike' : ''}">
      <td>${ad ? `<button style="text-align:left" data-act="prodotto" data-id="${p.id}">` : '<div>'}<b>${esc(p.emoji||'')} ${esc(p.nome)}</b><div class="mut" style="font-size:11px">${p.categoria === 'fondo' ? 'Dotazione fondo' : 'A consumo'}${p.attivo === false ? ' · non attivo' : ''}${ad ? ' · ' + ic('edit','s').replace('class="i s"','class="i s" style="width:11px;height:11px;vertical-align:-1px"') : ''}</div>${ad ? '</button>' : '</div>'}
        ${es ? `<div style="margin-top:4px"><span class="pill red inv-esaurito">⚠️ Esaurito in dispensa</span>${T.ammanco > 0 ? `<div class="red" style="font-size:11.5px;margin-top:3px">Ammanco: ${T.ammanco} ${T.ammanco === 1 ? 'pezzo non registrato' : 'pezzi non registrati'}</div>` : ''}</div>` : ''}
        ${ad && p.categoria !== 'fondo' ? `<div><button class="btn sm ${es ? 'red' : 'ghost'}" style="margin-top:6px;padding:4px 10px;font-size:12px" data-act="esaurito" data-id="${p.id}">${es ? 'Torna disponibile' : '⚠️ Segna esaurito'}</button></div>` : ''}</td>
      <td class="r mono amber"><b>${p.categoria === 'fondo' ? '—' : eur(p.prezzo)}</b></td>
      <td class="c">${ad ? `<span class="stepper"><button data-act="carico" data-id="${p.id}" data-v="-1">−</button><b class="mono ${sk <= SOGLIA_SCORTA || es ? 'red' : ''}">${sk}</b><button data-act="carico" data-id="${p.id}" data-v="1">+</button></span>
        <div><button class="btn link" style="font-size:11px;padding:2px" data-act="carico-n" data-id="${p.id}">carico…</button></div>` : `<b class="mono ${sk <= SOGLIA_SCORTA || es ? 'red' : ''}">${es ? 'Esaurito' : sk}</b>`}</td></tr>`; }).join('')}
  </tbody></table>
  ${list.length ? '' : `<div class="empty">Nessun altro articolo. ${ad ? 'Aggiungi il primo con “Nuovo”.' : ''}</div>`}
  ${infoBtn(`«Esaurito» (solo chi gestisce) toglie l'articolo da «Acquista snack» anche se a sistema risultano ancora pezzi: quei pezzi sono l'ammanco. Un nuovo carico, o «Torna disponibile», lo rimette in vendita. La scorta del caffè scala 1 ÷ ${resaKg()} kg per ogni caffè registrato (giri offerti inclusi).`, 'Come funziona')}
  </div>`;
}

/* ---------- QUOTE ---------- */
const quotaMov = (d, mid, a) => d.movs.find(x => x.tipo === 'quota' && x.mid === mid && String(x.anno) === String(a) && !d.stornati.has(x.id) && (!x.stato || x.stato === 'confermata'));
/* vecchi addebiti di quota (modello a debito) mai pagati: danno ancora un saldo ridotto */
function quoteMigra(d){
  const out = [];
  for(const y in d.S.dovute) for(const mid in d.S.dovute[y]){
    if(!(d.S.dovute[y][mid] > 0) || ((d.S.quote[y] || {})[mid] || 0) > 0) continue;
    const m = membro(mid); if(!m || m.attivo === false) continue;
    const mv = d.movs.find(x => x.tipo === 'addebito_quota' && x.mid === mid && String(x.anno) === y && !d.stornati.has(x.id));
    out.push({y, mid, imp: mv ? mv.importo : (st.gruppo.quotaAnnua || 0)});
  }
  return out;
}
function pQuote(d){
  const a = anno();
  const list = membriAttivi().map(m => ({...m, sq: statoQuota(d, m.id, a), qm: quotaMov(d, m.id, a), qa: d.pendenti.some(x => x.tipo === 'quota' && x.mid === m.id && String(x.anno) === a)}))
    .sort((x,y) => (x.sq === 'pagata') - (y.sq === 'pagata') || x.nome.localeCompare(y.nome));
  const pagati = list.filter(m => m.sq === 'pagata').length, mig = quoteMigra(d);
  const dovuti = (st.gruppo.quotaAnnua || 0) * (list.length - pagati);
  return `<h2>${ic('banknote')} Quote annuali ${a}</h2><p class="sub">Quota di ${eur(st.gruppo.quotaAnnua||0)} · pagate ${pagati} su ${list.length}</p>
  <div class="card" id="quote-riepilogo"><div class="grid2">
    <div class="stat"><small>✅ Pagate</small><b class="mono green" id="q-pagate" style="font-size:24px">${pagati}</b></div>
    <div class="stat"><small>⏳ Da pagare</small><b class="mono ${list.length - pagati ? 'red' : 'green'}" id="q-dapagare" style="font-size:24px">${list.length - pagati}</b><small>${eur(dovuti)} ancora da incassare</small></div></div>
    ${can('soci') ? `<label class="f" style="margin-top:10px"><span>Importo della quota annuale €</span><div class="row" style="gap:8px"><input class="in mono" id="q-importo" inputmode="decimal" value="${((st.gruppo.quotaAnnua || 0) / 100).toFixed(2).replace('.', ',')}" style="flex:1"><button class="btn amber" id="btn-q-importo" data-act="quota-importo">Salva</button></div></label>` : ''}</div>
  <div class="banner sky">${ic('wallet')}<div>La quota è un contributo al fondo, separato dal portafoglio: non crea debiti e non cambia il saldo. Attiva l'interruttore quando la ricevi: scegli solo come è stata pagata. Per dare crediti al collega serve una ricarica a parte.</div></div>
  ${mig.length ? `<div class="banner amber">${ic('alert')}<div class="grow">${mig.length} ${mig.length === 1 ? 'collega ha' : 'colleghi hanno'} ancora un addebito di quota del vecchio modello non pagato (${eur(mig.reduce((t, x) => t + x.imp, 0))} in meno nei saldi).</div><button class="btn sm amber" id="btn-quota-migra" data-act="quota-migra">Azzera addebiti quota pregressi</button></div>` : ''}
  <div class="card">${cercaBox('quote-lista')}<div class="list" id="quote-lista">${list.map(m => `<div class="li" data-q="${qMem(m)}">
    <div class="av">${esc(m.nome.slice(0,1))}</div><div class="grow"><div class="t">${esc(nomeM(m.id))}</div><div class="d mono">saldo ${eurS(saldo(m.id))}${m.sq === 'pagata' && m.qm && typeof m.qm.cred === 'boolean' ? ' · ' + (m.qm.cred ? 'accreditata come crediti' : 'solo fondo') : ''}</div></div>
    <span class="pill ${m.sq === 'pagata' ? 'green' : m.qa ? 'amber' : 'red'}">${m.sq === 'pagata' ? 'pagata' : m.qa ? 'in attesa' : 'da pagare'}</span>
    ${can('soci') ? `<button class="tgl ${m.sq === 'pagata' ? 'on' : ''}" role="switch" aria-checked="${m.sq === 'pagata'}" aria-label="Quota pagata: ${esc(nomeM(m.id))}" data-act="quota-toggle" data-id="${m.id}"></button>` : ''}</div>`).join('')}</div>${cercaVuoto('quote-lista')}</div>`;
}

/* ---------- STATISTICHE ---------- */
/* consumi pagati nel periodo (caffe, caffe_pagato, snack) dai movimenti gia' in memoria; uno storno vale nel periodo del movimento originale */
function consumiRange(r, mid){
  const R = {caffe: 0, caffeE: 0, snack: 0, snackE: 0, per: {}, mov: []}, stor = derived().stornati;
  const per = x => R.per[x] || (R.per[x] = {c: 0, s: 0, e: 0});
  const pass = (m, sg) => {
    if(m.tipo === 'storno'){ if(m.orig) pass(m.orig, -sg); return; }
    if(m.stato === 'annullata' || (mid && m.mid !== mid)) return;
    if(m.tipo === 'caffe' || m.tipo === 'caffe_pagato'){ const p = per(m.mid); R.caffe += sg * (m.qta || 0); R.caffeE += sg * (m.importo || 0); p.c += sg * (m.qta || 0); p.e += sg * (m.importo || 0); }
    else if(m.tipo === 'snack'){ const p = per(m.mid); R.snack += sg * (m.qta || 0); R.snackE += sg * (m.importo || 0); p.s += sg * (m.qta || 0); p.e += sg * (m.importo || 0); }
    else return;
    if(sg > 0 && !stor.has(m.id)) R.mov.push(m);
  };
  (st.isAdmin && st.arcMov ? st.arcMov : []).concat(tuttiMov()).filter(m => { const t = m.tipo === 'storno' && m.orig ? m.orig.t : m.t; return t >= r.da && t <= r.a; }).forEach(m => pass(m, 1));
  R.righe = Object.entries(R.per).filter(([, v]) => v.c > 0 || v.s > 0 || v.e > 0).map(([id, v]) => ({mid: id, nome: nomeM(id), c: v.c, s: v.s, e: v.e}))
    .sort((a, b) => b.e - a.e || (b.c + b.s) - (a.c + a.s) || a.nome.localeCompare(b.nome));
  R.tot = R.caffeE + R.snackE;
  return R;
}
/* Scheda Resoconto Consumi: immagine PNG disegnata su canvas */
function disegnaConsumi(r, R){
  const W = 1080, P = 56, F = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', M = 'ui-monospace, Menlo, Consolas, monospace';
  const MAXR = 24, righe = R.righe.slice(0, MAXR), altri = R.righe.length - righe.length;
  const hh = 250, sum = 250, th = 70, rh = 54;
  const Ht = hh + sum + th + Math.max(1, righe.length) * rh + (altri > 0 ? rh : 0) + (righe.length ? rh + 10 : 0) + 120;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = Ht;
  const g = cv.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, Ht); grad.addColorStop(0, '#171a24'); grad.addColorStop(1, '#0d0f16');
  g.fillStyle = grad; g.fillRect(0, 0, W, Ht); g.textBaseline = 'alphabetic';
  g.fillStyle = '#f5a524'; g.font = `800 50px ${F}`; g.fillText('☕ Saletta Armieri — Resoconto Consumazioni', P, 100, W - 2 * P);
  g.fillStyle = '#e8eaf0'; g.font = `600 34px ${F}`; g.fillText(r.label.length > 44 ? r.label.slice(0, 44) + '…' : r.label, P, 160, W - 2 * P);
  g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(P, 190, W - 2 * P, 2);
  // riepilogo
  let y = hh;
  const riga = (l, v, col, big) => { g.fillStyle = '#aab0c2'; g.font = `500 ${big ? 34 : 30}px ${F}`; g.textAlign = 'left'; g.fillText(l, P, y); g.fillStyle = col; g.font = `700 ${big ? 40 : 32}px ${M}`; g.textAlign = 'right'; g.fillText(v, W - P, y); g.textAlign = 'left'; y += big ? 74 : 62; };
  riga(`☕ Caffè serviti (${R.caffe})`, eur(R.caffeE), '#fbbf24');
  riga(`🍫 Snack e bevande (${R.snack})`, eur(R.snackE), '#e8eaf0');
  g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(P, y - 34, W - 2 * P, 2); y += 6;
  riga('Totale consumato', eur(R.tot), '#34d399', true);
  // tabella
  y = hh + sum - 10;
  g.fillStyle = '#f5a524'; g.font = `700 26px ${F}`;
  g.fillText('COLLEGA', P, y); g.textAlign = 'right'; g.fillText('CAFFÈ', W - P - 420, y); g.fillText('SNACK', W - P - 250, y); g.fillText('TOTALE', W - P, y); g.textAlign = 'left';
  g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(P, y + 14, W - 2 * P, 2); y += 14;
  if(!righe.length){ y += rh; g.fillStyle = '#7b8194'; g.font = `500 30px ${F}`; g.fillText('Nessun consumo nel periodo', P, y - 14); }
  righe.forEach((x, i) => {
    y += rh;
    if(i % 2 === 0){ g.fillStyle = 'rgba(255,255,255,.04)'; g.fillRect(P - 12, y - rh + 8, W - 2 * P + 24, rh - 4); }
    g.fillStyle = '#e8eaf0'; g.font = `500 30px ${F}`; g.fillText(x.nome.length > 22 ? x.nome.slice(0, 21) + '…' : x.nome, P, y - 14);
    g.font = `600 30px ${M}`; g.textAlign = 'right'; g.fillText(String(x.c), W - P - 420, y - 14); g.fillText(String(x.s), W - P - 250, y - 14);
    g.fillStyle = '#fbbf24'; g.fillText(eur(x.e), W - P, y - 14); g.textAlign = 'left';
  });
  if(altri > 0){ y += rh; g.fillStyle = '#7b8194'; g.font = `500 26px ${F}`; g.fillText(`…e altri ${altri} ${altri === 1 ? 'collega' : 'colleghi'}`, P, y - 14); }
  g.fillStyle = '#586079'; g.font = `500 24px ${F}`; g.fillText('Generato da Armieri 5.0', P, Ht - 42);
  return cv;
}
A['st-img'] = async () => {
  const r = scRange(), R = consumiRange(r);
  const cv = disegnaConsumi(r, R);
  const blob = await new Promise(res => cv.toBlob(res, 'image/png'));
  if(!blob) return toast('Impossibile creare l\'immagine', 'err');
  const testo = `☕ Saletta Armieri — Resoconto Consumazioni · ${r.label}`;
  await condividiBlob(blob, `resoconto_consumi_${oggiISO()}.png`, 'Resoconto Consumi', testo, 'Immagine scaricata: allegala al messaggio');
};
function labelChiusura(c){
  const a = c.da && c.da.toMillis && c.da.toMillis() > 0 ? dataOra(c.da.toMillis()).slice(0,10) : 'inizio';
  return `${a} → ${dataOra(c.fino.toMillis()).slice(0,10)}`;
}


/* ---------- COLLEGHI (elenco membri) ---------- */
function pMembri(d){
  const a = anno(), att = membriAttivi().slice().sort((x, y) => x.nome.localeCompare(y.nome, 'it')), qOn = (st.gruppo.quotaAnnua || 0) > 0;
  const qPag = att.filter(m => statoQuota(d, m.id, a) === 'pagata').length;
  const qPill = m => !qOn ? '' : statoQuota(d, m.id, a) === 'pagata' ? '<span class="pill green">quota ✓</span>' : '<span class="pill amber">quota da pagare</span>';
  return `<h2>${ic('users')} Gestione Soci ${infoBtn(`Elenco dei colleghi con saldo, punti e stato della quota annuale. Tocca un nome per cambiare nome e nickname, modificare saldo o punti, archiviare o espellere. I PIN si gestiscono da Gestione PIN, i Supervisor da Gestione Supervisor.`)}</h2>
  ${qOn ? `<button class="card between" id="soci-quote" style="width:100%;text-align:left" data-act="go" data-p="quote"><span>${ic('wallet','s')} <b>Quote fondo ${a}</b></span><span class="pill ${qPag === att.length ? 'green' : 'amber'}">${qPag} su ${att.length} pagate</span></button>` : ''}
  <div class="card"><h3><span>Soci</span><button class="btn link" data-act="membro" data-id="">${ic('plus','s')} Aggiungi</button></h3>
    ${cercaBox('mb-lista')}<div class="list" id="mb-lista">${att.map(m => `<button class="li" data-q="${qMem(m)}" style="width:100%;text-align:left" data-act="membro" data-id="${m.id}">
      <div class="av">${esc(m.nome.slice(0,1))}</div><div class="grow"><div class="t">${esc(m.nome)}</div><div class="d">${m.nick ? '“' + esc(m.nick) + '” · ' : ''}⭐ ${ptDisp(d, m.id)} punti${isCreatore(m.id) ? ' · Creatore' : adminDiMembro(m.id).length ? ' · Supervisor' : ''} ${qPill(m)}</div></div>
      <b class="mono ${saldo(m.id) < 0 ? 'red' : 'green'}" style="font-size:13px">${eurS(saldo(m.id))}</b></button>`).join('')}</div>${cercaVuoto('mb-lista')}
    <button class="btn sm ghost block" style="margin-top:8px" data-act="ricarica-per">${ic('banknote','s')} Ricarica per un collega</button>
    ${st.membri.some(m => m.attivo === false) ? `<details style="margin-top:8px"><summary class="mut" style="cursor:pointer;font-size:12.5px;padding:6px 2px">Archiviati ed espulsi (${st.membri.filter(m => m.attivo === false).length})</summary>
      <div class="list">${st.membri.filter(m => m.attivo === false).map(m => `<button class="li" style="width:100%;text-align:left" data-act="membro" data-id="${m.id}">
        <div class="av">${ic(m.espulso ? 'logout' : 'archive','s')}</div><div class="grow"><div class="t">${esc(nomeM(m.id))}</div><div class="d">${m.espulso ? 'espulso' : 'archiviato'}</div></div>
        <b class="mono ${saldo(m.id) < 0 ? 'red' : saldo(m.id) > 0 ? 'green' : 'mut'}" style="font-size:13px">${eurS(saldo(m.id))}</b></button>`).join('')}</div></details>` : ''}
  </div>`;
}

/* ---------- GESTIONE PIN ---------- */
function pPin(d){
  const att = membriAttivi().slice().sort((x, y) => x.nome.localeCompare(y.nome, 'it')), sel = st.pinSel && att.find(m => m.id === st.pinSel);
  return `<h2>${ic('lock')} Gestione PIN ${infoBtn(`Il PIN personale (6 cifre) serve a ritrovare il profilo su un nuovo telefono. «Reset PIN» lo azzera: alla prossima apertura il collega ne sceglie uno nuovo. «PIN temporaneo» ne imposta uno che comunichi di persona; poi il collega dovrà sceglierne uno suo. Il PIN del Creatore lo può resettare solo il Creatore.`)}</h2>
  <div class="card"><h3>Scegli il collega</h3>${cercaBox('pin-lista')}<div class="list" id="pin-lista">${att.map(m => `<button class="li" id="pin-${m.id}" data-q="${qMem(m)}" style="width:100%;text-align:left;${sel && sel.id === m.id ? 'border-color:var(--amber)' : ''}" data-act="pin-sel" data-id="${m.id}"><div class="av">${esc(m.nome.slice(0,1))}</div><div class="grow"><div class="t">${esc(nomeM(m.id))}</div></div>${sel && sel.id === m.id ? '<span class="pill amber">scelto</span>' : ''}</button>`).join('')}</div>${cercaVuoto('pin-lista')}</div>
  ${sel ? `<div class="card" id="pin-azioni"><h3>${esc(nomeM(sel.id))}</h3>
    ${pinGestibile(sel.id) ? `<div class="grid2"><button class="btn ghost" id="btn-pin-reset" data-act="pin-reset" data-id="${sel.id}">${ic('lock','s')} Reset PIN</button><button class="btn amber" id="btn-pin-temp" data-act="pin-temp" data-id="${sel.id}">${ic('lock','s')} PIN temporaneo</button></div>`
      : `<div class="banner amber">${ic('shield')}<div>Il PIN del Creatore lo può resettare solo il Creatore.</div></div>`}</div>`
    : `<p class="hint" id="pin-hint">Scegli un collega per resettare il suo PIN o impostarne uno temporaneo.</p>`}`;
}
A['pin-sel'] = ds => { st.pinSel = ds.id; render(); };

