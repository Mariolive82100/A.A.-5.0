'use strict';
/* ---------- tasto / gesture "Indietro" (History API) ----------
   Una sola voce "sentinella" sopra la base della cronologia: a ogni Indietro l'app decide cosa chiudere
   (sheet, menu, pagina) leggendo lo stato esistente e riarma la sentinella. Dalla Home il primo Indietro avvisa,
   il secondo (entro 2,5 s) esce davvero. Nessun URL cambia e nessun dato viene letto. */
let backArmata = false, backTimer = null;
const GUARD = {armieri: 'guard'};
const inAppOra = () => st.sync !== 'nocfg' && st.gid && st.uid && st.ready.g && st.ready.u && st.mid && membro(st.mid);
function backRiarma(){ clearTimeout(backTimer); backTimer = null; try { history.pushState(GUARD, ''); } catch(e){} }
function backArma(){
  if(backArmata) return;
  try { if(!(history.state && history.state.armieri === 'guard')){ history.replaceState({armieri: 'base'}, ''); history.pushState(GUARD, ''); } backArmata = true; } catch(e){}
}
/* true se l'Indietro e' stato assorbito dall'app (qualcosa da chiudere o una pagina da cui tornare) */
function indietro(){
  if($('vittoria')){ A['vittoria-chiudi'](); return true; }
  if($('infopop') && $('infopop').classList.contains('on')){ A['info-x'](); return true; }
  if($('sheet').classList.contains('on')){ closeSheet(); return true; }
  if($('drawer').classList.contains('on')){ A['drawer-close'](); return true; }
  if(!inAppOra()){ if(st.entry){ st.entry = null; render(); return true; } return false; }
  if(st.pinDoc === null || (st.pinDoc && st.pinDoc.temporaneo)) return false;   // schermata bloccante: nessuna navigazione
  if(st.page !== 'bar'){ A['go']({p: SALETTA_SUB.includes(st.page) && st.page !== 'saletta' ? 'saletta' : 'bar'}); return true; }
  return false;
}
const overlayAperto = () => !!(($('infopop') && $('infopop').classList.contains('on')) || $('sheet').classList.contains('on') || $('drawer').classList.contains('on') || $('vittoria'));
function chiudiOverlay(){
  if($('vittoria')) A['vittoria-chiudi']();
  else if($('infopop') && $('infopop').classList.contains('on')) A['info-x']();
  else if($('sheet').classList.contains('on')) closeSheet();
  else A['drawer-close']();
}
window.addEventListener('popstate', () => {
  if(!backArmata) return;
  const hs = history.state;
  if(hs && hs.armieri === 'guard') return;   // voce di guardia dell'app: niente altro da fare
  if(indietro()){ backRiarma(); return; }
  toast('Premi ancora Indietro per uscire');
  clearTimeout(backTimer);
  backTimer = setTimeout(backRiarma, 2500);
});
/* se l'utente tocca qualcosa durante la finestra di uscita, la sentinella torna subito */
document.addEventListener('click', () => { if(backTimer) backRiarma(); }, true);
/* Chrome ignora le voci aggiunte senza gesto dell'utente: la sentinella si arma al primo tocco */
(function(){
  if(history.state && history.state.armieri === 'guard'){ backArmata = true; return; }
  const arma = () => { document.removeEventListener('click', arma, true); document.removeEventListener('keydown', arma, true); backArma(); };
  document.addEventListener('click', arma, true); document.addEventListener('keydown', arma, true);
})();

/* scheda -> immagine PNG: la scheda viene clonata con gli stili calcolati e disegnata in un SVG (foreignObject) poi su canvas. Tutto in locale, nessuna lettura/scrittura. */
async function cardImmagine(c){
  const rc = c.getBoundingClientRect(), W = Math.ceil(rc.width), H = Math.ceil(rc.height);
  const cl = c.cloneNode(true);
  const src = [c, ...c.querySelectorAll('*')], dst = [cl, ...cl.querySelectorAll('*')];
  src.forEach((e, i) => {
    const d = dst[i]; if(!d || !d.style) return;
    const cs = getComputedStyle(e); let t = '';
    for(let k = 0; k < cs.length; k++){ const n = cs[k]; t += n + ':' + cs.getPropertyValue(n) + ';'; }
    d.setAttribute('style', t);
  });
  cl.querySelectorAll('.cs-btn, script, .hint-i, .ibtn, button.hint-i, #btn-st-img').forEach(x => x.remove());
  cl.style.margin = '0'; cl.style.width = W + 'px'; cl.style.height = H + 'px'; cl.style.boxSizing = 'border-box'; cl.style.position = 'static';
  cl.querySelectorAll('use').forEach(u => {   // le icone del gruppo di simboli stanno fuori dalla scheda: si copiano dentro
    const id = (u.getAttribute('href') || u.getAttribute('xlink:href') || '').replace('#', ''), sym = id && document.getElementById(id), sv = u.closest('svg');
    if(sym && sv){ if(sym.getAttribute('viewBox')) sv.setAttribute('viewBox', sym.getAttribute('viewBox')); const g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.innerHTML = sym.innerHTML; u.replaceWith(g); } else u.remove();
  });
  cl.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
  const bg = getComputedStyle(document.body).backgroundColor || '#0b1220', PAD = 18, FOOT = 34, CW = W + PAD * 2, CH = H + PAD + FOOT;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><foreignObject x="0" y="0" width="100%" height="100%">${new XMLSerializer().serializeToString(cl)}</foreignObject></svg>`;
  const img = new Image();
  await new Promise((ok, ko) => { img.onload = ok; img.onerror = () => ko(new Error('img')); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); });
  const K = 2, cv = document.createElement('canvas'); cv.width = CW * K; cv.height = CH * K;
  const x = cv.getContext('2d'); x.scale(K, K);
  x.fillStyle = bg; x.fillRect(0, 0, CW, CH);
  x.drawImage(img, PAD, PAD, W, H);
  x.fillStyle = '#9aa7bd'; x.font = '600 13px system-ui, sans-serif'; x.textAlign = 'center';
  x.fillText(`☕ ${st.gruppo.nome || 'Saletta'} — Armieri 5.0`, CW / 2, PAD + H + 22);
  return await new Promise((res, rej) => { try { cv.toBlob(b => b ? res(b) : rej(new Error('blob')), 'image/png'); } catch(e){ rej(e); } });
}
A['card-share'] = async (ds, el) => {
  const c = el && el.closest('.card'); if(!c) return;
  const zeri = [...c.querySelectorAll('.rk.z')];   // nella sola immagine condivisa: solo chi ha punteggio maggiore di 0 (nell'app restano tutti)
  zeri.forEach(e => { e.style.display = 'none'; });
  const {titolo, corpo} = cardTesto(c), testo = `☕ ${st.gruppo.nome || 'Saletta'} — Armieri 5.0\n\n${corpo}`;
  try {
    const blob = await cardImmagine(c);
    zeri.forEach(e => { e.style.display = ''; });
    const nome = 'armieri_' + (titolo || 'scheda').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 30) + '_' + oggiISO() + '.png';
    await condividiBlob(blob, nome, titolo || 'Armieri 5.0', `☕ ${st.gruppo.nome || 'Saletta'} — ${titolo || 'Armieri 5.0'}`, 'Immagine scaricata: allegala al messaggio');
  } catch(e){   // se il browser non riesce a disegnare la scheda, si ripiega sul testo
    zeri.forEach(x => { x.style.display = ''; });
    if(navigator.share){ navigator.share({title: titolo || 'Armieri 5.0', text: testo}).catch(() => {}); return; }
    try { navigator.clipboard.writeText(testo).then(() => toast('Immagine non disponibile: scheda copiata come testo')).catch(() => toast('Condivisione non disponibile', 'err')); } catch(e2){ toast('Condivisione non disponibile', 'err'); }
  }
};
