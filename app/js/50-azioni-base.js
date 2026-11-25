'use strict';
/* --- condivisione dell'app (solo il link, senza codice gruppo) e installazione --- */
A['condividi-app'] = async () => {
  A['drawer-close']();
  if(!sonoCreatore()) return;
  const url = appUrl();
  if(navigator.share){
    try { await navigator.share({title: 'Armieri 5.0', url}); return; }
    catch(e){ if(e && e.name === 'AbortError') return; }
  }
  try { await navigator.clipboard.writeText(url); toast('Link dell\'app copiato'); }
  catch(e){ window.open('https://wa.me/?text=' + encodeURIComponent(url), '_blank'); }
};
A['install-app'] = async () => {
  const p = installPrompt; if(!p) return;
  installPrompt = null;
  try {
    p.prompt();
    const r = await p.userChoice;
    if(r && r.outcome === 'accepted'){ st.installata = true; toast('Installazione avviata'); }
  } catch(e){}
  render();
};
A['install-salta'] = () => {
  if(!confirm('Continuare nel browser? Se installerai l\'app più tardi, l\'app installata non conoscerà la tua registrazione e dovrai registrarti di nuovo.')) return;
  st.skipInstall = true; render();
};

async function joinVerifica(code){
  st.entry = 'join'; st.busy = true; render();
  try {
    const sn = await db.collection('saletta').doc(code).get({source:'server'});
    if(!sn.exists){ toast('Codice non trovato', 'err'); LS.set('invito', code); return; }
    st.joinCode = code; st.joinNome = sn.data().nome || ''; st.entry = 'creatore'; LS.del('invito');
    if(st.authAnon === false) A['join-collega']();   // account già collegato: si entra subito (se il profilo è suo, nessun PIN)
  } catch(e){ toast('Impossibile verificare il codice (' + errMsg(e) + ')', 'err'); }
  finally { st.busy = false; render(); }
}
A['join'] = () => {
  const code = normCode(val('j-code'));
  if(!code) return toast('Il codice ha 12 caratteri, es. ABCD-EFGH-JKLM', 'err');
  joinVerifica(code);
};

A['join-collega'] = () => { const code = st.joinCode; if(!code) return; st.gid = code; LS.set('gid', code); LS.del('invito'); st.entry = null; st.joinCode = null; connect(code); render(); };
A['invia-richiesta'] = async () => {
  const nome = val('r-nome').replace(/\s+/g, ' '), nick = val('r-nick');
  if(!validaNome(nome)) return toast('Scrivi nome e cognome (almeno 2 caratteri)', 'err');
  if(!validaNick(nick)) return toast('Nickname troppo lungo (max 20)', 'err');
  st.busy = true; render();
  try { await C('richieste').doc(st.uid).set(clean({nome, nick: nick || undefined, stato: 'attesa', ts: TS()})); toast('Richiesta inviata'); }
  catch(e){ toast('Invio non riuscito (' + errMsg(e) + ')', 'err'); }
  finally { st.busy = false; render(); }
};
A['richiesta-modifica'] = () => { st.richiesta = {...st.richiesta, stato: 'modifica'}; render(); };
A['richiesta-ritira'] = () => { if(!confirm('Ritirare la richiesta di accesso?')) return; C('richieste').doc(st.uid).delete().catch(e => toast(errMsg(e), 'err')); };
A['nick'] = () => {
  const m = membro(st.mid);
  openSheet(`<h3>${ic('user')} Il tuo nickname</h3><p class="sub">Il nome <b>${esc(m.nome)}</b> è stato registrato dal Supervisor e non si può cambiare.</p>
    <label class="f"><span>Nickname</span><input class="in" id="nk" maxlength="20" value="${esc(m.nick || '')}" placeholder="facoltativo" autofocus></label>
    <button class="btn amber block big" data-act="salva-nick">Salva</button>`);
};
A['salva-nick'] = () => {
  const nick = val('nk'); if(!validaNick(nick)) return toast('Massimo 20 caratteri', 'err');
  C('membri').doc(st.mid).update({nick}).then(() => toast('Nickname aggiornato')).catch(e => toast(errMsg(e), 'err'));
  closeSheet();
};
A['approva'] = ds => {
  const r = st.richieste.find(x => x.id === ds.id); if(!r) return;
  const liberi = membriAttivi().filter(m => !m.uid || !st.utenti.some(u => u.id === m.uid));
  const simile = liberi.find(m => m.nome.toLowerCase().trim() === r.nome.toLowerCase().trim());
  openSheet(`<h3>${ic('user')} Approva ${esc(r.nome)}</h3><p class="sub">${r.nick ? 'Nickname “' + esc(r.nick) + '” · ' : ''}richiesta ${quando(r.ts && r.ts.toMillis ? r.ts.toMillis() : 0)}</p>
    <label class="f"><span>Registra come</span><select class="in" id="ap-m">
      <option value="">➕ Nuovo collega: ${esc(r.nome)}</option>
      ${st.membri.map(m => `<option value="${m.id}" ${simile && simile.id === m.id ? 'selected' : ''}>Collega esistente: ${esc(m.nome)}</option>`).join('')}
    </select></label>
    ${infoBtn(`Scegli un collega esistente se ha cambiato telefono o se l'avevi già aggiunto tu: mantiene saldo e storico.`, 'Come funziona')}
    ${st.gruppo.quotaAnnua > 0 ? `<label class="check"><input type="checkbox" id="ap-quota"><b style="flex:1;font-size:14px">Ha già pagato la quota ${anno()}</b><span class="mut mono" style="font-size:12px">${eur(st.gruppo.quotaAnnua)}</span></label>
    ${infoBtn(`Se spunti, la quota risulta pagata. Altrimenti il collega vedrà l'avviso «Quota non ancora saldata». Il saldo parte comunque da zero.`, 'Come funziona')}` : ''}
    <div class="grid2"><button class="btn red" data-act="rifiuta-accesso" data-id="${r.id}">Rifiuta</button><button class="btn green" data-act="conferma-approva" data-id="${r.id}">Approva</button></div>`);
};
A['conferma-approva'] = ds => {
  const r = st.richieste.find(x => x.id === ds.id); if(!r) return closeSheet();
  const esistente = val('ap-m');
  const b = db.batch();
  const mref = esistente ? C('membri').doc(esistente) : C('membri').doc();
  if(esistente) b.set(mref, clean({uid: r.id, nick: r.nick || undefined, attivo: true}), {merge: true});
  else b.set(mref, clean({nome: r.nome, nick: r.nick || undefined, uid: r.id, attivo: true, creato: TS()}));
  b.set(C('utenti').doc(r.id), {mid: mref.id, nome: esistente ? (membro(esistente) || {}).nome || r.nome : r.nome, ts: TS()});
  b.set(C('richieste').doc(r.id), {stato: 'approvata', mid: mref.id, esitoDa: myName(), esitoTs: TS()}, {merge: true});
  if($('ap-quota') && $('ap-quota').checked && statoQuota(derived(), mref.id, anno()) !== 'pagata')
    addMov({tipo:'quota', mid: mref.id, anno: anno(), metodo: 'esterno', importo: st.gruppo.quotaAnnua, cred: false});
  b.commit().then(() => toast(`${r.nome} è nel gruppo`)).catch(e => toast('Non riuscito (' + errMsg(e) + ')', 'err'));
  closeSheet();
};
A['rifiuta-accesso'] = ds => {
  C('richieste').doc(ds.id).set({stato: 'rifiutata', esitoDa: myName(), esitoTs: TS()}, {merge: true}).then(() => toast('Richiesta rifiutata')).catch(e => toast(errMsg(e), 'err'));
  closeSheet();
};
A['gioco-tutti'] = ds => { const g = giocoSt(); cercaFiltra('gm-lista', membriAttivi()).forEach(m => { if(ds.v === '1') g.sel[m.id] = true; else delete g.sel[m.id]; }); render(); };
A['gioco-toggle'] = ds => { const g = giocoSt(); g.sel[ds.id] = !g.sel[ds.id]; render(); };
A['gioco-reset'] = () => { st.gioco = null; render(); };
function giocoAvvia(g){
  g.ord = Object.keys(g.sel).filter(k => g.sel[k] && membro(k)); for(let k = g.ord.length - 1; k > 0; k--){ const j = Math.floor(Math.random() * (k + 1)); [g.ord[k], g.ord[j]] = [g.ord[j], g.ord[k]]; }
  g.fase = 'play'; g.i = 0; g.lo = g.min; g.hi = g.max; g.dlo = g.min; g.dhi = g.max; g.secret = g.min + Math.floor(Math.random() * (g.max - g.min + 1)); g.ultimo = null; g.storia = []; g.perde = null;
}
A['gioco-start'] = () => {
  const g = giocoSt(), mn = 1, mx = parseInt(val('gm-max'), 10);
  if(![100, 500, 1000].includes(mx)) return toast('Scegli il numero massimo', 'err');
  if(Object.keys(g.sel).filter(k => g.sel[k]).length < 2) return toast('Servono almeno 2 giocatori', 'err');
  g.min = mn; g.max = mx; giocoAvvia(g); render();
};
/* dopo la partita: proposta della Ruota del Barista (tutto in memoria, nessuna lettura/scrittura) */
function giocoChiediRuota(){
  openSheet(`<h3>☕ Chi fa i caffè?</h3><p class="sub">Vuoi scegliere anche chi fa i caffè con la <b>Ruota del Barista</b>?</p>
    <div class="grid2"><button class="btn ghost" id="gr-no" data-act="sheet-close">No, grazie</button><button class="btn amber" id="gr-si" data-act="gioco-ruota-si">Sì, scegliamo!</button></div>`);
}
A['gioco-ruota'] = () => giocoChiediRuota();
A['gioco-ruota-si'] = () => {
  closeSheet(); ruotaReset(); A['go']({p: 'ruota'});
  setTimeout(() => { if(st.page === 'ruota' && !ruotaSt().gira) A['ruota-gira'](); }, 500);
};
A['gioco-ancora'] = () => { const g = giocoSt(); giocoAvvia(g); render(); };
A['gioco-prova'] = () => {
  const g = giocoSt(), n = parseInt(val('gm-n'), 10);
  if(!Number.isInteger(n) || n < g.lo || n > g.hi) return toast(`Scrivi un numero tra ${g.lo} e ${g.hi}${g.dlo > g.min || g.dhi < g.max ? ' (gli estremi sono già stati provati)' : ''}`, 'err');
  const mid = g.ord[g.i];
  const inp = $('gm-n'); if(inp) inp.value = '';   // pronto per il giocatore dopo: campo vuoto e tastiera ancora su
  const rifocus = () => requestAnimationFrame(() => requestAnimationFrame(() => { const x = $('gm-n'); if(x) x.focus(); }));
  if(n === g.secret){ g.storia.push({mid, n, dir: 'ok'}); g.perde = mid; g.fase = 'fine'; try { navigator.vibrate && navigator.vibrate([120, 60, 120, 60, 300]); } catch(e){} render(); setTimeout(() => { if(st.gioco === g && g.fase === 'fine' && st.page === 'gioco') giocoChiediRuota(); }, 900); return; }
  const dir = n < g.secret ? 'su' : 'giu';
  if(dir === 'su'){ g.lo = n + 1; g.dlo = n; } else { g.hi = n - 1; g.dhi = n; }
  g.ultimo = {mid, n, dir}; g.storia.push({mid, n, dir}); g.i = (g.i + 1) % g.ord.length; render(); rifocus();
};

A['elimina-gruppo'] = () => {
  if(!st.gruppo) return;
  openSheet(`<h3 style="color:var(--red)">${ic('trash')} Elimina il gruppo</h3>
    <p class="sub">Verranno cancellati <b>definitivamente</b> per tutti i colleghi: movimenti, saldi, cassa, inventario, quote, eventi e anagrafica. Non si può annullare.</p>
    <label class="f"><span>Per confermare scrivi il nome del gruppo: <b>${esc(st.gruppo.nome)}</b></span><input class="in" id="eg-nome" autocomplete="off"></label>
    <button class="btn block big" data-act="conferma-elimina-gruppo" style="background:var(--red);border-color:var(--red);color:#fff">Elimina per sempre</button>`);
};
A['conferma-elimina-gruppo'] = async () => {
  const g0 = st.gruppo; if(!g0 || st.busy) return;
  if(val('eg-nome').trim() !== g0.nome) return toast('Il nome non corrisponde', 'err');
  if(!navigator.onLine) return toast('Serve la connessione per eliminare il gruppo', 'err');
  const gid = st.gid, g = db.collection('saletta').doc(gid), me = st.uid;
  st.busy = true; closeSheet(); toast('Eliminazione in corso…');
  try {
    // 1) leggo tutto finché le regole mi riconoscono; l'ordine di cancellazione tiene per ultimi amministratori e collegamenti telefono
    const cols = ['movimenti','buste','riscatti','acquisti','eventi','chiusure','archivio','estratti','prodotti','listaSpesa','membri','richieste','richiesteAdmin','bloccati','admin','utenti'];
    const snaps = await Promise.all(cols.map(n => g.collection(n).get()));
    const ownUtente = g.collection('utenti').doc(me);
    const refs = [g.collection('segreti').doc('pin')];
    snaps[cols.indexOf('membri')].docs.forEach(d => refs.push(g.collection('segretiMembri').doc(d.id)));
    cols.forEach((n, i) => snaps[i].docs.forEach(d => { if(!(n === 'utenti' && d.id === me)) refs.push(d.ref); }));
    disconnect();
    for(let i = 0; i < refs.length; i += 400){
      const b = db.batch(); refs.slice(i, i + 400).forEach(r => b.delete(r)); await b.commit();
    }
    await g.delete();
    await ownUtente.delete().catch(() => {});
    st.gid = null; st.mid = null; st.entry = null; LS.del('gid'); LS.del('mid'); LS.del('page'); LS.del('ultimoGruppo');
    toast('Gruppo eliminato');
  } catch(e){ toast('Eliminazione non riuscita (' + errMsg(e) + '). Riprova: i dati già cancellati non tornano.', 'err'); }
  finally { st.busy = false; render(); }
};
A['esci-gruppo'] = force => {
  if(force !== true && st.isAdmin && st.gid){
    const unico = st.admins.length <= 1;
    const cre = sonoCreatore();
    const msg = cre ? 'ATTENZIONE: sei il Creatore del gruppo. Per rientrare servono il codice del gruppo e il tuo PIN personale.\n\nCodice: ' + st.gid + '\n\nPremi OK per copiare il codice e uscire, Annulla per restare.'
      : 'Uscire dal gruppo su questo telefono? Su questo telefono basterà il tuo PIN personale per rientrare; da un altro telefono servirà il codice, che ti dà il Creatore.';
    if(!confirm(msg)) return;
    if(cre){ try { navigator.clipboard && navigator.clipboard.writeText(st.gid); } catch(e){} }
  } else if(force !== true && !confirm('Uscire dal gruppo su questo telefono? Potrai rientrare con il codice.')) return;
  if(force === true) LS.del('ultimoGruppo'); else if(st.gid) LS.set('ultimoGruppo', {gid: st.gid, nome: (st.gruppo && st.gruppo.nome) || ''});   // l'ultimo codice resta sul telefono
  disconnect(); st.gid = null; st.mid = null; st.entry = null; st.autoUlt = false; LS.del('gid'); LS.del('mid'); render();
};

/* ---------- account di accesso: collegamento Google / email sulla sessione anonima (l'UID non cambia) ---------- */
const nuovoGoogle = () => { const p = new firebase.auth.GoogleAuthProvider(); p.setCustomParameters({prompt: 'select_account'}); return p; };
const pwv = id => { const e = $(id); return e ? e.value : ''; };   // le password non si tagliano
/* dopo il collegamento: nuovo token (le regole vedono il nuovo provider) e controllo che l'UID sia rimasto lo stesso */
async function dopoCollegamento(u, uidPrima){
  await u.getIdToken(true);
  authInfo(u);
  if(u.uid !== uidPrima) console.error('UID cambiato dopo il collegamento', uidPrima, u.uid);
}
async function collegaEmail(mail, pw, el){
  if(!/^\S+@\S+\.\S+$/.test(mail)) return toast(AUTH_ERR['auth/invalid-email'], 'err');
  if(pw.length < 6) return toast(AUTH_ERR['auth/weak-password'], 'err');
  const u = firebase.auth().currentUser;
  if(!u || !u.isAnonymous) return toast('Hai già un account collegato', 'err');
  const prima = u.uid; if(el) el.disabled = true;
  try { await u.linkWithCredential(firebase.auth.EmailAuthProvider.credential(mail, pw)); await dopoCollegamento(u, prima); closeSheet(); toast('Email collegata'); render(); }
  catch(e){ toast(authErr(e), 'err'); if(el) el.disabled = false; }
}
/* dal Profilo: collega l'account al profilo già in uso (mai cambio di account: se è già di un altro profilo, errore) */
A['collega-google'] = async () => {
  const u = firebase.auth().currentUser;
  if(!u || !u.isAnonymous) return toast('Hai già un account collegato', 'err');
  const prima = u.uid;
  try { await u.linkWithPopup(nuovoGoogle()); await dopoCollegamento(u, prima); toast('Account Google collegato'); render(); }   // la finestra si apre subito dentro il tocco: così non viene bloccata
  catch(e){ toast(authErr(e), 'err'); }
};
A['collega-email-apri'] = () => openSheet(`<h3>${ic('lock')} Collega email e password</h3><p class="sub">Il tuo profilo resta lo stesso: saldo, crediti e punti non cambiano.</p>
  <label class="f"><span>Email</span><input class="in" id="ac-mail" type="email" autocomplete="email" autocapitalize="off" autofocus></label>
  <label class="f"><span>Password (almeno 6 caratteri)</span><input class="in" id="ac-pw" type="password" autocomplete="new-password"></label>
  <label class="f"><span>Ripeti la password</span><input class="in" id="ac-pw2" type="password" autocomplete="new-password"></label>
  <button class="btn amber block big" data-act="collega-email">Collega</button>`);
A['collega-email'] = (ds, el) => {
  if(pwv('ac-pw') !== pwv('ac-pw2')) return toast('Le due password non coincidono', 'err');
  return collegaEmail(val('ac-mail'), pwv('ac-pw'), el);
};
A['reset-password'] = async () => {
  const mail = val('ac-mail') || st.authEmail;
  if(!mail) return toast('Scrivi prima la tua email', 'err');
  try { await firebase.auth().sendPasswordResetEmail(mail); toast('Email inviata a ' + mail + ' (controlla anche lo spam)'); }
  catch(e){ toast(authErr(e), 'err'); }
};
/* dalle schermate di ingresso (chi non è ancora nel gruppo): accedere a un account già collegato, oppure crearne uno nuovo */
A['accedi-apri'] = () => openSheet(`<h3>${ic('user')} Ho già un account</h3><p class="sub">Entra con l'account collegato al tuo profilo, oppure creane uno nuovo.</p>
  <button class="btn block big" id="btn-accedi-google" data-act="accedi-google">Continua con Google</button>
  <p class="hint" style="text-align:center;margin:10px 0">oppure con email e password</p>
  <label class="f"><span>Email</span><input class="in" id="ac-mail" type="email" autocomplete="email" autocapitalize="off"></label>
  <label class="f"><span>Password</span><input class="in" id="ac-pw" type="password" autocomplete="current-password"></label>
  <div class="grid2"><button class="btn amber" id="btn-accedi-email" data-act="accedi-email">Accedi</button><button class="btn" id="btn-crea-account" data-act="crea-account">Crea account</button></div>
  <button class="btn link" data-act="reset-password" style="margin-top:6px">Password dimenticata?</button>`);
A['accedi-google'] = async () => {
  const u = firebase.auth().currentUser;
  if(!u || !u.isAnonymous || st.mid) return toast('Sei già dentro: usa il Profilo', 'err');
  const prima = u.uid;
  try { await u.linkWithPopup(nuovoGoogle()); await dopoCollegamento(u, prima); closeSheet(); toast('Account Google collegato'); render(); }
  catch(e){
    if(e && e.code === 'auth/credential-already-in-use' && e.credential){   // account già usato: qui (nessun profilo da perdere) si passa a quello
      try { await firebase.auth().signInWithCredential(e.credential); closeSheet(); toast('Accesso eseguito'); } catch(e2){ toast(authErr(e2), 'err'); }
    } else toast(authErr(e), 'err');
  }
};
A['accedi-email'] = async (ds, el) => {
  const mail = val('ac-mail'), pw = pwv('ac-pw');
  if(!mail || !pw) return toast('Scrivi email e password', 'err');
  if(st.mid) return toast('Sei già dentro: usa il Profilo', 'err');
  el.disabled = true;
  try { await firebase.auth().signInWithEmailAndPassword(mail, pw); closeSheet(); toast('Accesso eseguito'); }
  catch(e){ toast(authErr(e), 'err'); el.disabled = false; }
};
A['crea-account'] = (ds, el) => { if(st.mid) return toast('Sei già dentro: usa il Profilo', 'err'); return collegaEmail(val('ac-mail'), pwv('ac-pw'), el); };
A['account-nascondi'] = () => { LS.set('accNasc', oggiISO()); render(); };
A['account-vai'] = () => {
  A['go']({p: 'impostazioni'});
  setTimeout(() => { const el = $('card-account'); if(el){ el.scrollIntoView({block: 'center', behavior: 'smooth'}); el.classList.add('qs-flash'); setTimeout(() => el.classList.remove('qs-flash'), 1800); } }, 160);
};
A['account-esci'] = async () => {
  if(st.mid) return;
  if(!confirm('Uscire da questo account su questo telefono?')) return;
  try { disconnect(); st.uid = null; await firebase.auth().signOut(); render(); }
  catch(e){ toast(authErr(e), 'err'); }
};

/* --- bar --- */
const caffeBtn = () => { const q = st.caffeQta, pc = st.gruppo.prezzoCaffe || 0; return `${ic('check')} ${q > 1 ? `Offri un giro di ${q} caffè (${eur(pc*q)})` : `Registra 1 caffè (${eur(pc)})`}`; };
A['caffe-menu'] = () => {
  if(maxCaffe() < 1) return toast(MSG_CREDITO, 'err');
  st.caffeQta = 1;
  openSheet(`<h3>${ic('coffee')} Acquista caffè</h3><p class="sub">Prezzo unitario <b class="amber">${eur(st.gruppo.prezzoCaffe || 0)}</b>. Quanti ne prendi? <span class="mut">(max ${maxCaffe()} col tuo credito)</span></p>
    <div class="qty"><button data-act="cq" data-v="-1">−</button><span class="mono" id="cq-n">1</span><button data-act="cq" data-v="1">+</button></div>
    <button class="btn block big amber" id="cq-btn" data-act="caffe">${caffeBtn()}</button>`);
};
A['cq'] = ds => { st.caffeQta = Math.min(Math.max(1, maxCaffe()), Math.max(1, st.caffeQta + Number(ds.v))); $('cq-n').textContent = st.caffeQta; const b = $('cq-btn'); b.innerHTML = caffeBtn(); b.className = 'btn block big ' + (st.caffeQta > 1 ? 'giro' : 'amber'); };
let lastTap = 0;
A['caffe'] = () => {
  if(Date.now() - lastTap < 900) return; lastTap = Date.now();
  const q = st.caffeQta, pc = st.gruppo.prezzoCaffe;
  if(!puoPagare(pc * q)){ closeSheet(); return toast(MSG_CREDITO, 'err'); }
  const id = addMov({tipo:'caffe', mid: st.mid, qta: q, importo: pc * q, pt: ptCaffeE() * q});
  st.caffeQta = 1; closeSheet(); render();
  toast(q > 1 ? `Giro di ${q} caffè registrato (−${eur(pc*q)})` : `Caffè registrato (−${eur(pc)})`, '', {label:'Annulla', fn: () => annullaConsumo(id)});
};
function annullaConsumo(id){
  const mv = derived().movs.find(x => x.id === id);
  C('movimenti').doc(id).update({stato:'annullata'}).then(() => { toast('Annullato'); }).catch(e => toast('Non annullabile (' + errMsg(e) + ')', 'err'));
}
A['annulla-consumo'] = ds => annullaConsumo(ds.id);
A['annulla-richiesta'] = ds => {
  const mv = derived().movs.find(x => x.id === ds.id);
  C('movimenti').doc(ds.id).update({stato:'annullata'}).then(() => { if(mv && mv.tipo === 'spesa') aggiornaArticoli(mv, false); toast('Richiesta annullata'); }).catch(e => toast(errMsg(e), 'err'));
};

A['snack'] = () => {
  const d = derived(), sd = saldo(st.mid) - riservato(st.mid);
  const list = st.prodotti.filter(p => p.id !== PID_CAFFE && p.categoria !== 'fondo' && p.attivo !== false && p.esaurito !== true && giacenza(d, p) > 0).sort((a,b) => a.nome.localeCompare(b.nome));
  openSheet(`<h3>${ic('cookie')} Acquista snack</h3><p class="sub">Tocca l'articolo che hai preso. Credito disponibile: <b class="mono ${sd < 0 ? 'red' : 'green'}">${eurS(sd)}</b>${list.some(p => p.prezzo > sd) ? ' · gli articoli oltre il tuo credito sono disabilitati: <b>' + MSG_CREDITO.toLowerCase() + '</b>' : ''}.</p>
    ${list.length ? `<div class="list">${list.map(p => { const sk = d.S.stock[p.id] || 0, fin = (st.isAdmin && sk <= 0) || p.prezzo > sd; return `<button class="li" style="width:100%;text-align:left;${fin ? 'opacity:.45' : ''}" data-act="prendi-snack" data-id="${p.id}" ${fin ? 'disabled' : ''}>
      <div class="av" style="font-size:22px">${esc(p.emoji || '🍫')}</div><div class="grow"><div class="t">${esc(p.nome)}</div>${p.prezzo > sd ? '<div class="d red">Credito insufficiente</div>' : st.isAdmin ? `<div class="d">${sk <= 0 ? 'Esaurito' : 'Giacenza ' + sk + ' pz'}</div>` : ''}</div><b class="mono amber">${eur(p.prezzo)}</b></button>`; }).join('')}</div>`
      : '<div class="empty">Nessuno snack disponibile al momento.</div>'}`);
};
A['prendi-snack'] = ds => {
  const p = prodotto(ds.id); if(!p) return;
  if(p.esaurito === true){ closeSheet(); return toast(p.nome + ' è esaurito in dispensa', 'err'); }
  if(!puoPagare(p.prezzo)){ closeSheet(); return toast(MSG_CREDITO, 'err'); }
  const id = addMov({tipo:'snack', mid: st.mid, pid: p.id, qta: 1, importo: p.prezzo, nome: p.nome, emoji: p.emoji || '', pt: ptSnackP(p.prezzo)});
  closeSheet();
  const rest = (derived().S.stock[p.id] || 0);
  toast(`${p.nome} (−${eur(p.prezzo)})${st.isAdmin && rest <= SOGLIA_SCORTA ? ' · scorte basse!' : ''}`, '', {label:'Annulla', fn: () => annullaConsumo(id)});
};

/* --- Paga: unico pulsante per i consumi (caffe' oppure snack e bibite) --- */
A['paga-menu'] = () => {
  const d = derived(), sd = saldo(st.mid) - riservato(st.mid), pc = st.gruppo.prezzoCaffe || 0;
  const sn = st.prodotti.filter(p => p.id !== PID_CAFFE && p.categoria !== 'fondo' && p.attivo !== false && p.esaurito !== true && giacenza(d, p) > 0);
  const noC = !puoPagare(pc), noS = !sn.length || !sn.some(p => puoPagare(p.prezzo));
  openSheet(`<h3>${ic('wallet')} Cosa vuoi pagare?</h3><p class="sub">Credito disponibile: <b class="mono ${sd < 0 ? 'red' : 'green'}">${eurS(sd)}</b></p>
    <button class="btn block big amber" id="paga-caffe" data-act="paga-caffe" ${noC ? 'disabled' : ''}>☕ Caffè${noC ? ' · credito insufficiente' : ''}</button>
    <button class="btn block big" id="paga-snack" data-act="paga-snack" style="margin-top:8px" ${noS ? 'disabled' : ''}>🍫 Snack e bibite${noS ? (sn.length ? ' · credito insufficiente' : ' · nessuno disponibile') : ''}</button>`);
};
A['paga-caffe'] = () => A['caffe-menu']();
A['paga-snack'] = () => A['snack']();

/* --- ricarica e riscatto: sempre verso il Fondo Gruppo, conferma di un Supervisor --- */
A['riscatta-menu'] = () => {
  const puoRisc = (saldo(st.mid) || 0) > 0 && creditoLibero() > 0;
  openSheet(`<h3>${ic('wallet')} Riscatta o rimborso</h3>
  <p class="sub">Chiedi al gruppo di restituirti valore: crediti convertiti in denaro, oppure una spesa che hai anticipato.</p>
  <button class="btn green block big" id="scelta-riscatto" data-act="riscatta-nuovo" ${puoRisc ? '' : 'disabled'}>💰 Riscatta crediti in denaro</button>
  ${puoRisc ? '' : '<p class="hint" style="margin:4px 0 0">Per riscattare servono crediti liberi sul saldo.</p>'}
  <button class="btn amber block big" id="scelta-rimborso" data-act="rimborso-nuovo" style="margin-top:8px">🧾 Rimborso spesa</button>
  ${infoBtn(`Riscatta crediti: chiedi al Fondo Gruppo di restituirti denaro in cambio dei tuoi crediti. Rimborso spesa: hai anticipato dei soldi per la saletta o per il gruppo (acquisti, un telegramma, un omaggio…) e chiedi di essere rimborsato in crediti, in denaro o in modo misto.`, 'Differenza')}`);
};
A['ricarica-saldo'] = () => {
  const deb = debitoLibero(), base = deb > 0 ? deb : 1000;
  openSheet(`<h3>${ic('wallet')} Ricarica crediti</h3>
    <p class="sub">${deb > 0 ? `Hai un debito di <b class="mono red">${eur(deb)}</b>. ` : ''}Versi i soldi al Fondo Gruppo; quando un Supervisor conferma l'incasso ricevi i crediti (1 credito = 1 €).</p>
    <div class="chips" id="rc-tagli">${[500, 1000, 2000, 5000].map(v => `<button type="button" data-act="rc-taglio" data-v="${v}">${eur(v)}</button>`).join('')}</div>
    <label class="f"><span>Importo €</span><input class="in mono" id="r-imp" inputmode="decimal" value="${(base / 100).toFixed(2).replace('.', ',')}"></label>
    <label class="f"><span>Come versi i soldi?</span>${segOpts('r-met', [['contanti', '💶 Contanti in cassetta'], ['revolut', '📱 Revolut']], 'contanti', revOff())}</label>
    <button class="btn amber block big" id="btn-ricarica-conferma" data-act="conferma-ricarica">Invia la richiesta</button>`);
};
A['rc-taglio'] = ds => { const i = $('r-imp'); if(i) i.value = (Number(ds.v) / 100).toFixed(2).replace('.', ','); };
A['conferma-ricarica'] = () => {
  const imp = parseEuro(val('r-imp')), met = revolutOn() ? (radio('r-met') || 'contanti') : 'contanti';
  if(!(imp > 0) || imp > 50000) return toast('Importo non valido', 'err');
  const subito = can('soci') || can('inbox');
  addMov({tipo:'ricarica', mid: st.mid, importo: imp, metodo: met, stato: subito ? 'confermata' : 'attesa', ...(subito ? {esitoDa: myName()} : {})});
  closeSheet();
  toast(subito ? `Ricarica di ${eur(imp)} registrata` : `Richiesta inviata: ${eur(imp)} in attesa di conferma`);
};
A['riscatta-nuovo'] = () => {
  const cr = creditoLibero(); if(cr <= 0) return toast('Non hai crediti da riscattare', 'err');
  openSheet(`<h3>${ic('banknote')} Riscatta crediti</h3>
    <p class="sub">Hai <b class="mono green">${eur(cr)}</b> di crediti liberi. Chiedi al Fondo Gruppo di restituirti il denaro (1 credito = 1 €): l'importo resta riservato e il saldo scende solo quando un Supervisor ti paga. Se in cassa non c'è liquidità la richiesta può essere rifiutata: potrai rifarla per un importo minore.</p>
    <label class="f"><span>Quanto riscatti €</span><input class="in mono" id="vf-imp" inputmode="decimal" value="${(Math.min(cr, 50000) / 100).toFixed(2).replace('.', ',')}"></label>
    <label class="f"><span>Come vuoi ricevere i soldi?</span>${segOpts('vf-met', [['contanti', '💶 Contanti'], ['revolut', '📱 Revolut']], 'contanti', revOff())}</label>
    <button class="btn amber block big" id="btn-riscatto-conferma" data-act="conferma-riscatto">Invia la richiesta</button>`);
};
A['conferma-riscatto'] = () => {
  const imp = parseEuro(val('vf-imp'));
  if(!(imp > 0) || imp > 50000) return toast('Importo non valido', 'err');
  if(imp > creditoLibero()) return toast('Non puoi riscattare più dei tuoi crediti liberi', 'err');
  addMov({tipo:'riscatto', mid: st.mid, importo: imp, metodo: revolutOn() ? (radio('vf-met') || 'contanti') : 'contanti', stato: 'attesa'});
  closeSheet(); toast(`Richiesta di riscatto di ${eur(imp)} inviata`);
};
/* admin: paga il riscatto dalla cassa (importo intero, oppure rifiuta) */
A['riscatto-paga'] = ds => {
  const m = derived().movs.find(x => x.id === ds.id); if(!m || m.tipo !== 'riscatto' || m.stato !== 'attesa') return;
  const c = derived().S.cassa || {};
  openSheet(`<h3>${ic('banknote')} Paga il riscatto</h3>
    <p class="sub"><b>${esc(nomeM(m.mid))}</b> chiede <b class="mono">${eur(m.importo)}</b> · preferisce ${esc(FONTI[m.metodo] || m.metodo)}. Saldo attuale: <b class="mono">${eurS(saldo(m.mid))}</b>.</p>
    <div class="banner amber">${ic('wallet')}<div>Liquidità: contanti <b>${eur(c.contanti || 0)}</b> · Revolut <b>${eur(c.revolut || 0)}</b>. Paga solo se c'è capienza.</div></div>
    <label class="f"><span>Da dove escono i soldi</span>${segOpts('rc-met', [['contanti', '💶 Contanti in cassetta'], ['revolut', '📱 Revolut']], m.metodo === 'revolut' && revolutOn() ? 'revolut' : 'contanti')}</label>
    <button class="btn amber block big" id="btn-riscatto-paga" data-act="conferma-riscatto-paga" data-id="${m.id}">Ho pagato: conferma</button>
    ${infoBtn(`L'importo è quello richiesto. Se non puoi pagarlo per intero, rifiuta la richiesta: il collega potrà rifarla per una cifra minore.`, 'Come funziona')}`);
};
A['conferma-riscatto-paga'] = ds => {
  const m = derived().movs.find(x => x.id === ds.id); if(!m || m.tipo !== 'riscatto' || m.stato !== 'attesa') return closeSheet();
  const met = radio('rc-met') || 'contanti';
  if((saldo(m.mid) || 0) < m.importo) return toast('Il saldo del collega non copre più questo importo: rifiuta la richiesta', 'err');
  if((((derived().S.cassa || {})[met]) || 0) < m.importo) return toast('Capienza di cassa insufficiente: scegli l\'altro metodo, fai un giroconto o rifiuta', 'err');
  C('movimenti').doc(m.id).update({stato: 'confermata', esitoDa: myName(), esitoTs: TS(), ...(met !== m.metodo ? {metodo: met} : {})})
    .then(() => toast('Riscatto pagato dalla cassa ✓')).catch(e => toast(errMsg(e), 'err'));
  closeSheet();
};

/* rimborso spesa: qualsiasi spesa anticipata per il gruppo (saletta o spese straordinarie). Punti proporzionali all'importo alla convalida */
A['rimborso-nuovo'] = () => {
  openSheet(`<h3>${ic('receipt')} Rimborso spesa</h3>
    <p class="sub">Hai anticipato una spesa per il gruppo? Un Supervisor la convalida guardando lo scontrino o la ricevuta.</p>
    <label class="f"><span>Motivo del rimborso</span><input class="in" id="s-desc" maxlength="80" placeholder="es. Caffè in grani e bicchieri · Telegramma condoglianze" autofocus></label>
    <label class="f"><span>Importo speso €</span><input class="in mono" id="s-imp" inputmode="decimal" placeholder="12,50"></label>
    <div data-chg="rb-upd"><label class="f"><span>Come vuoi essere rimborsato?</span>${segOpts('s-rimb', [['crediti','🪙 Tutto in crediti'],['denaro','💶 Tutto in denaro reale'],['misto','⚖️ Misto (crediti + denaro)']], 'crediti')}</label></div>
    <div id="rb-misto" hidden data-chg="rb-upd"><div class="grid2" style="gap:8px">
      <label class="f" style="margin:0"><span>Quota in denaro reale €</span><input class="in mono" id="s-qd" inputmode="decimal" placeholder="0,00"></label>
      <label class="f" style="margin:0"><span>Quota in crediti €</span><input class="in mono" id="s-qc" inputmode="decimal" placeholder="0,00"></label></div>
      <p class="hint" id="rb-msg" style="margin:6px 0 0;font-size:12px"></p></div>
    ${infoBtn(`Tutto in crediti: l'importo diventa un credito per te. Tutto in denaro reale: un Supervisor ti paga dalla cassa e il tuo saldo non cambia. Misto: parte in denaro e parte in crediti; le due quote devono dare esattamente il totale. I punti spesa si calcolano sul totale, in ogni caso.`, 'Come funziona')}
    <button class="btn green block big" data-act="conferma-spesa">Invia la richiesta</button>`);
};
/* rimborso misto: tengo le due quote sincronizzate col totale (quella modificata per ultima comanda) */
function rbAggiorna(ult){
  const m = radio('s-rimb'), box = $('rb-misto'); if(!box) return;
  box.hidden = m !== 'misto'; if(m !== 'misto') return;
  const tot = parseEuro(val('s-imp')), qd = $('s-qd'), qc = $('s-qc'), msg = $('rb-msg');
  if(!(tot > 0)){ if(msg) msg.textContent = 'Inserisci prima l\'importo totale.'; return; }
  const f = c => (c / 100).toFixed(2).replace('.', ',');
  if(ult === 'qc'){ const c = parseEuro(qc.value); if(Number.isFinite(c) && c >= 0 && c <= tot) qd.value = f(tot - c); }
  else { const d = parseEuro(qd.value); if(Number.isFinite(d) && d >= 0 && d <= tot) qc.value = f(tot - d); }
  const d = parseEuro(qd.value), c = parseEuro(qc.value), ok = d > 0 && c > 0 && d + c === tot;
  if(msg){ msg.textContent = ok ? `Totale ${eur(tot)} → ${eur(d)} in denaro reale + ${eur(c)} in crediti` : 'Entrambe le quote devono essere maggiori di zero e dare insieme il totale.'; msg.className = 'hint ' + (ok ? 'green' : 'amber'); }
}
A['conferma-spesa'] = () => {
  const descr = val('s-desc'), imp = parseEuro(val('s-imp')), modo = radio('s-rimb') || 'crediti';
  if(!descr || !(imp > 0) || imp > MAXOP) return toast('Scrivi il motivo e un importo valido', 'err');
  const mov = {tipo:'spesa', mid: st.mid, importo: imp, descr: descr.slice(0,80), stato: 'attesa'};
  if(modo === 'misto'){
    const qd = parseEuro(val('s-qd')), qc = parseEuro(val('s-qc'));
    if(!(qd > 0) || !(qc > 0) || qd + qc !== imp) return toast('Le due quote devono essere maggiori di zero e dare esattamente il totale', 'err');
    Object.assign(mov, {fonte: 'misto', quotaDenaro: qd, quotaCrediti: qc});
  } else mov.fonte = modo === 'denaro' ? 'denaro' : 'tasca';
  addMov(mov);
  closeSheet();
  toast('Richiesta di rimborso inviata, in attesa di convalida');
};
A['paga-spesa'] = ds => {
  const m = derived().movs.find(x => x.id === ds.id); if(!m || m.stato !== 'attesa') return;
  const c = derived().S.cassa;
  openSheet(`<h3>${ic('banknote')} Convalida e Paga</h3>
    <p class="sub"><b>${esc(nomeM(m.mid))}</b> ha anticipato <b class="mono">${eur(m.importo)}</b> per «${esc(m.descr || '')}». ${spesaMista(m) ? `<br><b>${spesaMista(m)}</b>.<br>Paghi dalla cassa solo la quota in denaro (${eur(m.quotaDenaro)}); la quota in crediti (${eur(m.quotaCrediti)}) va sul saldo del collega.` : 'Paghi dalla cassa: il saldo del collega non cambia.'}</p>
    <label class="f"><span>Da dove paghi${spesaMista(m) ? ' la quota in denaro' : ''}?</span>${segOpts('ps-met', [['contanti','💶 Contanti (' + eur(c.contanti || 0) + ')'],['revolut','📱 Revolut (' + eur(c.revolut || 0) + ')']], 'contanti')}</label>
    <button class="btn green block big" data-act="conferma-paga-spesa" data-id="${m.id}">Convalida e Paga</button>`);
};
A['conferma-paga-spesa'] = ds => {
  const met = radio('ps-met') || 'contanti', mv = derived().movs.find(x => x.id === ds.id);
  if(mv && spesaMista(mv) && (((derived().S.cassa || {})[met]) || 0) < mv.quotaDenaro) return toast('Capienza di cassa insufficiente per la quota in denaro: scegli l\'altro metodo o fai un giroconto', 'err');
  C('movimenti').doc(ds.id).update({stato: 'confermata', fonte: met, esitoDa: myName(), esitoTs: TS(), pt: ptSpesaE(mv && mv.importo)})
    .then(() => { aggiornaArticoli(mv, true); closeSheet(); toast('Spesa pagata dalla cassa ✓'); }).catch(e => toast(errMsg(e), 'err'));
};

/* --- Incarichi dei vecchi compiti: restano solo quelli ancora aperti (assegnato / in attesa), gestiti da «Incarichi in sospeso» nelle Notifiche --- */
const cpAperto = m => m.stato === 'assegnato' || m.stato === 'attesa';
const cpIncarichi = () => { const s = derived().stornati; return tuttiMov().filter(m => m.tipo === 'compito' && !s.has(m.id)); };
const cpAperti = () => cpIncarichi().filter(cpAperto);
A['cp-fatto'] = ds => {
  const m = tuttiMov().find(x => x.id === ds.id);
  if(!m || m.tipo !== 'compito' || m.mid !== st.mid || m.stato !== 'assegnato' || m._pending) return toast('Questo incarico non è più da svolgere', 'err');
  C('movimenti').doc(m.id).update({stato: 'attesa', fattoTs: Date.now()})
    .then(() => toast('Fatto! In attesa di convalida di un Supervisor ✓')).catch(e => toast(errMsg(e), 'err'));
};
A['cp-annulla'] = ds => {
  const m = tuttiMov().find(x => x.id === ds.id);
  if(!can('compiti') || !m || m.tipo !== 'compito' || m.stato !== 'assegnato') return;
  if(!confirm('Annullare questo incarico?\n\nViene chiuso senza assegnare punti.')) return;
  C('movimenti').doc(m.id).update({stato: 'annullata', esitoDa: myName(), esitoTs: TS()}).then(() => toast('Incarico annullato')).catch(e => toast(errMsg(e), 'err'));
};

/* --- Ruoli (v1.40.0): Creatore e Supervisor ---
   Il Creatore ha tutti i poteri e solo lui nomina i Supervisor e ne sceglie i permessi.
   Un Supervisor vede le stesse schermate dei colleghi: compaiono solo i comandi dei permessi che ha. */
const PERMESSI = [
  ['inbox', '✅', 'Approva richieste', 'Conferma spese, ricariche, riscatti e nuovi iscritti (Notifiche)'],
  ['cassa', '💶', 'Cassa e Storni', 'Entrate, giroconti, correzione saldo cassa, storni'],
  ['inventario', '📦', 'Inventario e Scorte', 'Prezzi e articoli, giacenze, scorta caffè, Esaurito'],
  ['soci', '👥', 'Quote e Saldi Soci', 'Quote annuali, saldi e punti, PIN, archivia / espelli'],
  ['compiti', '🏆', 'Punti e Regole', 'Mastro Lindo, parametri di punteggio e premi'],
  ['sistema', '🛠️', 'Strumenti di Sistema', 'Moderazione della Bacheca in Home, backup, chiusura periodo']];
const PERM_IDS = PERMESSI.map(x => x[0]);
function sonoCreatore(){ return !!st.gruppo && (st.gruppo.creatoDa === st.uid || (!!st.mid && st.gruppo.creatoreMid === st.mid)); }
/* permessi di un telefono Supervisor (uid): voce assente = tutti (così i vecchi amministratori restano operativi finché il Creatore non li ritocca) */
function permDi(uid){ const pm = st.gruppo && st.gruppo.permSup, v = pm && pm[uid]; return Array.isArray(v) ? v.filter(x => PERM_IDS.includes(x)) : PERM_IDS.slice(); }
function can(p){ return sonoCreatore() || (!!st.admDoc && permDi(st.uid).includes(p)) || (p === 'compiti' && isSup()); }
const canAccessi = () => can('inbox') || can('soci');
function ruolo(){ return sonoCreatore() ? 'Creatore' : st.isAdmin ? 'Supervisor' : 'Collega'; }
const midDiUid = uid => { const u = st.utenti.find(x => x.id === uid); return u ? u.mid : null; };
/* vecchi «supervisori dei compiti» (lista sul gruppo): continuano a funzionare con il solo permesso Punti e Regole */
const supervisoriIds = () => { const v = st.gruppo && st.gruppo.supervisori; return Array.isArray(v) ? v.filter(x => typeof x === 'string') : []; };
const isSup = () => !!st.mid && supervisoriIds().includes(st.mid);
/* mid -> [uid dei telefoni con documento admin], escluso il Creatore (lo leggono solo Creatore e Supervisor) */
const supervisorMids = () => {
  const out = {};
  st.admins.forEach(a => { const m = midDiUid(a.id); if(m && !protettoUid(a.id) && !isCreatore(m)) (out[m] = out[m] || []).push(a.id); });
  return out;
};
const svPermessiMid = mid => { const uids = supervisorMids()[mid]; return uids && uids.length ? permDi(uids[0]) : (supervisoriIds().includes(mid) ? ['compiti'] : []); };
const badgePerm = ids => PERMESSI.filter(x => ids.includes(x[0])).map(x => `<span class="pill violet" title="${x[2]}">${x[1]}</span>`).join(' ');
const cpSoloAdmin = () => sonoCreatore() && supervisoriIds().length === 0 && !st.admins.some(a => permDi(a.id).includes('compiti') && midDiUid(a.id) !== st.mid);   // il Creatore è l'unico a poter convalidare: può chiudere anche un compito proprio
const cpPuoConv = m => m.stato === 'attesa' && !m._pending && !m._local && can('compiti') && (m.mid !== st.mid || cpSoloAdmin());
const nCpConv = () => (can('compiti') && ptMaster()) ? cpAperti().filter(cpPuoConv).length : 0;
function incarichiSospesi(){
  if(!can('compiti')) return '';
  const l = cpAperti().slice().sort((a, b) => a.t - b.t); if(!l.length) return '';
  return `<div class="card" id="sf-sospesi"><h3>📋 Incarichi in sospeso <span class="pill violet">${l.length}</span></h3>
    <p class="hint" style="margin:0 0 8px">Compiti del vecchio Briefing ancora da svolgere o da convalidare: convalidali o annullali per chiuderli.</p>
    <div class="list">${l.map(m => cpRiga(m, st.mid)).join('')}</div></div>`;
}
function cpConvCard(){
  if(!can('compiti') || !ptMaster()) return '';
  const l = cpAperti().filter(cpPuoConv); if(!l.length) return '';
  return `<div class="card" id="cp-conv"><h3>🛡️ Compiti da convalidare <span class="pill red">${l.length}</span></h3><div class="list">${l.map(m => cpRiga(m, st.mid)).join('')}</div></div>`;
}
let soloSent = '';
function sincronizzaSolo(){   // il Creatore tiene aggiornati il flag «unico che può convalidare» (lo usano le regole) e l'elenco pubblico dei Supervisor
  if(!sonoCreatore() || st.sync !== 'ok' || modeKey !== 'admin' || !st.gruppo || !Array.isArray(st.admins) || !st.admins.length) return;
  const solo = cpSoloAdmin(), mids = Object.keys(supervisorMids()).sort(), att = (Array.isArray(st.gruppo.supMids) ? st.gruppo.supMids : []).slice().sort();
  const up = {};
  if((st.gruppo.soloAdmin === true) !== solo) up.soloAdmin = solo;
  if(mids.join() !== att.join()) up.supMids = mids;
  const k = JSON.stringify(up); if(k === '{}' || soloSent === k) return;
  soloSent = k; G().update(up).catch(() => { soloSent = ''; });
}
/* --- Gestione Supervisor (solo Creatore) --- */
function pSupervisor(d){
  if(!sonoCreatore()) return `<h2>${ic('shield')} Gestione Supervisor</h2><div class="card"><div class="empty">Solo il Creatore del gruppo può nominare i Supervisor.</div></div>`;
  const per = supervisorMids(), legacy = supervisoriIds().filter(id => !per[id]);
  const att = membriAttivi().filter(m => per[m.id] || legacy.includes(m.id));
  const cand = membriAttivi().filter(m => !per[m.id] && !legacy.includes(m.id) && !isCreatore(m.id) && st.utenti.some(u => u.mid === m.id));
  return `<h2>${ic('shield')} Gestione Supervisor ${infoBtn(`Il Supervisor è un collega di fiducia con gli stessi schermi degli altri: vede solo i comandi dei permessi che gli concedi. Solo tu puoi nominarlo, cambiarne i permessi o revocarlo. I vecchi amministratori sono stati trasformati in Supervisor con tutti i permessi: puoi ridurli da qui.`)}</h2>
  <div class="card" id="sv-attivi"><h3><span>Supervisor attivi</span>${att.length ? `<span class="pill violet">${att.length}</span>` : ''}</h3>
    ${att.length ? `<div class="list">${att.map(m => `<div class="li" id="sv-${m.id}" style="flex-wrap:wrap;gap:8px"><div class="av">${esc(m.nome.slice(0,1))}</div>
      <div class="grow"><div class="t">${esc(nomeM(m.id))}${per[m.id] ? '' : ' <span class="pill">vecchio</span>'}</div><div class="d">${badgePerm(svPermessiMid(m.id)) || 'nessun permesso'}</div></div>
      <div class="row" style="gap:6px"><button class="btn sm" data-act="sv-permessi" data-id="${m.id}">Permessi</button><button class="btn sm ghost" data-act="sv-revoca" data-id="${m.id}">Revoca</button></div></div>`).join('')}</div>`
      : '<div class="empty" id="sv-vuoto">Nessun Supervisor: gestisci tutto tu.</div>'}
  </div>
  <div class="card" id="sv-nomina"><h3>Nomina un Supervisor</h3>
    ${cand.length ? `${cercaBox('sv-lista')}<div class="list" id="sv-lista">${cand.map(m => `<button class="li" data-q="${qMem(m)}" style="width:100%;text-align:left" data-act="sv-nomina" data-id="${m.id}"><div class="av">${esc(m.nome.slice(0,1))}</div><div class="grow"><div class="t">${esc(nomeM(m.id))}</div></div><span class="pill amber">Nomina</span></button>`).join('')}</div>${cercaVuoto('sv-lista')}`
      : '<div class="empty">Nessun collega con un telefono collegato da nominare.</div>'}
  </div>
  <div class="card"><h3>I sei permessi</h3><div class="list">${PERMESSI.map(x => `<div class="li"><div class="av">${x[1]}</div><div class="grow"><div class="t">${x[2]}</div><div class="d">${x[3]}</div></div></div>`).join('')}</div></div>`;
}
function svSheet(mid, esiste){
  const m = membro(mid); if(!m || !sonoCreatore()) return;
  const att = esiste ? svPermessiMid(mid) : [];
  openSheet(`<h3>🛡️ ${esc(m.nome)}</h3><p class="sub">${esiste ? 'Cambia cosa può fare come Supervisor.' : 'Scegli cosa potrà fare come Supervisor. Potrai cambiarlo o revocarlo quando vuoi.'}</p>
    <div id="sv-perm">${PERMESSI.map(([k, em, nome, desc]) => `<label class="check"><input type="checkbox" class="sv-p" id="svp-${k}" value="${k}" ${att.includes(k) ? 'checked' : ''}><span style="flex:1"><b style="font-size:14px">${em} ${nome}</b><span class="hint" style="display:block;margin:2px 0 0;font-size:12px">${desc}</span></span></label>`).join('')}</div>
    <button class="btn amber block big" id="btn-sv-salva" data-act="sv-salva" data-id="${mid}" style="margin-top:8px">${esiste ? 'Salva permessi' : 'Nomina Supervisor'}</button>`);
}
A['sv-nomina'] = ds => svSheet(ds.id, false);
A['sv-permessi'] = ds => svSheet(ds.id, true);
A['sv-salva'] = ds => {
  if(!sonoCreatore()) return;
  const m = membro(ds.id); if(!m) return;
  const perm = Array.from(document.querySelectorAll('#sheet input.sv-p')).filter(b => b.checked).map(b => b.value);
  if(!perm.length) return toast('Scegli almeno un permesso', 'err');
  const uids = st.utenti.filter(u => u.mid === ds.id).map(u => u.id);
  if(!uids.length) return toast('Questo collega non ha un telefono collegato', 'err');
  const b = db.batch(), up = {};
  uids.forEach(uid => { if(!st.admins.some(a => a.id === uid)) b.set(C('admin').doc(uid), {nome: m.nome, nominatoDa: myName(), ts: TS()}); up['permSup.' + uid] = perm; });
  up.supMids = Array.from(new Set(Object.keys(supervisorMids()).concat([ds.id])));
  if(supervisoriIds().includes(ds.id)) up.supervisori = supervisoriIds().filter(x => x !== ds.id);   // il vecchio ruolo «solo compiti» è assorbito
  b.update(G(), up);
  b.commit().then(() => { closeSheet(); toast(`${m.nome}: permessi salvati`); }).catch(e => toast(errMsg(e), 'err'));
};
A['sv-revoca'] = ds => {
  if(!sonoCreatore()) return;
  const m = membro(ds.id); if(!m) return;
  if(!confirm(`Togliere il ruolo di Supervisor a ${m.nome}? Tornerà un collega come gli altri.`)) return;
  const uids = st.utenti.filter(u => u.mid === ds.id).map(u => u.id), b = db.batch(), up = {};
  uids.forEach(uid => { if(st.admins.some(a => a.id === uid) && !protettoUid(uid)) b.delete(C('admin').doc(uid)); up['permSup.' + uid] = firebase.firestore.FieldValue.delete(); });
  up.supMids = Object.keys(supervisorMids()).filter(x => x !== ds.id);
  if(supervisoriIds().includes(ds.id)) up.supervisori = supervisoriIds().filter(x => x !== ds.id);
  b.update(G(), up);
  b.commit().then(() => { closeSheet(); toast(`${m.nome} non è più Supervisor`); }).catch(e => toast(errMsg(e), 'err'));
};
