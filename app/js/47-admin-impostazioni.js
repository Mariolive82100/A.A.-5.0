'use strict';
/* ---------- strumenti amministratore (menù a panino) ---------- */
const uidNome = uid => { const u = st.utenti.find(x => x.id === uid); return u ? nomeM(u.mid) : null; };
const bannerBackup = () => { const b = LS.get('backup_' + st.gid); return (!b || Date.now() - b > 7 * 864e5) ? `<div class="banner amber">${ic('alert')}<div>${b ? 'L\'ultimo backup risale a più di una settimana fa.' : 'Non hai ancora fatto un backup dei dati.'} <a href="#" data-act="go" data-p="backup" style="color:inherit;font-weight:800">Vai al backup</a></div></div>` : ''; };
const cardParametri = () => `  <div class="card"><h3>Nome del gruppo</h3>
    <label class="f"><span>Nome gruppo</span><input class="in" id="ad-nome" value="${esc(st.gruppo.nome||'')}" maxlength="40"></label>
    <button class="btn amber block" data-act="salva-gruppo">Salva</button>
    ${infoBtn(`Prezzo del caffè e listino: Saletta → Inventario. Quota annuale: ☰ → Quote annuali. Regole punti, soci, PIN, backup e chiusura sono nel menu ☰, sezione Gestione.`, 'Come funziona')}
  </div>
`;
const RP_SW = [['rp-on-caffe', 'ptCaffeOn', '☕🍫 Punti caffè e snack'], ['rp-on-bf', 'ptBfOn', '👏 Punti «Ben fatto»']];
const cardRegolePunti = () => `  <div class="card" id="card-regole-punti">
    ${infoBtn(`Un cambio vale per gli eventi futuri: quelli già registrati mantengono il loro valore (i punti sono congelati nei movimenti).`, 'Come funziona')}
    <label class="check"><input type="checkbox" id="rp-on" data-chg="rp-sw" ${ptMaster() ? 'checked' : ''}><b style="flex:1;font-size:14px">⭐ Sistema Punti e Gamification attivo</b></label>
    <p class="hint" style="margin:4px 0 8px">Se spento, nessun accredito di punti e premi del podio nascosti. I punti già maturati restano.</p>
    <div id="rp-sw-lista">${RP_SW.map(([id, k, l]) => `<label class="check"><input type="checkbox" id="${id}" ${flagOn(k) ? 'checked' : ''} ${ptMaster() ? '' : 'disabled'}><b style="flex:1;font-size:14px">${l}</b></label>`).join('')}</div>
    <button class="btn sm block ghost" id="btn-rp-consigliati" data-act="rp-consigliati" style="margin:8px 0">✨ Applica valori consigliati</button>
  </div>
  <div class="rp-grid">
  <div class="card" id="rp-a"><h3>A · Consumi &amp; spese</h3>
    <div class="grid2">
      <label class="f"><span>☕ Punti per caffè</span><input class="in mono" id="rp-caffe" inputmode="numeric" value="${ptCaffe()}"></label>
      <label class="f"><span>🍪 Punti per ogni 1,00 € di snack</span><input class="in mono" id="rp-snackeuro" inputmode="decimal" value="${nDec(ptSnackEuro())}"></label>
    </div>
    <div class="grid2">
      <label class="f"><span>🧾 Punti per ogni € di rimborso</span><input class="in mono" id="rp-speuro" inputmode="decimal" value="${nDec(ptSpesaEuro())}"></label>
      <label class="f"><span>Tetto punti per spesa</span><input class="in mono" id="rp-spmax" inputmode="numeric" value="${ptSpesaMax()}"></label>
    </div>
    <p class="hint" style="margin:-4px 0 8px;font-size:12px">Snack e spese: punti = importo × tariffa, arrotondati all'intero (le spese anche limitate dal tetto). Il rimborso resta al 100%.</p>
    <div class="grid2">
      <label class="f"><span>☕ Tazzine per 1 kg di caffè</span><input class="in mono" id="rp-resa" inputmode="numeric" value="${resaKg()}" data-chg="resa-gr"></label>
      <label class="f"><span>⚖️ Grammi per caffè</span><input class="in mono" id="rp-gr" inputmode="decimal" value="${grCaffe()}" data-chg="resa-gr"></label>
    </div>
    <p class="hint" style="margin:-4px 0 8px;font-size:12px">Sono lo stesso dato: grammi per caffè = 1000 ÷ tazzine per kg (predefinito ${CAFFE_PER_KG} tazzine, circa ${String(Math.round(10000 / CAFFE_PER_KG) / 10).replace('.', ',')} g). Se cambi uno, l'altro si aggiorna. Ogni caffè registrato scala la scorta stimata e la barra «Reale» della Home.</p>
  </div>
  <div class="card" id="rp-b"><h3>B · Obiettivi &amp; collaborazione</h3>
    <div class="grid2">
      <label class="f"><span>👏 Punti per «Ben fatto»</span><input class="in mono" id="rp-bf" inputmode="numeric" value="${ptBenFatto()}"></label>
    </div>
    <div class="grid2">
      <label class="f"><span>Gettoni «Ben fatto»</span><input class="in mono" id="rp-bfn" inputmode="numeric" value="${bfN()}"></label>
      <label class="f"><span>Ogni</span><select class="in" id="rp-bfp"><option value="settimana" ${bfPeriodo() === 'settimana' ? 'selected' : ''}>settimana</option><option value="mese" ${bfPeriodo() === 'mese' ? 'selected' : ''}>mese</option></select></label>
    </div>
  </div>
  <div class="card" id="rp-c"><h3>C · Premi del podio settimanale</h3>
    ${sonoCreatore() ? `<p class="hint" style="margin:0 0 8px;font-size:12px">Crediti che vincono i primi tre della classifica settimanale (da lunedì a domenica). Li imposta solo il Creatore. Metti 0 per nessun premio. Chi è sul podio li riscatta da solo, in Home, a settimana chiusa.</p>
    <div class="grid3" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
      ${[1, 2, 3].map(i => `<label class="f"><span>${['🥇 1°', '🥈 2°', '🥉 3°'][i - 1]} (€)</span><input class="in mono" id="rp-premio${i}" inputmode="decimal" value="${(premioPos(i) / 100).toFixed(2).replace('.', ',')}"></label>`).join('')}
    </div>
    <button class="btn amber block" id="btn-salva-premi" data-act="salva-premi-podio" style="margin-top:8px">Salva i premi</button>`
    : `<p class="hint" style="margin:0">I premi li imposta solo il Creatore. Attuali: ${premiPodio().some(x => x > 0) ? [1, 2, 3].map(i => ['🥇', '🥈', '🥉'][i - 1] + ' ' + eur(premioPos(i))).join(' · ') : 'nessun premio impostato'}.</p>`}
  </div>
  </div>
  <button class="btn amber block" id="btn-salva-punti" data-act="salva-punti" style="margin-bottom:12px">Salva le regole</button>
`;
function pRegole(){
  return `<h2>${ic('sparkles')} ⚙️ Regole punti &amp; premi ${infoBtn(`Tutto in un posto: consumi e spese, obiettivi e collaborazione, premi del podio settimanale (impostati dal Creatore)`)}</h2>${cardRegolePunti()}`;
}
function pBackup(d){
  return `<h2>${ic('download')} Backup & Ripristino</h2><p class="sub">Copia dei dati fuori dall'app.</p>
  <div class="card"><h3>Backup e ripristino</h3>
    <p class="tx2" style="font-size:13px;margin:0 0 10px">Copia completa di saldi, cassa, movimenti e periodi chiusi. Conservala fuori dall'app (Drive, email, WhatsApp a te stesso).${LS.get('backup_'+st.gid) ? ' Ultimo backup: ' + dataOra(LS.get('backup_'+st.gid)) + '.' : ' Non hai ancora fatto un backup.'}</p>
    <button class="btn block" data-act="backup">${ic('download','s')} Scarica backup (JSON)</button>
    <div class="grid2" style="margin-top:8px"><button class="btn" data-act="backup-invia">${ic('share','s')} Invia / salva</button><button class="btn" data-act="backup-csv">Excel (CSV)</button></div>
    ${sonoCreatore() ? `<button class="btn block ghost" style="margin-top:8px" data-act="ripristina-backup">Ripristina da file…</button>
    <input type="file" id="bk-file" accept=".json,application/json" hidden>` : '<p class="hint" style="margin:8px 0 0">Il ripristino da file lo può fare solo il Creatore.</p>'}
  </div>`;
}
/* Chiusure ravvicinate: tutto dai documenti `chiusure` e dai movimenti già in memoria (nessuna lettura in più) */
const trascorso = ms => { const h = Math.floor(ms / 36e5); return h < 1 ? 'meno di un\'ora' : h < 24 ? (h === 1 ? '1 ora' : h + ' ore') : (Math.floor(h / 24) === 1 ? '1 giorno' : Math.floor(h / 24) + ' giorni'); };
function infoChiusura(d){
  const last = ultimaChiusura();
  const nuovi = d.movs.filter(m => !m._pending && m.tipo !== 'storno' && !['annullata', 'rifiutata', 'assegnato'].includes(m.stato)).length;
  if(!last) return {last: null, nuovi, recente: false, pochi: false};
  const t = tms(last.ts) || last.fino.toMillis(), ms = Math.max(0, Date.now() - t);
  return {last, t, ms, nuovi, autore: last.autore || 'un Supervisor', n: last.n || 0, recente: ms < CHIUSURA_RECENTE_GG * 864e5, pochi: nuovi < CHIUSURA_MIN_NUOVI};
}
function pChiusura(d){
  const vecchi = d.movs.filter(m => m.t < Date.now() - CHIUSURA_MARGINE && !m._pending).length;
  const k = infoChiusura(d), last = k.last, avvisa = !!last && (k.recente || k.pochi);
  const box = last ? `<div class="banner sky" id="chiusura-ultima" style="font-size:14.5px;margin-bottom:12px">${ic('archive')}<div class="grow"><b>Ultima chiusura effettuata il ${dataOra(k.t)} da ${esc(k.autore)}</b> (${k.n} ${k.n === 1 ? 'movimento archiviato' : 'movimenti archiviati'})</div></div>`
    : `<div class="banner" id="chiusura-ultima" style="margin-bottom:12px">${ic('archive')}<div class="grow">Nessuna chiusura ancora effettuata.</div></div>`;
  const warn = avvisa ? `<div class="banner red" id="chiusura-recente" style="margin-bottom:12px">${ic('alert')}<div class="grow"><b>⚠️ ${k.recente ? `Periodo chiuso di recente da ${esc(k.autore)} solo ${trascorso(k.ms)} fa` : `Pochi movimenti nuovi dall'ultima chiusura (${esc(k.autore)}, ${dataOra(k.t)})`}</b>${k.pochi ? `<br><span style="font-size:12.5px">Dopo quella chiusura i movimenti significativi sono solo ${k.nuovi}.</span>` : ''}<br><span style="font-size:12.5px">Per chiuderlo di nuovo serve una doppia conferma.</span></div></div>` : '';
  return `<h2>${ic('archive')} Chiusura periodo</h2><p class="sub">Consolida e archivia i movimenti.</p>
  ${box}
  <div class="card"><h3>Chiusura periodo</h3>
    <p class="tx2" style="font-size:13px;margin:0 0 10px">Fissa saldi, cassa e giacenze e archivia i movimenti. Ogni telefono poi scarica solo i movimenti nuovi: tienilo leggero chiudendo una volta al mese.</p>
    <div class="between" style="font-size:13px;margin-bottom:10px"><span class="mut">Ultima chiusura</span><b>${last ? dataOra(k.t) : 'mai'}</b></div>
    <div class="between" style="font-size:13px;margin-bottom:12px"><span class="mut">Movimenti nel periodo aperto</span><b class="mono ${d.movs.length > 800 ? 'red' : ''}">${d.movs.length}</b></div>
    ${warn}
    <button class="btn block" id="btn-chiudi-periodo" data-act="chiudi-periodo" ${!vecchi || st.busy ? 'disabled' : ''}>${ic('archive','s')} Chiudi il periodo</button>
  </div>`;
}

/* ---------- IMPOSTAZIONI ---------- */
function pImpostazioni(){
  const link = location.origin + location.pathname + '#g=' + st.gid;
  return `<h2>${ic(st.isAdmin ? 'settings' : 'user')} ${st.isAdmin ? 'Impostazioni' : 'Profilo'}</h2><p class="sub">${esc(st.gruppo.nome || '')}</p>
  <div class="card"><h3>Tu</h3>
    <div class="between"><div><b>${esc(membro(st.mid).nome)}</b>${membro(st.mid).nick ? `<div class="amber" style="font-size:13px;font-weight:700">“${esc(membro(st.mid).nick)}”</div>` : ''}<div class="mut" style="font-size:12px">${ruolo()}</div></div>
    <button class="btn sm ghost" data-act="nick">${ic('edit','s')} Nickname</button></div></div>
  ${st.mid ? `<div class="card"><div class="between"><div><b>PIN personale</b><div class="mut" style="font-size:12px">Serve a ritrovare il profilo se cambi telefono</div></div><button class="btn sm" data-act="pin-cambia">${ic('lock','s')} Cambia</button></div></div>` : ''}
  ${sonoCreatore() ? cardParametri() : ''}
  ${sonoCreatore() ? `<div class="card" id="card-bacheca-sw"><h3>📢 Bacheca in Home</h3><label class="check"><input type="checkbox" id="bac-aperta" data-act="bac-aperta" ${bacAperta() ? 'checked' : ''}><b style="flex:1;font-size:14px">Consenti ai colleghi di pubblicare in Bacheca</b></label><p class="hint" style="margin:6px 0 0">Acceso: tutti possono pubblicare avvisi, eventi e sondaggi e gestire i propri. Spento: i colleghi consultano e votano, e pubblicano solo i compleanni; il resto lo pubblicano Creatore e Supervisor con «Strumenti di Sistema».</p></div>` : ''}
  ${st.isAdmin && !sonoCreatore() ? `<div class="card"><div class="between"><div><b>Ruolo di Supervisor</b><div class="mut" style="font-size:12px">${badgePerm(permDi(st.uid)) || 'nessun permesso'}</div></div><button class="btn sm ghost" data-act="lascia-admin">${ic('logout','s')} Lascia</button></div></div>` : ''}
  <div class="card"><div class="between"><div><b>Regolamento</b><div class="mut" style="font-size:12px">Regole di crediti, quote e compiti</div></div><button class="btn sm" data-act="go" data-p="regolamento">${ic('receipt','s')} Leggi</button></div></div>
  ${sonoCreatore() ? `<div class="card" id="card-invita"><h3>Invita i colleghi</h3>
    <div class="code mono" style="margin-bottom:10px">${esc(st.gid)}</div>
    <div class="grid2"><button class="btn sm" data-act="copia" data-v="${esc(st.gid)}">${ic('copy','s')} Copia codice</button>
    <button class="btn sm amber" data-act="condividi" data-v="${esc(link)}">${ic('share','s')} Invia link</button></div>
    <button class="btn block" id="btn-copia-link" data-act="copia-link" style="margin-top:8px">🔗 Copia link di accesso</button>
    ${infoBtn(`Mandalo solo ai colleghi. Per installarla: Chrome → menu ⋮ → <i>Aggiungi a schermata Home</i>; iPhone → Safari → Condividi → <i>Aggiungi alla schermata Home</i>.`, 'Come funziona')}</div>` : ''}
  <div class="card"><h3>Stato</h3>
    <div class="between" style="font-size:13px"><span class="mut">Sincronizzazione</span><span class="row" style="gap:6px"><span class="dot ${({ok:'ok',off:'off',err:'err'})[st.sync]||''}"></span>${st.sync === 'ok' ? 'collegato' : st.sync === 'off' ? 'offline' : st.sync === 'err' ? 'errore' : 'in corso'}</span></div>
    <div class="between" style="font-size:13px;margin-top:6px"><span class="mut">Versione</span><span>v${VERSION}</span></div></div>
  <button class="btn block ghost" data-act="esci-gruppo" style="color:var(--red)">${ic('logout','s')} Esci dal gruppo su questo telefono</button>
  ${isCreatore(st.mid) || (st.gruppo && st.gruppo.creatoDa === st.uid) ? `<div class="card" style="border-color:rgba(248,113,113,.45);margin-top:14px"><h3 style="color:var(--red)">Zona pericolosa</h3>
    <p class="mut" style="font-size:13px;margin:0 0 10px">Solo tu, che hai creato il gruppo, puoi eliminarlo. Vengono cancellati per sempre registro, saldi, cassa, inventario e colleghi. Prima scarica un backup da ☰ → Backup & Ripristino.</p>
    <button class="btn block" id="btn-elimina-gruppo" data-act="elimina-gruppo" style="background:var(--red);border-color:var(--red);color:#fff">${ic('trash','s')} Elimina il gruppo</button></div>` : ''}`;
}


/* =====================================================================
   AZIONI  (la tabella A è dichiarata in p7)
   ===================================================================== */
A['fab'] = () => { st.fab = !st.fab; render(); };
A['fab-close'] = () => { st.fab = false; render(); };
A['fab-go'] = ds => { st.fab = false; render(); A[ds.v]({}); };
A['notif-letti'] = () => { LS.set('notifSeen_' + st.mid, Date.now() + 1); render(); };



A['qs-apri'] = () => { A['drawer'](); setTimeout(() => { const i = $('qs-in'); if(i) i.focus(); }, 280); };
A['qs-go'] = ds => {
  const x = (st.qsList || [])[+ds.i]; if(!x) return;
  st.qsQ = '';
  const vai = (p, a, dopo) => {
    A['go']({p});
    setTimeout(() => {
      const el = a && $(a);
      if(el){ if(el.scrollIntoView) el.scrollIntoView({block:'start', behavior:'smooth'}); el.classList.add('qs-flash'); setTimeout(() => el.classList.remove('qs-flash'), 1800); }
      if(dopo) dopo();
    }, 160);
  };
  if(x.socio){ if(!can('soci')) return; vai('membri', null, () => A['membro']({id: x.socio})); }
  else if(x.pin){ if(!can('soci')) return; st.pinSel = x.pin; vai('pin', 'pin-azioni'); }
  else vai(x.p, x.a);
};
A['drawer'] = () => { $('drawer').classList.add('on'); $('drawer-ov').classList.add('on'); };
A['info'] = () => { A['drawer-close'](); openSheet(`<h3>${ic('info')} Info</h3>
  <p class="sub">Armieri 5.0 v${VERSION} · ${esc(st.gruppo.nome || '')}</p>
  <div class="card" style="margin:0 0 10px"><div class="between" style="font-size:13px;margin-bottom:6px"><span class="tx2">Il tuo ruolo</span><b>${ruolo()}</b></div>
    <div class="between" style="font-size:13px;margin-bottom:6px"><span class="tx2">Prezzo caffè</span><b class="mono">${eur(st.gruppo.prezzoCaffe || 0)}</b></div>
    <div class="between" style="font-size:13px"><span class="tx2">Quota fondo annuale</span><b class="mono">${eur(st.gruppo.quotaAnnua || 0)}</b></div></div>
  ${infoBtn(`Il saldo è prepagato: si consuma solo con crediti sufficienti. La quota annuale del fondo è separata dal saldo: la richiedi dalla Home e un Supervisor la conferma. Ricariche e pagamenti li conferma un Supervisor. Saldi e movimenti degli altri sono visibili solo ail Creatore e i Supervisor.`, 'Come funziona')}
  <button class="btn block" data-act="sheet-close">Chiudi</button>`); };
/* forza l'aggiornamento: svuota cache e service worker, rilegge i file dalla rete e ricarica (dati e accesso restano) */
A['aggiorna'] = async () => {
  toast('Aggiorno all\'ultima versione…');
  try{
    await Promise.all(['index.html', 'config.js', 'sw.js'].map(f => fetch(f, {cache: 'reload'}).catch(() => {})));
    if('serviceWorker' in navigator){ const rs = await navigator.serviceWorker.getRegistrations(); await Promise.all(rs.map(r => r.unregister())); }
    if(window.caches){ const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k))); }
  }catch(e){}
  location.reload();
};
A['drawer-close'] = () => { $('drawer').classList.remove('on'); $('drawer-ov').classList.remove('on'); };
A['sheet-close'] = closeSheet;
A['go'] = ds => { if(sfHd > 0){ const n = sfHd; sfHd = 0; try { history.go(-n); } catch(e){} } if(ds.p === 'sfide'){ sfSez = null; sfDet = null; sfTab = 'corso'; } if(ds.p === 'crediti') st.creditiTab = ds.t || null; st.fab = false; st.page = pagineConsentite().includes(ds.p) ? ds.p : 'bar'; LS.set('page', ds.p); A['drawer-close'](); closeSheet(); window.scrollTo(0,0); render(); };
A['entry'] = ds => { st.entry = ds.v || null; render(); };

