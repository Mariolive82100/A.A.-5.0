'use strict';
/* ---------- Avvisi e comunicazioni in Home ---------- */
const isoLocale = ms => { const d = new Date(ms); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
/* campo scadenza: '' -> null (nessuna), data nel passato -> false, altrimenti millisecondi */
const scadInput = id => { const v = val(id); if(!v) return null; const t = new Date(v).getTime(); return Number.isFinite(t) && t > Date.now() ? t : false; };
/* avvisi automatici: eventi da oggi a 3 giorni. Solo dati gia' in memoria (st.eventi), nessuna lettura ne' scrittura */
function avvisiAuto(){
  return evVeri().filter(e => e && e.titolo && e.data)
    .map(e => ({e, g: giorniA(prossimaData(e))})).filter(x => x.g >= 0 && x.g <= 3)
    .sort((a, b) => a.g - b.g)
    .map(({e, g}) => {
      const [em, lab, , rgb, tc] = evTipo(e.tipo), cd = g === 0 ? 'Oggi!' : g === 1 ? 'Domani' : 'Tra ' + g + ' giorni';
      const sub = g === 0 && e.tipo === 'compleanno' ? 'Ricordategli i pasticcini 🎉' : (e.autore ? 'Inserito da ' + esc(e.autore) : '');
      return {g, tipo: e.tipo || 'altro', st: `--avc:rgba(${rgb},.75);--avb:rgba(${rgb},.14);--avt:${tc};--avg:${rgb}`,
        t: `<div class="avv-t">${em} ${lab} · ${cd}</div><div class="avv-m">${esc(e.titolo)}</div>${sub ? `<div class="avv-t" style="margin-top:2px;opacity:.75;text-transform:none;font-weight:600">${sub}</div>` : ''}`};
    });
}
const scadVivo = o => !o || !o.scad || Date.now() < o.scad;
function avvisiHome(){
  const auto = avvisiAuto();
  let h = '';
  auto.forEach((x, i) => { h += `<div class="avv" id="avviso-evento-${i}" data-tipo="${esc(x.tipo)}" data-g="${x.g}" style="${x.st}" role="status">${x.t}</div>`; });
  const nc = nCpConv();   // promemoria al Supervisor: compiti svolti da convalidare
  if(nc) h += `<button class="avv violet" id="avviso-conv" data-act="go" data-p="notifiche"><div class="avv-t">🛡️ ${nc === 1 ? '1 compito da convalidare' : nc + ' compiti da convalidare'}</div><div class="avv-m"><b>Apri le Notifiche →</b></div></button>`;
  const pm = podioDaAssegnare();   // admin: a inizio mese, bonus podio del mese precedente da assegnare con un tocco
  if(pm) h += `<button class="avv amber" id="avviso-podio" data-act="podio-apri"><div class="avv-t">🏅 Podio del mese</div><div class="avv-m"><b>Assegna i bonus di ${esc(pm.nome)}</b><br><span style="font-size:12.5px">Prima convalida le ultime richieste e i compiti di fine mese.</span></div></button>`;
  return h;
}

/* ---------- Bacheca in Home: eventi, avvisi e sondaggi ----------
   Tutto vive nella raccolta 'eventi' (stessi due listener di prima, max 30 documenti ciascuno): nessuna lettura in piu'.
   Avvisi: tipo info | annuncio | novita. Sondaggi: tipo 'sondaggio' con mappa voti {mid: indice}, voto modificabile finche' e' aperto. */
const BAC_AVV = {info: ['ℹ️', 'Info', 'sky'], annuncio: ['📢', 'Annuncio', 'amber'], novita: ['🥐', 'Novità in sala', 'green']};
const BAC_TIPI = ['info', 'annuncio', 'novita', 'sondaggio'];
const BAC_SCAD = [['24', '24 ore'], ['48', '48 ore'], ['0', 'Fino a rimozione']];
const isBac = e => !!e && BAC_TIPI.includes(e.tipo);
const evVeri = () => (st.eventi || []).filter(e => e && !isBac(e) && e.titolo && e.data);
const moderatore = () => sonoCreatore() || can('sistema');
const bacAperta = () => !!(st.gruppo && st.gruppo.bachecaAperta === true);
const puoBacheca = () => moderatore() || bacAperta();
const sondAperto = e => e.chiuso !== true && scadVivo(e);
const bacOrd = (a, b) => (b.fissato ? 1 : 0) - (a.fissato ? 1 : 0) || tms(b.ts) - tms(a.ts);
/* novita' degli altri dall'ultima volta che hai aperto la Bacheca: stato solo locale, nessuna lettura */
function nBacNuovi(){
  if(!st.gid) return 0;
  const k = 'bacVisti_' + st.gid, v = LS.get(k, null);
  if(v == null){ LS.set(k, Date.now()); return 0; }
  return (st.eventi || []).filter(e => e.uid !== st.uid && tms(e.ts) > v && (!isBac(e) || scadVivo(e))).length;
}
function bacVoti(e){
  const n = (e.opzioni || []).length, c = Array(n).fill(0), v = e.voti || {};
  Object.keys(v).forEach(k => { const i = v[k]; if(Number.isInteger(i) && i >= 0 && i < n) c[i]++; });
  return {c, tot: c.reduce((a, b) => a + b, 0), mio: Number.isInteger(v[st.mid]) ? v[st.mid] : null};
}
const bacAzioni = e => {
  const mod = moderatore();
  if(!mod && e.uid !== st.uid) return '';
  return `<div class="bac-az">${mod ? `<button class="iconbtn" data-act="bac-fissa" data-id="${e.id}" aria-label="${e.fissato ? 'Togli dall\'evidenza' : 'Fissa in evidenza'}">${e.fissato ? '📍' : '📌'}</button>` : ''}
    <button class="iconbtn" data-act="bac-modifica" data-id="${e.id}" aria-label="Modifica">${ic('edit', 's')}</button>
    ${e.tipo === 'sondaggio' ? `<button class="iconbtn" data-act="bac-chiudi" data-id="${e.id}" aria-label="${e.chiuso ? 'Riapri' : 'Chiudi'} il sondaggio">${e.chiuso ? '🔓' : '🔒'}</button>` : ''}
    <button class="iconbtn" data-act="bac-elimina" data-id="${e.id}" aria-label="Elimina">${ic('trash', 's')}</button></div>`;
};
const bacAvviso = e => {
  const [em, lab, col] = BAC_AVV[e.tipo], t = tms(e.ts);
  return `<div class="bac-it ${col}" id="bac-${e.id}" data-tipo="${e.tipo}"><div class="bac-h">${e.fissato ? '📌 ' : ''}${em} ${lab}${e.autore ? ' · ' + esc(e.autore) : ''}${t ? ' · ' + quando(t) : ''}${e.scad ? ' · fino al ' + dataOra(e.scad) : ''}</div>
    <div class="bac-m">${esc(e.testo || '')}</div>${bacAzioni(e)}</div>`;
};
const bacSondaggio = e => {
  const v = bacVoti(e), aperto = sondAperto(e), t = tms(e.ts);
  return `<div class="bac-it violet bac-poll" id="bac-${e.id}" data-tipo="sondaggio"><div class="bac-h">${e.fissato ? '📌 ' : ''}🗳️ Sondaggio${e.autore ? ' · ' + esc(e.autore) : ''}${t ? ' · ' + quando(t) : ''} · ${aperto ? (e.scad ? 'fino al ' + dataOra(e.scad) : 'aperto') : 'chiuso'}</div>
    <div class="bac-m">${esc(e.titolo || '')}</div>
    ${(e.opzioni || []).map((o, i) => { const p = v.tot ? Math.round(v.c[i] * 100 / v.tot) : 0;
      return `<button class="opt ${v.mio === i ? 'mio' : ''}" id="bac-${e.id}-o${i}" data-act="bac-vota" data-id="${e.id}" data-i="${i}" ${aperto ? '' : 'disabled'}><i style="width:${p}%"></i><span>${v.mio === i ? '✓ ' : ''}${esc(o)}</span><span class="mono">${p}% · ${v.c[i]}</span></button>`; }).join('')}
    <div class="mut" style="font-size:12px;margin-top:6px">${v.tot} ${v.tot === 1 ? 'voto' : 'voti'}${aperto ? (v.mio == null ? ' · scegli una risposta' : ' · puoi cambiare il tuo voto') : ''}</div>${bacAzioni(e)}</div>`;
};
const evRow = e => { const g = giorniA(e.prossima); const [y,m,dd] = e.prossima.split('-');
    const puo = moderatore() || e.uid === st.uid;
    const [em, lab, icn, rgb, tc] = evTipo(e.tipo);
    return `<div class="li ev-row" data-tipo="${esc(e.tipo || 'altro')}" style="background:rgba(${rgb},.09);border-left:3px solid rgba(${rgb},.85);border-radius:12px;padding-left:10px;margin-bottom:6px"><div class="av" style="background:rgba(${rgb},.2);color:${tc}">${ic(icn)}</div>
      <div class="grow"><div class="t">${esc(e.titolo)}</div><div class="d mono">${dd}/${m}/${y}${e.tipo === 'compleanno' ? ' · ogni anno' : ''}</div>
        <div class="d"><span class="ev-badge" style="display:inline-block;margin-top:3px;padding:1px 8px;border-radius:99px;font-size:11px;font-weight:700;background:rgba(${rgb},.2);color:${tc}">${em} ${lab}</span></div></div>
      <span class="pill ${g === 0 ? 'amber' : g > 0 && g <= 7 ? 'violet' : 'mut'}">${g === 0 ? 'oggi!' : g === 1 ? 'domani' : g > 0 ? 'tra ' + g + ' gg' : 'passato'}</span>
      ${puo ? `<button class="iconbtn" style="width:32px;height:32px" data-act="bac-elimina" data-id="${e.id}" aria-label="Elimina">${ic('trash','s')}</button>` : ''}</div>`; };
function bacheca(){
  const tutti = (st.eventi || []).filter(isBac), now = Date.now();
  const avvisi = tutti.filter(e => e.tipo !== 'sondaggio' && scadVivo(e)).sort(bacOrd);
  const sond = tutti.filter(e => e.tipo === 'sondaggio' && (sondAperto(e) || now - tms(e.ts) < 7 * 864e5)).sort(bacOrd);
  const evs = evVeri().map(e => ({...e, prossima: prossimaData(e)})).sort((a, b) => a.prossima.localeCompare(b.prossima));
  const fut = evs.filter(e => e.prossima >= oggiISO()), pas = evs.filter(e => e.prossima < oggiISO()).reverse();
  const vis = st.bacTutti ? fut : fut.slice(0, 4), vuoto = !avvisi.length && !sond.length && !fut.length;
  return `<div class="card" id="bacheca"><h3 style="margin-bottom:10px"><span>📢 Bacheca, Eventi &amp; Sondaggi</span>
      ${puoBacheca() ? `<button class="btn sm amber" id="btn-bac-nuovo" data-act="bac-nuovo">${ic('plus', 's')} Pubblica</button>` : `<button class="btn sm ghost" id="btn-bac-compleanno" data-act="bac-nuovo" data-v="ev">🎂 Compleanno</button>`}</h3>
    ${vuoto ? `<div class="empty" id="bac-vuota">Nessuna novità in bacheca.</div>` : ''}
    ${avvisi.length ? `<div id="bac-avvisi">${avvisi.map(bacAvviso).join('')}</div>` : ''}
    ${sond.length ? `<div id="bac-sondaggi">${sond.map(bacSondaggio).join('')}</div>` : ''}
    ${fut.length || pas.length ? `<div class="mut" style="font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;margin:6px 2px">📅 Eventi</div>` : ''}
    ${fut.length ? `<div class="list" id="bac-eventi">${vis.map(evRow).join('')}</div>` : ''}
    ${fut.length > 4 || pas.length ? `<button class="btn sm ghost block" id="btn-bac-tutti" data-act="bac-tutti" style="margin-top:8px">${st.bacTutti ? 'Mostra meno' : 'Mostra tutti' + (fut.length > 4 ? ' (' + fut.length + ')' : '') + (pas.length ? ' e passati' : '')}</button>` : ''}
    ${st.bacTutti && pas.length ? `<div class="list" id="bac-passati" style="margin-top:8px">${pas.slice(0, 20).map(evRow).join('')}</div>` : ''}
  </div>`;
}
const bacEv = id => (st.eventi || []).find(x => x.id === id);
A['bac-tutti'] = () => { st.bacTutti = !st.bacTutti; render(); };
A['bac-vai'] = () => {
  LS.set('bacVisti_' + st.gid, Math.max(Date.now(), ...(st.eventi || []).map(e => tms(e.ts))));
  render();
  setTimeout(() => { const el = $('bacheca'); if(el){ el.scrollIntoView({block: 'start', behavior: 'smooth'}); el.classList.add('qs-flash'); setTimeout(() => el.classList.remove('qs-flash'), 1800); } }, 60);
};
A['bac-nuovo'] = ds => {
  const piena = puoBacheca(), t0 = piena && ds.v !== 'ev' ? 'info' : 'evento';
  st.bacTipo = t0;
  const tipi = piena ? [['info', 'ℹ️ Info'], ['annuncio', '📢 Annuncio'], ['novita', '🥐 Novità in sala'], ['sondaggio', '🗳️ Sondaggio'], ['evento', '📅 Evento']] : [['evento', '🎂 Compleanno']];
  openSheet(`<h3>📢 Nuova pubblicazione</h3>
    <div class="chips" id="bf-tipi">${tipi.map(([k, l]) => `<button id="bf-t-${k}" class="${k === t0 ? 'on' : ''}" data-act="bac-tipo" data-v="${k}">${l}</button>`).join('')}</div>
    <div id="bf-avv" ${t0 === 'evento' ? 'hidden' : ''}>
      <label class="f"><span>Testo breve</span><textarea class="in" id="bf-testo" maxlength="200" rows="3" placeholder="Es. Domani la saletta è chiusa per pulizie"></textarea></label>
      <div class="f"><span>Scadenza</span>${segOpts('bf-sc', BAC_SCAD, '48')}</div></div>
    <div id="bf-sond" hidden>
      <label class="f"><span>Domanda</span><input class="in" id="bf-dom" maxlength="120" placeholder="Es. Che giorno preferite per la cena?"></label>
      ${[0, 1, 2, 3].map(i => `<label class="f" id="bf-ol-${i}" ${i > 1 ? 'hidden' : ''}><span>Opzione ${i + 1}</span><input class="in" id="bf-o${i}" maxlength="40"></label>`).join('')}
      <button type="button" class="btn sm ghost" id="bf-piu" data-act="bac-piu">+ Aggiungi opzione</button>
      <div class="f" style="margin-top:8px"><span>Scadenza</span>${segOpts('bf-sc2', BAC_SCAD, '0')}</div></div>
    <div id="bf-ev" ${t0 === 'evento' ? '' : 'hidden'}>
      <p class="sub">${piena ? 'Compleanni, nascite, lauree e feste. Il banner compare in Home da 3 giorni prima.' : 'Il compleanno compare in Home da 3 giorni prima.'}</p>
      <label class="f"><span>Titolo</span><input class="in" id="bf-tit" maxlength="80" placeholder="es. Compleanno Marco"></label>
      <label class="f"><span>Data</span><input class="in" type="date" id="bf-data" value="${oggiISO()}"></label>
      ${piena ? `<div class="f"><span>Tipo</span>${segOpts('bf-etipo', [['compleanno', '🎂 Compleanno'], ['nascita', '👶 Nascita'], ['cerimonia', '🎓 Matrimonio / Laurea'], ['festa', '🎉 Festa'], ['altro', '🗓️ Ricorrenza']], 'compleanno')}</div>` : ''}</div>
    <button class="btn amber block big" id="btn-bac-pubblica" data-act="bac-pubblica" style="margin-top:10px">Pubblica</button>`);
};
A['bac-tipo'] = ds => {
  st.bacTipo = ds.v;
  document.querySelectorAll('#bf-tipi button').forEach(b => b.classList.toggle('on', b.dataset.v === ds.v));
  $('bf-avv').hidden = !['info', 'annuncio', 'novita'].includes(ds.v); $('bf-sond').hidden = ds.v !== 'sondaggio'; $('bf-ev').hidden = ds.v !== 'evento';
};
A['bac-piu'] = () => { for(let i = 2; i < 4; i++){ const l = $('bf-ol-' + i); if(l && l.hidden){ l.hidden = false; if(i === 3 && $('bf-piu')) $('bf-piu').hidden = true; break; } } };
const bacScad = nome => { const h = Number(radio(nome)); return h > 0 ? Date.now() + h * 36e5 : null; };
A['bac-pubblica'] = () => {
  const t = st.bacTipo, autore = (nomeBreve(st.mid) || myName() || '').slice(0, 40), base = {uid: st.uid, autore, ts: TS()};
  let doc;
  if(t === 'evento'){
    const titolo = val('bf-tit'), data = val('bf-data'), tipo = puoBacheca() ? (radio('bf-etipo') || 'altro') : 'compleanno';
    if(!titolo || !/^\d{4}-\d{2}-\d{2}$/.test(data)) return toast('Compila titolo e data', 'err');
    doc = {...base, titolo: titolo.slice(0, 80), data, tipo};
  } else if(!puoBacheca()) return toast('La pubblicazione è riservata a chi gestisce la bacheca', 'err');
  else if(t === 'sondaggio'){
    const dom = val('bf-dom'), opz = [0, 1, 2, 3].map(i => val('bf-o' + i).slice(0, 40)).filter(Boolean), scad = bacScad('bf-sc2');
    if(dom.length < 3) return toast('Scrivi la domanda', 'err');
    if(opz.length < 2) return toast('Servono almeno 2 opzioni', 'err');
    doc = {...base, tipo: 'sondaggio', titolo: dom.slice(0, 120), opzioni: opz, voti: {}, data: oggiISO(), ...(scad ? {scad} : {})};
  } else {
    const testo = val('bf-testo'), scad = bacScad('bf-sc');
    if(testo.length < 3) return toast('Scrivi il testo', 'err');
    doc = {...base, tipo: BAC_AVV[t] ? t : 'info', testo: testo.slice(0, 200), data: oggiISO(), ...(scad ? {scad} : {})};
  }
  C('eventi').add(doc).then(() => toast('Pubblicato')).catch(e => toast('Non pubblicato (' + errMsg(e) + ')', 'err'));
  closeSheet();
};
A['bac-vota'] = ds => {
  const e = bacEv(ds.id), i = Number(ds.i);
  if(!e || e.tipo !== 'sondaggio' || !st.mid) return;
  if(!sondAperto(e)) return toast('Il sondaggio è chiuso', 'err');
  if(!Number.isInteger(i) || i < 0 || i >= (e.opzioni || []).length) return;
  if(bacVoti(e).mio === i) return;
  C('eventi').doc(e.id).update({['voti.' + st.mid]: i}).catch(er => toast('Voto non registrato (' + errMsg(er) + ')', 'err'));
};
A['bac-modifica'] = ds => {
  const e = bacEv(ds.id); if(!e || !(moderatore() || e.uid === st.uid)) return;
  const sond = e.tipo === 'sondaggio';
  openSheet(`<h3>✏️ Modifica ${sond ? 'sondaggio' : 'avviso'}</h3>
    ${sond ? `<label class="f"><span>Domanda</span><input class="in" id="bf-dom" maxlength="120" value="${esc(e.titolo || '')}"></label><p class="hint">Le opzioni e i voti non si cambiano: per modificarle elimina e ripubblica.</p>`
           : `<label class="f"><span>Testo breve</span><textarea class="in" id="bf-testo" maxlength="200" rows="3">${esc(e.testo || '')}</textarea></label>`}
    <div class="f"><span>Scadenza</span>${segOpts('bf-sc3', [['keep', 'Invariata'], ...BAC_SCAD], 'keep')}</div>
    <button class="btn amber block big" id="btn-bac-salva" data-act="bac-salva" data-id="${e.id}">Salva</button>`);
};
A['bac-salva'] = ds => {
  const e = bacEv(ds.id); if(!e) return;
  const up = {};
  if(e.tipo === 'sondaggio'){ const t = val('bf-dom'); if(t.length < 3) return toast('Scrivi la domanda', 'err'); up.titolo = t.slice(0, 120); }
  else { const t = val('bf-testo'); if(t.length < 3) return toast('Scrivi il testo', 'err'); up.testo = t.slice(0, 200); }
  const sc = radio('bf-sc3');
  if(sc === '0') up.scad = firebase.firestore.FieldValue.delete(); else if(sc && sc !== 'keep') up.scad = Date.now() + Number(sc) * 36e5;
  C('eventi').doc(e.id).update(up).then(() => toast('Salvato')).catch(er => toast(errMsg(er), 'err'));
  closeSheet();
};
A['bac-chiudi'] = ds => { const e = bacEv(ds.id); if(!e || e.tipo !== 'sondaggio') return; C('eventi').doc(e.id).update({chiuso: e.chiuso !== true}).catch(er => toast(errMsg(er), 'err')); };
A['bac-fissa'] = ds => { const e = bacEv(ds.id); if(!e || !moderatore()) return; C('eventi').doc(e.id).update({fissato: e.fissato !== true}).catch(er => toast(errMsg(er), 'err')); };
A['bac-elimina'] = ds => { const e = bacEv(ds.id); if(!e || !confirm(isBac(e) ? 'Eliminare questa voce dalla bacheca?' : 'Eliminare questo evento?')) return; C('eventi').doc(e.id).delete().catch(er => toast(errMsg(er), 'err')); };
A['bac-aperta'] = (ds, el) => {
  if(!sonoCreatore()){ if(el) el.checked = bacAperta(); return; }
  const on = el && el.type === 'checkbox' ? !!el.checked : !bacAperta();
  G().update({bachecaAperta: on}).then(() => toast(on ? 'I colleghi possono pubblicare in Bacheca' : 'Pubblicazione riservata a Creatore e Supervisor')).catch(e => { if(el) el.checked = bacAperta(); toast(errMsg(e), 'err'); });
};
/* una tantum: il Creatore toglie dal documento del gruppo i vecchi campi 'avviso' e 'sondaggio' (1 sola scrittura) */
let bacPulito = false;
function bacPulisciVecchi(){
  if(bacPulito || !sonoCreatore() || !st.gruppo || (st.gruppo.avviso === undefined && st.gruppo.sondaggio === undefined)) return;
  bacPulito = true;
  const up = {}; if(st.gruppo.avviso !== undefined) up.avviso = firebase.firestore.FieldValue.delete(); if(st.gruppo.sondaggio !== undefined) up.sondaggio = firebase.firestore.FieldValue.delete();
  G().update(up).catch(() => {});
}

/* ---------- Saletta: Ruota del Barista (solo client) e Bacheca delle Perle ---------- */
function rndInt(n){ const lim = 4294967296 - 4294967296 % n; let x; do { x = crypto.getRandomValues(new Uint32Array(1))[0]; } while(x >= lim); return x % n; }
function ruotaSt(){
  if(!st.ruota) st.ruota = {ids: [], ang: 0, from: 0, gira: false, t0: 0, win: null, vinc: null, conf: null, ass: [], fine: false};
  return st.ruota;
}
/* nuovo giro da zero: nessun assente, nessun esito */
function ruotaReset(){ const r = ruotaSt(); if(r.gira) return r; r.vinc = null; r.conf = null; r.ass = []; r.fine = false; r.win = null; return r; }
/* bacino: tutti i membri attivi (già in memoria) tranne chi è risultato assente in questo giro */
const ruotaPool = () => membriAttivi().slice().sort((a, b) => (nomeBreve(a.id) || nomeM(a.id)).localeCompare(nomeBreve(b.id) || nomeM(b.id))).map(m => m.id).filter(id => !ruotaSt().ass.includes(id));
function ruotaSvg(ids, nome){
  const n = ids.length, A_ = 360 / n, R = 140, C0 = 150, pt = a => [C0 + R * Math.sin(a * Math.PI / 180), C0 - R * Math.cos(a * Math.PI / 180)];
  const fs = n <= 6 ? 15 : n <= 10 ? 12 : 10, mx = n <= 6 ? 12 : n <= 10 ? 9 : 7;
  return ids.map((id, i) => {
    const a1 = i * A_, a2 = (i + 1) * A_, [x1, y1] = pt(a1), [x2, y2] = pt(a2), mid = a1 + A_ / 2, nm = nome(id), lab = nm.length > mx ? nm.slice(0, mx - 1) + '…' : nm;
    return `<path d="M${C0} ${C0}L${x1.toFixed(2)} ${y1.toFixed(2)}A${R} ${R} 0 ${A_ > 180 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}Z" fill="hsl(${Math.round(i * 360 / n)} 62% 42%)" stroke="rgba(255,255,255,.55)" stroke-width="1.5"/>
      <text transform="rotate(${mid.toFixed(2)} ${C0} ${C0})" x="${C0}" y="${C0 - R * 0.62}" text-anchor="middle" dominant-baseline="middle" font-size="${fs}" font-weight="800" fill="#fff">${esc(lab)}</text>`;
  }).join('') + `<circle cx="${C0}" cy="${C0}" r="16" fill="var(--card)" stroke="rgba(255,255,255,.6)" stroke-width="2"/><text x="${C0}" y="${C0 + 1}" text-anchor="middle" dominant-baseline="middle" font-size="16">☕</text>`;
}
function pRuota(d){
  const r = ruotaSt(), nome = id => nomeBreve(id) || nomeM(id), pool = ruotaPool();
  const ids = r.gira || r.vinc || r.conf ? r.ids : pool;
  const anim = r.gira ? `--from:${r.from}deg;--to:${r.ang}deg;animation:ruota-spin 9.2s cubic-bezier(.12,.6,.1,1) ${(-(Date.now() - r.t0) / 1000).toFixed(2)}s forwards` : `transform:rotate(${r.ang}deg)`;
  const ruota = ids.length >= 2 ? `<div class="ruota-box"><div class="ruota-pt"></div><svg viewBox="0 0 300 300" id="ruota-svg" style="${anim}" role="img" aria-label="Ruota con ${ids.length} colleghi">${ruotaSvg(ids, nome)}</svg></div>`
    : (r.vinc || r.conf || r.fine ? '' : '<div class="empty">Servono almeno 2 colleghi attivi per girare la ruota.</div>');
  const verifica = r.vinc && !r.conf && !r.gira ? `<div class="card" id="ruota-verifica" style="text-align:center;border-color:var(--amber)"><div class="mut" style="font-size:12.5px">È uscito</div><div id="ruota-uscito" style="font-size:28px;font-weight:800;margin:6px 0">🎉 ${esc(nome(r.vinc))}</div><p class="tx2" style="font-size:13.5px;margin:0 0 10px">Verifica di persona: tocca a lui solo se è presente.</p>
    <div class="grid2"><button class="btn red" id="ruota-assente" data-act="ruota-assente">❌ Non è presente / Non disponibile</button><button class="btn green" id="ruota-presente" data-act="ruota-presente">✅ È presente</button></div></div>` : '';
  const esito = r.conf && !r.gira ? `<div class="card" id="ruota-esito" style="text-align:center;border-color:var(--amber)"><div style="font-size:40px;line-height:1.1">☕</div><div style="font-size:22px;font-weight:800;margin:4px 0">Tocca a ${esc(nome(r.conf))}!</div><div class="mut" style="font-size:13px">Alla macchinetta a fare i caffè per tutti.</div></div>` : '';
  const fine = r.fine && !r.gira ? `<div class="card" id="ruota-fine"><div class="empty">Nessun altro collega disponibile.</div></div>` : '';
  const mostraGira = !verifica;
  return `${backSaletta()}<h2>☕ La Ruota del Barista ${infoBtn(`Chi si mette alla macchinetta? La ruota include tutti i colleghi attivi. Quando esce un nome, conferma se è presente: se non lo è, la ruota gira di nuovo senza di lui.`)}</h2>
  ${ruota}${verifica}${esito}${fine}
  ${mostraGira ? `<button class="btn amber block big" id="ruota-gira" data-act="ruota-gira" ${r.gira || (r.fine ? false : pool.length < 2 && !r.conf) ? 'disabled' : ''}>${r.gira ? 'Gira…' : r.conf || r.fine ? '🔁 Nuova estrazione' : '🎡 Gira la ruota!'}</button>` : ''}
  <p class="hint" style="text-align:center;margin-top:10px">Estrazione casuale e uniforme tra ${r.gira || r.vinc || r.conf ? r.ids.length : pool.length} colleghi. Non viene salvato nulla.</p>`;
}
function ruotaParti(ids){
  const r = ruotaSt(), n = ids.length, A_ = 360 / n, k = rndInt(n), jit = (rndInt(1000) / 1000 - 0.5) * 0.7 * A_;
  r.ids = ids; r.win = ids[k]; r.vinc = null; r.conf = null; r.fine = false; r.gira = true; r.from = r.ang; r.t0 = Date.now();
  r.ang = (r.from - (r.from % 360)) + 3960 + ((360 - ((k + 0.5) * A_ + jit)) % 360 + 360) % 360;
  render();
  setTimeout(() => { r.gira = false; r.vinc = r.win; try { if(navigator.vibrate) navigator.vibrate([80, 40, 80]); } catch(e){} render(); }, 9300);
}
A['ruota-gira'] = () => {
  const r = ruotaSt(); if(r.gira) return;
  if(r.conf || r.fine || !r.vinc) ruotaReset();   // nuova estrazione: si riparte da tutti i colleghi attivi
  const ids = ruotaPool();
  if(ids.length < 2) return toast('Servono almeno 2 colleghi attivi', 'err');
  ruotaParti(ids);
};
A['ruota-presente'] = () => { const r = ruotaSt(); if(r.gira || !r.vinc || r.conf) return; r.conf = r.vinc; render(); };
A['ruota-assente'] = () => {
  const r = ruotaSt(); if(r.gira || !r.vinc || r.conf) return;
  if(!r.ass.includes(r.vinc)) r.ass.push(r.vinc);
  r.vinc = null; r.win = null;
  const ids = ruotaPool();
  if(!ids.length){ r.fine = true; r.ids = []; return render(); }
  if(ids.length === 1){ r.ids = ids; r.win = ids[0]; r.vinc = ids[0]; return render(); }   // ne resta uno solo: niente giro, solo la verifica
  ruotaParti(ids);   // nuova estrazione subito, senza chi è risultato assente
};

/* Bacheca delle Perle: listener limitato, attivo solo con la pagina aperta e l'app in primo piano */
let perleUnsub = null, perleKey = '';
/* Badge «nuova perla»: nessun listener in più, solo UNA lettura (limit 1) a pagina aperta, al massimo ogni 3 minuti, mai in background */
const perleKeyVisto = () => 'perleVisto_' + st.gid;
const perleTs = x => x && x.ts && typeof x.ts.toMillis === 'function' ? x.ts.toMillis() : 0;
const perleNuova = () => { const u = st.perleUlt; if(!u || !(u.t > 0) || u.mid === st.mid) return false; return u.t > (Number(LS.get(perleKeyVisto())) || Infinity); };
function perleSegnaVista(L){
  const t = L && L[0] ? perleTs(L[0]) : 0;
  if(t > 0 && t > (Number(LS.get(perleKeyVisto())) || 0)) LS.set(perleKeyVisto(), t);
  st.perleUlt = null;
}
function perleCheck(){
  if(!inAppOra() || document.visibilityState === 'hidden' || st.page === 'perle') return;
  const ora = Date.now(), c = st.perleChk;
  if(c && c.gid === st.gid && (c.busy || ora - c.t < 180000)) return;
  const gid = st.gid; st.perleChk = {gid, t: ora, busy: true};
  C('perle').orderBy('ts', 'desc').limit(1).get().then(sn => {
    st.perleChk = {gid, t: Date.now(), busy: false};
    if(gid !== st.gid) return;
    const x = sn.docs[0] ? sn.docs[0].data({serverTimestamps: 'estimate'}) : null, t = perleTs(x);
    st.perleUlt = x ? {t, mid: x.mid} : null;
    if(t > 0 && !(Number(LS.get(perleKeyVisto())) > 0)) LS.set(perleKeyVisto(), t);   // primo avvio: le perle già presenti non sono «nuove»
    render();
  }).catch(() => { st.perleChk = {gid, t: Date.now(), busy: false}; });
}
function perleSync(){
  const vuole = !!inAppOra() && st.page === 'perle' && document.visibilityState !== 'hidden';
  const key = vuole ? st.gid + '|' + (st.perleN || 20) : '';
  if(key === perleKey) return;
  if(perleUnsub){ perleUnsub(); perleUnsub = null; }
  perleKey = key;
  if(!vuole) return;
  st.perleErr = null;
  perleUnsub = C('perle').orderBy('ts', 'desc').limit(st.perleN || 20).onSnapshot(s => {
    st.perle = s.docs.map(d => ({id: d.id, ...d.data({serverTimestamps: 'estimate'})})); st.perleOk = true; perleSegnaVista(st.perle); render();
  }, e => { st.perleOk = true; st.perleErr = errMsg(e); render(); });
}
document.addEventListener('visibilitychange', perleSync);
function pPerle(d){
  const L = st.perle || [], N = st.perleN || 20;
  const card = p => `<div class="perla"><q>${esc(p.testo)}</q><div style="margin-top:6px;font-size:13.5px;font-weight:700">— ${esc(p.autore)}${p.contesto ? ` <span class="mut" style="font-weight:500">· ${esc(p.contesto)}</span>` : ''}</div>
    <div class="between" style="margin-top:6px"><span class="mut" style="font-size:11.5px">inserita da ${esc(nomeBreve(p.mid) || nomeM(p.mid) || '?')} · ${p.ts ? quando(tms(p.ts)) : 'ora'}</span>
    ${st.isAdmin || p.mid === st.mid ? `<button class="iconbtn" style="width:32px;height:32px" data-act="perla-del" data-id="${p.id}" aria-label="Elimina">${ic('trash','s')}</button>` : ''}</div></div>`;
  return `${backSaletta()}<div class="between" style="margin-bottom:14px"><div><h2>💬 Bacheca delle Perle</h2><p class="sub" style="margin:0">Frasi celebri sentite in saletta</p></div>
    <button class="btn sm amber" id="btn-perla-nuova" data-act="perla-nuova">${ic('plus','s')} Nuova</button></div>
  ${st.perleErr ? `<div class="banner red">${ic('alert')}<div>Non riesco a leggere la bacheca (${esc(st.perleErr)}).</div></div>` : ''}
  ${L.length ? `<div id="perle-lista">${L.map(card).join('')}</div>` : `<div class="card"><div class="empty">${st.perleOk ? 'Ancora nessuna perla. Inserisci la prima!' : 'Carico…'}</div></div>`}
  ${L.length >= N && N < 30 ? `<button class="btn sm block ghost" data-act="perle-altre">Mostra altre</button>` : ''}`;
}
A['perle-altre'] = () => { st.perleN = 30; render(); };
A['perla-nuova'] = () => {
  const nomi = membriAttivi().map(m => nomeBreve(m.id) || m.nome);
  openSheet(`<h3>💬 Nuova perla ${infoBtn(`Una frase da ricordare, sentita in saletta o durante il turno.`)}</h3>
    <label class="f"><span>Chi l'ha detta</span><input class="in" id="pe-aut" maxlength="40" list="pe-nomi" autocomplete="off" placeholder="es. Marco" autofocus><datalist id="pe-nomi">${nomi.map(n => `<option value="${esc(n)}"></option>`).join('')}</datalist></label>
    <label class="f"><span>La frase</span><textarea class="in" id="pe-txt" maxlength="280" rows="3" placeholder="Scrivi la citazione"></textarea></label>
    <label class="f"><span>Data o contesto (facoltativo)</span><input class="in" id="pe-ctx" maxlength="60" placeholder="es. riunione del lunedì"></label>
    <button class="btn amber block big" id="btn-perla-salva" data-act="perla-salva">Pubblica</button>`);
};
A['perla-salva'] = () => {
  const autore = val('pe-aut'), testo = val('pe-txt'), contesto = val('pe-ctx');
  if(autore.length < 2) return toast('Indica chi l\'ha detta', 'err');
  if(testo.length < 3) return toast('Scrivi la frase', 'err');
  if(st.perleUltima && Date.now() - st.perleUltima < 15000) return toast('Un attimo: aspetta qualche secondo tra una perla e l\'altra', 'err');
  st.perleUltima = Date.now();
  C('perle').add({autore, testo, ...(contesto ? {contesto} : {}), mid: st.mid, ts: TS()}).catch(e => toast('Non salvata (' + errMsg(e) + ')', 'err'));
  closeSheet(); toast('Perla pubblicata 💬');
};
A['perla-del'] = ds => { if(!confirm('Eliminare questa perla?')) return; C('perle').doc(ds.id).delete().catch(e => toast(errMsg(e), 'err')); };

