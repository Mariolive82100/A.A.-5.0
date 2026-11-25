'use strict';
/* ---------- pagina BAR ---------- */
/* consiglio di Chiusura Periodo (solo chi ha «Strumenti di sistema»): tutto dai dati già in memoria */
const chiusuraNasc = () => LS.get('chiusuraNasc_' + st.gid) === oggiISO();
/* invito a collegare Google / email: solo a chi è dentro con la sessione anonima; si può nascondere per oggi */
const accountNasc = () => LS.get('accNasc') === oggiISO();
function bannerAccount(){
  if(st.authAnon !== true || accountNasc()) return '';
  return `<div class="banner sky" id="banner-account">${ic('lock')}<div class="grow"><b>Collega il tuo account</b><br><span style="font-size:12.5px">Con Google o email non perdi il profilo se cambi telefono. Saldo e punti restano quelli di oggi.</span>
    <div style="margin-top:8px;display:flex;gap:10px;flex-wrap:wrap;align-items:center"><button class="btn sm amber" id="btn-account-vai" data-act="account-vai">Collega ora</button><button class="btn link" id="btn-account-nascondi" data-act="account-nascondi" style="padding:0;color:inherit;opacity:.8">Nascondi per oggi</button></div></div></div>`;
}
function bannerChiusura(d){
  if(!can('sistema') || !st.ready.mv || chiusuraNasc()) return '';
  const k = infoChiusura(d), n = d.movs.length, o = new Date();
  if(k.last && k.recente) return '';
  const giorni = k.last ? Math.floor(k.ms / 864e5) : 0;
  const inizioMese = !!k.last && o.getDate() <= 5 && k.t < new Date(o.getFullYear(), o.getMonth(), 1).getTime() && n >= 50;
  if(!(n >= CHIUSURA_SOGLIA_MOV || (!!k.last && giorni > CHIUSURA_SOGLIA_GG && k.nuovi >= CHIUSURA_MIN_NUOVI) || inizioMese)) return '';
  const rich = d.pendenti.length;
  const sub = n + (n === 1 ? ' movimento aperto' : ' movimenti aperti') + (k.last ? ', ultima chiusura ' + (giorni === 0 ? 'oggi' : giorni === 1 ? '1 giorno fa' : giorni + ' giorni fa') : ', nessuna chiusura finora');
  const nasc = `<button class="btn link" id="btn-chiusura-nascondi" data-act="chiusura-nascondi" style="padding:0;color:inherit;opacity:.8">Nascondi per oggi</button>`;
  if(rich){
    const parti = [rich ? `${rich} ${rich === 1 ? 'richiesta in attesa' : 'richieste in attesa'}` : ''].filter(Boolean).join(' e ');
    return `<div class="banner amber" id="banner-chiusura">${ic('alert')}<div class="grow">⚠️ <b>Prima di chiudere:</b> hai ${parti}.<br><span style="font-size:12.5px">${sub}</span>
      <div style="margin-top:8px;display:flex;gap:10px;flex-wrap:wrap;align-items:center">${rich ? '<button class="btn sm amber" id="btn-chiusura-richieste" data-act="go" data-p="notifiche">Vai alle richieste</button>' : ''}${nasc}</div></div></div>`;
  }
  return `<div class="banner sky" id="banner-chiusura">${ic('archive')}<div class="grow">📦 <b>Momento ideale per la Chiusura Periodo</b><br><span style="font-size:12.5px">${sub}</span>
    <div style="margin-top:8px;display:flex;gap:10px;flex-wrap:wrap;align-items:center"><button class="btn sm" id="btn-chiusura-apri" data-act="go" data-p="chiusura">Apri Chiusura periodo</button>${nasc}</div></div></div>`;
}
function pBar(d){
  const s = d.S.saldi[st.mid] || 0;
  const g = st.gruppo, pc = g.prezzoCaffe || 0, q = st.caffeQta;
  const mie = d.pendenti.filter(m => m.mid === st.mid && m.tipo !== 'compito');
  const basse = st.prodotti.filter(p => p.attivo !== false && (d.S.stock[p.id] || 0) <= SOGLIA_SCORTA);
  const recenti = d.movs.filter(m => m.uid === st.uid && ['caffe','snack'].includes(m.tipo) && !m.stato && !d.stornati.has(m.id) && Date.now() - m.t < ANNULLA_MIN*60000).reverse();
  const sq = statoQuota(d, st.mid, anno());
  const quotaDa = st.gruppo.quotaAnnua > 0 && st.ready.mv && sq !== 'pagata';
  const qAtt = d.pendenti.find(m => m.tipo === 'quota' && m.mid === st.mid && String(m.anno) === anno());
  const snDisp = st.prodotti.filter(p => p.id !== PID_CAFFE && p.categoria !== 'fondo' && p.attivo !== false && p.esaurito !== true && giacenza(d, p) > 0);
  const noCaffe = !puoPagare(pc), snVuoto = snDisp.length === 0, noSnack = snVuoto || !snDisp.some(p => puoPagare(p.prezzo));
  const scRic = scambiPerMe(d).length;
  return `
  ${can('sistema') ? bannerBackup() : ''}
  ${bannerChiusura(d)}
  ${bannerAccount()}
  ${scRic ? `<div class="banner amber" id="banner-scambi">${ic('alert')}<div class="grow"><b>${scRic === 1 ? 'Un collega vuole comprare' : scRic + ' colleghi vogliono comprare'} crediti da te</b></div><button class="btn sm amber" data-act="go" data-p="notifiche">Vedi</button></div>` : ''}
  ${quotaDa ? (qAtt ? `<div class="banner amber" id="banner-quota">${ic('clock')}<div class="grow">⏳ <b>Quota saletta</b> (${eur(qAtt.importo)}): richiesta inviata, in attesa di conferma.</div><button class="btn sm ghost" id="btn-annulla-quota" data-act="annulla-richiesta" data-id="${qAtt.id}">Annulla</button></div>` : `<div class="banner red" id="banner-quota">${ic('alert')}<div class="grow">⚠️ <b>Quota saletta non ancora saldata</b> (${eur(st.gruppo.quotaAnnua)}).</div><button class="btn sm amber" id="btn-paga-quota" data-act="paga-quota">Paga quota</button></div>`) : ''}
  <div class="card" style="text-align:center">
    <small class="mut">Il tuo saldo</small>
    <div class="mono ${s < 0 ? 'red' : 'green'}" id="home-saldo" style="font-size:30px;font-weight:800;line-height:1.15;margin:2px 0 10px">${eurS(s)}</div>
    <div class="grid2" style="gap:8px">
      <button class="btn amber block" id="btn-ricarica" data-act="ricarica-saldo">➕ Ricarica</button>
      <button class="btn green block" id="btn-riscatta" data-act="riscatta-menu">💰 Riscatta o rimborso</button>
    </div>
        ${!ptMaster() ? '' : homeSett(d)}
    ${d.pendenti.filter(m => m.mid === st.mid && m.tipo === 'riscatto').map(m => `<div class="between" style="margin-top:8px;font-size:12.5px"><span class="tx2">Riscatto in attesa di pagamento: <b class="mono">${eur(m.importo)}</b></span><button class="btn link" style="padding:0" data-act="annulla-richiesta" data-id="${m.id}">Annulla</button></div>`).join('')}
  </div>
  ${avvisiHome()}
  ${noCaffe || (noSnack && !snVuoto) ? `<div class="banner amber" id="banner-credito">${ic('alert')}<div class="grow"><b>${MSG_CREDITO}</b>${noCaffe && noSnack && !snVuoto ? ' (caffè e snack)' : noCaffe ? ' (caffè)' : ' (snack)'}${s < 0 ? ` · devi coprire il debito di ${eur(-s)} e arrivare almeno al prezzo del prodotto` : ''}</div><button class="btn sm amber" data-act="go" data-p="crediti" data-t="acq">Ricarica</button></div>` : ''}
  <div class="home" style="min-height:0;justify-content:flex-start;padding:0 0 4px">
    <div class="blob" style="width:200px;height:200px;background:#f5a524;top:4%;left:-40px"></div>
    <div class="blob" style="width:220px;height:220px;background:#7c3aed;top:38%;right:-60px"></div>
    <div class="blob" style="width:180px;height:180px;background:#10b981;bottom:2%;left:20%"></div>
    <div class="grid">
      <button class="gbtn" id="btn-paga" data-act="paga-menu" ${noCaffe && noSnack ? 'disabled' : ''}><span class="em">💳</span>Paga${noCaffe && noSnack ? '<small>credito insufficiente</small>' : '<small>Caffè, snack e bibite</small>'}</button>
      <button class="gbtn" id="btn-soon" disabled aria-disabled="true"><span class="em">✨</span>Coming soon<small>Novità in arrivo</small></button>
      <button class="gbtn" id="btn-benfatto" data-act="benfatto" ${bfRestanti() > 0 ? '' : 'disabled'}><span class="em">👏</span>Ben fatto<small id="bf-stato">${!onP('ptBfOn') && bfRestanti() > 0 ? 'Riconosci un collega' : bfRestanti() > 0 ? bfRestanti() + (bfRestanti() === 1 ? ' gettone disponibile' : ' gettoni disponibili') : 'Disponibile ' + bfCountdown()}</small></button>
      <button class="gbtn" id="btn-crediti-home" data-act="crediti-menu"><span class="em">🎁</span>Regala o scambia crediti<small>Tra colleghi</small></button>
    </div>
  </div>
  ${bacheca()}
  ${recenti.length ? `<div class="card"><h3><span class="row" style="gap:6px">${ic('undo','s')} Preso per sbaglio?</span><span class="mut" style="font-size:10.5px;text-transform:none;letter-spacing:0">annullabile per ${ANNULLA_MIN} min</span></h3>
    ${righeMov(recenti, d, {compact:true})}</div>` : ''}`;
}

/* ---------- richieste, notifiche, crediti ---------- */
const testoAttesa = m => m.tipo === 'quota' ? 'Quota fondo ' + esc(m.anno) + ' ' + eur(m.importo) + ' · ' + (FONTI[m.metodo] || m.metodo) : m.tipo === 'ricarica' ? (m.fondo ? 'Quota fondo ' : 'Ricarica ') + eur(m.importo) + ' · ' + (FONTI[m.metodo] || m.metodo) : m.tipo === 'riscatto' ? 'Riscatto ' + eur(m.importo) + ' · ' + (FONTI[m.metodo] || m.metodo) : 'Spesa ' + eur(m.importo) + ' · ' + esc(m.descr || '');
function richiesteUtente(d){
  const mie = d.pendenti.filter(m => m.mid === st.mid && m.tipo !== 'compito');
  return mie.length ? `<div class="card"><h3>${ic('clock','s')} In attesa</h3><div class="list">${mie.map(m => `
      <div class="li"><div class="av">${ic('clock','s')}</div><div class="grow"><div class="t" style="font-size:13px">${testoAttesa(m)}</div><div class="d">In attesa di conferma di un Supervisor</div></div>
      <button class="btn sm ghost" data-act="annulla-richiesta" data-id="${m.id}">Annulla</button></div>`).join('')}</div></div>` : '';
}
const recVisti = () => LS.get('recVisti_' + st.gid, []);
const recuperiNuovi = () => { const v = recVisti(); return st.utenti.filter(u => u.recuperato && u.id !== st.uid && !v.includes(u.id) && (tms(u.ts) || Date.now()) > Date.now() - 7 * 864e5); };
function contatori(d){
  const seen = notifSeen();
  const sc = scambiPerMe(d).length;
  const nc = nCpConv();
  const pers = notifiche(d).filter(n => n.t > seen).length + sc;
  const fondo = st.isAdmin ? (can('inbox') ? d.pendenti.filter(m => m.tipo !== 'compito').length + st.richieste.length : 0) + (canAccessi() ? recuperiNuovi().length : 0) + nc : 0;
  return {pers: pers + nc, fondo, tot: pers + (st.isAdmin ? fondo : nc)};
}
function pNotifiche(d){
  const list = notifiche(d), seen = notifSeen();
  const daApp = st.isAdmin && (can('inbox') || can('compiti') || canAccessi()) ? `<div class="card" id="da-approvare" style="padding-bottom:4px"><h3><span>🛡️ Da approvare</span></h3>${inboxAdmin(d)}</div>` : '';
  return `<h2>${ic('bell')} Notifiche</h2><p class="sub">${st.isAdmin ? 'Richieste da approvare e notifiche che ti riguardano.' : 'Richieste da gestire ed esiti che ti riguardano.'}</p>
  ${daApp}${st.isAdmin ? '' : cpConvCard()}${scambiRicevuti(d)}${scambiInviati(d)}${richiesteUtente(d) || ''}
  <div class="card"><h3><span>Esiti e accrediti</span><button class="btn link" data-act="notif-letti">Segna tutte come lette</button></h3>
    ${list.length ? `<div class="list" id="notif-list">${list.map(n => `<div class="li" style="${n.t > seen ? 'border-color:var(--amber)' : ''}"><div class="av">${n.e}</div><div class="grow"><div class="t" style="white-space:normal;font-size:13.5px">${n.x}${n.t > seen ? ' <span class="pill amber">nuova</span>' : ''}</div><div class="d">${quando(n.t)}</div></div></div>`).join('')}</div>` : '<div class="empty">Nessuna notifica.</div>'}</div>
  ${incarichiSospesi()}${storicoRichieste(d)}`;
}
function inboxAdmin(d){
  const it = [];
  const bt = (act, id, cls, lab, v) => `<button class="btn sm ${cls}" data-act="${act}" data-id="${id}"${v ? ` data-v="${v}"` : ''}>${lab}</button>`;
  const card = (t, tag, cls, titolo, sub, azioni) => it.push({t, h: `<div class="card" style="margin-bottom:10px"><div class="between" style="margin-bottom:6px"><span class="pill ${cls}">${tag}</span><span class="mut" style="font-size:11.5px">${t ? quando(t) : ''}</span></div>
    <div style="font-size:14.5px;font-weight:700">${titolo}</div>${sub ? `<div class="tx2" style="font-size:13px;margin-top:2px">${sub}</div>` : ''}
    ${azioni.length ? `<div style="display:grid;grid-template-columns:repeat(${azioni.length},1fr);gap:8px;margin-top:10px">${azioni.join('')}</div>` : `<div class="mut" style="font-size:12px;margin-top:8px">È un tuo compito: lo convalida un altro Supervisor o il Creatore.</div>`}</div>`});
  if(can('inbox')) st.richieste.forEach(r => card(r.ts && r.ts.toMillis ? r.ts.toMillis() : Date.now(), 'Accesso', 'sky', esc(r.nome), (r.nick ? '“' + esc(r.nick) + '” · ' : '') + 'chiede di entrare nel gruppo', [bt('approva', r.id, 'green', 'Valuta')]));
  d.pendenti.forEach(m => {
    if(m.tipo === 'compito' ? !can('compiti') : !can('inbox')) return;
    if(m.tipo === 'spesa') card(m.t, 'Spesa', 'violet', `${esc(nomeM(m.mid))} · ${eur(m.importo)}`, `${m.articoliNomi && m.articoliNomi.length ? '🛒 ' + m.articoliNomi.map(esc).join(', ') : esc(m.descr || '')}${m.note ? ' · «' + esc(m.note) + '»' : ''} · ${spesaMista(m) || (m.fonte === 'denaro' ? 'rimborso in denaro reale' : 'rimborso in crediti')}`,
      [bt('esito', m.id, 'ghost', 'Rifiuta', 'rifiutata'), (m.fonte === 'denaro' || m.fonte === 'misto') ? bt('paga-spesa', m.id, 'green', 'Convalida e Paga') : bt('esito', m.id, 'green', 'Convalida', 'confermata')]);
    else if(m.tipo === 'ricarica') card(m.t, 'Versamento', 'amber', `${esc(nomeM(m.mid))} · ${eur(m.importo)}`, `${m.fondo ? 'Quota fondo' : 'Ricarica crediti'} · ${esc(FONTI[m.metodo] || m.metodo || '')}`,
      [bt('esito', m.id, 'ghost', 'Rifiuta', 'rifiutata'), bt('esito', m.id, 'green', 'Conferma incasso', 'confermata')]);
    else if(m.tipo === 'quota') card(m.t, 'Quota fondo', 'amber', `${esc(nomeM(m.mid))} · ${eur(m.importo)}`, `Quota ${esc(m.anno)} · ${esc(FONTI[m.metodo] || m.metodo || '')} · entra in cassa, il saldo del collega non cambia`,
      [bt('esito', m.id, 'ghost', 'Rifiuta', 'rifiutata'), bt('esito', m.id, 'green', 'Conferma incasso', 'confermata')]);
    else if(m.tipo === 'riscatto') card(m.t, 'Riscatto', 'green', `${esc(nomeM(m.mid))} · ${eur(m.importo)}`, `chiede al Fondo Gruppo · preferisce ${esc(FONTI[m.metodo] || m.metodo || '')} · saldo ${eurS(saldo(m.mid))}`,
      [bt('esito', m.id, 'ghost', 'Rifiuta', 'rifiutata'), bt('riscatto-paga', m.id, 'green', 'Paga e conferma')]);
    else if(m.tipo === 'compito') card(m.fattoTs || m.t, 'Compito', 'violet', `${esc(m.nome || 'Compito')} · ${esc(nomeM(m.mid))}`, `Segnala di aver svolto il compito · +${m.punti || 0} punti alla convalida`,
      cpPuoConv(m) ? [bt('esito', m.id, 'ghost', 'Rifiuta / Riassegna', 'rifiutata'), bt('esito', m.id, 'green', 'Convalida', 'confermata')] : []);
    else card(m.t, 'Richiesta', 'mut', descMov(m).t, '', [bt('esito', m.id, 'ghost', 'Rifiuta', 'rifiutata'), bt('esito', m.id, 'green', 'Conferma', 'confermata')]);
  });

  if(canAccessi()) recuperiNuovi().forEach(u => card(tms(u.ts) || Date.now(), 'Profilo recuperato', 'amber', `${esc(nomeM(u.mid))} è rientrato da un nuovo telefono`, 'Ha usato il PIN personale. Se non è stato lui, scollega il telefono: il PIN viene azzerato.', [bt('rec-ok', u.id, 'ghost', 'Va bene'), bt('rec-scollega', u.id, 'red', 'Scollega')]));
  it.sort((a, b) => b.t - a.t);
  return it.length ? `<div class="mut" style="font-size:12.5px;margin:0 2px 10px">${it.length} ${it.length === 1 ? 'richiesta' : 'richieste'} in sospeso</div>${it.map(x => x.h).join('')}` : '<div class="card"><div class="empty">Nessuna richiesta in sospeso. 🎉</div></div>';
}
function pCrediti(d){
  const s = saldo(st.mid) || 0, mie = d.pendenti.filter(m => m.mid === st.mid && ['ricarica', 'riscatto'].includes(m.tipo));
  return `<h2>${ic('wallet')} Crediti ${infoBtn(`1 credito = 1 €. I soldi passano fuori dall'app e un Supervisor conferma.`)}</h2>
  <div class="card" style="text-align:center"><small class="mut">Il tuo saldo</small>
    <div class="mono ${s < 0 ? 'red' : 'green'}" style="font-size:30px;font-weight:800;line-height:1.15;margin:2px 0 10px">${eurS(s)}</div>
    <div class="grid2" style="gap:8px"><button class="btn amber block" id="cr-ricarica" data-act="ricarica-saldo">➕ Ricarica</button><button class="btn green block" id="cr-riscatta" data-act="riscatta-menu">💰 Riscatta o rimborso</button></div>
    <div style="margin-top:8px"><button class="btn regalo block" id="btn-crediti" data-act="crediti-menu">🎁 Regala o scambia crediti</button></div></div>
  ${scambiRicevuti(d)}${scambiInviati(d)}
  ${mie.length ? `<div class="card"><h3>${ic('clock','s')} In attesa</h3><div class="list">${mie.map(m => `<div class="li"><div class="av">${ic('clock','s')}</div><div class="grow"><div class="t" style="font-size:13px">${testoAttesa(m)}</div><div class="d">In attesa di conferma di un Supervisor</div></div><button class="btn sm ghost" data-act="annulla-richiesta" data-id="${m.id}">Annulla</button></div>`).join('')}</div></div>` : ''}
  ${infoBtn('<b>Ricarica:</b> scegli importo e modalità (contanti in cassetta o Revolut). Quando il Supervisor conferma l\'incasso, i crediti arrivano sul saldo.<br><br><b>Riscatto:</b> chiedi al Fondo Gruppo di restituirti denaro: l\'importo resta riservato finché il Supervisor non ti paga.<br><br><b>Tra colleghi:</b> «Regala crediti» è immediato e senza approvazioni; «Acquista crediti da un collega» richiede che il venditore confermi di aver ricevuto il denaro.', 'Come funzionano ricariche e riscatti')}`;
}

