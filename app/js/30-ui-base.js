'use strict';
/* ---------- scritture ---------- */
function addMov(data, id, silenzioso, onFail){
  const ref = id ? C('movimenti').doc(id) : C('movimenti').doc();
  const cts = Date.now();
  const full = clean({...data, uid: st.uid, amid: st.mid, autore: myName(), cts, ts: TS()});
  st.pending[ref.id] = {...clean(data), id: ref.id, uid: st.uid, amid: st.mid, autore: myName(), cts, t: cts, _pending: true};
  _derCache = null;
  render();
  ref.set(full).catch(e => {
    delete st.pending[ref.id]; _derCache = null;
    if(onFail) onFail(e); else if(!silenzioso) toast('Operazione rifiutata (' + errMsg(e) + ')', 'err'); render();
  });
  return ref.id;
}
function guard(fn){
  return (...a) => { try { return fn(...a); } catch(e){ console.error(e); toast(errMsg(e), 'err'); } };
}

/* ---------- toast ---------- */
let toastT = null;
function toast(msg, kind, action){
  const t = $('toast');
  $('toast-msg').textContent = msg;
  t.classList.toggle('err', kind === 'err');
  const b = $('toast-act');
  if(action){ b.textContent = action.label; b.classList.remove('hidden'); b.onclick = () => { action.fn(); t.classList.remove('on'); }; }
  else { b.classList.add('hidden'); b.onclick = null; }
  t.classList.add('on');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('on'), action ? 6000 : 3200);
}

/* ---------- sheet (finestre dal basso) ---------- */
function openSheet(html){
  $('sheet').innerHTML = '<div class="grab"></div>' + html;
  $('sheet').classList.add('on'); $('sheet-ov').classList.add('on');
  const f = $('sheet').querySelector('[autofocus]'); if(f) setTimeout(() => f.focus(), 250);
}
function closeSheet(){ $('sheet').classList.remove('on'); $('sheet-ov').classList.remove('on'); }
const val = id => { const e = $(id); return e ? e.value.trim() : ''; };
const radio = name => { const e = document.querySelector(`input[name="${name}"]:checked`); return e ? e.value : null; };
function segOpts(name, opts, sel, off){
  off = off || [];
  return `<div class="seg">${opts.map(([v,l]) => { const no = off.includes(v);
    return `<input type="radio" name="${name}" id="${name}-${v}" value="${v}" ${v===sel&&!no?'checked':''} ${no?'disabled':''}><label for="${name}-${v}"${no?' class="off" aria-disabled="true"':''}>${l}${no?'<small class="nd">(Non disponibile)</small>':''}</label>`; }).join('')}</div>`;
}
/* canale Revolut: sospendibile dal Supervisor (campo revolutAttivo nel documento gruppo, assente = attivo) */
const revolutOn = () => !st.gruppo || st.gruppo.revolutAttivo !== false;
const revOff = () => revolutOn() ? [] : ['revolut'];

/* =====================================================================
   RENDER
   ===================================================================== */
const PAGES = {
  bar:['Bar','coffee'], feed:['Feed movimenti','activity'], supervisor:['Gestione Supervisor','shield'], pin:['Gestione PIN','lock'], saletta:['Saletta','sparkles'], classifiche:['Classifica e statistiche','chart'], gioco:['Chi paga il caffè?','dice'], registro:['Cassa e registro','receipt'], crediti:['Crediti','wallet'], notifiche:['Notifiche','bell'],
  cassa:['Registro cassa','wallet'], inventario:['Inventario & listino','package'], quote:['Quote annuali','banknote'],
  regolamento:['Regolamento','receipt'], membri:['Gestione Soci','users'], statistiche:['Classifica e statistiche','chart'], impostazioni:['Impostazioni','settings'], backup:['Backup & Ripristino','download'], chiusura:['Chiusura periodo','archive']
};

// Modello prepagato: la quota non genera piu' addebiti sul saldo. Resta la funzione (vuota) per i punti di chiamata.
function assicuraQuote(){}

let rq = false;
/* scroll: ogni render ricostruisce main; ricordiamo la posizione per non farla tornare in cima (a ogni aggiornamento dati) */
let scY = 0, scFuori = 0;
window.addEventListener('scroll', () => { if(!scFuori) scY = window.scrollY; }, {passive: true});
function render(){ if(rq) return; rq = true; requestAnimationFrame(() => { rq = false; doRender(); }); }

function doRender(){
  const main = $('main');
  const inApp = st.sync !== 'nocfg' && st.gid && st.uid && st.ready.g && st.ready.u && st.mid && membro(st.mid);
  $('hdr').classList.toggle('hidden', !inApp);
  $('dock').classList.toggle('hidden', !inApp);
  const y0 = scFuori && Date.now() - scFuori < 4000 ? scY : window.scrollY;   // se la schermata d'ingresso è comparsa per un attimo, torna dov'eri
  const rimettiScroll = () => { scFuori = 0; if(Math.abs(window.scrollY - y0) > 1) window.scrollTo(0, y0); };
  const keep = {}, foc = document.activeElement && main.contains(document.activeElement) ? document.activeElement.id : null;
  main.querySelectorAll('input[id]:not([type=file]),textarea[id],select[id]').forEach(e => { keep[e.id] = e.type === 'checkbox' ? e.checked : e.value; });
  const restore = () => {
    for(const id in keep){ const e = $(id); if(e){ if(e.type === 'checkbox') e.checked = keep[id]; else e.value = keep[id]; } }
    cercaTutti();
    if(foc && $(foc)) $(foc).focus({preventScroll: true});   // senza preventScroll il browser portava in vista il campo (select/input) in cima alla pagina
  };
  if(!inApp){ if(!scFuori) scFuori = Date.now(); main.innerHTML = renderEntry(); restore(); return; }
  if(st.pinDoc === null || (st.pinDoc && st.pinDoc.temporaneo)){   // schermata bloccante: PIN personale da scegliere
    $('hdr').classList.add('hidden'); $('dock').classList.add('hidden'); closeSheet(); A['drawer-close']();
    main.classList.remove('wide'); main.innerHTML = entryPinGate(); restore(); return;
  }
  if(!regModalAperto && !LS.get(REG_KEY) && st.mid && st.ready.m && st.ready.mv){   // avviso «Regolamento aggiornato» (solo localStorage, nessuna scrittura su Firestore)
    regModalAperto = true; setTimeout(() => { if(!$('sheet').classList.contains('on') && !LS.get(REG_KEY) && st.page !== 'regolamento') A['reg-avviso'](); }, 700);
  }

  let d = derived();
  assicuraQuote(d); d = derived();
  // header
  const s = d.S.saldi[st.mid] || 0;

  $('syncdot').className = 'dot ' + ({ok:'ok', off:'off', err:'err'}[st.sync] || '');
  $('hdr-sub').textContent = st.sync === 'err' ? 'Errore: ' + st.syncErr : st.sync === 'off' ? 'Offline · si sincronizza dopo' : st.sync === 'ok' ? (st.gruppo.nome || 'Saletta') : 'Collegamento…';
  if(st.page === 'briefing' || st.page === 'compiti' || st.page === 'sfide') st.page = 'classifiche';   // Briefing e Sfide sono confluiti nella Classifica
  if(!pagineConsentite().includes(st.page)) st.page = 'bar';
  if(st.page === 'statistiche'){ st.page = 'classifiche'; st.clMod = 'stat'; }
  const cn = contatori(d);
  $('hdr-name').innerHTML = `${ic('coffee','s')}${esc(nomeBreve(st.mid))}`;
  const sb = $('hdr-sb'); sb.className = 'sbadge ' + (s < 0 ? 'neg' : 'pos'); sb.textContent = eurS(s); sb.dataset.p = 'crediti'; sb.setAttribute('aria-label', 'Saldo: tocca per ricaricare');
  aggiornaPillola(d, false);
  if(st.page === 'regolamento' && !LS.get(REG_KEY)) LS.set(REG_KEY, 1);   // aprire il regolamento vale come presa visione
  const rd = $('hdr-reg-dot'); if(rd) rd.classList.toggle('hidden', !!LS.get(REG_KEY));
  $('hdr-menu').classList.remove('hidden'); $('hdr-search').classList.toggle('hidden', !st.isAdmin);
  const tabs = [['bar','Home','coffee'],['classifiche','Classifica e statistiche','chart'],['registro','Cassa e registro','receipt'],['saletta','Saletta','sparkles'],['notifiche','Notifiche','bell']];
  const nb = cn.tot;
  $('dock').innerHTML = `<div class="dk" style="width:100%">${tabs.map(([p, l, i]) => `<button data-act="go" data-p="${p}" class="${(st.page === p || (p === 'saletta' && SALETTA_SUB.includes(st.page))) ? 'on' : ''}" id="dock-${p}" aria-label="${l}"><span class="tbw">${ic(i)}${p === 'saletta' && perleNuova() ? '<span class="tdot" id="dot-saletta" aria-label="Nuova perla nella bacheca"></span>' : ''}${p === 'notifiche' && nb ? `<span class="tb" id="tb-notifiche">${nb}</span>` : ''}</span>${l}</button>`).join('')}</div>`;
  sincronizzaGiacenze(d); sincronizzaEstratti(); sincronizzaSolo();
  $('fab-ov').classList.remove('on'); $('fab-menu').classList.remove('on');
  sincronizzaGiacenze(d); sincronizzaEstratti(); sincronizzaSolo();
  renderDrawer();

  const fn = {bar:pBar, onesta:pOnesta, caffereg:pCaffeReg, feed:pFeed, registro:pRegistro, crediti:pCrediti, notifiche:pNotifiche, supervisor:pSupervisor, pin:pPin, saletta:pSaletta, classifiche:pClassifiche, spesa:pSpesa, gioco:pGioco, ruota:pRuota, perle:pPerle, cassa:pCassa, inventario:pInventario, quote:pQuote, regolamento:pRegolamento, membri:pMembri, admin:pImpostazioni, regole:pRegole, backup:pBackup, chiusura:pChiusura, impostazioni:pImpostazioni}[st.page] || pBar;
  main.classList.remove('wide'); main.dataset.p = st.page;
  main.innerHTML = fn(d);
  restore();
  if(st.page === 'classifiche') cardShareMark();
  rimettiScroll();
  perleSync();
  perleCheck();
  bacPulisciVecchi();
}

/* icona «condividi» su ogni scheda di Classifica e Statistiche: condivide il contenuto della scheda come testo (nessuna lettura/scrittura) */
function cardShareMark(){
  document.querySelectorAll('#main .card').forEach(c => {
    if(c.querySelector('.cs-btn') || c.parentElement.closest('.card')) return;
    const h = c.querySelector(':scope > h3') || c.querySelector(':scope > .between');
    if(!h) return;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'iconbtn cs-btn'; b.dataset.act = 'card-share'; b.setAttribute('aria-label', 'Condividi questa scheda');
    b.innerHTML = ic('share', 's'); c.classList.add('cs-card'); c.appendChild(b);
  });
}
function cardTesto(c){
  const bt = new Set([...c.querySelectorAll('button')].map(x => (x.innerText || '').trim()).filter(Boolean));
  const h = c.querySelector(':scope > h3, :scope > .between'), titolo = h ? (h.innerText || '').replace(/\s*\n\s*/g, ' · ').trim() : '';
  const righe = (c.innerText || '').replace(/\t+/g, ' · ').split('\n').map(x => x.trim()).filter(x => x && !bt.has(x));
  return {titolo: titolo.replace(/\s*·\s*$/, ''), corpo: righe.join('\n')};
}
function renderDrawer(){
  const nav = (p, icona, label, id) => `<button class="nb ${st.page===p?'on':''}"${id ? ` id="${id}"` : ''} data-act="go" data-p="${p}">${ic(icona)}${label}</button>`;
  const voci = [];
  if(st.isAdmin){
    if(sonoCreatore()) voci.push(nav('supervisor', 'shield', '🛡️ Gestione Supervisor', 'nb-supervisor'));
    if(can('soci')) voci.push(nav('quote', 'banknote', '📅 Quote annuali', 'nb-quote'), nav('membri', 'users', '👥 Gestione Soci', 'nb-soci'), nav('pin', 'lock', '🔐 Gestione PIN', 'nb-pin'));
    if(can('compiti')) voci.push(nav('regole', 'sparkles', '⚙️ Regole punti &amp; premi', 'nb-regole'));
    if(can('sistema')) voci.push(nav('backup', 'download', 'Backup &amp; Ripristino', 'nb-backup'), nav('chiusura', 'archive', '📦 Chiusura periodo', 'nb-chiusura'));
  }
  const qsFoc = document.activeElement && document.activeElement.id === 'qs-in';
  $('drawer').innerHTML = `
    <div class="row" style="padding:4px 6px 14px;border-bottom:1px solid var(--line);margin-bottom:8px">
      <div class="av" style="background:rgba(245,165,36,.12);color:var(--amber)">${ic('coffee')}</div>
      <div class="grow" style="flex:1"><b>${esc(st.gruppo.nome || 'Saletta')}</b><div class="mut" style="font-size:12px">${esc(myName())}${st.isAdmin ? ' · ' + ruolo() : ''}</div></div>
      <button class="iconbtn" data-act="drawer-close">${ic('x')}</button>
    </div>
    ${st.isAdmin ? `<div id="qs-wrap"><div class="qs-box">${ic('search','s')}<input id="qs-in" type="search" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Cerca impostazione o socio..." aria-label="Cerca impostazione o socio" value="${esc(st.qsQ || '')}"></div><div id="qs-res"></div></div>` : ''}
    ${voci.length ? `<div class="mut" style="font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:6px 8px 2px">🛡️ Gestione</div>${voci.join('')}<div class="sep"></div>` : ''}
    <button class="nb ${st.page==='impostazioni'?'on':''}" data-act="go" data-p="impostazioni">${ic('settings')}Impostazioni</button>
    <button class="nb ${st.page==='regolamento'?'on':''}" data-act="go" data-p="regolamento">${ic('receipt')}Regolamento</button>
    ${sonoCreatore() ? `<button class="nb" id="nb-condividi-app" data-act="condividi-app">${ic('share')}Condividi app</button>` : ''}
    <button class="nb" data-act="info">${ic('info')}Info</button>
    <div style="margin-top:auto;padding:14px 8px 0;font-size:11px" class="mut">Armieri 5.0 v${VERSION}</div>`;
  if(st.isAdmin){ qsFiltra(); if(qsFoc && $('qs-in')){ const i = $('qs-in'); i.focus({preventScroll:true}); i.setSelectionRange(i.value.length, i.value.length); } } else st.qsQ = '';
}

/* ---------- ricerca rapida (solo Creatore e Supervisor): tutto in memoria, nessuna lettura Firestore ----------
   Ogni voce porta alla pagina giusta (e al riquadro, quando c'è) e compare solo se chi cerca ha il permesso. */
const qsNorm = t => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const QS_VOCI = [
  {e:'☕', t:'Scorta caffè in grani', s:'Inventario · kg, resa, ciclo', perm:'inventario', p:'inventario', a:'inv-caffe', k:'scorta caffe kg grani resa ciclo tazzine carico buste'},
  {e:'📦', t:'Inventario e listino', s:'Prezzi, snack, giacenze, Esaurito', perm:'inventario', p:'inventario', k:'inventario listino prezzi prezzo snack bibite esaurito giacenza giacenze articoli carico'},
  {e:'📅', t:'Quote annuali', s:'Pagamenti dell\'anno', perm:'soci', p:'quote', k:'quote quota annuali annuale pagamenti pagamento anno importo'},
  {e:'👥', t:'Gestione Soci', s:'Elenco soci, saldi, archivia, espelli', perm:'soci', p:'membri', k:'soci socio colleghi collega saldo saldi punti archivia espelli nickname gestione'},
  {e:'🔐', t:'Gestione PIN', s:'Reset PIN, PIN temporaneo', perm:'soci', p:'pin', k:'pin reset temporaneo codice password sblocco'},
  {e:'🛡️', t:'Gestione Supervisor', s:'Nomina, permessi e ruoli', perm:'creatore', p:'supervisor', k:'supervisor permessi permesso ruoli ruolo nomina revoca creatore admin amministratore'},
  {e:'⚙️', t:'Regole punti e premi', s:'Punteggi e premi del podio', perm:'compiti', p:'regole', k:'punti premi podio crediti ben fatto soglia tessera fedelta regole punteggi scala credito conversione'},
  {e:'🧹', t:'Mastro Lindo', s:'Classifica · assegna i punti delle pulizie', perm:'compiti', p:'classifiche', k:'mastro lindo pulizie punti extra assegna compiti incarichi'},
  {e:'💾', t:'Backup e ripristino', s:'Esporta i dati, ripristina', perm:'sistema', p:'backup', k:'backup esporta esportazione ripristino ripristina scarica dati salvataggio'},
  {e:'📦', t:'Chiusura periodo', s:'Chiusura, estratti, archivio', perm:'sistema', p:'chiusura', k:'chiusura periodo estratti estratto archivio chiudere'},
  {e:'📢', t:'Bacheca, eventi e sondaggi', s:'Home · avvisi, annunci, sondaggi, eventi', perm:null, p:'bar', a:'bacheca', k:'bacheca avviso avvisi annuncio annunci info novita sondaggio sondaggi evento eventi compleanno compleanni votazione'},
  {e:'🔓', t:'Consenti ai colleghi di pubblicare in Bacheca', s:'Impostazioni · interruttore del Creatore', perm:'creatore', p:'impostazioni', a:'card-bacheca-sw', k:'consenti colleghi pubblicare bacheca interruttore permessi avvisi eventi sondaggi'},
  {e:'💶', t:'Cassa: entrata, giroconto, correggi saldo', s:'Cassa e registro', perm:'cassa', p:'registro', a:'cassa-dash', k:'cassa entrata entrate giroconto correggi saldo revolut contanti giacenza uscite registro storno storni'},
  {e:'✅', t:'Approva richieste', s:'Notifiche · ricariche, spese, riscatti, iscritti', perm:'inbox', p:'notifiche', k:'richieste richiesta approva approvazione ricariche ricarica spese riscatti iscritti notifiche inbox'},
  {e:'🏷️', t:'Nome del gruppo', s:'Impostazioni', perm:'creatore', p:'impostazioni', k:'nome gruppo impostazioni rinomina'}
];
const qsPuo = perm => !perm || (perm === 'creatore' ? sonoCreatore() : can(perm));
function qsRisultati(q){
  const toks = qsNorm(q).split(' ').filter(Boolean);
  if(!toks.length) return [];
  const ok = txt => { const n = ' ' + qsNorm(txt); return toks.every(t => n.includes(' ' + t)); };   // ogni parola cercata deve iniziare una parola della voce
  const sez = QS_VOCI.filter(v => qsPuo(v.perm) && pagineConsentite().includes(v.p) && ok(v.t + ' ' + v.k)).map(v => ({tipo:'sez', v}));
  const soc = can('soci') ? membriAttivi().filter(m => ok((m.nome || '') + ' ' + (m.nick || ''))).sort((x, y) => (x.nome || '').localeCompare(y.nome || '', 'it')).slice(0, 6) : [];
  return {sez: sez.slice(0, 8), soc};
}
function qsFiltra(){
  const box = $('qs-res'); if(!box) return;
  const q = (($('qs-in') || {}).value || '').trim();
  st.qsQ = q;
  if(!q){ box.innerHTML = ''; st.qsList = []; return; }
  const r = qsRisultati(q), lista = [];
  let h = '';
  if(r.sez.length){ h += '<div class="qs-sec">Sezioni</div>'; r.sez.forEach(x => { lista.push({p:x.v.p, a:x.v.a}); h += `<button class="qs-r" data-act="qs-go" data-i="${lista.length - 1}"><span class="qs-e">${x.v.e}</span><span>${esc(x.v.t)}<small>${esc(x.v.s)}</small></span></button>`; }); }
  if(r.soc.length){
    h += '<div class="qs-sec">Soci</div>';
    r.soc.forEach(m => {
      lista.push({socio: m.id}); h += `<button class="qs-r" data-act="qs-go" data-i="${lista.length - 1}"><span class="qs-e">👤</span><span>${esc(m.nome)}${m.nick ? ' · ' + esc(m.nick) : ''}<small>Apri la scheda in Gestione Soci</small></span></button>`;
      lista.push({pin: m.id}); h += `<button class="qs-r" data-act="qs-go" data-i="${lista.length - 1}" style="padding-left:34px"><span class="qs-e">🔐</span><span>PIN di ${esc(m.nick || m.nome)}<small>Reset o PIN temporaneo</small></span></button>`;
    });
  }
  if(!h) h = '<div id="qs-vuoto">Nessun risultato per i tuoi permessi.</div>';
  st.qsList = lista; box.innerHTML = h;
}

const SALETTA_SUB = ['saletta','inventario','gioco','ruota','perle','spesa'];
const PAGINE_COLLEGA = ['bar','onesta','caffereg','saletta','classifiche','spesa','gioco','inventario','ruota','perle','impostazioni','regolamento','registro','crediti','notifiche'];
const PAGINE_UTENTE = PAGINE_COLLEGA.filter(p => p !== 'admin');
const PAGINE_ADM = PAGINE_UTENTE.concat(['onesta','regole','backup','chiusura','membri','quote','pin','supervisor','statistiche','cassa','feed']);
/* ogni voce di gestione compare solo a chi ha il permesso (il Creatore ha tutto) */
const PAGINE_PERM = {membri: 'soci', quote: 'soci', pin: 'soci', regole: 'compiti', backup: 'sistema', chiusura: 'sistema'};
const pagineConsentite = () => st.isAdmin ? PAGINE_ADM.filter(p => (!PAGINE_PERM[p] || can(PAGINE_PERM[p])) && (p !== 'supervisor' || sonoCreatore())) : PAGINE_COLLEGA;

/* ---------- installazione dell'app (PWA) ----------
   Browser e app installata conservano i dati separati: chi si registra dal browser e poi installa
   l'app si ritrova da capo. Per questo, finché non è registrato, chi apre l'app dal browser
   vede prima le istruzioni di installazione. */
const isStandalone = () => {
  try {
    return ['standalone', 'fullscreen', 'minimal-ui'].some(m => window.matchMedia('(display-mode: ' + m + ')').matches)
      || window.navigator.standalone === true || document.referrer.startsWith('android-app://');
  } catch(e){ return false; }
};
const piattaforma = () => {
  const ua = navigator.userAgent || '';
  if(/iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
  if(/Android/i.test(ua)) return 'android';
  return 'desktop';
};
const serveInstall = () => !st.gid && !st.skipInstall && !isStandalone();
let installPrompt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; render(); });
window.addEventListener('appinstalled', () => { installPrompt = null; st.installata = true; render(); });
const appUrl = () => location.origin + location.pathname.replace(/index\.html$/, '');

