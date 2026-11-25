'use strict';
/* ---------- Incarichi e punti (ex Briefing) ---------- */
const avvisoPuntiOff = () => ptMaster() ? '' : `<div class="banner amber" id="punti-off">${ic('alert')}<div class="grow"><b>Sistema punti disattivato</b><br><span style="font-size:12.5px">Nessun punto viene accreditato: le classifiche mostrano lo storico.</span></div></div>`;
/* riga di un incarico in corso: chi, da quanto, azione coerente con lo stato */
function cpRiga(m, me){
  const chi = x => esc(nomeBreve(x) || nomeM(x)), mio = m.mid === me, g = Math.floor((Date.now() - m.t) / 864e5);
  const eta = g <= 0 ? 'assegnato oggi' : g === 1 ? 'assegnato 1 giorno fa' : `assegnato ${g} giorni fa`;
  const da = m.da && m.da !== m.mid ? ` · estratto da ${chi(m.da)}` : '';
  let az = '';
  if(m._pending || m._local) az = '<span class="pill mut">invio…</span>';
  else if(m.stato === 'assegnato'){
    az = mio ? `<button class="btn sm green" id="btn-cp-fatto-${m.id}" data-act="cp-fatto" data-id="${m.id}">✅ Ho fatto!</button>` : '<span class="pill amber">da svolgere</span>';
    if(can('compiti')) az += ` <button class="btn link" style="padding:0;color:var(--mut)" id="btn-cp-annulla-${m.id}" data-act="cp-annulla" data-id="${m.id}">Annulla</button>`;
  } else if(m.stato === 'attesa'){
    az = cpPuoConv(m)
      ? `<div class="row" style="gap:4px"><button class="btn sm red" data-act="esito" data-id="${m.id}" data-v="rifiutata" aria-label="Rifiuta">✕</button><button class="btn sm green" id="btn-cp-ok-${m.id}" data-act="esito" data-id="${m.id}" data-v="confermata">Convalida</button></div>`
            : `<span class="pill violet">${mio ? 'in attesa di un altro Supervisor o del Creatore' : 'in attesa di convalida'}</span>`;
  }
  return `<div class="li" id="cp-inc-${m.id}"><div class="av">🎯</div>
    <div class="grow"><div class="t" style="white-space:normal;font-weight:700">${esc(m.nome || 'Compito')} · <b>${chi(m.mid)}</b>${mio ? ' <span class="pill violet">tu</span>' : ''}</div>
      <div class="d">+${m.punti || 0} pt · ${eta}${da}${m.stato === 'attesa' ? ' · svolto, da convalidare' : ''}</div></div>
    <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">${az}</div></div>`;
}
/* 🧹 Mastro Lindo: azione diretta di punti. Chi gestisce (Creatore o «Punti e Regole») assegna a consuntivo un montepremi fisso (lo imposta il Creatore),
   diviso in parti uguali tra chi ha pulito. Movimento 'bonus_podio' con extra:1 (conta nella classifica della settimana in cui viene dato). */
const SF_PUL = {id: 'pulizie', nome: '🧹 Mastro Lindo', pt: 20};
const pulMonte = () => { const v = st.gruppo && st.gruppo.sfPunti && st.gruppo.sfPunti.pulizie; return Number.isInteger(v) && v >= 0 ? Math.min(v, 100) : SF_PUL.pt; };
const sxSf = id => id === 'pulizie' ? SF_PUL : null;
const sfNome = id => esc(nomeBreve(id) || nomeM(id));
const sfWeek = () => { const l = lunediDi(new Date()), f = new Date(l.getFullYear(), l.getMonth(), l.getDate() + 6), dm = x => x.getDate() + '/' + (x.getMonth() + 1); return {key: 'w' + isoDi(l), label: 'settimana ' + dm(l) + '–' + dm(f)}; };
let vitOpen = false;   // animazione a tutto schermo (premio del podio riscattato)
