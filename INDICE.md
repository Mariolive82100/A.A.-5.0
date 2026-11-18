# Indice del codice — Armieri 5.0

Guida per lavorare su una sola sezione senza rileggere tutta l'app. Leggere questo file, poi **solo** il file JS interessato (e `css/stile.css` per gli stili).

## Regole di struttura

- `app/index.html`: scheletro (header, dock, icone SVG), costante `VERSION` e `BETA`, elenco dei `<script src>`.
- I file `app/js/NN-*.js` sono script classici (non moduli): condividono lo stesso ambito globale e **si caricano nell'ordine dei numeri**. Nuove funzioni vanno nel file della propria sezione.
- A ogni modifica funzionale: incrementare `VERSION` in `index.html` e la versione di `CACHE` in `sw.js` (stesso numero). Nuovi file JS/CSS vanno aggiunti anche all'elenco `FILES` di `sw.js`.
- `BETA` è vero quando l'app gira sotto `/beta/`: mostra il badge arancione e il suffisso `-beta` nella versione; la cache del service worker usa il prefisso `armieri-beta-v`.
- Aggiornare `pRegolamento` (`js/43-regolamento.js`) se cambiano regole, ruoli, permessi o funzioni visibili agli utenti.

## File e contenuto

### `js/00-base.js` — costanti, utilità, PIN (hash), stato `st`
`hashPin`, `parseEuro`, `dataOra`, `quando`, `clean`, `add`, `newCode`, `normCode`, `errMsg`

### `js/10-firebase.js` — inizializzazione Firebase, accesso, listener, dati riservati
`initFirebase`, `onErr`, `setSync`, `disconnect`, `connect`, `stopData`, `syncMode`, `subMovimenti`

### `js/20-dati.js` — dati derivati: saldi, punti, scale, regole punti, scambi
`tuttiMov`, `emptyState`, `emptyStats`, `applyMov`, `applyStat`, `derived`, `debitoLibero`, `riscala`, `riepScala`, `giorniLavorativi`, `scambiRicevuti`, `scambiInviati`, `creditoLibero`

### `js/30-ui-base.js` — scritture, toast, sheet, render/scroll, condivisione, ricerca rapida, installazione PWA
`addMov`, `guard`, `toast`, `openSheet`, `closeSheet`, `segOpts`, `assicuraQuote`, `render`, `doRender`, `cardShareMark`, `cardTesto`, `renderDrawer`, `qsRisultati`, `qsFiltra`

### `js/40-ingresso.js` — schermate di ingresso (crea/unisciti/recupera)
`renderEntry`, `entryInstall`, `entryWelcome`, `entryJoin`, `entryCreatore`, `entryRichiesta`, `entryRecupero`, `entryPinGate`

### `js/41-bar-crediti.js` — pagina Bar, consiglio chiusura, richieste, notifiche, crediti
`bannerChiusura`, `pBar`, `richiesteUtente`, `richiesteFondo`, `contatori`, `pNotifiche`, `inboxAdmin`, `pCrediti`

### `js/42-registro-feed.js` — tesoreria, registro movimenti, giacenze, scorta caffè, descrizione movimenti, feed
`tesoro`, `saldoDisp`, `pRegistro`, `storicoRichieste`, `notifiche`, `sincronizzaEstratti`, `sincronizzaGiacenze`, `busteCaricate`, `regCaffe`, `contaCaffe`, `statoCaffe`, `calcolaCaffe`, `statoProd`, `descMov`, `puoStornare`, `righeMov`, `feedLista`, `cassaRange`, `periodoChips`, `pFeed`

### `js/43-regolamento.js` — `pRegolamento` (testo del regolamento interno)
`pRegolamento`

### `js/44-sfide.js` — Sfide (fisse, classifiche, premi)
`cpRiga`, `vittoriaCheck`, `sfPeriodo`, `sfRimanente`, `sfCd`, `sfBuckets`, `sfRiepTrim`, `sfInit`, `sfMerge`, `sfClassifica`, `sfPrec`, `sfDaAssegnare`, `sfPtRiga`, `sfPremi`, `sfBoxE`, `sfBox`, `sfCard`, `sfCardConc`, `sfDettaglio`, `pSfide`

### `js/45-eventi-statistiche.js` — eventi, statistiche saletta, classifiche punti, Tasso di Onestà, statistiche per periodo
`prossimaData`, `giorniA`, `pSaletta`, `rangeSal`, `caricaArcMov`, `serieGen`, `graficoBarre`, `nuovoAgg`, `aggMov`, `aggrega`, `aggRange`, `aggPeriodo`, `clPerKey`, `clRange`, `riepDaChiusura`, `serieSett`, `aggConChiusi`, `noteChiusi`, `serieCont`, `rankList`, `posMese`, `aggiornaPillola`, `clRighe`, `clConteggi`, `clTitoli`, `clHero`, `onestaIndici`, `pCaffeReg`, `pOnesta`, `cardOnesta`, `clSala`, `viewMiei`, `clIo`, `clClassifica`, `pClassifiche`, `scRange`, `pStatConsumi`, `pClassificaPunti`

### `js/46-spesa-cassa-quote.js` — lista spesa, gioco, cassa, inventario, quote, statistiche, colleghi, gestione PIN
`pSpesa`, `aggiornaArticoli`, `giocoSt`, `pGioco`, `pCassa`, `scortaRighe`, `realeDisp`, `caffeLivello`, `cardCaffeScorta`, `pInventario`, `quoteMigra`, `pQuote`, `consumiRange`, `disegnaConsumi`, `labelChiusura`, `pMembri`, `pPin`

### `js/47-admin-impostazioni.js` — strumenti amministratore, chiusure ravvicinate, impostazioni
`pRegole`, `pBackup`, `infoChiusura`, `pChiusura`, `pImpostazioni`

### `js/50-azioni-base.js` — azioni: condivisione, Bar, Paga, ricarica e riscatto, ruoli
`joinVerifica`, `giocoAvvia`, `giocoChiediRuota`, `annullaConsumo`, `rbAggiorna`, `sonoCreatore`, `permDi`, `can`, `ruolo`, `cpConvCard`, `sincronizzaSolo`, `pSupervisor`, `svSheet`

### `js/51-azioni-gestione.js` — azioni: sfide, regalo crediti, storni, cassa, inventario, registro caffè, quote, admin
`sfDatiImg`, `disegnaSfida`, `rgAggiorna`, `acAggiorna`, `podioDaAssegnare`, `compactMov`, `corrAggiorna`, `caricaBusteCaffe`, `caricaProdotto`, `sheetReg`, `salvaRegCaffe`, `quotaAggiorna`, `scollega`, `selMembro`, `bfInizioPeriodo`, `bfRinnovo`, `bfCountdown`, `bfUsati`, `bfAggiorna`

### `js/52-azioni-pin-backup.js` — azioni: Punti Collega, Ben fatto, PIN, backup/ripristino, archivio
`scaricaBlob`, `condividiBlob`, `costruisciBackup`, `leggiBackup`, `datiRendiconto`, `opzRd`, `disegnaRendiconto`, `testoRendiconto`, `datiArchivio`, `pArchivio`, `testoArchivio`, `disegnaArchivio`, `aggiornaAnteprimaRd`

### `js/60-eventi-dom.js` — eventi DOM (click, input), riepilogo per periodo, icone (i), cerca collega
`rpRange`, `riepRange`, `cercaApplica`

### `js/61-bacheca-ruota.js` — avvisi, bacheca in Home, Ruota del Barista, Perle
`avvisiAuto`, `avvisiHome`, `nBacNuovi`, `bacVoti`, `bacheca`, `bacPulisciVecchi`, `rndInt`, `ruotaSt`, `ruotaReset`, `ruotaSvg`, `pRuota`, `ruotaParti`, `perleSegnaVista`, `perleCheck`, `perleSync`, `pPerle`

### `js/62-navigazione.js` — tasto Indietro (History API)
`backRiarma`, `backArma`, `indietro`, `chiudiOverlay`, `cardImmagine`

### `js/99-avvio.js` — avvio (`boot`)
_(nessuna funzione di primo livello)_

### `css/`
- `stile.css`: stili generali e mobile, badge beta. `desktop.css`: layout desktop/tablet (media query).
