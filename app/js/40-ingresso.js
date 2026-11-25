'use strict';
/* ---------- schermate di ingresso ---------- */
function renderEntry(){
  if(st.sync === 'nocfg') return `<div class="hero"><div class="logo">${ic('coffee','l')}</div><h1>Armieri 5.0</h1><p>Configurazione Firebase mancante.</p></div>
    <div class="card"><p class="tx2" style="margin:0;font-size:14px">Questa copia dell'app non è ancora collegata a un progetto Firebase. Inserisci il blocco <span class="mono">firebaseConfig</span> nel file <span class="mono">config.js</span>.</p></div>`;
  if(serveInstall()) return entryInstall();
  if(!st.uid) return st.sync === 'err'
    ? `<div class="hero"><div class="logo">${ic('coffee','l')}</div><h1>Armieri 5.0</h1></div><div class="banner red">${ic('alert')}<div>Impossibile collegarsi: ${esc(st.syncErr)}.<br>Controlla la connessione e riapri l'app.</div></div>`
    : `<div class="spin"></div><p class="mut" style="text-align:center">Collegamento in corso…</p>`;
  if(st.entry === 'recupero') return entryRecupero();
  if(!st.gid){
    if(!st.entry && !st.autoUlt){   // nessuna lettura: il gruppo ricordato sul telefono si apre direttamente (nome salvato in locale)
      st.autoUlt = true; const u = LS.get('ultimoGruppo', null);
      if(u && u.gid && normCode(u.gid)){ st.joinCode = normCode(u.gid); st.joinNome = u.nome || ''; st.entry = 'creatore'; } else st.entry = 'join';
    }
    if(st.autoJoin){ const c = st.autoJoin; st.autoJoin = null; setTimeout(() => joinVerifica(c), 0); }   // link con codice: la stessa unica verifica del pulsante «Continua»
    return st.entry === 'creatore' && st.joinCode ? entryCreatore() : st.entry === 'join' ? entryJoin() : entryWelcome();
  }
  if(!st.ready.g || !st.ready.u || !st.ready.r || !st.ready.a) return `<div class="spin"></div><p class="mut" style="text-align:center">Carico il gruppo…</p>`;
  if(st.mid) return `<div class="spin"></div><p class="mut" style="text-align:center">Accesso approvato, carico i dati…</p>`;
  return entryRichiesta();
}

function entryInstall(){
  const p = piattaforma(), inv = LS.get('invito', '') || '';
  const passi = {
    android: [
      `Apri il menu <b>⋮</b> di Chrome (in alto a destra).`,
      `Tocca <b>Installa app</b> (oppure <b>Aggiungi a schermata Home</b>) e conferma.`,
      `Chiudi questa pagina e apri <b>Armieri 5.0</b> dall'icona appena creata.`,
      `Registrati o entra nel gruppo <b>da lì</b>, non da questa pagina.`
    ],
    ios: [
      `Apri questo link con <b>Safari</b>.`,
      `Tocca <b>Condividi</b> ${ic('share','s')} (la barra in basso, o in alto a destra su iPad).`,
      `Scorri e tocca <b>Aggiungi alla schermata Home</b>, poi <b>Aggiungi</b>.`,
      `Apri <b>Armieri 5.0</b> dall'icona nella schermata Home e registrati <b>da lì</b>.`
    ],
    desktop: [
      `In Chrome o Edge, clicca l'icona <b>Installa</b> ${ic('download','s')} nella barra degli indirizzi (oppure menu <b>⋮</b> → <b>Installa Armieri 5.0</b>).`,
      `Conferma con <b>Installa</b>.`,
      `Apri l'app installata e registrati <b>da lì</b>.`
    ]
  };
  const titoli = {android: 'Android · Chrome', ios: 'iPhone / iPad', desktop: 'Computer'};
  const lista = k => `<ol class="steps">${passi[k].map(s => `<li><span>${s}</span></li>`).join('')}</ol>`;
  const altri = ['android', 'ios', 'desktop'].filter(k => k !== p);
  return `<div class="hero" style="padding-bottom:8px"><div class="logo">${ic('phone','l')}</div><h1>Prima installa l'app</h1><p>Ci vuole un minuto e ti evita di doverti registrare due volte.</p></div>
  ${st.installata ? `<div class="banner sky" id="inst-ok">${ic('check')}<div><b>App installata!</b> Chiudi questa pagina e apri Armieri 5.0 dall'icona nella schermata Home. Registrati da lì.</div></div>` : ''}
  <div class="banner amber">${ic('alert')}<div>Se ti registri da questa pagina e <b>poi</b> installi l'app, l'app installata non ti riconosce e ti chiede di registrarti di nuovo. Installa <b>prima</b>, poi registrati dall'app.</div></div>
  ${inv ? `<div class="card"><h3>Il tuo codice gruppo</h3><div class="code mono" style="margin-bottom:10px">${esc(inv)}</div>
    <button class="btn sm block" data-act="copia" data-v="${esc(inv)}">${ic('copy','s')} Copia codice</button>
    <p class="hint" style="margin:10px 0 0">Tienilo a portata di mano: una volta aperta l'app installata potresti doverlo inserire.</p></div>` : ''}
  <div class="card" id="inst-passi"><h3>${titoli[p]}</h3>
    ${installPrompt ? `<button class="btn amber block big" id="btn-install" data-act="install-app" style="margin-bottom:6px">${ic('download','s')} Installa app</button>` : ''}
    ${lista(p)}</div>
  <details style="margin-bottom:12px"><summary class="mut" style="cursor:pointer;font-size:12.5px;padding:6px 2px">Hai un altro tipo di dispositivo?</summary>
    ${altri.map(k => `<div class="card" style="margin-top:8px"><h3>${titoli[k]}</h3>${lista(k)}</div>`).join('')}</details>
  <div style="text-align:center;margin-top:6px"><button class="btn link" id="btn-install-salta" data-act="install-salta" style="color:var(--mut)">Continua nel browser senza installare</button>
    <p class="hint" style="margin:2px 0 0">Sconsigliato: se installerai l'app più tardi dovrai registrarti di nuovo.</p></div>`;
}

/* accesso con account (Google / email): link in fondo alle schermate di ingresso; con un account già collegato mostra quale e permette di cambiarlo */
function entryAccount(){
  return st.authAnon === false
    ? `<p class="hint" style="text-align:center;margin-top:14px">Account: <b>${esc(st.authEmail || 'collegato')}</b><br><button class="btn link" id="btn-account-esci" data-act="account-esci" style="font-size:13px">Cambia account</button></p>`
    : `<button class="btn block ghost" id="btn-accedi" data-act="accedi-apri" style="margin-top:14px">${ic('user','s')} Accedi con Google o email</button>`;
}

function entryWelcome(){
  return `<div class="hero"><div class="logo">${ic('coffee','l')}</div><h1>Armieri 5.0</h1><p>Caffè, snack, cassa e turni della saletta,<br>condivisi con i colleghi.</p></div>
  ${st.authAnon === false ? '' : `<button class="tile" id="tile-accedi" data-act="accedi-apri"><div class="ic amber">${ic('user')}</div><b>Accedi con il tuo account</b><span>Google o email: ritrovi il tuo profilo</span></button>`}
  <button class="tile" data-act="entry" data-v="join"><div class="ic amber">${ic('users')}</div><b>Ho un codice di gruppo</b><span>Te lo manda il Creatore del gruppo</span></button>${st.authAnon === false ? entryAccount() : ''}`;
}

function entryJoin(){
  const pre = LS.get('invito', '') || '';
  return `<div class="hero" style="padding-bottom:8px"><div class="logo">${ic('users','l')}</div><h1>Entra nel gruppo</h1><p>Inserisci il codice di 12 caratteri</p></div>
  <div class="card">
    <label class="f"><span>Codice gruppo</span><input class="in mono" id="j-code" placeholder="XXXX-XXXX-XXXX" value="${esc(pre)}" autocapitalize="characters" autocomplete="off" autofocus></label>
    <button class="btn amber block big" data-act="join" ${st.busy?'disabled':''}>${st.busy ? 'Verifico…' : 'Continua'}</button>
  </div>
  ${st.joinCode ? `<button class="btn link" data-act="entry" data-v="creatore" style="color:var(--mut);font-size:13px">← Torna a ${esc(st.joinNome || 'questo gruppo')}</button>` : ''}${entryAccount()}`;
}

function entryCreatore(){
  return `<div class="hero" style="padding-bottom:8px"><div class="logo">${ic('users','l')}</div><h1>${esc(st.joinNome || 'Gruppo')}</h1><p>Come vuoi entrare?</p></div>
  <div class="card">
    ${st.authAnon === false ? `<button class="btn amber block big" id="btn-entra-account" data-act="join-collega">${ic('check','s')} Entra con il tuo account</button>
    <p class="hint" style="margin:6px 0 12px">Se questo account è già collegato al tuo profilo, entri subito, senza PIN.</p>` : ''}
    <button class="btn ${st.authAnon === false ? 'ghost ' : 'amber '}block big" data-act="recupero-apri">${ic('lock','s')} Ho già un profilo</button>
    <p class="hint" style="margin:6px 0 12px">Eri già nel gruppo (nuovo telefono, app reinstallata…): ti ritrovi con il tuo PIN personale.</p>
    <button class="btn ${st.authAnon === false ? 'ghost ' : ''}block big" data-act="join-collega">${ic('user','s')} Sono un nuovo collega</button>
    <p class="hint" style="margin:6px 0 0">Invii una richiesta che un Supervisor deve approvare.</p>
  </div>
  <button class="btn link" id="btn-altro-codice" data-act="entry" data-v="join" style="color:var(--mut);font-size:13px">Usa un altro codice gruppo</button>${entryAccount()}`;
}


function entryRichiesta(){
  const r = st.richiesta, g = st.gruppo ? esc(st.gruppo.nome) : '';
  if(r && r.stato === 'attesa') return `<div class="hero" style="padding-bottom:8px"><div class="logo">${ic('clock','l')}</div><h1>Richiesta inviata</h1><p>${g}</p></div>
    <div class="card" style="text-align:center">
      <p class="tx2" style="margin:0 0 6px;font-size:14px">Hai chiesto di entrare come</p>
      <b style="font-size:18px">${esc(r.nome)}</b>${r.nick ? `<div class="mut" style="margin-top:2px">“${esc(r.nick)}”</div>` : ''}
      <p class="mut" style="font-size:13px;margin:14px 0 0">Un Supervisor deve approvarla. Questa pagina si aggiorna da sola appena succede.</p>
    </div>
    <div class="grid2"><button class="btn ghost" data-act="richiesta-modifica">${ic('edit','s')} Correggi</button><button class="btn ghost" data-act="richiesta-ritira">Ritira richiesta</button></div>
    <div style="text-align:center;margin-top:12px"><button class="btn link" data-act="esci-gruppo">Usa un altro codice</button></div>`;
  if(r && r.stato === 'espulso') return `<div class="hero"><div class="logo" style="color:var(--red);border-color:rgba(251,113,133,.4);background:rgba(251,113,133,.1)">${ic('logout','l')}</div><h1>Accesso rimosso</h1><p>${g}</p></div>
    <div class="card"><p class="tx2" style="margin:0;font-size:14px">Un Supervisor ti ha rimosso dal gruppo. Per chiarimenti rivolgiti a chi gestisce la saletta.</p></div>
    <button class="btn link" data-act="esci-gruppo">Esci</button>`;
  const rifiutata = r && r.stato === 'rifiutata', archiviato = r && r.stato === 'archiviato';
  return `<div class="hero" style="padding-bottom:8px"><div class="logo">${ic('user','l')}</div><h1>Chiedi di entrare</h1><p>${g}</p></div>
  ${rifiutata ? `<div class="banner red">${ic('alert')}<div>La tua richiesta precedente non è stata accettata. Controlla i dati o chiedi al Supervisor.</div></div>` : ''}
  ${archiviato ? `<div class="banner amber">${ic('archive')}<div>Il tuo profilo è stato archiviato da un Supervisor. Se fai di nuovo parte della saletta puoi chiedere di rientrare.</div></div>` : ''}
  <div class="card">
    <label class="f"><span>Nome e cognome</span><input class="in" id="r-nome" maxlength="30" placeholder="es. Elena Gialli" value="${esc(r ? r.nome : '')}" autocomplete="name"></label>
    <label class="f"><span>Nickname (facoltativo)</span><input class="in" id="r-nick" maxlength="20" placeholder="es. Ele" value="${esc(r && r.nick ? r.nick : '')}"></label>
    <p class="hint">Dopo l'approvazione il nome non si potrà più cambiare, il nickname sì.</p>
    <button class="btn amber block big" data-act="invia-richiesta" ${st.busy?'disabled':''}>${st.busy ? 'Invio…' : 'Invia richiesta'}</button>
  </div>
  <button class="btn block ghost" style="margin-bottom:8px" data-act="recupero-apri">${ic('lock','s')} Ho già un profilo (recupero con PIN)</button>
  <button class="btn link" data-act="esci-gruppo">Usa un altro codice</button>${entryAccount()}`;
}

function entryRecupero(){
  const l = st.recLista;
  return `<div class="hero" style="padding-bottom:8px"><div class="logo">${ic('lock','l')}</div><h1>Ho già un profilo</h1><p>Scegli il tuo nome e digita il PIN personale a 6 cifre</p></div>
  <div class="card">
    ${l === null || l === undefined ? '<div class="spin"></div>' : l.length ? `
    <label class="f"><span>Il tuo nome</span><select class="in" id="rc-mid">${l.map(m => `<option value="${m.id}">${esc(m.nome)}${m.nick ? ' (' + esc(m.nick) + ')' : ''}</option>`).join('')}</select></label>
    <label class="f"><span>PIN personale (6 cifre)</span><input class="in mono" id="rc-pin" type="password" inputmode="numeric" maxlength="6" autocomplete="off" placeholder="••••••"></label>
    <button class="btn amber block big" data-act="recupera" ${st.busy ? 'disabled' : ''}>${st.busy ? 'Verifico…' : 'Recupera il mio profilo'}</button>
    <p class="hint" style="margin:10px 0 0">Non ricordi il PIN? Chiedi a un Supervisor un PIN temporaneo: ti permette di rientrare e poi ne scegli uno nuovo.</p>` : '<div class="empty">Nessun profilo trovato in questo gruppo.</div>'}
  </div>
  <button class="btn link" data-act="recupero-indietro">← Indietro</button>`;
}

function entryPinGate(){
  const m = membro(st.mid), temp = st.pinDoc && st.pinDoc.temporaneo;
  return `<div class="hero" style="padding-bottom:8px"><div class="logo">${ic('lock','l')}</div><h1>Ciao${m ? ' ' + esc(m.nome) : ''}!</h1><p>${temp ? 'Scegli un nuovo PIN personale' : 'Imposta il tuo PIN personale'}</p></div>
  ${temp ? `<div class="banner sky">${ic('info')}<div>Un Supervisor ha impostato per te un PIN temporaneo: scegline uno nuovo, solo tuo.</div></div>` : ''}
  <div class="banner amber">${ic('alert')}<div>Il PIN ti serve per ritrovare il tuo profilo (saldo, crediti e storico) se cambi telefono o svuoti i dati. Ricordalo e non darlo a nessuno.</div></div>
  <div class="card">
    <label class="f"><span>PIN (6 cifre)</span><input class="in mono" id="pg-1" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password" placeholder="••••••"></label>
    <label class="f"><span>Ripeti il PIN</span><input class="in mono" id="pg-2" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password" placeholder="••••••"></label>
    <button class="btn amber block big" data-act="pin-salva" ${st.busy ? 'disabled' : ''}>${st.busy ? 'Salvo…' : 'Salva il PIN'}</button>
  </div>
  <p class="hint" style="text-align:center">Questa schermata scompare appena salvi il PIN.</p>
`;
}

