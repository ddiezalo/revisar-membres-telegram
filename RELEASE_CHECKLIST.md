# Revisió de publicació (v0.3.5)

- [x] Llicència GPL-3.0-or-later i avisos de dependències mantinguts.
- [x] Comparacions exclusivament en memòria: no hi ha historial ni resultats a `chrome.storage`.
- [x] Credencials persistents xifrades i desbloqueig temporal a `chrome.storage.session`.
- [x] Migració de vault v1: conserva la `StringSession` i elimina l'historial després de PIN correcte.
- [x] Columna @usuari, rol Admin/Bot segons dades de participació de l'API i exportació CSV temporal.
- [ ] Executar `npm ci`, `npm test`, `npm run build` i provar la v0.3.5 en Chrome.
- [ ] Provar la migració real de la v0.3.3 sobre la **mateixa instal·lació**, sense desinstal·lar-la.
- [ ] Comprovar que la segona finestra no demana PIN mentre Chrome és obert i que després de reiniciar-lo sí.
- [ ] Comprovar rol i @usuari en grups i supergrups amb membres coneguts.
- [ ] Actualitzar a GitHub README, política de privacitat i paquet/release `v0.3.5`.
- [ ] En el Chrome Web Store Developer Dashboard, penjar un ZIP nou v0.3.5 o actualitzar la versió en esborrany. No fer servir alhora descripcions incompatibles entre v0.3.3 i v0.3.5.
- [ ] Revisar l'auditoria del codi font corresponent de les dependències GPL i els avisos originals de tercers.
- [ ] Revisar `Privacy practices`, especialment la menció de l'historial (eliminat), dades transitòries i credencials persistents.
- [ ] Captures de pantalla amb identificadors i noms ficticis/ocultats.
- [ ] Verificar `manifest.json`, LICENSE i avisos a l'arrel del ZIP final.
- [ ] Confirmar que el PIN de 4 dígits s'ajusta al risc acceptat i a les polítiques aplicables.
