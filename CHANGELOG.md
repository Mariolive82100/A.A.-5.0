# Changelog

## 1.0.0 - prima release
- Caffe e snack con registro trasparente, saldo contabile/disponibile e Totale Fondo in home.
- Cassa (contanti + Revolut), Fondo Netto, quota annua, inventario (visibile a tutti, modificabile dagli amministratori), buste del caffe con Tasso di Onesta.
- Mercato dei crediti: acquisto dal Fondo o da colleghi, riscatto da colleghi in debito e dal Fondo, conferme dalla pagina Notifiche.
- Account "Amministrazione Fondo" separato dal Profilo Utente.
- Punti Pulizia (1 punto a turno di default, convertibili in crediti), eventi e compleanni, backup/ripristino, PWA installabile.
- Il creatore del gruppo puo eliminarlo (Impostazioni -> Zona pericolosa) e, entrando con il codice da un nuovo telefono, ritrova il proprio profilo inserendo il PIN.
- Firebase: accesso anonimo, gruppo protetto dal codice, regole Firestore in `firestore.rules`.
