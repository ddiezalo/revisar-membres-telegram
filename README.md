# Revisar membres de Telegram — versió 0.3.3 (MTProto / GramJS + PIN)

Extensió **Chrome / Edge (Manifest V3)** per comparar els membres del **grup 1** que no consten entre els membres del **grup 2**. Tota la interfície és en català.

La versió 0.2 substitueix el desplaçament i l'extracció de membres pel DOM de Telegram Web per consultes **MTProto** mitjançant **GramJS**. El DOM només s'utilitza per inserir el botó **Revisar membres** a Telegram Web A i identificar el grup que tens obert.

**Codi font per a GitHub.** Aquest repositori conté el codi de l'extensió. No inclou `node_modules/` ni `dist/`; per compilar, executa `npm ci`, `npm test` i `npm run build`. Instal·la **`dist/`** al navegador, mai `extension/` directament. La funcionalitat del PIN i la comparació s'han provat en una instal·lació real de la v0.3.2; els canvis de la v0.3.3 són només de distribució i documentació.

## 1. Requisits previs

- Chrome o Edge actualitzat i Telegram Web A (`https://web.telegram.org/a/`).
- **Node.js** (recomanem la versió LTS, 22 o superior) i `npm`, només per compilar l'extensió. No cal tenir Node en execució quan utilitzis l'extensió.
- Un compte de Telegram amb accés als dos grups.
- `api_id` i `api_hash` de [my.telegram.org/apps](https://my.telegram.org/apps). S'obtenen a la secció **API development tools**. Són credencials del teu compte d'aplicació: mantén-les privades.
- Telegram al mòbil per autoritzar la nova sessió mitjançant un codi QR; si tens verificació en dos passos, també la contrasenya corresponent.

## 2. Compilar i instal·lar (Windows / PowerShell)

1. Descomprimeix aquest ZIP en una carpeta permanent, per exemple `C:\Users\TU\Documents\telegram-revisar-membres-mtproto`.
2. Obre PowerShell a la carpeta que conté `package.json`.
3. Executa:

   ```powershell
   npm ci
   npm test
   npm run build
   ```

4. Hauria d'aparèixer una carpeta nova anomenada **`dist`** que contingui `manifest.json`, `dashboard.html`, `dashboard.js`, etc.
5. Obre `chrome://extensions` o `edge://extensions`, activa **Mode de desenvolupador**, prem **Carrega una extensió desempaquetada** i selecciona **`dist`**, no `extension` ni la carpeta arrel.
6. Actualitza Telegram Web A perquè s'hi insereixi el botó.

> L'ordre `npm install` necessita accés a Internet per descarregar GramJS, QRCode i Webpack. Tot el codi executable queda integrat localment al resultat de `npm run build`; l'extensió no carrega codi JavaScript des de CDN.

## 3. Primera autorització

1. Quan obris per primera vegada `https://web.telegram.org/a/` després d’instal·lar l’extensió, apareixerà una finestra breu de configuració **si encara no hi ha cap sessió MTProto autoritzada**.
2. Prem **Obtén les credencials de l’API** per obrir [my.telegram.org/apps](https://my.telegram.org/apps), iniciar sessió i crear una aplicació mitjançant **API development tools**. Telegram et proporcionarà un `API ID` i un `API hash`. L’extensió no pot generar-los en nom teu.
3. Torna a Telegram Web i prem **Continua amb l’autorització**. El comparador et demanarà crear i confirmar un **PIN de quatre dígits** abans de continuar; aquest PIN xifra les dades locals. Després, introdueix l’`API ID` i l’`API hash` i prem **Autoritza amb codi QR**.
4. Al mòbil, obre Telegram → **Configuració → Dispositius → Vincula un dispositiu**. Escaneja el QR i confirma l’accés. Si se’t demana, introdueix la contrasenya de verificació en dos passos.
5. En completar-se l’autorització, la finestra mostrarà el compte connectat i recuperarà els grups des de l’API. **Comprova que és el mateix compte** que utilitzes a Telegram Web. La sessió es reutilitzarà en les properes consultes.

Pots prémer **Més tard** per tancar l’avís definitivament en aquest perfil de navegador; en qualsevol moment, pots obrir el comparador des de la icona de l’extensió i autoritzar el compte. Si instal·les l’extensió amb Telegram Web ja obert, actualitza la pestanya perquè s’hi carregui l’avís. L’avís només apareix a **Telegram Web A** (`/a/`), no a Web K (`/k/`).

**La sessió MTProto és independent de la sessió web**. No copiem ni llegim cookies de Telegram Web. A partir de la v0.3.2, l'`api_hash`, la `StringSession` i l'historial es desen en un únic registre xifrat (`secureVault`) a `chrome.storage.local`, amb AES-256-GCM i una clau derivada del PIN mitjançant PBKDF2-SHA-256 (600.000 iteracions, sal aleatòria). El PIN i la clau no es persisteixen. **Un PIN de quatre dígits és vulnerable a un atac de força bruta fora de línia**: això protegeix contra inspeccions casuals, però no contra un atacant amb una còpia de l'emmagatzematge. Continua sent important protegir el perfil de navegador.

## 4. Compartir l’extensió compilada

Pots copiar **tota la carpeta `dist`**, incloent-hi `manifest.json`, `dashboard.js` i els altres fitxers, a un altre ordinador. No cal instal·lar Node.js, npm ni GramJS a l’altre ordinador: el JavaScript necessari ja s’ha integrat al build. Allà, obre `chrome://extensions` o `edge://extensions`, activa el mode de desenvolupador i fes **Carrega una extensió desempaquetada** sobre la còpia de `dist`.

**No** cal compartir `node_modules`, `src`, `extension` ni les credencials. Les credencials MTProto, la sessió autoritzada i l’historial es guarden **xifrats i per separat a cada perfil de navegador** amb `chrome.storage.local`. Un altre ordinador haurà d’autoritzar la seva pròpia sessió; podrà reutilitzar les credencials API del mateix compte d’aplicació, si és apropiat i es mantenen privades. No comparteixis còpies de l’emmagatzematge de sessió. Les instal·lacions desempaquetades s’actualitzen manualment.

## 5. Comparar membres

1. Selecciona el **grup d'origen (grup 1)** i el **grup de comparació (grup 2)**. Si has obert la finestra des d'un grup de Telegram Web, el grup 1 es preseleccionarà quan el mateix compte el tingui accessible a l'API.
2. Prem **Compara membres**. La finestra consulta els membres amb `client.getParticipants()` (paginació integrada; `messages.getFullChat` per a grups bàsics i `channels.getParticipants` per a supergrups).
3. Consulta els membres no trobats al grup 2 i els recomptes. El resultat es desa automàticament a l'**Historial**.
4. A l'Historial pots seleccionar una comprovació anterior, exportar un CSV, esborrar una comprovació o esborrar-les totes. Els registres de la versió anterior són compatibles.

Les llistes de temes dels supergrups no interfereixen: l'API consulta el grup principal, no els temes.

## 6. Garanties i limitacions

- **Sense bots de Telegram:** es fa servir una sessió d'usuari. Els usuaris que siguin bots s'inclouen a la comparació si Telegram els retorna.
- **Permisos/visibilitat:** ser membre de tots dos grups no garanteix que Telegram retorni la llista sencera. Poden existir restriccions administratives, de privadesa, de nombre de participants o d'API (especialment per a grups grans). L'extensió no n'intenta eludir cap.
- **Completitud:** només marca una comparació com a completa si l'API ha acabat la consulta, no s'ha assolit el límit de 10.000 usuaris i els recomptes obtinguts coincideixen amb el total declarat quan aquest és conegut. Això **no** garanteix que Telegram hagi exposat tots els membres possibles.
- **Comparació seqüencial:** si un membre entra o surt durant la consulta, poden produir-se diferències amb el total del servidor. No és una fotografia atòmica.
- **Límit inicial:** el selector recupera fins a 1.500 converses des de l'API; el processador consulta fins a 10.000 participants per grup. Per a grups més grans caldrà replantejar la cobertura, no inferir absències.
- **Control d'errors:** en cas de `FLOOD_WAIT`, autorització caducada o consulta denegada, l'extensió mostra l'error i no desa resultats parcials.
- **Una sola sessió:** evita obrir diverses finestres de comparació simultàniament, perquè poden generar consultes concurrents al mateix compte.
- **Revocació:** **Tanca la sessió** intenta revocar la sessió de l'extensió i n'esborra la còpia local. Si no pot confirmar la revocació, comprova manualment **Configuració → Dispositius** a Telegram.
- **Manteniment:** GramJS és una biblioteca de tercers; aquest prototip utilitza `telegram@2.26.22`. Comprova periòdicament les actualitzacions i avisos de seguretat. El repositori principal es va arxivar el juliol de 2026.

## 7. Estructura del projecte

| Fitxer/carpeta | Finalitat |
| --- | --- |
| `src/dashboard.js` | Autenticació QR i comparació API; Webpack genera `dist/dashboard.js` |
| `src/membership.cjs` | Funcions pures per normalitzar, deduplicar i comparar |
| `extension/dashboard.html`, `.css` | Interfície en català |
| `extension/content.js`, `.css` | Botó a Telegram Web A i ID del grup inicial |
| `extension/background.js` | Obre la finestra i limita l'accés a l'emmagatzematge |
| `extension/options.*` | Historial, CSV, canvi de PIN i esborrat |
| `extension/vault.js` | Xifrat AES-GCM, desbloqueig, migració i restabliment de dades |
| `extension/popup.*` | Menú de l'extensió |
| `webpack.config.cjs`, `build.mjs` | Generació del paquet local per Chrome/Edge |
| `tests/membership.test.js`, `tests/vault.test.js` | Tests deterministes: `npm test` |

## 8. Diagnosi

- **No surt el botó:** recarrega Telegram Web A i obre el panell de grup; també pots fer servir la icona de l'extensió.
- **La carpeta `dist` no existeix:** executa `npm install` i `npm run build`; revisa els errors de PowerShell.
- **La connexió MTProto falla:** comprova que `api_id` i `api_hash` són correctes, que Telegram no està bloquejat per la xarxa i que has autoritzat el QR; copia el missatge d'error sense incloure credencials ni claus de sessió.
- **No apareix el grup:** comprova el compte connectat. El selector inicial només explora 1.500 converses i Telegram pot restringir-hi l'accés.
- **El recompte no coincideix:** conserva l'avís d'incompletitud i no interpretis els membres no trobats com absències confirmades.


## 9. Canvis de la versió 0.3.1

- Els membres de supergrups amb estat `ChannelParticipantBanned` i `left=false` **es consideren membres actuals**. Es prova un filtre addicional de persones restringides quan Telegram hi dona accés; els usuaris expulsats (`left=true`) no s'incorporen.
- Es verifica explícitament el compte propi quan l'API no el retorna a l'enumeració.
- Els candidats no trobats al grup 2 es verifiquen individualment amb `channels.getParticipant` quan el grup 2 és un supergrup. S'estableix un límit prudent de **40 consultes**, seqüencials i separades 250 ms, per evitar consultes excessives. Els errors no equivalen a una absència. Un `FLOOD_WAIT` interromp la comparació i no desa cap resultat parcial.
- Als grups bàsics, si s'ha rebut la llista completa i el recompte concorda, s'utilitza aquesta llista com a referència; `channels.getParticipant` no s'hi pot aplicar.
- El resultat separa **absència confirmada**, **coincidència** i **no verificable**. El caràcter definitiu exigeix una llista d'origen completa i cap candidat sense resoldre. Els registres antics continuen sent llegibles a l'historial.
- El CSV protegeix contra la interpretació de noms com a fórmules de full de càlcul.
- S'ha eliminat la funció de diagnòstic temporal del paquet de producció.

## 10. Llicència GPLv3 i distribució pública

- **Llicència del projecte propi i de la distribució combinada:** `GPL-3.0-or-later`. Consulta el text íntegre a [`LICENSE`](LICENSE). Les biblioteques de tercers conserven les seves llicències originals; consulta [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
- **Fonts corresponents:** la distribució del ZIP compilat requereix oferir accés gratuït i equivalent al codi font corresponent, incloent-hi scripts de compilació i codi de les dependències incloses. Aquesta publicació font inclou `src/`, `extension/`, `package-lock.json`, `webpack.config.cjs` i `build.mjs`; les versions de les dependències es poden obtenir amb `npm ci`. Verifica l'accessibilitat del codi de les dependències i proporciona una còpia corresponent adequada si cal.
- **GitHub i Web Store:** publica primer aquest repositori, crea la etiqueta `v0.3.3` i enllaça aquesta versió des de la fitxa de Chrome Web Store. Fes que el ZIP binari i el codi font corresponguin a la mateixa etiqueta. Trobaràs una guia concreta a [`GITHUB_PUBLISHING.md`](GITHUB_PUBLISHING.md).
- **Privacitat:** [`PRIVACY_POLICY.md`](PRIVACY_POLICY.md) continua sent un esborrany: abans de publicar cal incorporar el responsable i un contacte real, i allotjar la política en una URL pública. Cap fitxer de sessió personal o CSV amb dades dels membres no ha de pujar-se a GitHub.
- **Seguretat:** AES-GCM xifra les dades locals, però un PIN de quatre dígits pot ser atacat fora de línia. No descriguis l'extensió com immune a l'extracció de credencials.
- **Proves:** `npm test` i `npm run build`, més una prova funcional a Chrome amb PIN, QR i comparacions, abans de presentar la versió.

## Interpretació de resultats a partir de la v0.3.1

- **Absència confirmada**: Telegram ha respost a una comprovació individual amb un estat explícit de no pertinença.
- **No trobat segons la llista**: Telegram ha retornat un nombre d'usuaris que coincideix amb el recompte del grup, però la comprovació individual no ha confirmat l'absència. És una inferència a partir de l'enumeració, no una confirmació individual.
- **No verificable**: Telegram ha retornat una llista parcial i tampoc no ha estat possible resoldre aquest usuari individualment.
- **Permisos d'administrador**: consultar participants restringits i verificar persones concretes pot requerir ser administrador. Una denegació d'accés no prova ni presència ni absència; no es repeteixen indefinidament consultes denegades.

La consulta dels membres restringits només s'efectua quan els recomptes encara no coincideixen després de verificar el compte propi. Això evita avisos de permisos innecessaris. Els detalls agregats de fallades de verificació, sense identificadors, es guarden amb cada comprovació.


## 11. PIN i migració (des de la versió 0.3.2)

1. **Actualització sense pèrdua:** conserva el mateix directori `dist` i la mateixa instal·lació de l'extensió. Actualitza el projecte font, executa `npm test` i `npm run build`, i prem **Recarrega** a `chrome://extensions`. **No desinstal·lis l'extensió** abans de migrar: es poden esborrar les dades locals.
2. **Primera obertura:** el comparador demana crear i repetir un PIN de **quatre dígits**. Si hi havia `mtprotoAuth` i `history` de la v0.3.1, els copia al vault xifrat i, només quan s'ha desat correctament, elimina les claus antigues. No cal reescanejar el QR si la sessió existent continua autoritzada.
3. **Obertures posteriors:** cada finestra nova del comparador sol·licita el PIN. L'historial també demana el PIN en obrir la pàgina d'Opcions; no es desa cap PIN ni clau temporal entre finestres.
4. **Canviar el PIN:** a **Historial**, desbloqueja'l i introdueix PIN actual, PIN nou i confirmació. La clau i la sal es renoven; tanca altres finestres del comparador obertes perquè utilitzaran claus ja invàlides.
5. **Oblit del PIN:** a la pantalla de desbloqueig pots **restablir** després de dues confirmacions. Això **esborra la sessió i TOT l'historial xifrat, irreversiblement**. Després cal crear un PIN nou i tornar a autoritzar Telegram. El restabliment local **no revoca** la sessió anterior als servidors de Telegram: revisa **Configuració → Dispositius** i revoca-la manualment.
6. **Confidencialitat:** AES-GCM xifra dades locals en repòs, però 4 dígits no són una protecció suficient contra un adversari decidit. El CSV exportat és un fitxer extern sense xifrar: tracta'l com a dada personal. No comparteixis `chrome.storage.local`, el PIN ni el CSV.

**Proves recomanades:** confirmar la migració i l'historial antic; PIN incorrecte; un `0007` vàlid; reobertura i desbloqueig sense QR; crear comparació i consultar-la a Historial; canvi de PIN; sessió caducada i tancament de sessió. Prova el restabliment **només en un perfil de proves** perquè destrueix les dades.

## 12. Versió 0.3.3: preparació del repositori GPLv3

Aquesta versió no modifica la lògica del comparador. Actualitza el manifest i les metadades a `0.3.3`, adopta la GPLv3 per al codi propi i la distribució combinada, incorpora les notificacions de llicències i afegeix un flux de publicació de fonts a GitHub.
