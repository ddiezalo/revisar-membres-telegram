# Guia de publicació a GitHub i Chrome Web Store

## 1. Preparar el repositori públic (sense dades personals)

1. Crea a GitHub un repositori **públic**, per exemple `revisar-membres-telegram`, sense inicialitzar-lo amb un README o una llicència nous (ja existeixen aquí).
2. Descomprimeix el ZIP de codi font v0.3.4 en una carpeta normal del teu ordinador. Obre PowerShell en aquesta carpeta.
3. Verifica `git status` abans del primer commit. No hi han d'aparèixer ni dades personals ni cap `.env`, fitxer de sessió, base de dades de Chrome o CSV.
4. Executa les ordres següents, substituint `USUARI` i `REPO` pels teus valors:

```powershell
git init
git branch -M main
git add .
git status
git commit -m "Publica el codi font v0.3.4 sota GPLv3"
git remote add origin https://github.com/USUARI/REPO.git
git push -u origin main
```

Si GitHub demana autenticació, fes-la mitjançant el gestor de credencials o l'autenticació compatible del teu client Git. **No introdueixis tokens al codi ni als fitxers del repositori.**

## 2. Compilar i validar

```powershell
npm ci
npm test
npm run build
```

Prova `dist/` com a extensió desempaquetada en un perfil de Chrome, conservant la instal·lació anterior si necessites migrar la sessió xifrada. **No desinstal·lis la versió existent abans de migrar la sessió xifrada.**

## 3. Preparar una versió traçable

```powershell
git tag -a v0.3.4 -m "v0.3.4 GPLv3"
git push origin v0.3.4
```

Des de GitHub → **Releases** → **Draft a new release**, selecciona `v0.3.4`. Els arxius font que genera GitHub serveixen per recuperar el codi propi de l'extensió. **A més, assegura l'accés al codi font corresponent de les dependències que formen part del bundle** (versions indicades a `package-lock.json`, scripts de compilació i textos de llicència); comprova que `npm ci` continua funcionant i conserva una còpia dels recursos necessaris quan sigui pertinent.

## 4. Crear el ZIP de Chrome Web Store

El codi font de GitHub és diferent del paquet instal·lable del navegador. Des de l'arrel del projecte, després d'executar el build:

```powershell
Compress-Archive -Path .\dist\* -DestinationPath .\revisar-membres-v0.3.4-store.zip -Force
```

Comprova que `manifest.json` és a l'arrel del ZIP, i que `LICENSE`, `THIRD_PARTY_NOTICES.md` i `dashboard.js.LICENSE.txt` hi són presents. Afegeix un enllaç clar i públic al repositori i la seva etiqueta `v0.3.4` a la descripció de la fitxa i/o a la informació distribuïda amb el paquet.

## 5. Abans de clicar «Submit for review»

- Completa `PRIVACY_POLICY.md` amb el nom/entitat responsable i un contacte real; publica-la a una URL pública.
- Revisa el qüestionari de privacitat de Chrome Web Store amb declaracions concordants amb el codi i els permisos.
- Verifica que la llicència de cada biblioteca queda respectada, que el codi font corresponent al bundle és accessible i que la política de privacitat reflecteix el PIN i els identificadors de membres.
- No publiquis dades reals dels teus grups en captures de pantalla, exemples o informes.
- Prova que el ZIP de Chrome Web Store coincideix amb el codi etiquetat a GitHub.

La documentació oficial de Google: https://developer.chrome.com/docs/webstore/prepare . Text GPL: https://www.gnu.org/licenses/gpl-3.0.html .

**Nota de migració v0.3.4:** la compilació elimina l’historial local després del primer desbloqueig correcte del PIN, de manera irreversible. S’ha de mantenir el mateix identificador de l’extensió. Comprova l’actualització de la política de privacitat i el nou text de la fitxa abans d’enviar la versió a Chrome Web Store.
