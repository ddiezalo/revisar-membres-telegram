# Historial de canvis

## 0.3.5 — Comparacions temporals i desbloqueig per sessió

- Elimina l’historial de consultes. Els resultats només viuen en memòria mentre la finestra és oberta.
- Manté un botó d’exportació CSV opcional a la finestra del comparador.
- Afegeix les columnes **@usuari** i **rol**; els membres normals es deixen en blanc, i els rols detectables inclouen Admin, Bot i Admin · Bot.
- Conserva xifrades només les credencials MTProto.
- Guarda temporalment la clau de desbloqueig a `chrome.storage.session`, sense demanar el PIN per cada nova finestra durant la mateixa sessió de Chrome.
- Migració de v0.3.3: requereix el PIN vigent, conserva les credencials i elimina l’historial en tornar a xifrar. **Eliminació irreversible de l’historial antic.**
- Actualitza la política de privacitat i la interfície de configuració del PIN.

## 0.3.3

- Publicació del codi GPL-3.0-or-later, avisos de tercers i automatització de proves.
