'use strict';
/* ---------- eventi DOM ---------- */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if(!el || el.disabled) return;
  const f = A[el.dataset.act];
  if(f){ if(!(el.type === 'checkbox')) e.preventDefault(); guard(f)(el.dataset, el); }   // sui checkbox il preventDefault annullava il flag appena toccato
});
document.addEventListener('change', e => {
  if(e.target && e.target.name === 'q-met') quotaAggiorna();
  const el = e.target.closest('[data-chg]');
  if(el && el.dataset.chg === 'rp-data'){ st.rpDa = ($('rp-da') || {}).value || ''; st.rpA = ($('rp-a') || {}).value || ''; render(); }
  if(el && el.dataset.chg === 'rp-sw') document.querySelectorAll('#rp-sw-lista input').forEach(i => { i.disabled = !el.checked; });
  if(el && el.dataset.chg === 'resa-gr'){
    const r = $('rp-resa'), g = $('rp-gr');
    if(r && g){
      if(e.target === g){ const x = Number(String(g.value).replace(',', '.')); if(x > 0) r.value = Math.max(1, Math.min(500, Math.round(1000 / x))); }
      const rv = Math.floor(Number(r.value)); if(rv >= 1 && rv <= 500) g.value = String(Math.round(10000 / rv) / 10).replace('.', ',');
    }
  }
  if(el && el.dataset.chg === 'corr') corrAggiorna();
  if(el && el.dataset.chg === 'rb-upd' && e.target.name === 's-rimb') rbAggiorna();
  if(el && el.dataset.chg === 'salper'){ st.salPer = el.value; st.scSel = null; render(); }
  if(el && el.dataset.chg === 'saldate'){ st.salDa = $('sal-da').value; st.salA = $('sal-a').value; st.scSel = null; render(); }
  if(el && el.dataset.chg === 'rd-opz') aggiornaAnteprimaRd();
  if(el && el.dataset.chg === 'rg-upd') rgAggiorna();
  if(el && el.dataset.chg === 'ac-upd') acAggiorna();
  if(el && el.dataset.chg === 'bf-upd') bfAggiorna();
  if(e.target && e.target.id === 'bk-file' && e.target.files && e.target.files[0]) guard(leggiBackup)(e.target.files[0]);
});
document.addEventListener('input', e => {
  if(e.target && e.target.id === 'qs-in'){ qsFiltra(); return; }
  if(e.target && (e.target.id === 's-qd' || e.target.id === 's-qc' || e.target.id === 's-imp')) rbAggiorna(e.target.id === 's-qc' ? 'qc' : 'qd');
  const el = e.target.closest && e.target.closest('[data-chg="rg-upd"]');
  if(el) rgAggiorna();
  if(e.target.closest && e.target.closest('[data-chg="ac-upd"]')) acAggiorna();
  if(e.target.closest && e.target.closest('[data-chg="bf-upd"]')) bfAggiorna();
  if(e.target && e.target.dataset && e.target.dataset.cerca) cercaApplica(e.target);
  if(e.target && e.target.id === 'feed-q'){   // filtra la sola lista, senza ricostruire la pagina (la tastiera resta aperta)
    st.feedQ = e.target.value; const l = $('feed-list'), x = $('feed-q-x');
    if(l) l.innerHTML = feedLista(derived());
    if(x) x.hidden = !st.feedQ;
  }
});
document.addEventListener('keydown', e => {
  if(e.key === 'Escape'){ if($('infopop')) A['info-x'](); closeSheet(); A['drawer-close'](); }
  if(e.key === 'Enter' && e.target.id === 'j-code') A['join']();
  if(e.key === 'Enter' && e.target.id === 'sp-nome') A['spesa-aggiungi']();
});
setInterval(() => { if(st.page === 'feed' || st.page === 'bar') render(); }, 60000);

/* ---------- Riepilogo per periodo (admin): filtri rapidi, tutto calcolato in memoria; condivisione testuale ---------- */
const RP_PER = [['oggi', 'Oggi'], ['settimana', 'Questa settimana'], ['mese', 'Questo mese'], ['corrente', 'Periodo corrente'], ['custom', 'Personalizzato']];
const dBr = ms => new Date(ms).toLocaleDateString('it-IT', {day: 'numeric', month: 'short', year: 'numeric'}).replace(/\.$/, '');
function rpRange(pp){
  const o = new Date(), y = o.getFullYear(), m = o.getMonth(), p = pp || st.rpPer || 'oggi';
  const ini = dt => { dt.setHours(0, 0, 0, 0); return dt.getTime(); }, fine = dt => { dt.setHours(23, 59, 59, 999); return dt.getTime(); };
  if(p === 'settimana'){ const dow = (o.getDay() + 6) % 7, da = ini(new Date(y, m, o.getDate() - dow)); return {p, da, a: Infinity, label: `Questa settimana (da ${dBr(da)})`}; }
  if(p === 'mese') return {p, da: ini(new Date(y, m, 1)), a: Infinity, label: `Questo mese (${o.toLocaleDateString('it-IT', {month: 'long', year: 'numeric'})})`};
  if(p === 'corrente'){ const l = ultimaChiusura(), da = l ? l.fino.toMillis() : 0; return {p, da, a: Infinity, label: da ? `Periodo corrente (dal ${dBr(da)})` : 'Periodo corrente (dall\'inizio)'}; }
  if(p === 'custom'){
    const da = st.rpDa ? ini(new Date(st.rpDa + 'T00:00:00')) : 0, a = st.rpA ? fine(new Date(st.rpA + 'T00:00:00')) : Infinity;
    return {p, da, a, label: (st.rpDa ? dBr(da) : 'inizio') + ' → ' + (st.rpA ? dBr(a) : 'oggi')};
  }
  return {p: 'oggi', da: ini(new Date(y, m, o.getDate())), a: Infinity, label: `Oggi (${dBr(Date.now())})`};
}
/* totali del periodo dai movimenti gia' in memoria (stessa regola degli storni delle altre statistiche) */
function riepRange(r){
  const R = {caffe: 0, caffeE: 0, snack: 0, snackE: 0, inC: 0, inR: 0, spese: 0, per: {}};
  const per = mid => R.per[mid] || (R.per[mid] = {n: 0, e: 0});
  const pass = (m, sg) => {
    switch(m.tipo){
      case 'caffe': case 'caffe_pagato': if(m.stato !== 'annullata'){ R.caffe += sg * (m.qta || 0); R.caffeE += sg * (m.importo || 0); const p = per(m.mid); p.n += sg * (m.qta || 0); p.e += sg * (m.importo || 0); } break;
      case 'snack': if(m.stato !== 'annullata'){ R.snack += sg * (m.qta || 0); R.snackE += sg * (m.importo || 0); const p = per(m.mid); p.n += sg * (m.qta || 0); p.e += sg * (m.importo || 0); } break;
      case 'ricarica': if(m.stato === 'confermata'){ if(m.metodo === 'revolut') R.inR += sg * m.importo; else R.inC += sg * m.importo; } break;
      case 'quota': if(!m.stato || m.stato === 'confermata'){ if(m.metodo === 'revolut') R.inR += sg * m.importo; else if(m.metodo === 'contanti') R.inC += sg * m.importo; } break;
      case 'spesa': if(m.stato === 'confermata') R.spese += sg * m.importo; break;
      case 'storno': if(m.orig) pass(m.orig, -sg); break;
    }
  };
  (st.isAdmin && st.arcMov ? st.arcMov : []).concat(tuttiMov()).filter(m => m.t >= r.da && m.t <= r.a).forEach(m => pass(m, 1));
  R.top = Object.entries(R.per).filter(([, v]) => v.n > 0).sort((a, b) => b[1].e - a[1].e || b[1].n - a[1].n).slice(0, 5).map(([mid, v]) => ({mid, n: v.n, e: v.e}));
  return R;
}
A['rp-per'] = ds => { if(!RP_PER.some(x => x[0] === ds.v)) return; st.rpPer = ds.v; render(); };
/* ---------- Icone (i): spiegazioni a comparsa, si chiudono con un tocco sullo sfondo ---------- */
const INFOS = {};
const infoBtn = (h, label) => {
  let x = 0; for(let i = 0; i < h.length; i++) x = (x * 31 + h.charCodeAt(i)) | 0;
  const k = 'i' + (x >>> 0).toString(36); INFOS[k] = h;
  return label ? `<button type="button" class="hint-i" data-act="info" data-k="${k}" aria-label="${label}"><span class="ibtn">i</span>${label}</button>`
    : `<button type="button" class="ibtn" data-act="info" data-k="${k}" aria-label="Informazioni">i</button>`;
};
A['info'] = ds => {
  const h = INFOS[ds.k]; if(!h) return;
  let o = $('infopop'); if(!o){ o = document.createElement('div'); o.id = 'infopop'; o.setAttribute('data-act', 'info-x'); document.body.appendChild(o); }
  o.innerHTML = `<div class="ip-card" role="dialog" aria-modal="true">${h}</div>`; o.classList.add('on');
};
A['info-x'] = () => { const o = $('infopop'); if(o) o.classList.remove('on'); };

/* ---------- Cerca collega: filtro istantaneo lato client sui dati gia' in memoria (nessuna lettura) ---------- */
const norm = t => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const qMem = m => esc(norm((m.nome || '') + ' ' + (m.nick || '')));
const cercaBox = id => `<div class="cerca"><input class="in" type="search" id="${id}-q" data-cerca="${id}" inputmode="search" autocomplete="off" placeholder="🔍 Cerca collega..." aria-label="Cerca collega"><button type="button" class="btn sm ghost" id="${id}-qx" data-act="cerca-x" data-t="${id}" hidden aria-label="Azzera la ricerca">✕</button></div>`;
const cercaVuoto = id => `<div class="empty cerca-vuoto" id="${id}-vuoto" hidden>Nessun collega trovato</div>`;
const cercaTesto = id => { const i = $(id + '-q'); return i ? norm(i.value.trim()) : ''; };
const cercaFiltra = (id, arr) => { const q = cercaTesto(id); return q ? arr.filter(m => norm((m.nome || '') + ' ' + (m.nick || '')).includes(q)) : arr; };
function cercaApplica(inp){
  const id = inp.dataset.cerca, el = $(id); if(!el) return;
  const q = norm(inp.value.trim());
  let n = 0, tot = 0;
  if(el.tagName === 'SELECT'){   // menu a tendina: ricostruisco le voci, tenendo la scelta se ancora visibile
    const cur = el.value, all = membriAttivi(), ok = q ? all.filter(m => norm(m.nome + ' ' + (m.nick || '')).includes(q)) : all;
    el.innerHTML = ok.map(m => `<option value="${m.id}">${esc(nomeM(m.id))}</option>`).join('');
    if(ok.some(m => m.id === cur)) el.value = cur;
    n = ok.length; tot = all.length;
  } else {
    el.querySelectorAll('[data-q]').forEach(x => { const vis = !q || x.dataset.q.includes(q); x.hidden = !vis; tot++; if(vis) n++; });
  }
  const v = $(id + '-vuoto'); if(v) v.hidden = n > 0 || !tot;
  const x = $(id + '-qx'); if(x) x.hidden = !q;
}
const cercaTutti = () => document.querySelectorAll('[data-cerca]').forEach(cercaApplica);
A['cerca-x'] = ds => { const i = $(ds.t + '-q'); if(i){ i.value = ''; cercaApplica(i); i.focus(); } };

