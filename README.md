# Armieri 5.0 v1.1.0

PWA (HTML + JavaScript, nessuna build) per gestire caffe, snack, cassa e turni della saletta.
Dati su **Firebase** (Firestore + accesso anonimo), sito pubblicato su **GitHub Pages**.

```
app/                    il sito (cio' che viene pubblicato)
  config.js             <- UNICO file da compilare con la config Firebase
  index.html, sw.js, manifest.webmanifest, icone, vendor/ (SDK Firebase 10.12.2)
firestore.rules         regole di sicurezza del database
firestore.indexes.json  indici del database
firebase.json           configurazione Firebase CLI
.github/workflows/      pubblicazione automatica su GitHub Pages
```

## 1. Crea il progetto Firebase (una volta sola)
1. https://console.firebase.google.com -> **Aggiungi progetto** (Google Analytics non serve).
2. **Build -> Authentication -> Get started -> Anonymous -> Abilita**.
3. **Build -> Firestore Database -> Crea database**: modalita **produzione**, regione europea (es. `eur3` o `europe-west1`).
4. **Impostazioni progetto -> Le tue app -> `</>` Web**: registra l'app (niente Hosting) e copia `firebaseConfig`.
5. I valori del progetto `progettosala-3591b` sono gia inseriti in `app/config.js` (se cambi progetto, sostituiscili).

## 2. Pubblica regole e indici
Con Node.js installato:
```
npm install -g firebase-tools
firebase login
firebase use --add          # scegli il progetto
firebase deploy --only firestore
```
(In alternativa: console -> Firestore -> **Regole**, incolla il contenuto di `firestore.rules` e **Pubblica**; gli indici si creano dalla scheda **Indici** oppure con il comando sopra.)

> Le regole sono state provate solo con un simulatore locale che ne riproduce la logica. Dopo la pubblicazione fai un giro di prova con due telefoni (creazione gruppo, ingresso di un collega, caffe, ricarica, conferma admin) prima di darle a tutti. Se una operazione viene rifiutata con *permission-denied* lo vedi in Console -> Firestore -> Regole -> **Monitor**.

## 3. Sicurezza della chiave API
La `apiKey` Web e pubblica per natura. Riduci l'abuso:
- Google Cloud Console -> **API e servizi -> Credenziali -> Browser key** -> **Restrizioni applicazione: Referrer HTTP** -> aggiungi `https://TUOUTENTE.github.io/*` (e `http://localhost:*` solo se ti serve per test).
- Authentication -> **Impostazioni -> Domini autorizzati**: aggiungi `TUOUTENTE.github.io`.
- Il **codice del gruppo** e il segreto condiviso: comunicalo solo ai colleghi.

## 4. Carica su GitHub e attiva Pages
```
git init -b main
git add .
git commit -m "Armieri 5.0 v1.1.0"
git remote add origin https://github.com/TUOUTENTE/armieri.git
git push -u origin main
```
Poi sul repository: **Settings -> Pages -> Build and deployment -> Source: GitHub Actions**.
Ad ogni push su `main` il workflow pubblica la cartella `app/` su `https://TUOUTENTE.github.io/armieri/`.
Il workflow si ferma con un errore se `config.js` contiene ancora i segnaposto `INCOLLA_QUI`.

## 5. Primo avvio
1. Apri il sito dal telefono -> **Crea un nuovo gruppo**: diventi amministratore.
2. Invia ai colleghi il link/codice del gruppo; approva le richieste di ingresso dalle Notifiche.
3. Aggiungi alla schermata Home (Chrome: menu -> *Installa app*).

## Aggiornamenti futuri
- Modifica i file in `app/`, incrementa `VERSION` in `index.html` e il nome cache in `sw.js` (`armieri-vX.Y.Z`), poi `git push`.
- Se cambi `firestore.rules`/`firestore.indexes.json` rilancia `firebase deploy --only firestore`.
- Esporta periodicamente un backup dalle Impostazioni dell'app.

## Alternativa: Firebase Hosting
`firebase.json` e gia configurato (cartella `app`): `firebase deploy --only hosting` pubblica su `https://PROGETTO.web.app` senza GitHub Pages.
