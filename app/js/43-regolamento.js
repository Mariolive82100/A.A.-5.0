'use strict';
/* ---------- REGOLAMENTO ---------- */
function pRegolamento(){
  const g = st.gruppo || {};
  const sez = (t, righe) => `<div class="card"><h3>${t}</h3><ul class="rg">${righe.filter(Boolean).map(r => `<li>${r}</li>`).join('')}</ul></div>`;
  const pt = n => `+${n} pt`;
  const nota = (ok, txt) => ok ? '' : txt;
  return `<h2>${ic('receipt')} Regolamento</h2><p class="sub">${esc(g.nome || 'Armieri 5.0')} · versione 5.3 · novembre 2026</p>
  ${sez('🎯 Principi', [
    '<b>Registra subito</b> ogni consumo: ognuno risponde del proprio.',
    '<b>Contabilità, non denaro:</b> l\'app tiene crediti e debiti; i soldi passano in contanti o Revolut, fuori dall\'app.',
    '<b>Trasparenza:</b> il Registro è visibile a tutti; i saldi degli altri no.'])}
  ${sez('💳 Crediti', [
    '<b>1 credito = 1,00 €</b>, senza commissioni.',
    '<b>Ricarica:</b> la chiedi dal pulsante «Ricarica»; i crediti arrivano quando un Supervisor conferma l\'incasso.',
    '<b>Saldo mai sotto zero:</b> senza credito non si registrano caffè, snack, regali o vendite.',
    '<b>Riscatto in denaro:</b> l\'importo resta riservato finché un Supervisor non lo paga dalla cassa.',
    `<b>Regala crediti:</b> immediato e definitivo, fino a ${MAX_REGALO} crediti (${eur(MAX_REGALO * 100)}) per collega e per regalo. <b>Scambia / Vendi:</b> il collega conferma dopo aver ricevuto il denaro.`])}
  ${sez('☕ Caffè e snack', [
    `Prezzo da listino (caffè ${eur(g.prezzoCaffe || 0)}), addebitato subito sul saldo.`,
    `Ti sei sbagliato? <b>Annulla entro ${ANNULLA_MIN} minuti.</b>`,
    'In Home il pulsante <b>💳 Paga</b> raccoglie i consumi: toccalo e scegli <b>☕ Caffè</b> (singolo o giro offerto) oppure <b>🍫 Snack e bibite</b>; dentro il pulsante vedi anche la scorta di caffè stimata. Con credito insufficiente la voce corrispondente resta disabilitata.',
    'Ogni prelievo riduce la scorta in inventario. Se un articolo è segnato <b>⚠️ Esaurito</b> non si può acquistare finché non viene ricaricato.'])}
  ${sez('🛒 Spesa e rimborsi', [
    'La <b>Lista della spesa</b> è solo un <b>promemoria</b>: chiunque aggiunge ciò che manca e chi lo compra lo spunta per toglierlo dall\'elenco. Non genera rimborsi.',
    'Hai anticipato dei soldi per il gruppo (acquisti per la saletta o spese straordinarie come un telegramma o un omaggio autorizzato)? Da Home tocca <b>💰 Riscatta o rimborso → 🧾 Rimborso spesa</b>: indica motivo, importo e se vuoi il rimborso <b>in crediti</b> o in <b>denaro reale</b>.',
    'Il rimborso può essere <b>tutto in crediti</b>, <b>tutto in denaro reale</b> oppure <b>misto</b> (una parte in denaro e una in crediti, con le due quote che sommano esattamente il totale). Per il denaro il Supervisor sceglie contanti o Revolut: la cassa cala solo della quota in denaro e il tuo saldo sale solo della quota in crediti.',
    'Il rimborso vale solo dopo la <b>convalida</b> di un Supervisor ed è sempre al 100%. Se rifiutato o annullato, non cambia nulla.',
    'Alla convalida ricevi anche i <b>punti spesa</b>, proporzionali all\'importo, per qualunque motivo di spesa.'])}
  ${sez('🏅 Classifica e Mastro Lindo', [
    'Nella scheda <b>Classifica e statistiche</b> vedi la classifica a punti della settimana (corrente o scorsa) e le <b>classifiche per categoria</b>: ☕ Caffè, 🔄 Giri, 🧹 Mastro Lindo (punti pulizie) e 👏 Ben fatto. Le categorie sono solo statistiche: non assegnano punti né premi. I punti delle 🧾 spese e delle 🔋 ricariche si vedono nei filtri del podio.',
    '<b>🧹 Mastro Lindo:</b> quando qualcuno fa le pulizie, il Creatore o un Supervisor con «Punti e Regole» assegna dalla scheda Classifica un <b>montepremi di punti fissato dal Creatore</b> (Regole punti): se pulisce una persona li prende tutti, se sono di più si dividono in parti uguali. I punti vanno subito nella classifica della settimana e compaiono nel registro.',
    'Le vecchie sfide non esistono più: i punti già assegnati restano in classifica. I premi settimanali del podio (crediti) funzionano come prima.',
    'Il vecchio sistema dei compiti con sorteggio non c\'è più. Gli incarichi già assegnati restano in <b>Incarichi in sospeso</b> (nelle Notifiche, visibili solo a chi gestisce), dove si convalidano o si annullano; i punti già convalidati restano.',
    '🛡️ <b>Supervisor:</b> colleghi di fiducia nominati dal Creatore, senza scadenza finché non revocati. Ognuno ha solo i permessi che il Creatore gli concede (vedi «Ruoli»).',
    'Nessuno convalida un <b>proprio</b> incarico in sospeso: serve un altro Supervisor con il permesso «Punti e Regole» o il Creatore (unica eccezione: il Creatore, se è l\'unico a poter convalidare).'])}
    ${sez('⭐ Punti Collega Modello', [
    !ptMaster() ? '⚠️ <b>Sistema punti disattivato dal Supervisor:</b> nessun accredito; i punti già maturati restano.' : '',
    `<b>Si guadagnano:</b> ☕ ${ptCaffeE()} per caffè · 🍫 ${nDec(ptSnackEuro())} ${ptSnackEuro() === 1 ? 'punto' : 'punti'} per ogni 1,00 € di snack · 👏 ${ptBfE()} per «Ben fatto» ricevuto · 🎯 compiti convalidati · 🔋 ricarica convalidata: ${nDec(ptRicEuro())} ${ptRicEuro() === 1 ? 'punto' : 'punti'} per ogni € ricaricato, massimo ${ptRicMax()} per ricarica (dal 23/11/2026) · 🧾 spesa convalidata: ${nDec(ptSpesaEuro())} ${ptSpesaEuro() === 1 ? 'punto' : 'punti'} per ogni € speso, arrotondati, massimo ${ptSpesaMax()} per spesa (il rimborso resta al 100%).`,
    '<b>I punti non si riscattano più:</b> non si convertono in crediti e concorrono solo alla classifica (settimanale e generale).',
    `<b>🏆 Premi del podio:</b> ogni settimana (da lunedì a domenica) i primi tre della classifica settimanale vincono un premio in crediti: il Creatore stabilisce il tetto massimo del montepremi settimanale, che si divide tra i primi tre in proporzione 100% · 50% · 25% (circa 57% · 29% · 14%)${premiPodio().some(x => x > 0) ? ': ' + [1, 2, 3].map(i => ['🥇', '🥈', '🥉'][i - 1] + ' ' + eur(premioPos(i))).join(' · ') : ' (per ora nessuno impostato)'}. Dal lunedì alle 00:01 (a settimana scaduta), in Home, chi è sul podio trova il pulsante «Riscatta premio»: i crediti arrivano subito sul saldo. Il premio si riscatta una sola volta, entro la fine della settimana successiva, e servono almeno ${premiMinPt()} ${premiMinPt() === 1 ? 'punto' : 'punti'}. ${premiPerc() > 0 ? `Il montepremi non supera il ${premiPerc()}% degli incassi della settimana (vendite di caffè, snack e caffè pagati subito): nelle settimane di poco incasso i premi scendono da soli.` : ''}`,
    `<b>Ben fatto!</b> è un pulsante in Home: riconosci un collega con una motivazione (max 80 caratteri): ${bfN()} ${bfN() === 1 ? 'gettone' : 'gettoni'} a ${bfPeriodo() === 'mese' ? 'mese' : 'settimana'}, tu non perdi nulla.`])}
  ${sez('🏆 Classifica e statistiche', [
    '<b>Classifica:</b> punti della settimana in corso (da lunedì), della <b>settimana scorsa</b> (🏁 la classifica finale su cui si assegna il podio). In Home vedi i punti della tua settimana e la tua posizione; in alto compaiono i premi in crediti del podio settimanale.',
    '<b>Statistiche:</b> consumi di caffè e snack, della saletta o personali.',
    '<b>Tasso di Onestà:</b> indice globale della saletta (media ponderata tra caffè e prodotti confezionati), un indice per il caffè e uno per snack e bibite. <b>Caffè:</b> il Registro caffè (Inventario → «📒 Registro caffè») è un vero registro cronologico di <b>acquisti</b> (kg aggiunti) e <b>rilevazioni</b> (kg pesati), fino a ' + REG_MAX + ' righe: oltre, le più vecchie vengono assorbite. Il Creatore e i Supervisor con permesso Inventario possono aggiungere, correggere ed eliminare righe: data e ora sono precompilate alle 08:00 di oggi e modificabili, anche con date passate (mai future). La scorta mostra sempre due barre: quella <b>stimata</b> (verde, gialla o rossa; scalata dai caffè pagati) e quella <b>reale</b> (sempre gialla): l\'ultima quantità rilevata con la sua data, scalata dei caffè registrati da allora. Ogni caffè pesa i grammi impostati da chi gestisce (Impostazioni → Regole punti → «A · Consumi e spese»). Il Tasso di Onestà si calcola tra rilevazioni consecutive: kg consumati davvero (rilevazione precedente + acquisti in mezzo − kg pesati, ×' + resaKg() + ' caffè/kg) contro i caffè pagati nello stesso intervallo. Se ci sono acquisti prima della prima rilevazione, l\'app ipotizza una giacenza di 0 kg subito prima del primo acquisto e calcola già il tasso sulla prima pesata; una rilevazione inserita prima degli acquisti diventa invece il punto di partenza. Senza acquisti, la prima rilevazione avvia soltanto il conteggio. Tra una pesata e l\'altra la rimanenza è stimata (barra nel pulsante «Caffè» in Home). In Home il tasso aggregato sta nel badge 🛡️ accanto ai premi del Podio: toccandolo si apre la pagina con i dettagli. Verde da 85%, giallo 70–85%, rosso sotto 70%.',
    `Caffè in grani: caffè registrati ÷ (kg caricati × ${resaKg()}). Snack e bibite: pezzi registrati ÷ pezzi caricati nel lotto, valutato a giacenza 0 o con «Esaurito». Verde da 85%, giallo 70–84%, rosso sotto 70%.`])}
  ${sez('📢 Bacheca, Eventi &amp; Sondaggi', [
    'In Home trovi la <b>Bacheca</b>: avvisi (ℹ️ Info, 📢 Annuncio, 🥐 Novità in sala), sondaggi e gli eventi della saletta (compleanni, nascite, lauree, feste).',
    '<b>Sondaggi:</b> da 2 a 4 risposte; voti e percentuali si aggiornano subito e puoi <b>cambiare il tuo voto</b> finché il sondaggio è aperto. Il voto è legato al tuo profilo: nell\'app vedi solo i conteggi e la tua scelta.',
    bacAperta() ? '✅ <b>Il Creatore ha aperto la bacheca ai colleghi:</b> chiunque può pubblicare avvisi, eventi e sondaggi e modificare o eliminare i propri.'
      : '🔒 <b>Oggi pubblicano solo il Creatore e i Supervisor con «Strumenti di Sistema».</b> I colleghi consultano la bacheca e votano; i <b>compleanni</b> li può inserire chiunque.',
    'Il Creatore (e i Supervisor con «Strumenti di Sistema») possono modificare, fissare in evidenza, chiudere o eliminare qualsiasi voce.'])}
  ${sez('🔑 Ruoli', [
    '<b>Collega:</b> registra consumi, spese, ricariche e regali; consulta classifiche e statistiche nella scheda Classifica; riceve notifiche personali.',
    '<b>Creatore:</b> ha tutti i poteri, non può essere revocato ed è l\'unico che nomina e revoca i Supervisor e ne sceglie i permessi (☰ → Gestione Supervisor). Solo lui può ripristinare un backup.',
    '<b>Supervisor:</b> usa le stesse schermate di tutti; vede solo i comandi dei permessi che il Creatore gli ha concesso: ✅ <i>Approva richieste</i> (Notifiche: spese, ricariche, riscatti, nuovi iscritti) · 💶 <i>Cassa e Storni</i> (entrate, giroconti, correzione saldo cassa, storni) · 📦 <i>Inventario e Scorte</i> (prezzi, articoli, giacenze, scorta caffè, Esaurito) · 👥 <i>Quote e Saldi Soci</i> (quote annuali, saldi e punti — anche impostando direttamente il nuovo saldo —, PIN, archivia / espelli) · 🏆 <i>Punti e Regole</i> (sfide, punteggi e premi) · 🛠️ <i>Strumenti di Sistema</i> (moderazione della Bacheca: avvisi, eventi e sondaggi; backup; chiusura periodo).',
    '<b>Accesso:</b> si entra solo con il codice del gruppo, che solo il Creatore può vedere e mandare come link (☰ → Impostazioni → «Invita i colleghi»); la condivisione dell\'app e il codice non sono visibili a Supervisor e colleghi, a cui basta chiederlo al Creatore. Se esci dal gruppo, il telefono ricorda l\'ultimo gruppo: basta il tuo PIN personale per rientrare. Non è possibile creare nuovi gruppi.',
    'Chi ha un ruolo non può approvare o convalidare le proprie richieste (salvo il Creatore se è l\'unico a poterlo fare per i compiti). Tutte le uscite di denaro dalla cassa passano da «Rimborso spesa».'])}
  ${sez('🔐 Account di accesso', [
    'In <b>Profilo → Account di accesso</b> puoi collegare il tuo profilo a un account <b>Google</b> oppure a <b>email e password</b>. Il collegamento non cambia nulla: saldo, crediti, punti e storico restano i tuoi.',
    'Con l\'account collegato ritrovi il tuo profilo su qualsiasi telefono dalla schermata iniziale («Ho già un account»), senza PIN. Se dimentichi la password puoi reimpostarla con l\'email.',
    'La tua email non compare mai nell\'app agli altri colleghi e non finisce nei dati del gruppo: la vede solo chi gestisce il progetto Firebase.',
    'Il <b>PIN personale</b> resta valido come ripiego, ad esempio se perdi l\'accesso al tuo account.'])}
  ${g.quotaAnnua > 0 ? sez('📅 Quota annuale', [
    `${eur(g.quotaAnnua)} di contributo al fondo, <b>separato dal saldo</b>: non crea debiti né blocca i consumi.`,
    'Fino al pagamento in Home compare un avviso con il pulsante «Paga quota»: scegli contanti o Revolut e invia la richiesta; quando un Supervisor conferma di aver ricevuto i soldi la quota risulta pagata e l\'importo entra in cassa. Il tuo saldo non cambia.', 'Il Creatore o un Supervisor con «Quote e Saldi Soci» può anche registrarla direttamente (☰ → Quote annuali) o annullarla: la quota è sempre solo contributo al fondo (mai crediti: per dare credito a un collega si usa una ricarica) e l\'annullamento non toglie mai crediti a nessuno.']) : ''}
  ${sez('🗂️ Chiusure e backup', [
    'Il Creatore o un Supervisor con «Strumenti di Sistema» chiude i periodi: i dati vanno nell\'Archivio (visibile a chi gestisce) e i saldi ripartono. L\'app mostra chi ha eseguito l\'ultima chiusura e chiede una doppia conferma se è stata fatta meno di 15 giorni fa. In Home, a chi ha «Strumenti di Sistema», compare un promemoria quando conviene chiudere (molti movimenti aperti, più di 30 giorni dall\'ultima chiusura o primi giorni del mese): ti avvisa anche di richieste in attesa e premi delle sfide ancora da assegnare, e puoi nasconderlo per oggi.',
    'Backup (.json e .csv) almeno ogni 7 giorni.'])}`;
}

