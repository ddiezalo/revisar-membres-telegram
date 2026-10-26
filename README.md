# Revisar membres de Telegram — v0.3.4

Extensió **Chrome / Edge (Manifest V3)**, amb interfície en català, que compara dos grups de Telegram mitjançant GramJS / MTProto. Mostra els membres del grup 1 que no consten al grup 2 i diferencia entre absència confirmada, absència segons la llista i casos no verificables.

## Funcionalitats

- Compara grups i supergrups als quals pot accedir la sessió MTProto.
- Per a cada membre no trobat mostra **nom, @usuari (si en té), ID de Telegram, rol i estat de verificació**. El rol només s'omple si l'API identifica un **Admin**, un **Bot**, o ambdós. Els creadors es mostren com a Admin. No es fan consultes individuals addicionals per obtenir els rols: si Telegram no dona informació de rol, la cel·la queda buida.
- **No desa les comparacions ni identificadors de membres**: les dades romanen en memòria durant la finestra del comparador i es descarten quan es tanca.
- Exportació opcional de la comparació actual a un CSV **sense xifrar**. El fitxer descarregat queda fora del control de l'extensió.
- Una autorització inicial amb QR i un **PIN de quatre dígits per sessió de navegador**. El desbloqueig es comparteix entre les finestres de confiança de l'extensió mitjançant `chrome.storage.session`; desapareix si es reinicia Chrome o es recarrega, actualitza o desactiva l'extensió.
- Les credencials d'aplicació i la `StringSession` necessàries per reconnectar es desen xifrades amb AES-256-GCM en `chrome.storage.local`. La clau es deriva del PIN amb PBKDF2-SHA-256 (600.000 iteracions); el PIN no es desa. **Un PIN de quatre dígits ofereix protecció limitada davant un atac fora de línia.**
- Compatibilitat amb la v0.3.3: al primer desbloqueig correcte, el registre anterior (que contenia sessió i historial) es transforma en un registre que **només conté les credencials**. L'historial antic es descarta irreversiblement. Si no coneixes el PIN, no es pot migrar la sessió.

## Requisits

- Chrome / Edge actualitzat i Telegram Web A (`https://web.telegram.org/a/`).
- Node.js LTS i npm per compilar.
- Un compte de Telegram amb accés als grups, i `api_id` + `api_hash` obtinguts a [my.telegram.org/apps](https://my.telegram.org/apps).

## Compilació (PowerShell)

```powershell
npm ci
npm test
npm run build
```

El resultat és la carpeta `dist/` amb `manifest.json` a l'arrel. A `chrome://extensions` activa el mode de desenvolupador i **carrega `dist/` com a extensió desempaquetada**. No carreguis `extension/` directament.

**Actualitzar una instal·lació existent:** mantén la mateixa instal·lació i l'identificador de l'extensió; substitueix els fitxers de l'antiga carpeta font, torna a compilar `dist/` i prem *Recarrega*. No desinstal·lis l'extensió si vols recuperar-ne la sessió MTProto xifrada: desinstal·lar-la elimina les dades locals. Si instal·les una còpia separada amb un ID d'extensió diferent, no compartirà el seu emmagatzematge.

## Ús

1. Obre el comparador des de la icona de l'extensió o des del botó **Revisar membres** dins de Telegram Web A.
2. Si encara no l'has configurat, crea el PIN de quatre dígits. Introdueix l'API ID i l'API hash i autoritza la sessió escanejant el QR des de Telegram al mòbil (**Configuració → Dispositius → Vincula un dispositiu**).
3. Selecciona el grup d'origen i el grup destinatari, i prem **Compara membres**.
4. Consulta els resultats, inclosos `@usuari` i rol quan estiguin disponibles. Si vols conservar-los, prem **Exporta CSV** abans de tancar la finestra.
5. En obrir una nova finestra durant la mateixa sessió de Chrome **no cal tornar a introduir el PIN**. Després de reiniciar el navegador, el PIN es torna a demanar, però no és necessari repetir l'autorització QR mentre la sessió MTProto continuï vigent.
6. Per canviar el PIN, obre **Configuració del PIN** a la finestra o al menú de l'extensió.

## Restriccions de l'API i privacitat

Telegram pot limitar l'enumeració dels grups i impedir algunes comprovacions per manca de permisos d'administrador. Les absències sense confirmació individual s'identifiquen adequadament; **«No verificable» no equival a absent**. Els rols depenen del `participant` retornat per GramJS: una cel·la buida no prova que el membre sigui ordinari si l'API no ha revelat aquesta informació.

Els noms i identificadors només es processen per produir la comparació. No es guarden al registre local ni a `chrome.storage.session`. No s'envien al desenvolupador ni a serveis d'anàlisi; les consultes MTProto van als servidors de Telegram. El fitxer CSV exportat queda en disc sense xifrat. Consulteu [PRIVACY_POLICY.md](PRIVACY_POLICY.md).

## Distribució i llicències

El projecte es publica sota **GPL-3.0-or-later**, segons [LICENSE](LICENSE), i conserva els avisos dels components de tercers a [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Per a una distribució compilada cal facilitar també el codi font corresponent de les biblioteques incorporades. Consulteu [GITHUB_PUBLISHING.md](GITHUB_PUBLISHING.md) i [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md).
