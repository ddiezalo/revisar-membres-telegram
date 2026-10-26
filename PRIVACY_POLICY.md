# Política de privacitat — Revisar membres de Telegram

**Responsable:** Daniel Díez Alonso (contact@danieldiez.eu)

**Actualitzada:** 16 d'octubre de 2026. Aquesta versió descriu el comportament de l'extensió **v0.3.5**. La v0.3.3 i anteriors encara guardaven un historial local xifrat.

**Finalitat:** l'extensió compara identificadors de participants de dos grups de Telegram seleccionats per la persona usuària. Es connecta directament als servidors de Telegram via MTProto. No envia dades al desenvolupador, als seus servidors ni a eines de publicitat o analítica.

**Dades utilitzades:** identificadors i noms dels grups, noms, identificadors, noms d'usuari i rols dels participants accessibles (administrador o bot, si Telegram ho revela), a més de les credencials de l'aplicació (`api_id`, `api_hash`) i la sessió MTProto. La comparació inclou eventuals consultes individuals per verificar la pertinença al segon grup.

**Resultats i conservació:** la v0.3.5 **no desa cap historial**, llista de membres ni resultat de comparació. Aquestes dades es mantenen en la memòria de la finestra mentre es consulta la comparació i es descarten al tancar-la. En migrar d'una versió anterior, després d'introduir correctament el PIN, el registre xifrat es reescriu sense l'historial antic; no es pot assegurar la desaparició de còpies de seguretat anteriors del disc. Els CSV descarregats voluntàriament per l'usuari **no estan xifrats** i romanen al seu dispositiu fins que els esborri.

**Credencials persistents:** per evitar repetir l'autorització QR, es conserva localment l'API ID, l'API hash i la `StringSession` xifrats amb AES-256-GCM a `chrome.storage.local`. La clau de xifrat es deriva d'un PIN de quatre dígits amb PBKDF2-SHA-256 i una sal aleatòria. El PIN no es desa. Un PIN de quatre dígits té només 10.000 combinacions i, per tant, **no protegeix adequadament contra un atac fora de línia amb una còpia de les dades xifrades**.

**Desbloqueig durant la sessió del navegador:** després d'introduir el PIN es conserva temporalment, només a `chrome.storage.session`, el material criptogràfic necessari per tornar a desbloquejar les credencials en altres finestres de l'extensió. Aquest emmagatzematge és en memòria, està limitat a contextos de confiança de l'extensió i es neteja en reiniciar Chrome o recarregar, actualitzar o desactivar l'extensió. No conté identificadors de participants ni resultats.

**Comunicacions:** les dades consultades es transmeten als servidors de Telegram segons el funcionament del protocol MTProto. L'extensió no consulta missatges privats ni l'historial de navegació, i no comparteix la informació amb anunciants.

**Control:** l'usuari pot tancar la sessió MTProto de l'extensió, intentar revocar-la a Telegram i eliminar les credencials locals. Si la revocació remota falla, es pot efectuar a Telegram → Configuració → Dispositius. Si s'oblida el PIN, restablir l'extensió elimina les credencials locals i requereix una nova autorització QR; el restabliment per si mateix no revoca la sessió remota. Desinstal·lar l'extensió elimina l'emmagatzematge associat al seu identificador.

**Limitacions:** els permisos i les restriccions de Telegram poden impedir conèixer tots els membres o confirmar algunes absències. El programa diferencia les comprovacions parcials i les no verificables.

**Política de dades i ús limitat (Limited Use):** les dades es tracten exclusivament per autoritzar el compte, comparar membres, mostrar els resultats i produir exportacions sol·licitades per l'usuari, d'acord amb la Chrome Web Store User Data Policy. No es transfereixen al desenvolupador ni s'utilitzen per a publicitat, venda de dades, perfilat comercial, decisions creditícies o altres finalitats no relacionades amb la funcionalitat descrita. Aquest límit s'aplica tant a les dades originals com a les derivades.

**Llicència:** el programa es distribueix sota GPL-3.0-or-later, independentment de la política de dades.
