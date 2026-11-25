'use strict';
/* ---------- tema grafico: attuale o natalizio. La scelta resta solo su questo telefono (nessun dato su Firebase) ---------- */
const TEMI = [['auto', 'Automatico'], ['base', 'Tema attuale'], ['natale', 'Natalizio']];
const TEMA_COLORE = {base: '#0b1020', natale: '#1c090d'};

/* periodo natalizio: dal 1° dicembre al 6 gennaio compresi, ogni anno a partire da dicembre 2026 (data del telefono) */
function periodoNatale(d){
  const a = d.getFullYear(), m = d.getMonth(), g = d.getDate();
  return (m === 11 && a >= 2026) || (m === 0 && g <= 6 && a >= 2027);
}
function temaScelta(){ const v = LS.get('tema', 'auto'); return TEMI.some(t => t[0] === v) ? v : 'auto'; }
function temaAttivo(d){
  const s = temaScelta();
  return s !== 'auto' ? s : periodoNatale(d || new Date()) ? 'natale' : 'base';
}

/* fiocchi: posizione (% orizzontale), diametro (px), durata e anticipo (s) */
const NEVE = [[4,5,17,2],[12,3,23,14],[21,6,19,9],[29,4,26,3],[38,3,21,17],[47,5,24,11],[55,4,18,6],[63,6,27,21],[71,3,20,1],[80,5,22,15],[88,4,25,8],[95,3,19,12]];
function neve(on){
  let el = document.getElementById('neve');
  if(!on){ if(el) el.remove(); return; }
  if(el) return;
  el = document.createElement('div'); el.id = 'neve'; el.setAttribute('aria-hidden', 'true');
  el.innerHTML = NEVE.map(([x, p, t, r]) => `<i style="left:${x}%;width:${p}px;height:${p}px;animation-duration:${t}s;animation-delay:-${r}s"></i>`).join('');
  document.body.appendChild(el);
}

function applicaTema(){
  const t = temaAttivo(), root = document.documentElement;
  if(t === 'natale') root.setAttribute('data-tema', 'natale'); else root.removeAttribute('data-tema');
  const meta = document.querySelector('meta[name="theme-color"]');
  if(meta) meta.setAttribute('content', TEMA_COLORE[t]);
  neve(t === 'natale');
}
applicaTema();
/* in Automatico il cambio di giorno si applica anche ad app gia' aperta */
document.addEventListener('visibilitychange', () => { if(!document.hidden) applicaTema(); });
setInterval(applicaTema, 60000);
