# Llicències i avisos de tercers

La distribució de **Revisar membres de Telegram** (el programa combinat) es publica sota **GPL-3.0-or-later**. El codi creat per aquest projecte segueix aquesta llicència; les dependències de tercers **conserven les seves llicències i els seus avisos originals**.

El fitxer `LICENSE` conté el text íntegre de la GPLv3. El fitxer de construcció conserva els avisos que Webpack extreu a `dashboard.js.LICENSE.txt`; no equival a una relació exhaustiva de drets de tercers. Les llicències i els textos originals també es distribueixen amb els paquets npm corresponents.

Per obtenir les fonts de les dependències en les versions fixades:

```powershell
npm ci
```

Cada entrada següent correspon a un paquet utilitzat en temps d’execució segons `package-lock.json` (les dependències de compilació no es distribueixen intencionadament al bundle). Per comprovar exactament quins mòduls s’han inclòs al JavaScript compilat, inspecciona l’informe Webpack (`npm run build` i `webpack --json`).

| Dependència npm | Versió | Llicència declarada |
|---|---|---|
| `@cryptography/aes` | `0.1.1` | `GPL-3.0-or-later` |
| `ansi-regex` | `5.0.1` | `MIT` |
| `ansi-styles` | `4.3.0` | `MIT` |
| `async-mutex` | `0.3.2` | `MIT` |
| `base64-js` | `1.5.1` | `MIT` |
| `big-integer` | `1.6.52` | `Unlicense` |
| `buffer` | `6.0.3` | `MIT` |
| `bufferutil` | `4.1.0` | `MIT` |
| `camelcase` | `5.3.1` | `MIT` |
| `cliui` | `6.0.0` | `ISC` |
| `color-convert` | `2.0.1` | `MIT` |
| `color-name` | `1.1.4` | `MIT` |
| `d` | `1.0.2` | `ISC` |
| `debug` | `2.6.9` | `MIT` |
| `decamelize` | `1.2.0` | `MIT` |
| `dijkstrajs` | `1.0.3` | `MIT` |
| `dom-serializer` | `1.4.1` | `MIT` |
| `domelementtype` | `2.3.0` | `BSD-2-Clause` |
| `domhandler` | `4.3.1` | `BSD-2-Clause` |
| `domutils` | `2.8.0` | `BSD-2-Clause` |
| `emoji-regex` | `8.0.0` | `MIT` |
| `entities` | `2.2.0` | `BSD-2-Clause` |
| `es5-ext` | `0.10.64` | `ISC` |
| `es6-iterator` | `2.0.3` | `MIT` |
| `es6-symbol` | `3.1.4` | `ISC` |
| `esniff` | `2.0.1` | `ISC` |
| `event-emitter` | `0.3.5` | `MIT` |
| `ext` | `1.7.0` | `ISC` |
| `find-up` | `4.1.0` | `MIT` |
| `get-caller-file` | `2.0.5` | `ISC` |
| `graceful-fs` | `4.2.11` | `ISC` |
| `htmlparser2` | `6.1.0` | `MIT` |
| `ieee754` | `1.2.1` | `BSD-3-Clause` |
| `imurmurhash` | `0.1.4` | `MIT` |
| `ip-address` | `10.7.4` | `MIT` |
| `is-fullwidth-code-point` | `3.0.0` | `MIT` |
| `is-typedarray` | `1.0.0` | `MIT` |
| `locate-path` | `5.0.0` | `MIT` |
| `mime` | `3.0.0` | `MIT` |
| `ms` | `2.0.0` | `MIT` |
| `next-tick` | `1.1.0` | `ISC` |
| `node-gyp-build` | `4.8.4` | `MIT` |
| `node-localstorage` | `2.2.1` | `MIT` |
| `p-limit` | `2.3.0` | `MIT` |
| `p-locate` | `4.1.0` | `MIT` |
| `p-try` | `2.2.0` | `MIT` |
| `pako` | `2.2.0` | `(MIT AND Zlib)` |
| `path-browserify` | `1.0.1` | `MIT` |
| `path-exists` | `4.0.0` | `MIT` |
| `pngjs` | `5.0.0` | `MIT` |
| `qrcode` | `1.5.4` | `MIT` |
| `real-cancellable-promise` | `1.2.3` | `MIT` |
| `require-directory` | `2.1.1` | `MIT` |
| `require-main-filename` | `2.0.0` | `ISC` |
| `set-blocking` | `2.0.0` | `ISC` |
| `slide` | `1.1.6` | `ISC` |
| `smart-buffer` | `4.2.0` | `MIT` |
| `socks` | `2.8.10` | `MIT` |
| `store2` | `2.14.4` | `MIT` |
| `string-width` | `4.2.3` | `MIT` |
| `strip-ansi` | `6.0.1` | `MIT` |
| `telegram` | `2.26.22` | `MIT` |
| `ts-custom-error` | `3.3.1` | `MIT` |
| `tslib` | `2.8.1` | `0BSD` |
| `type` | `2.7.3` | `ISC` |
| `typedarray-to-buffer` | `3.1.5` | `MIT` |
| `utf-8-validate` | `5.0.10` | `MIT` |
| `websocket` | `1.0.35` | `Apache-2.0` |
| `which-module` | `2.0.1` | `ISC` |
| `wrap-ansi` | `6.2.0` | `MIT` |
| `write-file-atomic` | `1.3.4` | `ISC` |
| `y18n` | `4.0.3` | `ISC` |
| `yaeti` | `0.0.6` | `MIT` |
| `yargs` | `15.4.1` | `MIT` |
| `yargs-parser` | `18.1.3` | `ISC` |

**Especialment rellevant:** `@cryptography/aes@0.1.1` declara `GPL-3.0-or-later` i és una dependència de GramJS (`telegram@2.26.22`). La GPLv3 del programa combinat és coherent amb aquesta obligació, però també cal facilitar el *Corresponding Source* i respectar els drets de les altres biblioteques. La taula i el `package-lock.json`, per si sols, no substitueixen les obligacions de subministrament del codi font.

Els drets d’autor i les declaracions originals de cada dependència prevalen sobre qualsevol resum d’aquesta pàgina.
