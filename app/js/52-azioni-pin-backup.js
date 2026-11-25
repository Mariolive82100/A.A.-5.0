'use strict';
/* --- PIN personale: recupero profilo, impostazione, cambio, reset --- */
A['recupero-apri'] = async () => {
  const code = st.joinCode || st.gid; if(!code) return;
  st.recCode = code; st.recLista = null; st.entry = 'recupero'; render();
  try {
    const sn = await db.collection('saletta').doc(code).collection('membri').get({source:'server'});
    st.recLista = sn.docs.map(d => ({id: d.id, ...d.data()})).filter(m => m.attivo !== false && !m.espulso).sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
  } catch(e){ st.recLista = []; toast('Impossibile caricare i nomi (' + errMsg(e) + ')', 'err'); }
  render();
};
A['recupero-indietro'] = () => { st.entry = st.gid ? null : 'creatore'; render(); };
A['recupera'] = async () => {
  const code = st.recCode, mid = val('rc-mid'), pin = val('rc-pin');
  if(!code || !mid) return toast('Scegli il tuo nome', 'err');
  if(!pinOk(pin)) return toast('Il PIN ha esattamente 6 cifre', 'err');
  if(!navigator.onLine) return toast('Serve la connessione', 'err');
  st.busy = true; render();
  const entra = (m, msg) => { st.gid = code; LS.set('gid', code); LS.set('mid', m); LS.del('invito'); st.entry = null; st.joinCode = null; st.recLista = null; connect(code); toast(msg); };
  try {
    const u = db.collection('saletta').doc(code).collection('utenti').doc(st.uid);
    const ex = await u.get({source:'server'});
    if(ex.exists){ entra(ex.data().mid, 'Questo telefono è già collegato al tuo profilo: bentornato ✓'); return; }   // identità già collegata: niente da scrivere
    const h = await hashPin(pin, code, mid), m = (st.recLista || []).find(x => x.id === mid);
    await u.set({mid, nome: m ? m.nome : '', recuperato: true, pinHash: h, ts: TS()});
    LS.set('offriAdmin_' + code, mid);
    entra(mid, 'Profilo recuperato ✓');
  } catch(e){ toast(errIngresso(e, 'PIN errato, oppure nessun PIN impostato per questo profilo (chiedi un PIN temporaneo a un Supervisor)'), 'err'); }
  finally { st.busy = false; render(); }
};
let offertaAdminAperta = false;
const REG_KEY = 'regolamento_letto_v25';   // memorizzato come ps_regolamento_letto_v7: si cambia suffisso a ogni nuova versione del regolamento
let regModalAperto = false;
A['reg-avviso'] = () => {
  openSheet(`<h3>📜 Regolamento Aggiornato</h3>
    <p class="tx2" style="font-size:15px;line-height:1.5;margin:0 0 12px">È disponibile il nuovo regolamento della saletta. Puoi consultarlo in qualsiasi momento toccando l'icona accanto al tuo nome in alto a sinistra.</p>
    <button class="btn link" id="btn-reg-leggi" style="padding:0;margin:0 0 14px;font-size:15px" data-act="reg-leggi">📖 Leggi il regolamento adesso</button>
    <label class="check"><input type="checkbox" id="reg-mai"><b style="flex:1;font-size:14px">Non mostrare più</b></label>
    <button class="btn amber block big" id="btn-reg-ok" data-act="reg-ok" style="margin-top:6px">Ho letto e compreso</button>`);
};
A['reg-ok'] = () => { const mai = $('reg-mai') && $('reg-mai').checked; if(mai) LS.set(REG_KEY, 1); closeSheet(); if(mai) render(); };
A['reg-leggi'] = () => { closeSheet(); A['go']({p: 'regolamento'}); };
A['pin-salva'] = async () => {
  const a = val('pg-1'), b = val('pg-2');
  if(!pinOk(a)) return toast('Il PIN ha esattamente 6 cifre', 'err');
  if(a !== b) return toast('I due PIN non coincidono', 'err');
  if(!navigator.onLine) return toast('Serve la connessione', 'err');
  st.busy = true; render();
  try {
    const h = await hashPin(a, st.gid, st.mid);
    await C('segretiMembri').doc(st.mid).set({pinHash: h, temporaneo: false, ts: TS()});
    st.pinDoc = {temporaneo: false}; toast('PIN salvato ✓');
  } catch(e){ toast(/permission/i.test((e && (e.code || e.message)) || '') ? 'Non riesco a salvare il PIN: chiedi al Supervisor di aggiornare le regole del database' : pinErr(e), 'err'); }
  finally { st.busy = false; render(); }
};
A['pin-cambia'] = () => openSheet(`<h3>${ic('lock')} Cambia il tuo PIN</h3><p class="sub">Serve il PIN attuale. Il nuovo ha 6 cifre.</p>
  <label class="f"><span>PIN attuale</span><input class="in mono" id="pc-old" type="password" inputmode="numeric" maxlength="6" autocomplete="off" autofocus></label>
  <label class="f"><span>Nuovo PIN</span><input class="in mono" id="pc-1" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password"></label>
  <label class="f"><span>Ripeti il nuovo PIN</span><input class="in mono" id="pc-2" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password"></label>
  <button class="btn amber block big" data-act="pin-cambia-conferma">Cambia PIN</button>`);
A['pin-cambia-conferma'] = async () => {
  const o = val('pc-old'), a = val('pc-1'), b = val('pc-2');
  if(!pinOk(o) || !pinOk(a)) return toast('Il PIN ha esattamente 6 cifre', 'err');
  if(a !== b) return toast('I due nuovi PIN non coincidono', 'err');
  if(a === o) return toast('Il nuovo PIN è uguale a quello attuale', 'err');
  if(!navigator.onLine) return toast('Serve la connessione', 'err');
  try {
    const ho = await hashPin(o, st.gid, st.mid), hn = await hashPin(a, st.gid, st.mid);
    await C('segretiMembri').doc(st.mid).set({pinHash: hn, prova: ho, temporaneo: false, ts: TS()});
    closeSheet(); toast('PIN cambiato ✓');
  } catch(e){ toast(/permission/i.test((e && (e.code || e.message)) || '') ? 'PIN attuale errato' : pinErr(e), 'err'); }
};
const pinGestibile = mid => !(isCreatore(mid) && mid !== st.mid && !(st.gruppo && st.gruppo.creatoDa === st.uid));
A['pin-reset'] = ds => {
  const m = membro(ds.id); if(!m) return;
  if(!pinGestibile(m.id)) return toast('Il PIN del creatore lo può resettare solo il creatore', 'err');
  if(!confirm(`Resettare il PIN di ${m.nome}? Al prossimo avvio dovrà sceglierne uno nuovo. Se ha perso il telefono, dagli invece un PIN temporaneo.`)) return;
  C('segretiMembri').doc(m.id).delete().then(() => { closeSheet(); toast('PIN resettato'); }).catch(e => toast(errMsg(e), 'err'));
};
A['pin-temp'] = ds => {
  const m = membro(ds.id); if(!m) return;
  if(!pinGestibile(m.id)) return toast('Il PIN del creatore lo può resettare solo il creatore', 'err');
  const r = new Uint32Array(1); crypto.getRandomValues(r);
  openSheet(`<h3>${ic('lock')} PIN temporaneo</h3><p class="sub">Per <b>${esc(m.nome)}</b>. Comunicaglielo di persona: gli permette di rientrare da un nuovo telefono, poi dovrà sceglierne uno suo.</p>
    <label class="f"><span>PIN temporaneo (6 cifre)</span><input class="in mono" id="pt-pin" inputmode="numeric" maxlength="6" value="${String(r[0] % 1000000).padStart(6, '0')}"></label>
    <button class="btn amber block big" data-act="pin-temp-conferma" data-id="${m.id}">Imposta</button>`);
};
A['pin-temp-conferma'] = async ds => {
  const p = val('pt-pin'); if(!pinOk(p)) return toast('Il PIN ha esattamente 6 cifre', 'err');
  try {
    const h = await hashPin(p, st.gid, ds.id);
    await C('segretiMembri').doc(ds.id).set({pinHash: h, temporaneo: true, da: myName(), ts: TS()});
    closeSheet(); toast(`PIN temporaneo impostato: ${p}`);
  } catch(e){ toast(pinErr(e), 'err'); }
};
A['rec-ok'] = ds => { LS.set('recVisti_' + st.gid, recVisti().concat(ds.id)); render(); };
A['rec-scollega'] = ds => {
  const u = st.utenti.find(x => x.id === ds.id); if(!u) return;
  if(protettoUid(u.id)) return toast('Il creatore del gruppo non può essere scollegato', 'err');
  if(!confirm(`Scollegare il telefono che ha recuperato il profilo di ${nomeM(u.mid)}? Il suo PIN verrà azzerato: il collega dovrà scegliere un nuovo PIN (se non ha un altro telefono, dagli un PIN temporaneo).`)) return;
  const b = db.batch(); b.delete(C('utenti').doc(u.id)); if(st.admins.some(a => a.id === u.id)) b.delete(C('admin').doc(u.id)); b.delete(C('segretiMembri').doc(u.mid));
  b.commit().then(() => { LS.set('recVisti_' + st.gid, recVisti().concat(u.id)); toast('Telefono scollegato e PIN azzerato'); }).catch(e => toast(errMsg(e), 'err'));
};
/* Modifica saldo / punti: un'unica finestra (Euro € oppure Punti pt) al posto di Accredita, Rettifica e Modifica punti */
A['saldo-punti'] = ds => {
  const m = membro(ds.id); if(!m || !can('soci')) return;
  openSheet(`<h3>${ic('edit')} Modifica saldo / punti ${infoBtn(`Corregge il saldo (€) o i punti (pt) di un collega senza toccare la cassa: omaggi, premi, errori, saldo iniziale. Usa il meno per togliere, oppure scegli «Nuovo saldo» e scrivi il saldo finale: l'app registra la differenza.`)}</h3>
    <p class="sub"><b>${esc(nomeM(m.id))}</b> · saldo <b class="mono ${saldo(m.id) < 0 ? 'red' : 'green'}">${eurS(saldo(m.id))}</b> · ⭐ ${ptDisp(derived(), m.id)} pt</p>
    <label class="f"><span>Cosa modifichi</span>${segOpts('sp-k', [['euro','€ Euro'],['pt','⭐ Punti']], 'euro')}</label>
    <label class="f"><span>Tipo di punti (solo se Punti)</span>${segOpts('sp-t', [['pulizia','🎯 Compiti'],['caffe','☕🍫 Consumi']], 'pulizia')}</label>
    <label class="f"><span>Come inserisci il saldo (solo se Euro)</span>${segOpts('sp-m', [['var','± Variazione'],['nuovo','🎯 Nuovo saldo']], 'var')}</label>
    <label class="f"><span>Importo (Variazione: + aggiunge, − toglie · Nuovo saldo: il saldo finale)</span><input class="in mono" id="sp-imp" inputmode="decimal" placeholder="es. 5,00 oppure -2" autofocus></label>
    <label class="f"><span>Causale</span><input class="in" id="sp-caus" maxlength="80" placeholder="es. omaggio, correzione, saldo dal vecchio quaderno"></label>
    <button class="btn amber block big" id="btn-sp-ok" data-act="conferma-saldo-punti" data-id="${m.id}">Registra</button>`);
};
A['conferma-saldo-punti'] = ds => {
  if(!can('soci') || !membro(ds.id)) return;
  const mid = ds.id, caus = val('sp-caus').slice(0, 80);
  if(radio('sp-k') === 'pt'){
    const n = parseInt(String(val('sp-imp')).replace('−', '-'), 10);
    if(!n || Math.abs(n) > 1000) return toast('Variazione non valida', 'err');
    addMov({tipo:'punti_adj', mid, kind: radio('sp-t') === 'caffe' ? 'caffe' : 'pulizia', punti: n, causale: caus.slice(0, 60)});
    closeSheet(); return toast('Punti aggiornati');
  }
  if(radio('sp-m') === 'nuovo'){
    // nuovo saldo: si registra la sola differenza rispetto al saldo di adesso (stessa rettifica di sempre, nessun effetto sulla cassa)
    const nuovo = parseEuro(val('sp-imp'));
    if(!Number.isFinite(nuovo) || Math.abs(nuovo) > 500000) return toast('Saldo non valido', 'err');
    const diff = nuovo - saldo(mid);
    if(diff === 0){ closeSheet(); return toast('Il saldo è già ' + eurS(nuovo)); }
    addMov({tipo:'rettifica', mid, importo: diff, causale: caus || ('Saldo impostato a ' + eurS(nuovo))});
    closeSheet(); return toast('Saldo impostato a ' + eurS(nuovo));
  }
  const imp = parseEuro(val('sp-imp'));
  if(!imp || Math.abs(imp) > 500000) return toast('Importo non valido', 'err');
  addMov({tipo:'rettifica', mid, importo: imp, causale: caus});
  closeSheet(); toast('Saldo aggiornato');
};
A['spesa-admin'] = () => {
  const c = derived().S.cassa;
  openSheet(`<h3>${ic('receipt')} Registra spesa ${infoBtn(`Acquisto per il fondo già fatto (caffè, palette, zucchero, detersivi…).`)}</h3>
    <label class="f"><span>Descrizione</span><input class="in" id="sa-desc" maxlength="80" placeholder="es. Palette e bicchierini" autofocus></label>
    <label class="f"><span>Importo €</span><input class="in mono" id="sa-imp" inputmode="decimal" placeholder="12,50"></label>
    <label class="f"><span>Pagata da</span>${segOpts('sa-met', [['contanti','💶 Contanti (' + eur(c.contanti || 0) + ')'],['revolut','📱 Revolut (' + eur(c.revolut || 0) + ')'],['tasca','🙋 Mia, in crediti']], 'contanti')}</label>
    <button class="btn amber block big" data-act="conferma-spesa-admin">Registra</button>`);
};
A['conferma-spesa-admin'] = () => {
  const descr = val('sa-desc'), imp = parseEuro(val('sa-imp')), fonte = radio('sa-met') || 'contanti';
  if(!descr || !(imp > 0) || imp > MAXOP) return toast('Scrivi cosa è stato comprato e un importo valido', 'err');
  addMov({tipo:'spesa', mid: st.mid, importo: imp, fonte, descr: descr.slice(0,80), stato: 'confermata', esitoDa: myName(), pt: ptSpesaE(imp)});
  closeSheet(); toast('Spesa registrata');
};
A['salva-prezzo-caffe'] = () => {
  const pc = parseEuro(val('mg-caffe'));
  if(!(pc >= 0)) return toast('Prezzo non valido', 'err');
  G().set({prezzoCaffe: pc}, {merge: true}).then(() => toast('Prezzo caffè aggiornato')).catch(e => toast(errMsg(e), 'err'));
};

A['chiudi-periodo'] = async () => {
  const d = derived();
  if(st.sync !== 'ok') return toast('Serve la connessione per chiudere il periodo', 'err');
  const limite = Date.now() - CHIUSURA_MARGINE;
  if(st.movimenti.some(m => m.t <= limite && (m._local || !m._ts)) || Object.keys(st.pending).length) return toast('Attendi che tutti i movimenti siano sincronizzati', 'err');
  const incl = st.movimenti.filter(m => m.t <= limite);
  if(!incl.length) return toast('Nessun movimento da chiudere', 'err');
  if(incl.some(m => m.stato === 'attesa' && m.tipo !== 'scambio')) return toast('Prima conferma o rifiuta le richieste in attesa', 'err');

  const nCpA = incl.filter(m => m.tipo === 'compito' && m.stato === 'assegnato' && !d.stornati.has(m.id)).length;
  if(nCpA && !confirm(`Ci sono ${nCpA} ${nCpA === 1 ? 'incarico ancora da svolgere' : 'incarichi ancora da svolgere'} (Compiti di oggi).\n\nChiudendo il periodo ${nCpA === 1 ? 'verrà archiviato' : 'verranno archiviati'} e non sarà più possibile confermarlo.\n\nProseguire comunque?`)) return;
  const k = infoChiusura(d);
  if(k.last && (k.recente || k.pochi)){   // doppia conferma esplicita contro le chiusure ravvicinate
    const perche = k.recente ? `Il periodo è stato chiuso di recente da ${k.autore}, solo ${trascorso(k.ms)} fa (il ${dataOra(k.t)}).` : `Dopo l'ultima chiusura (${k.autore}, ${dataOra(k.t)}) ci sono solo ${k.nuovi} movimenti significativi.`;
    if(!confirm(`⚠️ ATTENZIONE\n\n${perche}\n\nVuoi davvero chiudere di nuovo il periodo?`)) return;
    if(!confirm(`Seconda conferma: chiudere ora il periodo con ${incl.length} movimenti?\n\nL'operazione non si annulla.`)) return;
  } else if(!confirm(`Chiudere il periodo con ${incl.length} movimenti?`)) return;
  st.busy = true; render();
  try {
    const prev = ultimaChiusura();
    const S = prev && prev.stato ? JSON.parse(JSON.stringify(prev.stato)) : emptyState();
    ['saldi','stock','turni','ultimo','punti','puntiConv','pcaf','pcafConv','pspesa','pbf','pRisc','quote','dovute'].forEach(k => S[k] = S[k] || {}); S.cassa = S.cassa || {contanti:0, revolut:0};
    if(prev && prev.stato && scalaDa() && !prev.sc) riscala(S);   // la chiusura precedente è in scala vecchia: si porta a ×10 prima di sommare
    const T = emptyStats();
    incl.forEach(m => { applyMov(S, m); applyStat(T, m); });
    let fino = incl[0]._ts;
    incl.forEach(m => { if(m._ts.seconds > fino.seconds || (m._ts.seconds === fino.seconds && m._ts.nanoseconds > fino.nanoseconds)) fino = m._ts; });
    const id = 'c' + fino.toMillis();
    const b = db.batch();
    const scF = scalaDa() ? {sc: 1} : {};
    const G = aggrega(incl);
    const riep = ({...scF, id, da: prev ? prev.fino.toMillis() : 0, fino: fino.toMillis(), n: incl.length, caffe: G.caffe, snack: G.snack, euro: G.euro, spese: G.spese, speseN: G.speseN, turni: G.turni, pPul: G.pPul, regDati: G.regDati, bfRic: G.bfRic, ptC: G.ptC, ptP: G.ptP, ptS: G.ptS, ptB: G.ptB, ptR: G.ptR, ptL: G.ptL, giri: G.giri, ser: serieSett(incl, prev ? prev.fino.toMillis() : 0), tot: G.tot});
    const storico = st.chiusure.map(riepDaChiusura).concat([riep]).sort((x, y) => x.fino - y.fino).slice(-STORICO_MAX);
    const bf = {}, stor = new Set(incl.filter(m => m.tipo === 'storno').map(m => m.rif)), lim = Date.now() - 40 * 864e5;
    if(prev && prev.bf) Object.keys(prev.bf).forEach(k => { bf[k] = (prev.bf[k] || []).slice(); });
    incl.filter(m => m.tipo === 'ben_fatto' && !stor.has(m.id)).forEach(m => { (bf[m.mid] = bf[m.mid] || []).push(m.t); });
    Object.keys(bf).forEach(k => { bf[k] = bf[k].filter(t => t >= lim).slice(-10); if(!bf[k].length) delete bf[k]; });   // ultimi invii di "Ben fatto": servono al gettone a cavallo di una chiusura
    const mp = {pcaf: S.pcaf, pcafConv: S.pcafConv, punti: S.punti, puntiConv: S.puntiConv, turni: S.turni, ultimo: S.ultimo, pspesa: S.pspesa, pbf: S.pbf, pRisc: S.pRisc, bf};
    b.set(C('chiusure').doc(id), {fino, da: prev ? prev.fino : firebase.firestore.Timestamp.fromMillis(0), stato: S, stats: T, riep, bf, ...scF, n: incl.length, uid: st.uid, daMid: st.mid || '', autore: myName(), ts: TS()});
    const arr = incl.map(compactMov);
    st.membri.forEach(m => {
      const q = {}, dv = {};
      for(const a in S.quote) if(S.quote[a][m.id]) q[a] = S.quote[a][m.id];
      for(const a in S.dovute) if(S.dovute[a][m.id]) dv[a] = S.dovute[a][m.id];
      b.set(C('estratti').doc(m.id), {saldo: S.saldi[m.id] || 0, pcaf: S.pcaf[m.id] || 0, pcafConv: S.pcafConv[m.id] || 0, mp, ...scF, storico, saldi: S.saldi, cassa: S.cassa, quote: q, dovute: dv, fino, chiusura: id});
    });
    for(let i = 0; i * ARCHIVIO_CHUNK < arr.length; i++) b.set(C('archivio').doc(id + '_' + i), {movimenti: arr.slice(i*ARCHIVIO_CHUNK, (i+1)*ARCHIVIO_CHUNK)});
    await b.commit();
    st.archivio = null;
    toast('Periodo chiuso: ' + incl.length + ' movimenti archiviati');
  } catch(e){ toast('Chiusura non riuscita (' + errMsg(e) + ')', 'err'); }
  finally { st.busy = false; render(); }
};


/* --- backup, ripristino, rendiconto (admin) --- */
const plain = s => { const e = document.createElement('textarea'); e.innerHTML = String(s == null ? '' : s); return e.value; };
function scaricaBlob(blob, nome){
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = nome;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
async function condividiBlob(blob, nome, titolo, testo, avviso){
  const f = new File([blob], nome, {type: blob.type});
  if(navigator.canShare && navigator.canShare({files: [f]})){
    try { await navigator.share({files: [f], title: titolo, text: testo}); return true; }
    catch(e){ if(e && e.name === 'AbortError') return false; }
  }
  scaricaBlob(blob, nome); toast(avviso || 'File scaricato'); return false;
}
async function costruisciBackup(){
  const arch = await C('archivio').get();
  const est = await C('estratti').get();
  const lista = await C('listaSpesa').get().catch(() => ({docs: []}));
  const d = derived();
  const ts = x => x && x.toMillis ? x.toMillis() : (x || null);
  return {
    app: 'Armieri 5.0', formato: 2, versione: VERSION, esportato: new Date().toISOString(), gruppo: {...st.gruppo, ...(sonoCreatore() ? {id: st.gid} : {})},
    membri: st.membri, prodotti: st.prodotti, eventi: st.eventi.map(e => ({...e, ts: ts(e.ts)})),
    chiusure: st.chiusure.map(c => ({...c, fino: ts(c.fino), da: ts(c.da) || 0, ts: ts(c.ts)})),
    archivio: arch.docs.map(x => ({id: x.id, ...x.data()})),
    estratti: est.docs.map(x => ({id: x.id, ...x.data(), fino: ts(x.data().fino)})),
    listaSpesa: lista.docs.map(x => { const v = x.data(); return {id: x.id, ...v, ts: ts(v.ts), acquistoTs: ts(v.acquistoTs)}; }),
    movimentiAperti: tuttiMov().map(compactMov),
    situazione: d.S,
    saldiLeggibili: st.membri.map(m => ({nome: m.nome, nick: m.nick || '', attivo: m.attivo !== false, saldo: (d.S.saldi[m.id] || 0) / 100}))
  };
}
A['backup'] = async () => {
  try {
    const blob = new Blob([JSON.stringify(await costruisciBackup(), null, 1)], {type: 'application/json'});
    scaricaBlob(blob, `armieri_backup_${oggiISO()}.json`);
    LS.set('backup_' + st.gid, Date.now()); render(); toast('Backup scaricato');
  } catch(e){ toast('Backup non riuscito (' + errMsg(e) + ')', 'err'); }
};
A['backup-invia'] = async () => {
  try {
    const blob = new Blob([JSON.stringify(await costruisciBackup(), null, 1)], {type: 'application/json'});
    await condividiBlob(blob, `armieri_backup_${oggiISO()}.json`, 'Backup Armieri 5.0', 'Backup Armieri 5.0 del ' + oggiISO(), 'Backup scaricato: salvalo su Drive o invialo a te stesso');
    LS.set('backup_' + st.gid, Date.now()); render();
  } catch(e){ toast('Backup non riuscito (' + errMsg(e) + ')', 'err'); }
};
const csvCella = v => { v = plain(v); return /[;"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
const csvRiga = r => r.map(csvCella).join(';');
const numIt = c => (c / 100).toFixed(2).replace('.', ',');
A['backup-csv'] = async () => {
  try {
    const b = await costruisciBackup();
    const d = derived();
    const righeS = [['Nome','Nickname','Stato','Saldo €']].concat(st.membri.map(m => [m.nome, m.nick || '', m.attivo === false ? (m.espulso ? 'espulso' : 'archiviato') : 'attivo', numIt(d.S.saldi[m.id] || 0)]));
    scaricaBlob(new Blob(['﻿' + righeS.map(csvRiga).join('\r\n')], {type: 'text/csv'}), `armieri_saldi_${oggiISO()}.csv`);
    const tutti = [];
    b.archivio.forEach(x => (x.movimenti || []).forEach(m => tutti.push(m)));
    b.movimentiAperti.forEach(m => tutti.push(m));
    tutti.sort((x, y) => (x.t || 0) - (y.t || 0));
    const righeM = [['Data','Tipo','Collega','Descrizione','Importo €','Autore']].concat(tutti.map(m => {
      const ds = descMov(m);
      return [m.t ? dataOra(m.t) : '', m.tipo + (m.stato === 'annullata' || m.stato === 'rifiutata' ? ' (' + m.stato + ')' : ''), m.mid ? nomeM(m.mid) : '', ds.t, numIt(m.importo || 0), m.autore || ''];
    }));
    setTimeout(() => scaricaBlob(new Blob(['﻿' + righeM.map(csvRiga).join('\r\n')], {type: 'text/csv'}), `armieri_movimenti_${oggiISO()}.csv`), 600);
    toast('Esporto saldi e movimenti (2 file CSV)');
  } catch(e){ toast('Esportazione non riuscita (' + errMsg(e) + ')', 'err'); }
};
A['ripristina-backup'] = () => { if(!sonoCreatore()) return toast('Il ripristino è riservato al Creatore', 'err'); const f = $('bk-file'); if(f){ f.value = ''; f.click(); } };
async function leggiBackup(file){
  let bk;
  try { bk = JSON.parse(await file.text()); } catch(e){ return toast('Il file non è un backup valido', 'err'); }
  if(!bk || !['Armieri 5.0', 'Armieri 5.0'].includes(bk.app) || !bk.situazione || !Array.isArray(bk.membri)) return toast('Il file non è un backup di Armieri 5.0', 'err');
  const d = derived(), piano = {membri: [], prodotti: [], rett: [], cassa: []};
  bk.membri.forEach(m => {
    const att = st.membri.find(x => x.id === m.id);
    if(!att) piano.membri.push(m);
    const target = (bk.situazione.saldi || {})[m.id] || 0, now = att ? (d.S.saldi[m.id] || 0) : 0;
    if(target !== now) piano.rett.push({mid: m.id, nome: m.nome, diff: target - now});
  });
  (bk.prodotti || []).forEach(p => { if(!prodotto(p.id)) piano.prodotti.push(p); });
  ['contanti', 'revolut'].forEach(k => {
    const diff = ((bk.situazione.cassa || {})[k] || 0) - (d.S.cassa[k] || 0);
    if(diff) piano.cassa.push({k, diff});
  });
  st.bkPiano = piano;
  const nulla = !piano.membri.length && !piano.prodotti.length && !piano.rett.length && !piano.cassa.length;
  openSheet(`<h3>${ic('download')} Ripristina da backup</h3><p class="sub">Backup del ${esc(dataOra(Date.parse(bk.esportato) || Date.now()))} · ${esc((bk.gruppo && bk.gruppo.nome) || '')}</p>
    ${nulla ? '<div class="empty">Saldi e cassa coincidono già con il backup. Non c\'è niente da ripristinare.</div>' : `
    <div class="card" style="margin:0 0 10px">
      <div class="between" style="font-size:13px;margin-bottom:6px"><span class="tx2">Colleghi mancanti da ricreare</span><b class="mono">${piano.membri.length}</b></div>
      <div class="between" style="font-size:13px;margin-bottom:6px"><span class="tx2">Articoli mancanti da ricreare</span><b class="mono">${piano.prodotti.length}</b></div>
      <div class="between" style="font-size:13px;margin-bottom:6px"><span class="tx2">Saldi da riallineare</span><b class="mono">${piano.rett.length}</b></div>
      <div class="between" style="font-size:13px"><span class="tx2">Cassa da riallineare</span><b class="mono">${piano.cassa.length ? piano.cassa.map(c => c.k + ' ' + eurS(c.diff)).join(', ') : '—'}</b></div>
    </div>
    ${piano.rett.length ? `<div class="list" style="max-height:160px;overflow:auto;margin-bottom:10px">${piano.rett.map(r => `<div class="li"><div class="grow"><div class="t">${esc(r.nome)}</div></div><b class="mono ${r.diff < 0 ? 'red' : 'green'}">${eurS(r.diff)}</b></div>`).join('')}</div>` : ''}
    ${infoBtn(`Il ripristino non cancella nulla: aggiunge rettifiche ed entrate/uscite di cassa con causale «Ripristino da backup» per riportare saldi e cassa ai valori del file. Lo storico dei movimenti resta quello attuale (il file JSON conserva l'originale).`, 'Come funziona')}
    <button class="btn amber block big" data-act="conferma-ripristino">Ripristina</button>`}`);
}
A['conferma-ripristino'] = async () => {
  const pi = st.bkPiano; if(!pi) return;
  if(st.sync !== 'ok') return toast('Serve la connessione', 'err');
  st.busy = true; closeSheet();
  try {
    for(const m of pi.membri){
      const dati = clean({nome: m.nome, nick: m.nick || undefined, attivo: m.attivo, espulso: m.espulso});
      await C('membri').doc(m.id).set(dati);
    }
    for(const x of pi.prodotti){ const {id, ...dati} = x; await C('prodotti').doc(id).set(clean(dati)); }
    pi.rett.forEach(r => addMov({tipo: 'rettifica', mid: r.mid, importo: r.diff, causale: 'Ripristino da backup'}));
    pi.cassa.forEach(c => addMov({tipo: c.diff > 0 ? 'entrata' : 'uscita', importo: Math.abs(c.diff), fonte: c.k, causale: 'Ripristino da backup'}));
    st.bkPiano = null; toast('Ripristino completato');
  } catch(e){ toast('Ripristino non riuscito (' + errMsg(e) + ')', 'err'); }
  finally { st.busy = false; render(); }
};

/* rendiconto condivisibile */
function datiRendiconto(){
  const d = derived(), per = st.statPeriodo;
  let T, label;
  if(per === 'corrente'){ T = d.T; label = 'Periodo aperto' + (ultimaChiusura() ? ' (dal ' + dataOra(ultimaChiusura().fino.toMillis()).slice(0,10) + ')' : ''); }
  else { const c = st.chiusure.find(x => x.id === per); T = (c && c.stats) || emptyStats(); label = c ? labelChiusura(c) : ''; }
  const c = d.S.cassa; let cred = 0, deb = 0;
  st.membri.forEach(m => { const s = d.S.saldi[m.id] || 0; if(s > 0) cred += s; else deb += s; });
  const attivi = membriAttivi(), a = anno();
  const pagate = attivi.filter(m => statoQuota(d, m.id, a) === 'pagata').length;
  const top = Object.entries(T.euroMid || {}).filter(([, v]) => v > 0).sort((x, y) => y[1] - x[1]).slice(0, 5).map(([mid, v]) => ({nome: nomeM(mid), v}));
  const saldi = st.membri.filter(m => m.attivo !== false).map(m => ({nome: nomeM(m.id), s: d.S.saldi[m.id] || 0})).sort((x, y) => y.s - x.s);
  return {gruppo: st.gruppo.nome || 'Saletta', label, oggi: dataOra(Date.now()).slice(0, 10), revolut: c.revolut || 0, contanti: c.contanti || 0, tot: (c.revolut || 0) + (c.contanti || 0),
    cred, deb, netto: (c.revolut || 0) + (c.contanti || 0) - cred - deb,
    caffe: Object.values(T.caffe || {}).reduce((x, y) => x + y, 0), snack: Object.values(T.snack || {}).reduce((x, y) => x + y, 0), consumi: Object.values(T.euroMid || {}).reduce((x, y) => x + y, 0),
    ricariche: T.ricariche || 0, spese: T.spese || 0, quota: st.gruppo.quotaAnnua || 0, anno: a, pagate, nAttivi: attivi.length, top, saldi};
}
function opzRd(){ return {top: !!($('rd-top') && $('rd-top').checked), saldi: !!($('rd-saldi') && $('rd-saldi').checked)}; }
function disegnaRendiconto(o){
  const D = datiRendiconto(), W = 1080, P = 56;
  const righe = [];
  const H = (txt) => righe.push({k: 'h', txt});
  const R = (l, v, col) => righe.push({k: 'r', l, v, col});
  H('Cassa del fondo');
  R('Conto Revolut', eur(D.revolut)); R('Contanti in sala', eur(D.contanti)); R('Totale in cassa', eur(D.tot), '#fbbf24');
  R('Crediti prepagati dei colleghi', eur(D.cred)); R('Debiti da incassare', eur(-D.deb), '#fb7185');
  R('Fondo netto', eur(D.netto), D.netto < 0 ? '#fb7185' : '#34d399');
  H('Attività · ' + D.label);
  R('Caffè serviti', String(D.caffe)); R('Snack presi', String(D.snack)); R('Consumi', eur(D.consumi));
  R('Ricariche', eur(D.ricariche), '#34d399'); R('Spese per il gruppo', eur(D.spese), '#fb7185');
  if(D.quota > 0){ H('Quota fondo ' + D.anno + ' (' + eur(D.quota) + ')'); R('Quote pagate', D.pagate + ' su ' + D.nAttivi); }
  if(o.top && D.top.length){ H('Chi ha consumato di più'); D.top.forEach(x => R(x.nome, eur(x.v))); }
  if(o.saldi && D.saldi.length){ H('Saldi dei colleghi'); D.saldi.forEach(x => R(x.nome, eurS(x.s), x.s < 0 ? '#fb7185' : '#34d399')); }
  const hh = 230, rh = 62, sh = 84;
  const Ht = hh + righe.reduce((s, r) => s + (r.k === 'h' ? sh : rh), 0) + 110;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = Ht;
  const g = cv.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, Ht); grad.addColorStop(0, '#171a24'); grad.addColorStop(1, '#0d0f16');
  g.fillStyle = grad; g.fillRect(0, 0, W, Ht);
  const F = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  g.textBaseline = 'alphabetic';
  g.fillStyle = '#f5a524'; g.font = `800 52px ${F}`; g.fillText('☕ ' + D.gruppo.slice(0, 26), P, 100);
  g.fillStyle = '#e8eaf0'; g.font = `600 32px ${F}`; g.fillText('Rendiconto del fondo · ' + D.oggi, P, 156);
  g.fillStyle = '#7b8194'; g.font = `500 26px ${F}`; g.fillText('Trasparenza sui conti della saletta', P, 198);
  let y = hh;
  righe.forEach(r => {
    if(r.k === 'h'){
      y += 54; g.fillStyle = '#f5a524'; g.font = `700 28px ${F}`; g.fillText(r.txt.toUpperCase().slice(0, 48), P, y);
      g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(P, y + 14, W - 2 * P, 2); y += 30;
    } else {
      y += rh; g.fillStyle = '#aab0c2'; g.font = `500 30px ${F}`; g.textAlign = 'left'; g.fillText(r.l.slice(0, 34), P, y - 18);
      g.fillStyle = r.col || '#e8eaf0'; g.font = `700 32px ui-monospace, Menlo, Consolas, monospace`; g.textAlign = 'right'; g.fillText(r.v, W - P, y - 18); g.textAlign = 'left';
    }
  });
  g.fillStyle = '#586079'; g.font = `500 22px ${F}`; g.fillText('Armieri 5.0 · dati aggiornati al ' + dataOra(Date.now()), P, Ht - 40);
  return cv;
}
function testoRendiconto(o){
  const D = datiRendiconto(), L = [];
  L.push(`☕ *${D.gruppo}* — Rendiconto del ${D.oggi}`, '', '*Cassa del fondo*', `Revolut: ${eur(D.revolut)}`, `Contanti: ${eur(D.contanti)}`, `Totale in cassa: *${eur(D.tot)}*`,
    `Crediti prepagati dei colleghi: ${eur(D.cred)}`, `Debiti da incassare: ${eur(-D.deb)}`, `Fondo netto: *${eur(D.netto)}*`, '', `*Attività · ${D.label}*`,
    `Caffè: ${D.caffe} · Snack: ${D.snack} · Consumi: ${eur(D.consumi)}`, `Ricariche: ${eur(D.ricariche)} · Spese: ${eur(D.spese)}`);
  if(D.quota > 0) L.push('', `*Quota fondo ${D.anno}* (${eur(D.quota)}): pagata da ${D.pagate} su ${D.nAttivi}`);
  if(o.top && D.top.length){ L.push('', '*Chi ha consumato di più*'); D.top.forEach((x, i) => L.push(`${i + 1}. ${x.nome} — ${eur(x.v)}`)); }
  if(o.saldi && D.saldi.length){ L.push('', '*Saldi dei colleghi*'); D.saldi.forEach(x => L.push(`${x.nome}: ${eurS(x.s)}`)); }
  return L.join('\n');
}
/* ---------- Archivio (solo chi gestisce): report dei periodi chiusi, dai documenti `chiusure` gia' in memoria (nessuna lettura in piu') ---------- */
const ARC_MAX = 30;
const sommaV = o => Object.values(o || {}).reduce((a, b) => a + (+b || 0), 0);
function datiArchivio(c){
  const rp = riepScala(riepDaChiusura(c)), T = c.stats || {}, S = c.stato || {}, cassa = S.cassa || {}, saldi = S.saldi || {}, tot = rp.tot || {};
  let cred = 0, deb = 0;
  st.membri.forEach(m => { const v = saldi[m.id] || 0; if(v > 0) cred += v; else deb += v; });
  const rc = (cassa.revolut || 0) + (cassa.contanti || 0);
  const top = Object.entries(rp.euro || {}).filter(([, v]) => v > 0).sort((x, y) => y[1] - x[1]).slice(0, 5).map(([mid, v]) => ({nome: nomeM(mid), v}));
  return {id: c.id, label: labelChiusura(c), gruppo: st.gruppo.nome || 'Saletta', n: c.n || 0, autore: c.autore || '', chiusoIl: c.ts && c.ts.toMillis ? dataOra(c.ts.toMillis()).slice(0, 10) : dataOra(c.fino.toMillis()).slice(0, 10),
    caffe: sommaV(rp.caffe), snack: rp.snack ? sommaV(rp.snack) : null, consumi: sommaV(rp.euro || T.euroMid),
    ricariche: tot.ric ?? T.ricariche ?? 0, spese: tot.speseTot ?? T.spese ?? 0, nSpese: rp.speseN ? sommaV(rp.speseN) : null,
    turni: rp.turni ? sommaV(rp.turni) : null, ptPul: rp.pPul ? sommaV(rp.pPul) : null,
    revolut: cassa.revolut || 0, contanti: cassa.contanti || 0, cassaTot: rc, cred, deb, netto: rc - cred - deb, top,
    saldi: st.membri.filter(m => m.attivo !== false).map(m => ({nome: nomeM(m.id), s: saldi[m.id] || 0})).sort((x, y) => y.s - x.s)};
}
function pArchivio(){
  if(!st.isAdmin) return '';
  const lista = st.chiusure.slice().reverse().slice(0, ARC_MAX), sel = st.arcSel && st.chiusure.find(x => x.id === st.arcSel);
  if(!st.chiusure.length) return `<div class="card" id="arc-vuoto"><div class="empty">Nessun periodo chiuso: l'archivio si riempie a ogni chiusura periodo.</div></div>`;
  if(!sel) return `<div class="card" id="arc-lista"><h3>${ic('archive','s')} Periodi chiusi</h3>
    <div class="list">${lista.map(c => `<button class="li" id="arc-${c.id}" style="width:100%;text-align:left" data-act="arc-apri" data-id="${c.id}"><div class="grow"><div class="t">${esc(labelChiusura(c))}</div><div class="d">${c.n || 0} movimenti${c.autore ? ' · chiuso da ' + esc(c.autore) : ''}</div></div><span class="mut">›</span></button>`).join('')}</div>
    ${st.chiusure.length > ARC_MAX ? `<p class="hint" style="margin:8px 0 0">Mostro gli ultimi ${ARC_MAX} periodi.</p>` : ''}</div>`;
  const D = datiArchivio(sel), nd = '<span class="mut">non disponibile</span>';
  return `<button class="btn link" style="padding:0;margin:0 0 8px" id="arc-indietro" data-act="arc-chiudi">‹ Tutti i periodi</button>
  <div class="card" id="arc-report"><h3>📦 Periodo ${esc(D.label)}</h3>
    <p class="hint" style="margin:0 0 8px">Chiuso il ${D.chiusoIl}${D.autore ? ' da ' + esc(D.autore) : ''} · ${D.n} movimenti</p>
    <b class="amber" style="font-size:12px;letter-spacing:.04em">CONSUMI</b>
    ${rigaTot('☕', 'Caffè serviti', D.caffe)}${rigaTot('🍫', 'Snack presi', D.snack == null ? nd : D.snack)}${rigaTot('💶', 'Consumi', eur(D.consumi))}
    <b class="amber" style="font-size:12px;letter-spacing:.04em;display:block;margin-top:10px">SPESE E RICARICHE</b>
    ${rigaTot('➕', 'Ricariche', eur(D.ricariche))}${rigaTot('🛒', 'Spese per il gruppo', eur(D.spese), D.nSpese ? D.nSpese + (D.nSpese === 1 ? ' spesa' : ' spese') : '')}
    <b class="amber" style="font-size:12px;letter-spacing:.04em;display:block;margin-top:10px">PULIZIE</b>
    ${rigaTot('🎯', 'Compiti svolti', D.turni == null ? nd : D.turni)}${D.ptPul == null ? '' : rigaTot('🎯', 'Punti compiti assegnati', D.ptPul)}
    <b class="amber" style="font-size:12px;letter-spacing:.04em;display:block;margin-top:10px">CASSA ALLA CHIUSURA</b>
    ${rigaTot('📱', 'Conto Revolut', eur(D.revolut))}${rigaTot('💵', 'Contanti in sala', eur(D.contanti))}${rigaTot('🏦', 'Totale in cassa', eur(D.cassaTot))}${rigaTot('🟢', 'Crediti dei colleghi', eur(D.cred))}${rigaTot('🔴', 'Debiti da incassare', eur(-D.deb))}${rigaTot('⚖️', 'Fondo netto', eur(D.netto))}
    ${D.top.length ? `<b class="amber" style="font-size:12px;letter-spacing:.04em;display:block;margin-top:10px">CHI HA CONSUMATO DI PIÙ</b>${D.top.map((x, i) => rigaTot(['🥇', '🥈', '🥉', '4°', '5°'][i], esc(x.nome), eur(x.v))).join('')}` : ''}
    <b class="amber" style="font-size:12px;letter-spacing:.04em;display:block;margin-top:10px">SALDI DEI COLLEGHI ALLA CHIUSURA</b>
    ${D.saldi.map(x => rigaTot('👤', esc(x.nome), eurS(x.s))).join('')}
  </div>
  <div class="card" id="arc-condividi"><h3>${ic('share','s')} Condividi report</h3>
    <label class="check"><input type="checkbox" id="ar-top" checked><b style="flex:1;font-size:14px">Chi ha consumato di più (primi 5)</b></label>
    <label class="check"><input type="checkbox" id="ar-saldi"><b style="flex:1;font-size:14px">Includi saldi dei colleghi (con i nomi)</b></label>
    <button class="btn amber block big" id="btn-arc-testo" data-act="arc-testo" style="margin-top:8px">📤 Condividi report</button>
    <button class="btn block" id="btn-arc-img" data-act="arc-img" style="margin-top:8px">🖼️ Condividi immagine PNG</button>
    <p class="hint" style="margin:8px 0 0">Il report resta privato: lo condividi solo tu. I saldi con i nomi compaiono solo se spunti la voce.</p>
  </div>`;
}
A['arc-apri'] = ds => { if(!st.isAdmin) return; st.arcSel = ds.id; render(); window.scrollTo(0, 0); };
A['arc-chiudi'] = () => { st.arcSel = null; render(); };
const opzAr = () => ({top: !!($('ar-top') && $('ar-top').checked), saldi: !!($('ar-saldi') && $('ar-saldi').checked)});
const chiusuraSel = () => st.isAdmin ? st.chiusure.find(x => x.id === st.arcSel) : null;
function testoArchivio(D, o){
  const L = [`☕ *${D.gruppo}* — Report periodo ${D.label}`, `Chiuso il ${D.chiusoIl} · ${D.n} movimenti`, '', '*Consumi*',
    `Caffè: ${D.caffe}${D.snack == null ? '' : ' · Snack: ' + D.snack} · Consumi: ${eur(D.consumi)}`, '', '*Spese e ricariche*', `Ricariche: ${eur(D.ricariche)} · Spese: ${eur(D.spese)}${D.nSpese ? ' (' + D.nSpese + ')' : ''}`];
  if(D.turni != null) L.push('', '*Pulizie*', `Compiti svolti: ${D.turni}${D.ptPul == null ? '' : ' · Punti: ' + D.ptPul}`);
  L.push('', '*Cassa alla chiusura*', `Revolut: ${eur(D.revolut)} · Contanti: ${eur(D.contanti)}`, `Totale in cassa: *${eur(D.cassaTot)}*`, `Crediti dei colleghi: ${eur(D.cred)} · Debiti: ${eur(-D.deb)}`, `Fondo netto: *${eur(D.netto)}*`);
  if(o.top && D.top.length){ L.push('', '*Chi ha consumato di più*'); D.top.forEach((x, i) => L.push(`${i + 1}. ${x.nome} — ${eur(x.v)}`)); }
  if(o.saldi && D.saldi.length){ L.push('', '*Saldi dei colleghi*'); D.saldi.forEach(x => L.push(`${x.nome}: ${eurS(x.s)}`)); }
  return L.join('\n');
}
function disegnaArchivio(D, o){
  const W = 1080, P = 56, righe = [], H = t => righe.push({k: 'h', t}), R = (l, v, col) => righe.push({k: 'r', l, v, col});
  H('Consumi'); R('Caffè serviti', String(D.caffe)); if(D.snack != null) R('Snack presi', String(D.snack)); R('Consumi', eur(D.consumi));
  H('Spese e ricariche'); R('Ricariche', eur(D.ricariche), '#34d399'); R('Spese per il gruppo', eur(D.spese), '#fb7185');
  if(D.turni != null){ H('Pulizie'); R('Compiti svolti', String(D.turni)); if(D.ptPul != null) R('Punti assegnati', String(D.ptPul)); }
  H('Cassa alla chiusura'); R('Conto Revolut', eur(D.revolut)); R('Contanti in sala', eur(D.contanti)); R('Totale in cassa', eur(D.cassaTot), '#fbbf24'); R('Crediti dei colleghi', eur(D.cred)); R('Debiti da incassare', eur(-D.deb), '#fb7185'); R('Fondo netto', eur(D.netto), D.netto < 0 ? '#fb7185' : '#34d399');
  if(o.top && D.top.length){ H('Chi ha consumato di più'); D.top.forEach(x => R(x.nome, eur(x.v))); }
  if(o.saldi && D.saldi.length){ H('Saldi dei colleghi'); D.saldi.slice(0, 30).forEach(x => R(x.nome, eurS(x.s), x.s < 0 ? '#fb7185' : '#34d399')); }
  const hh = 230, rh = 62, sh = 84, Ht = hh + righe.reduce((a, r) => a + (r.k === 'h' ? sh : rh), 0) + 110;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = Ht;
  const g = cv.getContext('2d'), grad = g.createLinearGradient(0, 0, 0, Ht); grad.addColorStop(0, '#171a24'); grad.addColorStop(1, '#0d0f16');
  g.fillStyle = grad; g.fillRect(0, 0, W, Ht);
  const F = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'; g.textBaseline = 'alphabetic';
  g.fillStyle = '#f5a524'; g.font = `800 52px ${F}`; g.fillText('☕ ' + D.gruppo.slice(0, 26), P, 100);
  g.fillStyle = '#e8eaf0'; g.font = `600 32px ${F}`; g.fillText('Report periodo ' + D.label, P, 156);
  g.fillStyle = '#7b8194'; g.font = `500 26px ${F}`; g.fillText(`Chiuso il ${D.chiusoIl} · ${D.n} movimenti`, P, 198);
  let y = hh;
  righe.forEach(r => {
    if(r.k === 'h'){ y += 54; g.fillStyle = '#f5a524'; g.font = `700 28px ${F}`; g.fillText(r.t.toUpperCase().slice(0, 48), P, y); g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(P, y + 14, W - 2 * P, 2); y += 30; }
    else { y += rh; g.fillStyle = '#aab0c2'; g.font = `500 30px ${F}`; g.textAlign = 'left'; g.fillText(r.l.slice(0, 34), P, y - 18); g.fillStyle = r.col || '#e8eaf0'; g.font = `700 32px ui-monospace, Menlo, Consolas, monospace`; g.textAlign = 'right'; g.fillText(r.v, W - P, y - 18); g.textAlign = 'left'; }
  });
  g.fillStyle = '#586079'; g.font = `500 22px ${F}`; g.fillText('Armieri 5.0 · generato il ' + dataOra(Date.now()), P, Ht - 40);
  return cv;
}
A['arc-testo'] = () => {
  const c = chiusuraSel(); if(!c) return;
  const testo = testoArchivio(datiArchivio(c), opzAr());
  if(navigator.share && /Android|iPhone|iPad/i.test(navigator.userAgent)) navigator.share({title: 'Report periodo', text: testo}).catch(() => {});
  else window.open('https://wa.me/?text=' + encodeURIComponent(testo), '_blank');
};
A['arc-img'] = async () => {
  const c = chiusuraSel(); if(!c) return;
  const D = datiArchivio(c), cv = disegnaArchivio(D, opzAr());
  const blob = await new Promise(res => cv.toBlob(res, 'image/png'));
  if(!blob) return toast('Impossibile creare l\'immagine', 'err');
  await condividiBlob(blob, `report_${D.id}.png`, 'Report periodo ' + D.label, `☕ ${D.gruppo} — Report periodo ${D.label}`, 'Immagine scaricata: allegala al messaggio');
};
function aggiornaAnteprimaRd(){ const img = $('rd-img'); if(img) img.src = disegnaRendiconto(opzRd()).toDataURL('image/png'); }
A['rendiconto'] = () => {
  openSheet(`<h3>${ic('share')} Condividi rendiconto ${infoBtn(`Immagine con i numeri chiave del fondo, da mandare ai colleghi per trasparenza.`)}</h3>
    <label class="check"><input type="checkbox" id="rd-top" data-chg="rd-opz" checked><b style="flex:1;font-size:14px">Chi ha consumato di più (primi 5)</b></label>
    <label class="check"><input type="checkbox" id="rd-saldi" data-chg="rd-opz"><b style="flex:1;font-size:14px">Saldi di ogni collega (con i nomi)</b></label>
    <img id="rd-img" alt="Anteprima rendiconto" style="width:100%;border-radius:12px;margin:10px 0;border:1px solid var(--line)">
    <button class="btn amber block big" data-act="rd-img">${ic('share','s')} Condividi immagine</button>
    <div class="grid2" style="margin-top:8px"><button class="btn green" data-act="rd-wa">WhatsApp (testo)</button><button class="btn" data-act="rd-png">${ic('download','s')} Scarica PNG</button></div>
    ${infoBtn(`Il testo e l'immagine mostrano i saldi con i nomi solo se spunti la voce qui sopra.`, 'Come funziona')}`);
  aggiornaAnteprimaRd();
};
const rdBlob = () => new Promise(r => disegnaRendiconto(opzRd()).toBlob(r, 'image/png'));
A['rd-img'] = async () => {
  const b = await rdBlob();
  await condividiBlob(b, `rendiconto_${oggiISO()}.png`, 'Rendiconto ' + (st.gruppo.nome || 'saletta'), testoRendiconto(opzRd()), 'Immagine scaricata: allegala al messaggio WhatsApp');
};
A['rd-png'] = async () => { scaricaBlob(await rdBlob(), `rendiconto_${oggiISO()}.png`); toast('Immagine scaricata'); };
A['rd-wa'] = () => {
  const testo = testoRendiconto(opzRd());
  if(navigator.share && /Android|iPhone|iPad/i.test(navigator.userAgent)) navigator.share({title: 'Rendiconto', text: testo}).catch(() => {});
  else window.open('https://wa.me/?text=' + encodeURIComponent(testo), '_blank');
};

/* --- impostazioni --- */
A['copia'] = ds => { if(ds.v && st.gid && String(ds.v).indexOf(st.gid) >= 0 && !sonoCreatore()) return; (navigator.clipboard ? navigator.clipboard.writeText(ds.v) : Promise.reject()).then(() => toast('Copiato')).catch(() => toast('Copia non riuscita: tieni premuto sul codice', 'err')); };
A['copia-link'] = () => {
  if(!sonoCreatore() || !st.gid) return;
  const link = location.origin + location.pathname + '#g=' + st.gid;
  (navigator.clipboard ? navigator.clipboard.writeText(link) : Promise.reject()).then(() => toast('Link di accesso copiato: incollalo su WhatsApp')).catch(() => toast('Copia non riuscita: usa «Invia link»', 'err'));
};
A['condividi'] = ds => {
  if(!sonoCreatore()) return;
  const testo = `Entra nella saletta "${st.gruppo.nome}" su Armieri 5.0: ${ds.v}\nCodice: ${st.gid}`;
  if(navigator.share) navigator.share({title: 'Armieri 5.0', text: testo}).catch(() => {});
  else window.open('https://wa.me/?text=' + encodeURIComponent(testo), '_blank');
};

