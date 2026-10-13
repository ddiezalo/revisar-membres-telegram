# Política de privacitat — Revisar membres de Telegram (pendent de publicar)

**Responsable:** [afegir nom o entitat i contacte abans de publicar]

**Funció:** l'extensió compara identificadors de participants de dos grups de Telegram als quals pot accedir el compte autoritzat. Per fer-ho, es connecta directament als servidors de Telegram mitjançant MTProto; no envia dades al desenvolupador, a servidors propis ni a serveis de publicitat o anàlisi.

**Dades utilitzades:** identificadors i noms de grups, identificadors i noms dels seus participants, indicador de bot, credencials API introduïdes per la persona usuària i la clau de sessió MTProto generada després de l'autorització. Les consultes individuals a Telegram poden permetre confirmar pertinences no visibles al llistat general.

**Conservació:** la sessió MTProto (`StringSession`), l'`api_hash` i l'historial de comparacions (incloent-hi noms, identificadors i estats de verificació) es desen localment a `chrome.storage.local`, dins d'un registre xifrat amb AES-256-GCM. La clau deriva d'un PIN de quatre dígits amb PBKDF2-SHA-256 i una sal aleatòria, i no es guarda permanentment. Un PIN de quatre dígits proporciona una **protecció limitada** i es pot provar exhaustivament si un atacant obté una còpia del registre xifrat. La migració elimina les claus antigues de text pla, sense garantir la desaparició de còpies prèvies del disc. No s'aplica un termini d'esborrat automàtic. L'historial es pot esborrar individualment o sencer a les Opcions, després del desbloqueig.

**Comunicacions:** les consultes es trameten als servidors de Telegram mitjançant la connexió xifrada pròpia de MTProto. No s'utilitzen cookies de Telegram Web per autoritzar l'extensió, ni es venen o comparteixen les dades amb anunciants.

**Control:** després de desbloquejar, «Tanca la sessió» esborra les credencials del registre xifrat i intenta revocar la sessió a Telegram. Si falla la revocació, la persona usuària la pot completar a Configuració → Dispositius. L'eliminació de l'extensió esborra el seu emmagatzematge local al perfil del navegador. Les exportacions CSV **no** estan xifrades i queden sota el control de qui les descarrega. El PIN es pot canviar des de l'Historial; si s'oblida, el restabliment esborra irreversiblement la sessió i l'historial local i no revoca per si mateix la sessió remota de Telegram.

**Limitacions:** l'accés a membres depèn de les regles i permisos de Telegram. Algunes absències són indeterminades i es mostren com «No verificable».

**Política de dades:** les dades únicament es processen per proporcionar la funcionalitat indicada i no s'utilitzen per a publicitat, perfilat, venda de dades ni usos aliens a la comparació.

**Publicació:** aquest document és un esborrany; completar-lo amb el responsable, les jurisdiccions i el contacte aplicables, i publicar una URL accessible abans de la distribució al Chrome Web Store. Revisar que les afirmacions coincideixin amb la versió final i les obligacions legals aplicables.

**Llicència del programa:** GPL-3.0-or-later, amb codi font públic i avisos de dependències. Això és independent de la política de tractament de dades.
