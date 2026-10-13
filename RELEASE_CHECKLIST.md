# Revisió de publicació (v0.3.3)

- [x] Escollida `GPL-3.0-or-later` per al projecte propi / distribució combinada i afegit text GPLv3 íntegre.
- [x] Conservades versions de `telegram@2.26.22`, `qrcode@1.5.4` i dependències existents; sense migració funcional.
- [x] Actualitzats `package.json`, `package-lock.json` i `manifest.json` a la versió 0.3.3.
- [x] Afegits `.gitignore`, avisos de dependències i instruccions de publicació.
- [x] PIN i vault AES-GCM conservats de la v0.3.2, que l'usuari ha provat en Chrome.
- [ ] Executar `npm ci`, `npm test`, `npm run build` al teu ordinador i provar la versió empaquetada 0.3.3.
- [ ] Comprovar la disponibilitat real del codi corresponent de les dependències incloses al bundle i les llicències completes.
- [ ] Publicar el repositori font i crear tag/release `v0.3.3`.
- [ ] Afegir a la distribució/fitxa un enllaç concret i persistent al codi font de `v0.3.3`.
- [ ] Completar responsable i contacte a `PRIVACY_POLICY.md`, publicar-ne la URL i revisar els camps «Privacy practices».
- [ ] Revisar justificacions de `storage` i permisos `*.telegram.org`.
- [ ] Captures de pantalla sense dades reals; prova QR/PIN, supergrups i historial.
- [ ] Empaquetar exclusivament **el contingut** de `dist/`, amb `manifest.json` a l'arrel del ZIP.
- [ ] Validar si el PIN de quatre dígits és suficient per al nivell de risc acceptat i per a les polítiques aplicables.
