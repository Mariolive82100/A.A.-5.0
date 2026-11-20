'use strict';
/* --- sfide fisse: navigazione e assegnazione del premio (unica azione dell'admin) --- */
A['sf-apri'] = ds => { if(!SF_PER[ds.s]) return; if(sfHd === 0) sfHPush(); sfSez = ds.s; sfDet = null; sfTab = 'corso'; window.scrollTo(0, 0); render(); };
A['chiusura-nascondi'] = () => { LS.set('chiusuraNasc_' + st.gid, oggiISO()); render(); };
A['vittoria-chiudi'] = () => { const e = $('vittoria'); if(e) e.remove(); vitOpen = false; };
A['sf-det'] = ds => { if(!SF_FISSE[ds.id]) return; if(sfHd === 1) sfHPush(); sfDet = ds.id; sfTab = ds.t === 'concluso' ? 'concluso' : 'corso'; window.scrollTo(0, 0); render(); };
/* Classifica di una sfida come immagine PNG (canvas), condivisibile */
function sfDatiImg(x){
  const conc = sfTab === 'concluso', p = conc ? sfPrec(x) : sfPeriodo(x.per, new Date()), R = sfClassifica(x.tipo, p);
  const aw = conc ? sfAssegnati()[x.id + '|' + p.key] : null, pOn = ptMaster();
  const full = id => plain(sfNome(id)), ab = n => { const w = n.trim().split(/\s+/); return w.length < 2 || w[0].length <= 2 ? n : w[0] + ' ' + w[1].charAt(0).toUpperCase() + '.'; };
  const ids = Array.from(new Set(R.map(r => r.id).concat(aw || []))), cont = {}; ids.forEach(id => { const k = ab(full(id)); cont[k] = (cont[k] || 0) + 1; });
  const nm = id => { const k = ab(full(id)); return cont[k] > 1 ? full(id) : k; };   // se due colleghi darebbero la stessa sigla, resta il nome intero
  return {conc, p, aw, nm, valori: x.tipo !== 'ricarica', righe: R.map(r => ({pos: r.pos, nome: nm(r.id), txt: (r.txt || '') + (r.sub ? ' · ' + r.sub : ''), pt: pOn ? sfPtRiga(x, r, conc, aw) : null}))};
}
function disegnaSfida(x, D){
  const W = 1080, P = 56, F = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  const MAXR = 24, righe = D.righe.slice(0, MAXR), altri = D.righe.length - righe.length;
  const hh = 290, th = 70, rh = D.valori ? 104 : 66, legenda = righe.some(r => r.pt);
  const Ht = hh + th + Math.max(1, righe.length) * rh + (altri > 0 ? 66 : 0) + (legenda ? 56 : 0) + 130;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = Ht;
  const g = cv.getContext('2d');
  /* testo che sta sempre nella larghezza data: riduce il corpo, poi accorcia con «…» */
  const fit = (t, w, px, wt, min) => {
    let s = px; g.font = `${wt} ${s}px ${F}`;
    while(g.measureText(t).width > w && s > min){ s -= 1; g.font = `${wt} ${s}px ${F}`; }
    if(g.measureText(t).width > w){ while(t.length > 1 && g.measureText(t + '…').width > w) t = t.slice(0, -1); t += '…'; }
    return t;
  };
  const grad = g.createLinearGradient(0, 0, 0, Ht); grad.addColorStop(0, '#171a24'); grad.addColorStop(1, '#0d0f16');
  g.fillStyle = grad; g.fillRect(0, 0, W, Ht); g.textBaseline = 'alphabetic'; g.textAlign = 'left';
  g.fillStyle = '#f5a524'; g.fillText(fit(x.nome, W - 2 * P, 52, 800, 30), P, 100);
  g.fillStyle = '#e8eaf0'; g.fillText(fit((D.conc ? 'Classifica finale · ' : 'Classifica in corso · ') + D.p.label, W - 2 * P, 32, 600, 22), P, 150);
  const win = D.conc && D.aw && D.aw.length;
  const prem = win ? `✅ Premio assegnato: ${D.aw.map(D.nm).join(', ')} (+${x.pt} pt)` : D.conc ? `⏳ Premio da assegnare: +${x.pt} pt` : `+${x.pt} punti in palio`;
  g.fillStyle = win ? '#34d399' : '#aab0c2'; g.fillText(fit(prem, W - 2 * P, 30, 500, 20), P, 200);
  g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(P, 226, W - 2 * P, 2);
  let y = hh + 10;
  g.fillStyle = '#f5a524'; g.font = `700 26px ${F}`;
  g.fillText('#', P, y); g.fillText('COLLEGA', P + 96, y);
  g.textAlign = 'right'; if(legenda) g.fillText('PUNTI', W - P, y); g.textAlign = 'left';
  g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(P, y + 14, W - 2 * P, 2); y += 14;
  if(!righe.length){ y += rh; g.fillStyle = '#7b8194'; g.font = `500 30px ${F}`; g.fillText('Nessuno in classifica per ora', P, y - 22); }
  const XN = P + 96;
  righe.forEach((r, i) => {
    y += rh;
    const top = y - rh + 6, base1 = D.valori ? top + 44 : top + 42;
    if(i % 2 === 0){ g.fillStyle = 'rgba(255,255,255,.04)'; g.fillRect(P - 12, top, W - 2 * P + 24, rh - 6); }
    g.fillStyle = '#e8eaf0'; g.font = `700 34px ${F}`; g.fillText(r.pos <= 3 ? sfMed(r.pos) : String(r.pos), P, base1);
    let wp = 0;
    if(r.pt){ const tp = (r.pt.k === 'ok' ? '✅ ' : r.pt.k === 'da' ? '⏳ ' : '') + '+' + x.pt + ' pt'; g.font = `700 30px ${F}`; wp = g.measureText(tp).width + 24;
      g.textAlign = 'right'; g.fillStyle = r.pt.k === 'ok' ? '#34d399' : r.pt.k === 'da' ? '#fbbf24' : '#7dd3fc'; g.fillText(tp, W - P, base1); g.textAlign = 'left'; }
    g.fillStyle = '#f2f4f8'; g.fillText(fit(r.nome, W - P - XN - wp, 36, 600, 22), XN, base1);
    if(D.valori && r.txt){ g.fillStyle = '#aab0c2'; g.fillText(fit(r.txt, W - P - XN, 28, 500, 18), XN, base1 + 38); }
  });
  if(altri > 0){ y += 66; g.fillStyle = '#7b8194'; g.font = `500 26px ${F}`; g.fillText(`…e altri ${altri} ${altri === 1 ? 'collega' : 'colleghi'}`, P, y - 22); }
  if(legenda){ y += 56; g.fillStyle = '#7b8194'; g.font = `500 24px ${F}`; g.fillText(D.conc ? '✅ punti assegnati  ·  ⏳ punti da assegnare' : 'I punti vanno a chi è in testa a fine periodo', P, y - 18); }
  if(!D.valori){ g.fillStyle = '#7b8194'; g.font = `500 24px ${F}`; g.fillText('🔒 Per privacy si vede solo l\'ordine, non gli importi', P, Ht - 84); }
  g.fillStyle = '#586079'; g.font = `500 24px ${F}`; g.fillText('Generato da Armieri 5.0', P, Ht - 42);
  return cv;
}
A['sf-img'] = async () => {
  const x = sfDet && SF_FISSE[sfDet]; if(!x) return;
  const D = sfDatiImg(x), cv = disegnaSfida(x, D);
  const blob = await new Promise(res => cv.toBlob(res, 'image/png'));
  if(!blob) return toast('Impossibile creare l\'immagine', 'err');
  const testo = `${x.nome} — ${D.conc ? 'classifica finale' : 'classifica in corso'} · ${D.p.label}`;
  await condividiBlob(blob, `sfida_${x.id.replace('sfauto_', '')}_${oggiISO()}.png`, x.nome, testo, 'Immagine scaricata: allegala al messaggio');
};
A['sf-back'] = () => { if(sfHd > 0){ history.back(); return; } sfTab = 'corso'; if(sfDet) sfDet = null; else sfSez = null; window.scrollTo(0, 0); render(); };
/* premio a fine periodo: un movimento 'bonus_podio' per vincitore con ID deterministico (create-only: nessun doppio accredito) */
A['sf-assegna'] = ds => {
  const x = SF_FISSE[ds.id]; if(!x || !can('compiti')) return;
  const e = sfDaAssegnare(x).find(y => y.p.key === ds.k); if(!e) return toast('Premio già assegnato o non più disponibile', 'err');
  if(e.parziale && !confirm('Nel periodo c\'è stata una chiusura: i dati potrebbero essere parziali.\n\nAssegnare comunque il premio?')) return;
  e.win.forEach(r => addMov({tipo: 'bonus_podio', mid: r.id, pos: 1, sfida: x.id, periodo: e.p.key, periodoTxt: e.p.label, titolo: x.nome.slice(0, 60), punti: x.pt}, `sfi_${x.id}_${e.p.key}_${r.id}`, true, er => toast('Premio non assegnato (' + errMsg(er) + ')', 'err')));
  toast('🏆 Premio assegnato: ' + e.win.map(r => nomeBreve(r.id) || nomeM(r.id)).join(', ') + ' (+' + x.pt + ' pt)');
};
/* --- punti extra durante una sfida: l'admin (Creatore o «Sfide e Regole») dà punti a mano a uno o più colleghi, nella Tessera Fedeltà.
   Movimento 'bonus_podio' con extra:1 e perExtra (senza il campo 'periodo': non conta come premio assegnato). ID automatico, quindi si possono dare più volte. --- */
const MAX_PT_EXTRA = 100;
A['sf-extra'] = ds => {
  const x = SF_FISSE[ds.id]; if(!x || !can('compiti') || !ptMaster()) return;
  const col = membriAttivi().filter(m => m.id !== st.mid).sort((a, b) => nomeM(a.id).localeCompare(nomeM(b.id)));
  if(!col.length) return toast('Non ci sono altri colleghi', 'err');
  openSheet(`<h3>🎯 Punti extra</h3>
    <p class="sub">Sfida <b>${esc(x.nome)}</b> · ${esc(sfPeriodo(x.per, new Date()).label)}. I punti vanno subito nei punti accumulati dei colleghi scelti${x.tipo === 'pulizie' ? ' e contano nella graduatoria della sfida' : ''}.</p>
    ${cercaBox('sx-lista')}<div id="sx-lista" style="max-height:32vh;overflow:auto;margin:6px 0 10px">${col.map(m => `<label class="check" data-q="${qMem(m)}"><input type="checkbox" class="sx-c" value="${m.id}" data-chg="sx-upd"><b style="flex:1;font-size:14px">${esc(nomeM(m.id))}</b></label>`).join('')}${cercaVuoto('sx-lista')}</div>
    <div data-chg="sx-upd" style="margin-bottom:8px">${segOpts('sx-modo', [['tot', 'Montante da dividere'], ['cad', 'Punti a ciascuno']], x.tipo === 'pulizie' ? 'tot' : 'cad')}</div>
    <label class="f"><span id="sx-lbl">Punti</span><input class="in mono" id="sx-q" inputmode="numeric" maxlength="3" value="10" data-chg="sx-upd"></label>
    <div id="sx-tot" class="stat" style="margin:4px 0 8px;padding:10px;font-size:13.5px;text-align:center"></div>
    <label class="f"><span>Motivo (facoltativo)</span><input class="in" id="sx-msg" maxlength="60" placeholder="Es. Pulizie fatte da solo, bonus sfida"></label>
    <button class="btn amber block big" id="sx-invia" data-act="sx-invia" data-id="${x.id}" disabled>Assegna i punti</button>`);
  sxAggiorna();
};
/* anteprima dei punti: «montante» = totale diviso per difetto tra i colleghi scelti; «a ciascuno» = stesso valore per tutti */
function sxCalcola(){
  const n = document.querySelectorAll('#sheet input.sx-c:checked').length, raw = val('sx-q'), tot = radio('sx-modo') !== 'cad';
  const q = /^\d{1,3}$/.test(raw) ? +raw : 0, per = tot ? (n ? Math.floor(q / n) : 0) : q;
  return {n, q, tot, per, ok: n > 0 && q >= 1 && per >= 1 && per <= MAX_PT_EXTRA};
}
function sxAggiorna(){
  if(!$('sx-q')) return;
  const c = sxCalcola(), l = $('sx-lbl'), t = $('sx-tot'), b = $('sx-invia');
  if(l) l.textContent = c.tot ? 'Punti totali da dividere tra i colleghi scelti' : `Punti per ogni collega (da 1 a ${MAX_PT_EXTRA})`;
  if(t) t.innerHTML = !c.n ? 'Seleziona almeno un collega' : !c.q ? 'Indica i punti (numero intero)'
    : c.tot ? (c.per < 1 ? `<b class="red">${c.q} pt non bastano per ${c.n} colleghi</b>` : c.per > MAX_PT_EXTRA ? `<b class="red">Massimo ${MAX_PT_EXTRA} pt a collega</b>` : `${c.q} pt ÷ ${c.n} = <b class="mono green">${c.per} pt a collega</b>${c.q - c.per * c.n ? ` <small class="mut">(${c.q - c.per * c.n} avanzano)</small>` : ''}`)
    : (c.per > MAX_PT_EXTRA ? `<b class="red">Massimo ${MAX_PT_EXTRA} pt a collega</b>` : `${c.n} × ${c.per} = <b class="mono green">${c.n * c.per} pt totali</b>`);
  if(b) b.disabled = !c.ok;
}
A['sx-invia'] = ds => {
  const x = SF_FISSE[ds.id]; if(!x || !can('compiti') || !ptMaster()) return;
  const ids = [...document.querySelectorAll('#sheet input.sx-c:checked')].map(e => e.value).filter(v => v !== st.mid && membro(v));
  if(!ids.length) return toast('Seleziona almeno un collega', 'err');
  const c = sxCalcola(); if(!c.ok || c.n !== ids.length) return toast(`Punti non validi: da 1 a ${MAX_PT_EXTRA} per collega`, 'err');
  const n = c.per, msg = val('sx-msg').trim().slice(0, 60), p = sfPeriodo(x.per, new Date());
  ids.forEach(mid => addMov({tipo: 'bonus_podio', mid, sfida: x.id, extra: 1, perExtra: p.key, periodoTxt: p.label, titolo: x.nome.slice(0, 60), punti: n, ...(c.tot ? {monte: c.q, nPart: ids.length} : {}), ...(msg ? {causale: msg} : {})},
    null, true, er => toast('Punti non assegnati (' + errMsg(er) + ')', 'err')));
  closeSheet(); toast(`🎯 +${n} pt a ${ids.length} ${ids.length === 1 ? 'collega' : 'colleghi'}`);
};
/* --- regala crediti (immediato, senza approvazione) --- */
function rgAggiorna(){
  if(!$('rg-q')) return;
  const n = document.querySelectorAll('#sheet input.rg-c:checked').length;
  const raw = val('rg-q'), qOk = /^\d{1,3}$/.test(raw) && +raw >= 1 && +raw <= MAX_REGALO, q = qOk ? +raw : 0;
  const tot = n * q, ins = qOk && tot * 100 > creditoLibero();
  const t = $('rg-tot');
  if(t) t.innerHTML = !qOk ? `Indica quanti crediti regalare (numero intero da 1 a ${MAX_REGALO})` : n ? `${n} ${n === 1 ? 'collega' : 'colleghi'} × ${q} ${q === 1 ? 'credito' : 'crediti'} = <b class="mono ${ins ? 'red' : 'green'}">${tot} ${tot === 1 ? 'credito totale' : 'crediti totali'}</b>` : 'Seleziona almeno un collega';
  const w = $('rg-warn'); if(w) w.style.display = ins ? '' : 'none';
  const b = $('rg-send'); if(b) b.disabled = !(n > 0 && qOk && !ins);
}
A['regala'] = () => {
  const col = membriAttivi().filter(m => m.id !== st.mid).slice().sort((a, b) => nomeM(a.id).localeCompare(nomeM(b.id)));
  if(!col.length) return toast('Non ci sono altri colleghi', 'err');
  openSheet(`<h3>🎁 Regala crediti</h3>
    <p class="sub">Un regalo gratuito: i crediti passano subito ai colleghi scelti, senza approvazione e senza possibilità di annullo. Disponibili: <b class="mono green">${eur(creditoLibero())}</b></p>
    <div class="between" style="margin-bottom:8px"><b style="font-size:13px">Colleghi</b><span class="row" style="gap:6px"><button class="btn sm ghost" data-act="rg-tutti" data-v="1">Seleziona tutti</button><button class="btn sm ghost" data-act="rg-tutti" data-v="0">Deseleziona tutti</button></span></div>
    ${cercaBox('rg-lista')}<div id="rg-lista" style="max-height:34vh;overflow:auto;margin-bottom:10px">${col.map(m => `<label class="check" data-q="${qMem(m)}"><input type="checkbox" class="rg-c" value="${m.id}" data-chg="rg-upd"><b style="flex:1;font-size:14px">${esc(nomeM(m.id))}</b></label>`).join('')}${cercaVuoto('rg-lista')}</div>
    <label class="f"><span>Crediti per ogni collega (massimo ${MAX_REGALO})</span><input class="in mono" id="rg-q" inputmode="numeric" maxlength="2" value="1" data-chg="rg-upd"></label>
    <label class="f"><span>Causale (facoltativa)</span><input class="in" id="rg-msg" maxlength="80" placeholder="Es. Grazie per il turno, Caffè del venerdì, Auguri!"></label>
    <div id="rg-tot" class="stat" style="margin:4px 0 8px;padding:10px;font-size:13.5px;text-align:center"></div>
    <div id="rg-warn" class="banner red" style="display:none">${ic('alert')}<div><b>Saldo insufficiente</b></div></div>
    <button class="btn green block big" id="rg-send" data-act="rg-invia" disabled>Invia i crediti</button>`);
  rgAggiorna();
};
function acAggiorna(){
  if(!$('ac-q')) return;
  const r = document.querySelector('#sheet input[name="ac-v"]:checked');
  const raw = val('ac-q'), qOk = /^\d{1,3}$/.test(raw) && +raw >= 1 && +raw <= 500, q = qOk ? +raw : 0;
  const t = $('ac-tot');
  if(t) t.innerHTML = !r ? 'Scegli il collega da cui comprare' : !qOk ? 'Indica quanti crediti vuoi comprare (numero intero)' : `Compri <b class="mono green">${q} ${q === 1 ? 'credito' : 'crediti'}</b> da ${esc(nomeBreve(r.value) || nomeM(r.value))} · da pagargli <b class="mono">${eur(q * 100)}</b>`;
  const b = $('ac-invia'); if(b) b.disabled = !(r && qOk);
}
A['crediti-menu'] = () => {
  if(!membriAttivi().some(m => m.id !== st.mid)) return toast('Non ci sono altri colleghi', 'err');
  openSheet(`<h3>🎁 Regala o scambia crediti</h3>
    <p class="sub">Scegli cosa vuoi fare. In entrambi i casi vedi solo i nomi dei colleghi, mai i loro saldi.</p>
    <button class="btn regalo block big" id="cm-regala" data-act="regala" style="margin-bottom:6px">🎁 Regala crediti</button>
    <p class="sub" style="margin:0 0 14px">Invio gratuito dal tuo saldo a uno o più colleghi, con causale facoltativa. Immediato e definitivo.</p>
    <button class="btn acquisto block big" id="cm-scambia" data-act="acquista" style="margin-bottom:6px">🤝 Scambia / Vendi crediti</button>
    <p class="sub" style="margin:0">Proposta a un collega scelto: lui deve confermare. Parità fissa 1 credito = 1,00 €, pagamento fuori dall'app.</p>`);
};
A['acquista'] = () => {
  const ven = membriAttivi().filter(m => m.id !== st.mid).map(m => ({m})).sort((a, b) => nomeM(a.m.id).localeCompare(nomeM(b.m.id)));
  if(!ven.length) return toast('Non ci sono altri colleghi', 'err');
  openSheet(`<h3>🤝 Scambia / Vendi crediti</h3>
    <p class="sub">Proponi a un collega uno scambio: 1 credito = 1,00 €. Vi accordate e paghi fuori dall'app. I crediti ti arrivano solo quando lui conferma di aver ricevuto il denaro.</p>
    <b style="font-size:13px">Da chi compri</b>
    ${cercaBox('ac-lista')}<div id="ac-lista" style="max-height:30vh;overflow:auto;margin:6px 0 10px">${ven.map(x => `<label class="check" data-q="${qMem(x.m)}"><input type="radio" name="ac-v" value="${x.m.id}" data-chg="ac-upd"><b style="flex:1;font-size:14px">${esc(nomeM(x.m.id))}</b></label>`).join('')}${cercaVuoto('ac-lista')}</div>
    <label class="f"><span>Crediti da comprare (1 credito = 1 €)</span><input class="in mono" id="ac-q" inputmode="numeric" maxlength="3" value="1" data-chg="ac-upd"></label>
    <label class="f"><span>Come paghi (fuori dall'app)</span>${segOpts('ac-met', [['contanti','Contanti'],['revolut','Revolut']], 'contanti')}</label>
    <div id="ac-tot" class="stat" style="margin:4px 0 8px;padding:10px;font-size:13.5px;text-align:center"></div>
    <button class="btn green block big" id="ac-invia" data-act="ac-invia" disabled>Invia la richiesta</button>`);
  acAggiorna();
};
A['ac-invia'] = () => {
  const r = radio('ac-v'), raw = val('ac-q'), metodo = radio('ac-met');
  if(!r || !membro(r) || r === st.mid) return toast('Scegli il collega', 'err');
  if(!/^\d{1,3}$/.test(raw) || +raw < 1 || +raw > 500) return toast('Quantità non valida', 'err');
  if(!['contanti', 'revolut'].includes(metodo)) return toast('Scegli come paghi', 'err');
  const q = +raw, imp = q * 100;
  if(imp > vendibile(r, derived())) return toast('Questo collega non può cedere questa quantità in questo momento', 'err');
  addMov({tipo: 'scambio', stato: 'attesa', mid: st.mid, dest: r, daMid: r, aMid: st.mid, importo: imp, metodo});
  closeSheet(); toast(`🤝 Richiesta inviata a ${nomeBreve(r) || nomeM(r)}: i crediti arrivano quando conferma`);
};
A['scambio-esito'] = ds => {
  const mv = derived().scambiAttesa.find(x => x.id === ds.id);
  if(!mv || mv.daMid !== st.mid || !['confermata', 'rifiutata'].includes(ds.v)) return;
  if(ds.v === 'confermata' && (saldo(st.mid) - riservato(st.mid)) < mv.importo) return toast('Non hai abbastanza crediti liberi per confermare', 'err');
  C('movimenti').doc(ds.id).update({stato: ds.v, esitoDa: myName(), esitoTs: TS()})
    .then(() => toast(ds.v === 'confermata' ? `Confermato ✓ ${mv.importo / 100} ${mv.importo === 100 ? 'credito ceduto' : 'crediti ceduti'}` : 'Richiesta rifiutata')).catch(e => toast(errMsg(e), 'err'));
};
A['rg-tutti'] = ds => { document.querySelectorAll('#sheet input.rg-c').forEach(x => { const l = x.closest('label'); if(!l || !l.hidden) x.checked = ds.v === '1'; }); rgAggiorna(); };
A['rg-invia'] = () => {
  const ids = [...document.querySelectorAll('#sheet input.rg-c:checked')].map(x => x.value).filter(x => x !== st.mid && membro(x));
  const raw = val('rg-q'); if(!/^\d{1,3}$/.test(raw) || +raw < 1 || +raw > MAX_REGALO) return toast(`Quantità non valida: da 1 a ${MAX_REGALO} crediti per collega`, 'err');
  const q = +raw, imp = q * 100, msg = val('rg-msg').slice(0, 80);
  if(!ids.length) return toast('Seleziona almeno un collega', 'err');
  if(ids.length * imp > creditoLibero()) return toast('Saldo insufficiente', 'err');
  ids.forEach(dest => addMov({tipo:'regalo', mid: st.mid, dest, daMid: st.mid, aMid: dest, importo: imp, ...(msg ? {msg} : {})}));
  closeSheet(); toast(`🎁 Inviati ${ids.length * q} ${ids.length * q === 1 ? 'credito' : 'crediti'} a ${ids.length} ${ids.length === 1 ? 'collega' : 'colleghi'}`);
};

/* --- canale Revolut: il Supervisor lo sospende / riattiva (campo revolutAttivo nel documento del gruppo) --- */
A['revolut-toggle'] = () => {
  if(!can('cassa')) return;
  const on = !revolutOn();
  G().update({revolutAttivo: on}).then(() => toast(on ? 'Canale Revolut riattivato' : 'Canale Revolut sospeso')).catch(e => toast(errMsg(e), 'err'));
};

/* --- feed --- */
A['feed-filtro'] = ds => { st.feedFiltro = ds.v; render(); };
A['feed-q-x'] = () => { st.feedQ = ''; render(); };
A['storico-altre'] = () => { st.storicoN = (st.storicoN || 30) + 30; render(); };
A['carica-archivio'] = async () => {
  try {
    const s = await C('archivio').get();
    const map = {};
    s.docs.forEach(d => { const base = d.id.split('_')[0]; (map[base] = map[base] || []).push(...(d.data().movimenti || [])); });
    st.archivio = st.chiusure.slice().reverse().map(c => ({label: 'Periodo ' + labelChiusura(c), movimenti: (map[c.id] || []).sort((a,b) => a.t - b.t)}));
    render();
  } catch(e){ toast('Non riesco a caricare lo storico (' + errMsg(e) + ')', 'err'); }
};

/* --- storno ed esiti (admin) --- */
/* rimborso misto: testo con la ripartizione (null se il movimento non e' misto) */
const spesaMista = m => (m && Number.isInteger(m.quotaDenaro) && Number.isInteger(m.quotaCrediti) && m.quotaDenaro > 0 && m.quotaCrediti > 0) ? `Totale ${eur(m.importo)} → ${eur(m.quotaDenaro)} in denaro reale + ${eur(m.quotaCrediti)} in crediti` : null;
function compactMov(m){
  return clean({tipo:m.tipo, cp:m.cp, ob:m.ob, fase:m.fase, ciclo:m.ciclo, n:m.n, scad:m.scad, car:m.car, mid:m.mid, pid:m.pid, qta:m.qta, importo:m.importo, quotaDenaro:m.quotaDenaro, quotaCrediti:m.quotaCrediti, mese:m.mese, pos:m.pos, nPart:m.nPart, metodo:m.metodo, fonte:m.fonte, da:m.da, a:m.a, anno:m.anno, cred:m.cred, qmAnno:m.qmAnno, mids:m.mids, stato:m.stato, fondo:m.fondo, daMid:m.daMid, aMid:m.aMid, dest:m.dest, causale:m.causale, descr:m.descr, nome:m.nome, emoji:m.emoji, rif:m.rif, orig:m.orig, autore:m.autore, amid:m.amid, esitoDa:m.esitoDa, punti:m.punti, sfida:m.sfida, titolo:m.titolo, periodoTxt:m.periodoTxt, extra:m.extra, perExtra:m.perExtra, monte:m.monte, pt:m.pt, msg:m.msg, kind:m.kind, giorno:m.giorno, task:m.task, t:m.t, id:m.id, nota:m.nota});
}
A['storno'] = ds => {
  const d = derived(), m = d.movs.find(x => x.id === ds.id); if(!m) return;
  openSheet(`<h3>${ic('undo')} Stornare?</h3><p class="sub">${descMov(m).t} · ${quando(m.t)}</p>
    <p class="tx2" style="font-size:13px">Viene aggiunto un movimento opposto che annulla l'effetto su saldi, cassa e giacenze. L'originale resta visibile come “stornato”.</p>
    <div class="grid2"><button class="btn" data-act="sheet-close">Annulla</button><button class="btn red" data-act="conferma-storno" data-id="${m.id}">Storna</button></div>`);
};
A['conferma-storno'] = ds => {
  const d = derived(), m = d.movs.find(x => x.id === ds.id); if(!m || d.stornati.has(m.id)) return closeSheet();
  addMov({tipo:'storno', rif: m.id, mid: m.mid, orig: compactMov(m)}, 'st_' + m.id);
  closeSheet(); toast('Movimento stornato');
};
A['esito'] = ds => {
  const mv = derived().movs.find(x => x.id === ds.id);
  if(mv && mv.tipo === 'compito' && !cpPuoConv(mv)) return toast('Non puoi convalidare questo compito', 'err');
  if(mv && mv.tipo === 'quota' && ds.v === 'confermata' && statoQuota(derived(), mv.mid, String(mv.anno)) === 'pagata') return toast('Quota già registrata per questo collega', 'err');
  if(mv && mv.tipo === 'spesa' && mv.fonte === 'misto' && ds.v === 'confermata') return A['paga-spesa'](ds);   // la spesa mista si convalida scegliendo il canale della quota in denaro
  C('movimenti').doc(ds.id).update({stato: ds.v, esitoDa: myName(), esitoTs: TS(), ...(mv && mv.tipo === 'spesa' && ds.v === 'confermata' ? {pt: ptSpesaE(mv.importo)} : {})})
    .then(() => { if(mv && mv.tipo === 'spesa') aggiornaArticoli(mv, ds.v === 'confermata'); toast(ds.v === 'confermata' ? 'Confermata ✓' : 'Rifiutata'); }).catch(e => toast(errMsg(e), 'err'));
};

/* --- cassa (admin) --- */
A['cassa-op'] = ds => {
  const t = ds.v;
  const titoli = {uscita:'Registra uscita', entrata:'Registra entrata', giroconto:'Giroconto'};
  openSheet(`<h3>${ic(t === 'uscita' ? 'out' : t === 'entrata' ? 'in' : 'repeat')} ${titoli[t]}</h3>
    <p class="sub">${t === 'giroconto' ? 'Es. hai versato i contanti della saletta sul conto Revolut.' : t === 'uscita' ? 'Soldi usciti dalla cassa (spese, manutenzione…).' : 'Soldi entrati in cassa non legati a un collega (es. donazione, saldo iniziale).'}</p>
    ${t !== 'giroconto' ? `<label class="f"><span>Causale</span><input class="in" id="k-caus" maxlength="80" autofocus></label>` : ''}
    <label class="f"><span>Importo €</span><input class="in mono" id="k-imp" inputmode="decimal" placeholder="10,00"></label>
    ${t === 'giroconto' ? `<label class="f"><span>Direzione</span>${segOpts('k-dir', [['cr','Contanti → Revolut'],['rc','Revolut → Contanti']], 'cr')}</label>`
      : `<label class="f"><span>${t === 'uscita' ? 'Prelevato da' : 'Versato su'}</span>${segOpts('k-fonte', [['contanti','Contanti'],['revolut','Revolut']], 'contanti')}</label>`}
    <button class="btn amber block big" data-act="conferma-cassa" data-v="${t}">Registra</button>`);
};
/* correzione del saldo di cassa: il Supervisor inserisce il saldo reale, l'app calcola la differenza */
const corrInfo = () => {
  const f = $('cc-fonte') ? $('cc-fonte').value : 'contanti', att = (derived().S.cassa[f]) || 0, reale = parseEuro(val('cc-reale'));
  return {f, att, reale, diff: reale - att};
};
function corrAggiorna(){
  const i = corrInfo(), a = $('cc-att'), d = $('cc-diff');
  if(a) a.textContent = eur(i.att);
  if(d){ const ok = Number.isFinite(i.diff) && i.reale >= 0; d.textContent = ok ? (i.diff === 0 ? 'Nessuna differenza' : eurS(i.diff)) : '—'; d.className = 'mono ' + (!ok || i.diff === 0 ? 'mut' : i.diff > 0 ? 'green' : 'red'); }
}
A['cassa-corr'] = () => {
  openSheet(`<h3>${ic('edit')} Correggi saldo cassa ${infoBtn(`Inserisci quanto c'è davvero: l'app calcola la differenza e la registra come entrata o uscita.`)}</h3>
    <label class="f"><span>Cassa da correggere</span><select class="in" id="cc-fonte" data-chg="corr"><option value="contanti">Contanti in sala</option><option value="revolut">Conto Revolut</option></select></label>
    <div class="between" style="font-size:13px;margin:0 0 8px"><span class="tx2">Saldo in app</span><b class="mono" id="cc-att"></b></div>
    <label class="f"><span>Saldo reale €</span><input class="in mono" id="cc-reale" inputmode="decimal" placeholder="0,00" data-chg="corr" autofocus></label>
    <div class="between" style="font-size:14px;margin:0 0 8px"><span class="tx2">Differenza</span><b class="mono mut" id="cc-diff">—</b></div>
    <label class="f"><span>Descrizione</span><input class="in" id="cc-caus" maxlength="60" placeholder="es. contati i soldi in cassetta"></label>
    <button class="btn amber block big" data-act="conferma-cassa-corr">Registra correzione</button>`);
  corrAggiorna();
};
A['conferma-cassa-corr'] = () => {
  const i = corrInfo(), caus = val('cc-caus');
  if(!Number.isFinite(i.reale) || i.reale < 0) return toast('Inserisci il saldo reale', 'err');
  if(i.diff === 0) return toast('Il saldo coincide già: niente da correggere', 'err');
  if(!caus) return toast('Scrivi la descrizione', 'err');
  addMov({tipo: i.diff > 0 ? 'entrata' : 'uscita', importo: Math.abs(i.diff), fonte: i.f, causale: ('Correzione saldo: ' + caus).slice(0, 80)});
  closeSheet(); toast('Correzione registrata: ' + eurS(i.diff));
};
A['conferma-cassa'] = ds => {
  const t = ds.v, imp = parseEuro(val('k-imp'));
  if(!(imp > 0)) return toast('Importo non valido', 'err');
  if(t === 'giroconto'){ const dir = radio('k-dir'); addMov({tipo:'giroconto', importo: imp, da: dir === 'cr' ? 'contanti' : 'revolut', a: dir === 'cr' ? 'revolut' : 'contanti'}); }
  else { const caus = val('k-caus'); if(!caus) return toast('Scrivi la causale', 'err'); addMov({tipo: t, importo: imp, fonte: radio('k-fonte'), causale: caus.slice(0,80)}); }
  closeSheet(); toast('Registrato');
};

/* --- inventario (admin) --- */
A['inv-sort'] = ds => { if(st.invSort.k === ds.k) st.invSort.asc = !st.invSort.asc; else st.invSort = {k: ds.k, asc: true}; render(); };
/* scorta buste di caffe': articolo speciale 'caffe' creato dal Supervisor al primo carico (prezzo 0, categoria fondo: non compare tra gli snack) */
function caricaBusteCaffe(q){
  const d = derived();
  if(q < 0 && -q > busteDisp(d)) return toast('Non ci sono abbastanza buste da togliere', 'err');
  if(!prodCaffe()) C('prodotti').doc(PID_CAFFE).set({nome: 'Caffè (buste)', emoji: '☕', categoria: 'fondo', prezzo: 0, attivo: true, speciale: 'caffe'}, {merge: true}).catch(e => toast('Non salvato (' + errMsg(e) + ')', 'err'));
  addMov({tipo:'carico', pid: PID_CAFFE, qta: q, nome: 'Caffè (buste)'});
  return true;
}
A['carico-caffe'] = ds => { caricaBusteCaffe(Number(ds.v)); };
A['carico-caffe-n'] = () => {
  openSheet(`<h3>${ic('bean')} Carico buste di caffè</h3><p class="sub">Buste aggiunte alla scorta (negativo per toglierle). Ora disponibili: <b class="mono">${busteDisp(derived())}</b>.</p>
    <label class="f"><span>Buste</span><input class="in mono" id="cc-q" inputmode="numeric" value="5" autofocus></label>
    <button class="btn amber block big" data-act="conferma-carico-caffe">Registra</button>`);
};
A['conferma-carico-caffe'] = () => {
  const q = parseInt(val('cc-q'), 10); if(!q) return toast('Numero non valido', 'err');
  if(caricaBusteCaffe(q) === true){ closeSheet(); toast('Scorta buste aggiornata'); }
};
A['prodotto'] = ds => {
  const p = ds.id ? prodotto(ds.id) : null;
  openSheet(`<h3>${ic('package')} ${p ? 'Modifica articolo' : 'Nuovo articolo'}</h3><p class="sub">${p ? 'Il nuovo prezzo vale dai prossimi acquisti.' : 'Aggiungi un articolo al listino.'}</p>
    <div class="row" style="align-items:flex-end"><label class="f" style="width:74px"><span>Icona</span><input class="in" id="p-emoji" value="${esc(p ? p.emoji || '' : '🍫')}" maxlength="4" style="text-align:center;font-size:20px;padding:8px"></label>
    <label class="f" style="flex:1"><span>Nome</span><input class="in" id="p-nome" maxlength="40" value="${esc(p ? p.nome : '')}" placeholder="es. Patatine"></label></div>
    <label class="f"><span>Prezzo €</span><input class="in mono" id="p-prezzo" inputmode="decimal" value="${p ? (p.prezzo/100).toFixed(2).replace('.',',') : '1,00'}"></label>
    ${!p ? `<label class="f"><span>Giacenza iniziale</span><input class="in mono" id="p-stock" inputmode="numeric" value="0"></label>` : ''}
    ${p ? `<label class="check"><input type="checkbox" id="p-attivo" ${p.attivo !== false ? 'checked' : ''}><b style="font-size:14px">Attivo in listino</b></label>` : ''}
    <button class="btn amber block big" data-act="salva-prodotto" data-id="${p ? p.id : ''}" style="margin-top:6px">Salva</button>`);
};
A['salva-prodotto'] = ds => {
  const nome = val('p-nome'), emoji = val('p-emoji'), categoria = (ds.id && prodotto(ds.id) && prodotto(ds.id).categoria) || 'consumo';
  let prezzo = parseEuro(val('p-prezzo'));
  if(!nome) return toast('Scrivi il nome', 'err');
  if(categoria === 'fondo') prezzo = 0;
  if(!(prezzo >= 0)) return toast('Prezzo non valido', 'err');
  const data = {nome: nome.slice(0,40), emoji, categoria, prezzo};
  if(ds.id){
    data.attivo = $('p-attivo').checked;
    C('prodotti').doc(ds.id).set(data, {merge: true}).catch(e => toast('Non salvato (' + errMsg(e) + ')', 'err'));
  } else {
    const ref = C('prodotti').doc(); data.attivo = true;
    const sk = parseInt(val('p-stock'), 10) || 0;
    if(sk > 0) data.caricati = sk;
    ref.set(data).catch(e => toast('Non salvato (' + errMsg(e) + ')', 'err'));
    if(sk) addMov({tipo:'carico', pid: ref.id, qta: sk, nome: data.nome});
  }
  closeSheet(); toast('Articolo salvato');
};
/* carico/rettifica di un articolo: aggiorna la giacenza (movimento) e il lotto (pezzi caricati). Dopo «Esaurito» o a giacenza 0 il nuovo carico apre un nuovo lotto:
   il vecchio si consolida (ammanco = pezzi ancora a sistema) e l'ammanco viene tolto dalla giacenza */
function caricaProdotto(p, q){
  const d = derived(), gia = d.S.stock[p.id] || 0, car = Number(p.caricati) || 0, l = p.lotto && typeof p.lotto === 'object' ? p.lotto : {}, es = p.esaurito === true, upd = {};
  if(q > 0){
    const chiuso = car > 0 && (es || gia <= 0);
    if(chiuso) upd.lotto = {hc: (Number(l.hc) || 0) + car, ha: (Number(l.ha) || 0) + (es ? Math.max(0, gia) : 0), ts: Date.now()};
    upd.caricati = chiuso || car <= 0 ? q : car + q;
    if(es){ upd.esaurito = false; if(gia > 0) addMov({tipo:'carico', pid: p.id, qta: -gia, nome: p.nome + ' (ammanco)'}); }
  } else upd.caricati = Math.max(0, car + q);
  C('prodotti').doc(p.id).set(upd, {merge: true}).catch(e => toast('Non salvato (' + errMsg(e) + ')', 'err'));
  addMov({tipo:'carico', pid: p.id, qta: q, nome: p.nome});
}
A['carico'] = ds => { const p = prodotto(ds.id); if(p && can('inventario')) caricaProdotto(p, Number(ds.v)); };
A['carico-n'] = ds => {
  const p = prodotto(ds.id);
  openSheet(`<h3>${ic('package')} Carico ${esc(p.nome)}</h3><p class="sub">Pezzi aggiunti alla giacenza (negativo per toglierli).${p.esaurito === true ? ' L\'articolo è segnato «Esaurito»: con il carico torna disponibile e i pezzi ancora a sistema (ammanco) vengono tolti.' : ''}</p>
    <label class="f"><span>Pezzi</span><input class="in mono" id="cn-q" inputmode="numeric" value="10" autofocus></label>
    <button class="btn amber block big" data-act="conferma-carico" data-id="${p.id}">Registra</button>`);
};
A['conferma-carico'] = ds => {
  const q = parseInt(val('cn-q'), 10); if(!q) return toast('Numero non valido', 'err');
  const p = prodotto(ds.id); if(!p || !can('inventario')) return;
  caricaProdotto(p, q); closeSheet(); toast('Giacenza aggiornata');
};
A['esaurito'] = ds => {
  if(!can('inventario')) return;
  const p = prodotto(ds.id); if(!p) return;
  const on = p.esaurito !== true;
  C('prodotti').doc(p.id).set({esaurito: on}, {merge: true}).then(() => toast(on ? `${p.nome}: segnato esaurito` : `${p.nome}: di nuovo disponibile`)).catch(e => toast(errMsg(e), 'err'));
};
/* scorta caffè in grani (kg): avvia il ciclo, carica altri kg, azzera (consolida il ciclo per il Tasso di Onestà) */
/* ---- Registro caffè: nuova registrazione / modifica / elimina ---- */
const oraBr = ms => new Date(ms).toLocaleTimeString('it-IT', {hour: '2-digit', minute: '2-digit'});
function sheetReg(e){
  const now = dtLocal(Date.now()), d8 = new Date(); d8.setHours(8, 0, 0, 0);
  const pre = e ? dtLocal(e.t) : (d8.getTime() <= Date.now() ? dtLocal(d8.getTime()) : now), tp = e ? e.tp : (statoCaffe(derived()) && statoCaffe(derived()).attivo ? 'a' : 'r');
  openSheet(`<h3>${e ? 'Modifica registrazione' : '📒 Nuova registrazione caffè'}</h3>
    <p class="sub">Acquisto: kg di caffè in grani aggiunti. Rilevazione: kg pesati adesso (calcola il Tasso di Onestà dal confronto con la rilevazione precedente). Data e ora sono precompilate alle 08:00 di oggi (o all'ora attuale se le 08:00 non sono ancora passate): modificale se serve, anche con una data passata, mai futura.</p>
    ${segOpts('rg-tp', [['a', '🛒 Acquisto'], ['r', '⚖️ Rilevazione']], tp)}
    <label class="f" style="margin-top:10px"><span>Kg</span><input class="in mono" id="rg-kg" inputmode="decimal" value="${e ? kgTxt(e.kg) : ''}" placeholder="es. 5,5"></label>
    <label class="f"><span>Data e ora</span><input class="in" type="datetime-local" id="rg-dt" value="${pre}" max="${now}" data-def="${!e && pre === now ? now : ''}"></label>
    <label class="f"><span>Nota (facoltativa)</span><input class="in" id="rg-nt" maxlength="60" value="${esc(e ? e.nt : '')}"></label>
    <button class="btn amber block big" id="btn-reg-salva" data-act="caffe-reg-salva" data-id="${e ? esc(e.id) : ''}">Salva</button>
    ${e ? `<button class="btn block ghost" id="btn-reg-elimina" style="margin-top:8px;color:var(--red)" data-act="caffe-reg-elimina" data-id="${esc(e.id)}">Elimina registrazione</button>` : ''}`);
}
A['caffe-reg-nuova'] = () => { if(can('inventario')) sheetReg(null); };
A['caffe-reg-edit'] = ds => { if(!can('inventario')) return; const e = regCaffe().find(x => x.id === ds.id); if(e) sheetReg(e); };
A['caffe-reg-tutte'] = () => { st.regTutte = !st.regTutte; render(); };
function salvaRegCaffe(arr, msg){
  arr = arr.slice().sort((x, y) => x.t - y.t);
  let tagliato = false;
  if(arr.length > REG_MAX){ arr = arr.slice(arr.length - REG_MAX); tagliato = true; }
  if(tagliato){ while(arr.length && arr[0].tp !== 'r' && arr.some(x => x.tp === 'r')) arr.shift(); }
  G().set({caffeReg: arr.map(e => clean({id: e.id, t: e.t, tp: e.tp, kg: r3(e.kg), nt: e.nt || undefined, au: e.au || undefined}))}, {merge: true})
    .then(() => { closeSheet(); toast(msg + (tagliato ? ' · le righe più vecchie sono state assorbite' : '')); }).catch(e => toast(errMsg(e), 'err'));
}
A['caffe-reg-salva'] = ds => {
  if(!can('inventario')) return;
  const tp = radio('rg-tp'), kg = Number(String(val('rg-kg')).replace(',', '.')), nt = val('rg-nt').slice(0, 60), el = document.getElementById('rg-dt'), adesso = Date.now();
  if(tp !== 'a' && tp !== 'r') return toast('Scegli il tipo di registrazione', 'err');
  if(!(kg >= 0 && kg <= 500) || (tp === 'a' && !(kg > 0))) return toast('Kg non validi', 'err');
  let t = el && el.value ? new Date(el.value).getTime() : NaN;
  if(el && el.value && el.value === el.dataset.def) t = adesso;
  if(!Number.isFinite(t)) return toast('Data e ora non valide', 'err');
  if(t > adesso + 60000) return toast('La data non può essere nel futuro', 'err');
  const cur = regCaffe(), ex = ds.id ? cur.find(x => x.id === ds.id) : null;
  const nuova = {id: ex ? ex.id : nuovoIdReg(), t, tp, kg: r3(kg), nt, au: ex ? ex.au : String(nomeBreve(st.mid) || '').slice(0, 30)};
  salvaRegCaffe(ex ? cur.map(x => x.id === ex.id ? nuova : x) : cur.concat([nuova]), ex ? 'Registrazione aggiornata' : 'Registrazione salvata');
};
A['caffe-reg-elimina'] = ds => {
  if(!can('inventario')) return;
  if(!confirm('Eliminare questa registrazione? Rimanenza e Tasso di Onestà verranno ricalcolati.')) return;
  salvaRegCaffe(regCaffe().filter(x => x.id !== ds.id), 'Registrazione eliminata');
};

/* --- quote (admin) --- */
A['quota-importo'] = () => {
  if(!can('soci')) return;
  const qa = parseEuro(val('q-importo'));
  if(!(qa >= 0) || qa > 100000) return toast('Importo non valido', 'err');
  G().update({quotaAnnua: qa}).then(() => toast('Quota annuale aggiornata')).catch(e => toast(errMsg(e), 'err'));
};
A['quota-toggle'] = ds => { statoQuota(derived(), ds.id, anno()) === 'pagata' ? A['quota-annulla'](ds) : A['quota'](ds); };
const quotaInAttesa = (d, mid) => d.pendenti.some(m => m.tipo === 'quota' && m.mid === mid && String(m.anno) === anno());
A['paga-quota'] = () => {
  const q = st.gruppo.quotaAnnua || 0, d = derived(), subito = can('soci');
  if(!(q > 0)) return toast('Nessuna quota da pagare', 'err');
  if(statoQuota(d, st.mid, anno()) === 'pagata') return toast('La tua quota risulta già pagata');
  if(quotaInAttesa(d, st.mid)) return toast('Hai già una richiesta in attesa');
  openSheet(`<h3>${ic('banknote')} Paga la quota fondo ${anno()}</h3>
    <p class="sub"><b class="mono">${eur(q)}</b> · contributo al fondo, separato dai tuoi crediti: il tuo saldo non cambia. ${subito ? 'Hai il permesso «Quote e Saldi Soci»: viene registrata subito.' : 'Un Supervisor conferma di aver ricevuto i soldi.'}</p>
    <label class="f"><span>Come versi i soldi?</span>${segOpts('qp-met', [['contanti', '💶 Contanti in cassetta'], ['revolut', '📱 Revolut']], 'contanti', revOff())}</label>
    <button class="btn amber block big" id="btn-paga-quota-ok" data-act="conferma-paga-quota">${subito ? 'Registra il pagamento' : 'Invia la richiesta'}</button>`);
};
A['conferma-paga-quota'] = () => {
  const q = st.gruppo.quotaAnnua || 0, d = derived(), a = anno(), subito = can('soci');
  if(!(q > 0 && q <= 50000)) return toast('Quota non valida', 'err');
  if(statoQuota(d, st.mid, a) === 'pagata'){ closeSheet(); return toast('Quota già pagata'); }
  if(quotaInAttesa(d, st.mid)){ closeSheet(); return toast('Hai già una richiesta in attesa'); }
  const met = revolutOn() ? (radio('qp-met') || 'contanti') : 'contanti';
  const base = `qp_${a}_${st.mid}`, id = d.movs.some(x => x.id === base) ? base + '_' + Date.now().toString(36) : base;
  addMov({tipo:'quota', mid: st.mid, anno: a, metodo: met, importo: q, cred: false, stato: subito ? 'confermata' : 'attesa', ...(subito ? {esitoDa: myName()} : {})}, id);
  closeSheet();
  toast(subito ? 'Quota registrata' : `Richiesta inviata: ${eur(q)} in attesa di conferma`);
};
A['quota'] = ds => {
  const q = st.gruppo.quotaAnnua;
  openSheet(`<h3>${ic('users')} Quota ${anno()} di ${esc(nomeM(ds.id))}</h3><p class="sub">${eur(q)} · saldo attuale ${eurS(saldo(ds.id))}</p>
  <label class="f"><span>Come è stata pagata?</span>${segOpts('q-met', [['contanti','💶 Contanti'],['revolut','📱 Revolut'],['esterno','✔️ Già versata']], 'contanti')}</label>
  <p class="hint" id="q-hint"></p>
  <button class="btn green block big" data-act="conferma-quota" data-id="${ds.id}">Segna pagata</button>`);
  quotaAggiorna();
};
function quotaAggiorna(){
  const h = $('q-hint'); if(!h) return;
  const met = radio('q-met');
  h.textContent = (met === 'esterno' ? 'Versata fuori cassa: nessuna entrata in cassa. ' : 'I soldi entrano in cassa come contributo al fondo. ') + 'Il saldo del collega non cambia.';
}
A['conferma-quota'] = ds => {
  const d = derived(), a = anno();
  if(statoQuota(d, ds.id, a) === 'pagata'){ closeSheet(); return toast('Quota già registrata'); }
  if(quotaInAttesa(d, ds.id)){ closeSheet(); return toast('C\'è una richiesta in attesa: confermala da Notifiche', 'err'); }
  const base = `qp_${a}_${ds.id}`, id = d.movs.some(x => x.id === base) ? base + '_' + Date.now().toString(36) : base;
  addMov({tipo:'quota', mid: ds.id, anno: a, metodo: radio('q-met') || 'contanti', importo: st.gruppo.quotaAnnua, cred: false}, id);
  closeSheet(); toast('Quota registrata');
};
A['quota-annulla'] = ds => {
  const d = derived(), m = quotaMov(d, ds.id, anno());
  if(!m) return toast('Quota registrata prima dell\'ultima chiusura: non annullabile da qui', 'err');
  openSheet(`<h3>${ic('undo')} Annullare il pagamento?</h3><p class="sub">Quota ${anno()} di ${esc(nomeM(ds.id))} · ${eur(m.importo)}</p>
    <p class="tx2" style="font-size:13px">La quota torna «da pagare»${['contanti','revolut'].includes(m.metodo) ? ' e l\'importo esce dalla cassa' : ''}.${m.cred ? ' I crediti già accreditati con la vecchia procedura restano al collega.' : ''}</p>
    <div class="grid2"><button class="btn" data-act="sheet-close">Indietro</button><button class="btn red" data-act="conferma-storno" data-id="${m.id}">Annulla pagamento</button></div>`);
};
A['quota-migra'] = () => {
  const mig = quoteMigra(derived()); if(!mig.length) return toast('Niente da azzerare');
  openSheet(`<h3>${ic('wallet')} Azzera addebiti quota pregressi ${infoBtn(`Per ogni collega sotto viene accreditato l'importo dell'addebito mai pagato, così il saldo torna com'era. Chi aveva già pagato non viene toccato.`)}</h3>
    <div class="list">${mig.map(x => `<div class="li"><div class="grow"><div class="t">${esc(nomeM(x.mid))}</div><div class="d">quota ${esc(x.y)}</div></div><b class="mono green">+${eur(x.imp)}</b></div>`).join('')}</div>
    <button class="btn amber block big" style="margin-top:10px" id="btn-quota-migra-ok" data-act="conferma-quota-migra">Accredita</button>`);
};
A['conferma-quota-migra'] = () => {
  const mig = quoteMigra(derived());
  mig.forEach(x => addMov({tipo:'accredito', mid: x.mid, importo: x.imp, causale: `Storno addebito quota ${x.y} (nuovo modello)`, qmAnno: x.y}, `qm_${x.y}_${x.mid}`));
  closeSheet(); toast(mig.length ? `Azzerati ${mig.length} addebiti` : 'Niente da azzerare');
};


/* --- admin --- */
A['lascia-admin'] = () => { if(sonoCreatore()) return toast('Il Creatore non può lasciare il ruolo', 'err'); if(!confirm('Lasciare il ruolo di Supervisor su questo telefono?')) return; C('admin').doc(st.uid).delete().then(() => toast('Non sei più Supervisor')).catch(e => toast(errMsg(e), 'err')); };
A['salva-gruppo'] = () => {
  if(!sonoCreatore()) return;
  const nome = val('ad-nome');
  if(!nome) return toast('Scrivi il nome del gruppo', 'err');
  G().update({nome: nome.slice(0,40)}).then(() => toast('Salvato')).catch(e => toast(errMsg(e), 'err'));
};
A['membro'] = ds => {
  const m = ds.id ? membro(ds.id) : null;
  const puoRimuovere = m && m.id !== st.mid && !isCreatore(m.id) && (!adminDiMembro(m.id).length || sonoCreatore());
  openSheet(`<h3>${ic('user')} ${m ? esc(m.nome) : 'Nuovo collega'}</h3>
    ${m ? `<p class="sub">Saldo attuale <b class="mono ${saldo(m.id) < 0 ? 'red' : 'green'}">${eurS(saldo(m.id))}</b> · ⭐ ${ptDisp(derived(), m.id)} punti</p>` : '<p class="sub">Per un collega senza telefono. Se poi chiederà l\'accesso, collegalo a questo nome.</p>'}
    <div class="grid2"><label class="f"><span>Nome</span><input class="in" id="m-nome" maxlength="30" value="${esc(m ? m.nome : '')}" ${m ? '' : 'autofocus'}></label>
    <label class="f"><span>Nickname</span><input class="in" id="m-nick" maxlength="20" value="${esc(m && m.nick ? m.nick : '')}"></label></div>
    ${!m && st.gruppo.quotaAnnua > 0 ? `<label class="check"><input type="checkbox" id="m-quota"><b style="flex:1;font-size:14px">Ha già pagato la quota ${anno()}</b></label>` : ''}
    ${m && m.espulso ? `<div class="banner red">${ic('alert')}<div>Espulso${m.espulsoDa ? ' da ' + esc(m.espulsoDa) : ''}. I suoi telefoni non possono più chiedere l'accesso.</div></div>`
      : m && m.attivo === false ? `<div class="banner amber">${ic('archive')}<div>Archiviato: non fa più parte della saletta, ma saldo e storico restano.</div></div>` : ''}
    ${m && isCreatore(m.id) ? `<div class="banner amber">${ic('shield')}<div>Creatore del gruppo: non può essere archiviato né espulso.</div></div>` : m && adminDiMembro(m.id).length ? `<div class="banner sky">${ic('shield')}<div>Supervisor: ${sonoCreatore() ? 'se lo archivi o lo espelli perde anche il ruolo.' : 'può essere archiviato solo dal Creatore.'}</div></div>` : ''}
    <button class="btn amber block big" data-act="salva-membro" data-id="${m ? m.id : ''}" style="margin-top:6px">Salva</button>
    ${m && m.attivo !== false ? `<button class="btn block" id="btn-saldo-punti" style="margin-top:10px" data-act="saldo-punti" data-id="${m.id}">✏️ Modifica saldo / punti</button>` : ''}
    ${m && puoRimuovere ? (m.attivo !== false
      ? `<div class="grid2" style="margin-top:10px"><button class="btn sm ghost" data-act="archivia" data-id="${m.id}">${ic('archive','s')} Archivia</button><button class="btn sm ghost" style="color:var(--red)" data-act="espelli" data-id="${m.id}">${ic('logout','s')} Espelli</button></div>`
      : `<button class="btn sm ghost block" style="margin-top:10px" data-act="ripristina" data-id="${m.id}">${ic('undo','s')} Ripristina come collega attivo</button>`) : ''}`);
};
A['salva-membro'] = ds => {
  const nome = val('m-nome'), nick = val('m-nick'); if(!validaNome(nome) || !validaNick(nick)) return toast('Controlla nome e nickname', 'err');
  if(ds.id) C('membri').doc(ds.id).set({nome, nick}, {merge: true}).catch(e => toast(errMsg(e), 'err'));
  else {
    const ref = C('membri').doc();
    ref.set({nome, nick, attivo: true, creato: TS()}).catch(e => toast(errMsg(e), 'err'));
    if($('m-quota') && $('m-quota').checked) addMov({tipo:'quota', mid: ref.id, anno: anno(), metodo: 'esterno', importo: st.gruppo.quotaAnnua, cred: false});
  }
  closeSheet(); toast('Collega salvato');
};
// Toglie l'accesso a tutti i telefoni collegati al collega (e l'eventuale ruolo admin)
const isCreatore = mid => !!mid && st.gruppo && st.gruppo.creatoreMid === mid;
const adminDiMembro = mid => st.utenti.filter(u => u.mid === mid && st.admins.some(a => a.id === u.id));
const protettoUid = uid => { const g = st.gruppo || {}; if(g.creatoDa === uid) return true; const u = st.utenti.find(x => x.id === uid); return !!(u && g.creatoreMid && u.mid === g.creatoreMid); };
function scollega(b, mid, statoRichiesta, blocca){
  st.utenti.filter(u => u.mid === mid).forEach(u => {
    b.delete(C('utenti').doc(u.id));
    if(st.admins.some(a => a.id === u.id)) b.delete(C('admin').doc(u.id));
    b.set(C('richieste').doc(u.id), {stato: statoRichiesta, esitoDa: myName(), esitoTs: TS()}, {merge: true});
    if(blocca) b.set(C('bloccati').doc(u.id), {mid, da: myName(), ts: TS()});
  });
}
A['archivia'] = ds => {
  const m = membro(ds.id); if(!m) return;
  if(adminDiMembro(m.id).length && !sonoCreatore()) return toast('Un Supervisor lo può archiviare solo il Creatore', 'err');
  if(isCreatore(m.id)) return toast('Il creatore del gruppo non può essere archiviato', 'err');
  if(!confirm(`Archiviare ${m.nome}? Non farà più parte della saletta e il suo telefono perde l'accesso. Saldo e storico restano; potrai ripristinarlo.`)) return;
  const b = db.batch();
  b.set(C('membri').doc(m.id), {attivo: false, archiviatoDa: myName()}, {merge: true});
  scollega(b, m.id, 'archiviato', false);
  b.commit().then(() => toast(`${m.nome} archiviato`)).catch(e => toast(errMsg(e), 'err'));
  closeSheet();
};
A['espelli'] = ds => {
  const m = membro(ds.id); if(!m) return;
  if(adminDiMembro(m.id).length && !sonoCreatore()) return toast('Un Supervisor lo può espellere solo il Creatore', 'err');
  if(isCreatore(m.id)) return toast('Il creatore del gruppo non può essere espulso', 'err');
  if(!confirm(`Espellere ${m.nome}? Perde subito l'accesso e dal suo telefono non potrà più chiedere di rientrare.`)) return;
  const b = db.batch();
  b.set(C('membri').doc(m.id), {attivo: false, espulso: true, espulsoDa: myName()}, {merge: true});
  scollega(b, m.id, 'espulso', true);
  b.commit().then(() => toast(`${m.nome} espulso`)).catch(e => toast(errMsg(e), 'err'));
  closeSheet();
};
A['ripristina'] = ds => {
  const m = membro(ds.id); if(!m) return;
  C('membri').doc(m.id).set({attivo: true, espulso: false}, {merge: true}).then(() => toast(`${m.nome} di nuovo attivo. Per usare l'app dovrà chiedere l'accesso: collegalo a questo nome.`)).catch(e => toast(errMsg(e), 'err'));
  closeSheet();
};
function selMembro(id, sel){ return `${cercaBox(id)}<select class="in" id="${id}">${membriAttivi().map(m => `<option value="${m.id}" ${m.id===sel?'selected':''}>${esc(nomeM(m.id))}</option>`).join('')}</select>${cercaVuoto(id)}`; }
A['ricarica-per'] = ds => openSheet(`<h3>${ic('banknote')} Ricarica per un collega</h3><p class="sub">Hai ricevuto tu i soldi: vale subito.</p>
  <label class="f"><span>Collega</span>${selMembro('rp-m', ds.id)}</label>
  <label class="f"><span>Importo €</span><input class="in mono" id="rp-imp" inputmode="decimal" placeholder="10,00"></label>
  <label class="f"><span>Metodo</span>${segOpts('rp-met', [['contanti','💶 Contanti'],['revolut','📱 Revolut']], 'contanti')}</label>
  <button class="btn green block big" data-act="conferma-ricarica-per">Registra</button>`);
A['conferma-ricarica-per'] = () => {
  const mid = val('rp-m'), imp = parseEuro(val('rp-imp'));
  if(!mid || !(imp > 0)) return toast('Dati non validi', 'err');
  addMov({tipo:'ricarica', mid, importo: imp, metodo: radio('rp-met'), stato:'confermata', esitoDa: myName()});
  closeSheet(); toast(`Ricarica di ${eur(imp)} per ${nomeM(mid)}`);
};
/* --- punti caffè, punti (admin), spesa admin, prezzo caffè --- */
/* --- Premio del podio settimanale: lo riscatta il collega sul podio della settimana scorsa, una volta sola (ID fisso = create-only) --- */
function vitPremio(ps){
  if(vitOpen) return; vitOpen = true;
  const col = ['#f5a524', '#7c3aed', '#10b981', '#38bdf8', '#f472b6', '#facc15'];
  const conf = Array.from({length: 40}, (_, i) => `<i class="vit-c" style="left:${Math.round(Math.random() * 100)}%;background:${col[i % col.length]};animation-duration:${(2.6 + Math.random() * 2.4).toFixed(2)}s;animation-delay:${(Math.random() * 2.5).toFixed(2)}s"></i>`).join('');
  const tit = ['Sei il campione della settimana!', 'Argento: ottimo secondo posto!', 'Bronzo: sei salito sul podio!'][ps.pos - 1];
  const el = document.createElement('div');
  el.id = 'vittoria'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Premio del podio riscattato');
  el.innerHTML = `${conf}<div class="vit-box"><div class="vit-medal cup${ps.pos}" aria-hidden="true">🏆</div><div class="vit-pos" aria-hidden="true">${ps.medal}</div><h2>${tit}</h2>
    <div class="vit-r"><b>${ps.pos}° posto in classifica</b><span>${esc(ps.label)}</span><i>+${eur(ps.importo)} di crediti</i></div>
    <p class="hint" style="margin:10px 0 14px">I crediti sono già sul tuo saldo.</p>
    <button class="btn amber block" id="btn-vittoria-ok" data-act="vittoria-chiudi">Evviva!</button></div>`;
  document.body.appendChild(el);
  try { if(navigator.vibrate) navigator.vibrate([80, 40, 80]); } catch(e){}
}
A['riscatta-premio'] = () => {
  if(!ptMaster()) return toast('Sistema punti disattivato dal Supervisor', 'err');
  const ps = premioSett(derived());
  if(!ps || ps.fatto) return toast('Nessun premio da riscattare', 'err');
  const marca = ps.id + '_' + st.gid; LS.set(marca, 1);
  addMov({tipo: 'premio_podio', mid: st.mid, pos: ps.pos, sett: ps.key, settTxt: ps.label, importo: ps.importo}, ps.id, true,
    er => { LS.del(marca); if($('vittoria')) A['vittoria-chiudi'](); toast('Premio non riscattato (' + errMsg(er) + ')', 'err'); });
  vitPremio(ps);
};
/* --- Ben fatto: riconoscimento a un collega, con gettone periodico (controllo lato app sui movimenti già in memoria) --- */
function bfInizioPeriodo(){
  const o = new Date(); o.setHours(0, 0, 0, 0);
  if(bfPeriodo() === 'mese') return new Date(o.getFullYear(), o.getMonth(), 1).getTime();
  return new Date(o.getFullYear(), o.getMonth(), o.getDate() - ((o.getDay() + 6) % 7)).getTime();
}
function bfRinnovo(){
  const i = new Date(bfInizioPeriodo());
  return (bfPeriodo() === 'mese' ? new Date(i.getFullYear(), i.getMonth() + 1, 1) : new Date(i.getFullYear(), i.getMonth(), i.getDate() + 7)).toLocaleDateString('it-IT', {weekday: 'long', day: 'numeric', month: 'long'});
}
function bfCountdown(){
  const i = new Date(bfInizioPeriodo()), f = bfPeriodo() === 'mese' ? new Date(i.getFullYear(), i.getMonth() + 1, 1) : new Date(i.getFullYear(), i.getMonth(), i.getDate() + 7);
  const min = Math.max(0, Math.ceil((f.getTime() - Date.now()) / 60000)), g = Math.floor(min / 1440), h = Math.floor(min % 1440 / 60), m = min % 60;
  return 'tra ' + (g ? `${g}g ${h}h` : h ? `${h}h ${m}m` : `${m}m`);
}
function bfUsati(){
  const ini = bfInizioPeriodo(), d = derived();
  const live = tuttiMov().filter(m => m.tipo === 'ben_fatto' && m.mid === st.mid && m.t >= ini && !d.stornati.has(m.id)).map(m => m.t);
  const prima = ((st.estratto && st.estratto.mp && st.estratto.mp.bf && st.estratto.mp.bf[st.mid]) || []).filter(t => t >= ini);
  return live.length + prima.length;
}
const bfRestanti = () => st.mid ? Math.max(0, bfN() - bfUsati()) : 0;
function bfAggiorna(){
  if(!$('bf-msg')) return;
  const dest = radio('bf-dest'), msg = val('bf-msg'), ok = !!dest && msg.length >= 2 && msg.length <= 80 && bfRestanti() > 0;
  const b = $('bf-send'); if(b) b.disabled = !ok;
  const c = $('bf-cnt'); if(c) c.textContent = msg.length + '/80';
}
A['benfatto'] = () => {
  const col = membriAttivi().filter(m => m.id !== st.mid).slice().sort((a, b) => nomeM(a.id).localeCompare(nomeM(b.id)));
  const left = bfRestanti(), n = bfN();
  openSheet(`<h3>👏 Ben fatto!</h3>
    <p class="sub">Riconosci un collega meritevole: ${ptBfE() ? `lui riceve <b>+${ptBenFatto()} punti</b>, tu non perdi nulla.` : 'i punti «Ben fatto» sono disattivati: il riconoscimento resta, senza punti.'}</p>
    <div class="banner ${left > 0 ? 'sky' : 'amber'}">${ic(left > 0 ? 'info' : 'alert')}<div>${left > 0 ? `Gettoni disponibili: <b>${left}</b> su ${n} (${bfPeriodo() === 'mese' ? 'questo mese' : 'questa settimana'}).` : `Gettone già usato: si rinnova ${bfRinnovo()}.`}</div></div>
    ${col.length ? `<label class="f" style="margin-bottom:6px"><span>A chi?</span></label>${cercaBox('bf-lista')}<div id="bf-lista" style="max-height:30vh;overflow:auto;margin-bottom:10px">${col.map(m => `<label class="check" data-q="${qMem(m)}"><input type="radio" name="bf-dest" value="${m.id}" data-chg="bf-upd"><b style="flex:1;font-size:14px">${esc(nomeM(m.id))}</b></label>`).join('')}${cercaVuoto('bf-lista')}</div>` : '<div class="empty">Non ci sono altri colleghi.</div>'}
    <label class="f"><span>Perché? (obbligatorio) <small id="bf-cnt" class="mut">0/80</small></span><input class="in" id="bf-msg" maxlength="80" data-chg="bf-upd" placeholder="Es. Grazie per il turno, Caffè del venerdì, Auguri!"></label>
    <button class="btn green block big" id="bf-send" data-act="bf-invia" disabled>Invia 👏</button>`);
};
A['bf-invia'] = () => {
  const dest = radio('bf-dest'), msg = val('bf-msg').replace(/\s+/g, ' ').slice(0, 80);
  if(!dest || dest === st.mid || !membro(dest)) return toast('Scegli un collega', 'err');
  if(msg.length < 2) return toast('Scrivi la motivazione', 'err');
  if(bfRestanti() <= 0) return toast('Gettone già usato in questo periodo', 'err');
  addMov({tipo:'ben_fatto', mid: st.mid, dest, daMid: st.mid, aMid: dest, msg, pt: ptBfE()});
  closeSheet(); toast(`👏 Ben fatto a ${nomeBreve(dest)}!${ptBfE() ? ` +${ptBfE()} punti` : ''}`);
};
A['salva-punti'] = () => {
  const n = id => Math.floor(Number(val(id))), d = id => Math.round(Number(val(id).replace(',', '.')) * 100) / 100;
  const v = {ptCaffe: n('rp-caffe'), ptBenFatto: n('rp-bf'), ptSpesaMax: n('rp-spmax'), bfN: n('rp-bfn'),
    ptSnackEuro: d('rp-snackeuro'), ptSpesaEuro: d('rp-speuro'), resaKg: n('rp-resa')};
  const inR = (x, lo, hi) => Number.isInteger(x) && x >= lo && x <= hi, inD = x => isFinite(x) && x >= 0 && x <= 100;
  const ok = inR(v.resaKg, 1, 500) && inR(v.ptCaffe, 0, 100) && inR(v.ptBenFatto, 0, 100) && inR(v.ptSpesaMax, 0, 1000) && inD(v.ptSnackEuro) && inD(v.ptSpesaEuro) && inR(v.bfN, 1, 20);
  if(!ok) return toast('Valori non validi', 'err');
  const sw = {ptOn: !!($('rp-on') && $('rp-on').checked)};
  RP_SW.forEach(([id, k]) => { sw[k] = !!($(id) && $(id).checked); });
  G().set({...v, ...sw, bfPeriodo: val('rp-bfp') === 'mese' ? 'mese' : 'settimana'}, {merge: true}).then(() => toast('Regole salvate')).catch(e => toast(errMsg(e), 'err'));
};
/* valori consigliati: una sola scrittura, solo su richiesta del Supervisor; nulla viene sovrascritto in automatico */
const RP_CONSIGLIATI = {ptCaffe: 10, ptSnackEuro: 10, ptSpesaEuro: 10, ptSpesaMax: 500, ptBenFatto: 20};
A['salva-premi-podio'] = () => {
  if(!sonoCreatore()) return toast('Solo il Creatore può impostare i premi', 'err');
  const v = [1, 2, 3].map(i => Math.round(Number(val('rp-premio' + i).replace(',', '.')) * 100));
  if(!v.every(x => Number.isInteger(x) && x >= 0 && x <= 50000)) return toast('Importi non validi (da 0 a 500 €)', 'err');
  G().set({premiPodio: v}, {merge: true}).then(() => toast('Premi del podio salvati')).catch(e => toast(errMsg(e), 'err'));
};
A['rp-consigliati'] = () => {
  if(!can('compiti')) return;
  if(!confirm('Applicare i valori consigliati?\n\nCaffè 10 punti · snack 10 punti per 1,00 € · rimborsi 10 punti per € (tetto 500) · «Ben fatto» 20.\nVale per gli eventi futuri: quelli passati non cambiano.')) return;
  const ids = {ptCaffe: 'rp-caffe', ptSnackEuro: 'rp-snackeuro', ptSpesaEuro: 'rp-speuro', ptSpesaMax: 'rp-spmax', ptBenFatto: 'rp-bf'}, prima = {};
  Object.keys(ids).forEach(k => { const e = $(ids[k]); if(e){ prima[ids[k]] = e.value; e.value = nDec(RP_CONSIGLIATI[k]); } });
  G().set(RP_CONSIGLIATI, {merge: true}).then(() => toast('Valori consigliati applicati')).catch(e => { Object.keys(prima).forEach(id => { const x = $(id); if(x) x.value = prima[id]; }); toast(errMsg(e), 'err'); });
};
/* passaggio alla scala punti ×10: una sola scrittura sul documento del gruppo (scalaDa + valori espliciti); i movimenti vecchi si rivalutano in memoria */
A['scala10'] = () => {
  if(!can('compiti') || scalaDa()) return;
  if(!confirm('Passare alla scala punti ×10?\n\nValori: soglia 300 punti = 1 credito · caffè 10 · snack 10 · «Ben fatto» 20 · macchinetta 10.\nI punti già maturati vengono moltiplicati per 10 (i vecchi turni di pulizia valgono 50). L\'operazione non si annulla.')) return;
  // i campi della pagina conservano il testo digitato tra un render e l'altro: li aggiorno subito, altrimenti «Salva le regole» riscriverebbe i valori vecchi
  const campi = {'rp-soglia': 300, 'rp-caffe': 10, 'rp-snack': 10, 'rp-bf': 20}, prima = {};
  Object.keys(campi).forEach(id => { const e = $(id); if(e){ prima[id] = e.value; e.value = campi[id]; } });
  G().set({scalaDa: Date.now(), sogliaPunti: 300, creditiSoglia: creditiSoglia(), ptCaffe: 10, ptBenFatto: 20}, {merge: true})
    .then(() => toast('Scala ×10 attiva'))
    .catch(e => { Object.keys(prima).forEach(id => { const x = $(id); if(x) x.value = prima[id]; }); toast(errMsg(e), 'err'); });
};

