'use strict';
import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions';
import QRCode from 'qrcode';
const { groupSnapshot, reconcile, participantState, idString } = require('./membership.cjs');
const { currentRestrictedUsers } = require('./restricted.cjs');
const { errorCategory, shouldStopChecking } = require('./verification.cjs');

const $ = id => document.getElementById(id);
const LIMIT_DIALOGS = 1500;
const LIMIT_PARTICIPANTS = 10000;
const MAX_INDIVIDUAL_CHECKS = 40;
const INDIVIDUAL_CHECK_DELAY_MS = 250;
const vault = window.TmcVault.createStore(chrome.storage.local);
const params = new URLSearchParams(location.search);
const fromWeb = /^-\d{1,25}$/.test(params.get('source') || '') ? params.get('source') : '';
const fromWebName = (params.get('name') || '').slice(0,120);
let client = null;
let dialogs = [];
let busy = false;

function status(message, type='') {
  $('status').textContent = message;
  $('status').className = type;
}
function accountName(user) {
  return [user?.firstName,user?.lastName].filter(Boolean).join(' ') || user?.username || String(user?.id || 'Compte connectat');
}
function groupId(dialog) {
  const entity = dialog?.entity;
  if (!entity?.id) return null;
  const num = String(entity.id);
  if (entity.className === 'Chat') return '-' + num;
  if (entity.className === 'Channel' && (entity.megagroup || entity.gigagroup)) return '-100' + num;
  return null;
}
function groupName(d) { return String(d.title || d.entity?.title || 'Grup sense nom'); }
function putOptions(el, selected) {
  const first = new Option('Tria un grup…','');
  el.replaceChildren(first);
  for (const group of dialogs) el.add(new Option(group.name, group.id));
  el.value = selected || '';
}
function ready() {
  $('run').disabled = busy || !$('source').value || !$('target').value || $('source').value === $('target').value;
}
async function openHistory() { await chrome.runtime.openOptionsPage(); }
$('history').addEventListener('click', openHistory);
$('source').addEventListener('change', ready);
$('target').addEventListener('change', ready);

async function makeClient(apiId, apiHash, session='') {
  const c = new TelegramClient(new StringSession(session), Number(apiId),apiHash,
    {connectionRetries:4,useWSS:true});
  await c.connect();
  return c;
}
async function authorized() {
  $('auth').hidden = true;
  $('comparison').hidden = false;
  const me = await client.getMe();
  $('account').textContent = `Compte: ${accountName(me)}`;
  await reloadDialogs();
}
async function reloadDialogs() {
  status('Carregant els grups des de Telegram…');
  $('refresh').disabled = true;
  try {
    // Tot el que fa servir el selector prové de l'API, mai del DOM de la barra lateral.
    const list = await client.getDialogs({limit:LIMIT_DIALOGS});
    const groups = new Map();
    for (const dialog of list) {
      const id = groupId(dialog);
      if (!id) continue;
      groups.set(id,{id,name:groupName(dialog),dialog});
    }
    dialogs = [...groups.values()].sort((a,b)=>a.name.localeCompare(b.name,'ca'));
    const chosenSource = $('source').value || fromWeb;
    const chosenTarget = $('target').value;
    putOptions($('source'), chosenSource);
    putOptions($('target'), chosenTarget);
    $('starting-group').textContent = fromWeb
      ? `Grup seleccionat a Telegram Web: ${fromWebName || fromWeb}${groups.has(fromWeb) ? '' : ' (no apareix entre els grups accessibles per aquesta sessió)'}.`
      : 'Selecciona dos grups dels quals siguis membre.';
    ready();
    status(`${dialogs.length} grups disponibles.${list.length >= LIMIT_DIALOGS ? ' Límit de converses assolit: alguns grups podrien no aparèixer.' : ''}`,'good');
  } catch (err) { status(`No s’han pogut carregar els grups: ${safeError(err)}`,'error'); }
  finally {$('refresh').disabled = false;}
}
function safeError(err) {
  const message = String(err?.errorMessage || err?.message || err || 'Error desconegut');
  return message.replace(/[\r\n]+/g,' ').slice(0,350);
}
function setBusy(value) {
  busy=value;
  $('refresh').disabled=value;
  $('source').disabled=value;
  $('target').disabled=value;
  ready();
}

// La clau de desxifrat només viu a la memòria d'aquesta finestra.
async function continueAfterPin() {
  $('pin-setup').hidden = true;
  $('pin-unlock').hidden = true;
  status('Comprovant la sessió de Telegram…');
  try {
    const {auth} = await vault.read();
    if (auth?.session && auth.apiId && auth.apiHash) {
      client = await makeClient(auth.apiId, auth.apiHash, auth.session);
      if (!await client.checkAuthorization()) {
        await client.disconnect().catch(() => {});
        client = null;
        await vault.update(data => ({...data, auth: null}));
        status('La sessió ha caducat. Torna a autoritzar el compte.');
        $('auth').hidden = false;
        return;
      }
      await authorized();
    } else {
      $('auth').hidden = false;
      status('Cal autoritzar el compte una sola vegada.');
    }
  } catch (error) {
    if (client) await client.disconnect().catch(() => {});
    client = null;
    // Si el vault ha canviat en una altra finestra, evita accés amb una clau obsoleta.
    $('auth').hidden = true;
    status(`No s’ha pogut obrir la sessió: ${safeError(error)}. Tanca i torna a obrir el comparador.`, 'error');
  }
}

$('pin-setup-form').addEventListener('submit', async event => {
  event.preventDefault();
  const pin = $('pin-new').value;
  if (!window.TmcVault.validPin(pin) || pin !== $('pin-confirm').value) {
    status('El PIN ha de tenir quatre dígits i les dues entrades han de coincidir.', 'error');
    return;
  }
  const button = $('pin-setup-submit');
  button.disabled = true;
  try {
    await vault.setup(pin);
    $('pin-new').value = '';
    $('pin-confirm').value = '';
    await continueAfterPin();
  } catch (error) {
    status(`No s’ha pogut configurar el PIN: ${safeError(error)}`, 'error');
  } finally { button.disabled = false; }
});

$('pin-unlock-form').addEventListener('submit', async event => {
  event.preventDefault();
  const button = $('pin-unlock-submit');
  button.disabled = true;
  try {
    await vault.unlock($('pin-unlock-input').value);
    $('pin-unlock-input').value = '';
    await continueAfterPin();
  } catch (error) {
    status(`No s’ha pogut desbloquejar: ${safeError(error)}`, 'error');
  } finally { button.disabled = false; }
});

$('pin-reset').addEventListener('click', async () => {
  if (!confirm('Aquest restabliment esborrarà DEFINITIVAMENT la sessió xifrada i TOT l’historial. Vols continuar?')) return;
  if (!confirm('Última confirmació: no es podrà recuperar cap dada. Hauràs de tornar a autoritzar Telegram i revocar manualment la sessió antiga a Configuració → Dispositius. Restablir?')) return;
  try { await vault.reset(); location.reload(); }
  catch (error) { status(`No s’ha pogut restablir: ${safeError(error)}`, 'error'); }
});

$('credentials').addEventListener('submit', async event => {
  event.preventDefault();
  if (busy) return;
  const apiId = Number($('api-id').value);
  const apiHash = $('api-hash').value.trim();
  if (!Number.isSafeInteger(apiId) || apiId <= 0 || !/^[a-f\d]{32}$/i.test(apiHash)) {
    status('Introdueix un API ID vàlid i un API hash de 32 caràcters hexadecimals.','error'); return;
  }
  setBusy(true);
  $('connect').disabled = true;
  $('qr-region').hidden = false;
  status('Connectant amb Telegram…');
  try {
    client = await makeClient(apiId,apiHash);
    await client.signInUserWithQrCode({apiId,apiHash},{
      qrCode: async qr => {
        const encoded = qr.token.toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
        $('qr-image').src = await QRCode.toDataURL(`tg://login?token=${encoded}`,
          {width:230,margin:2,errorCorrectionLevel:'M'});
        status('Escaneja el QR amb el teu Telegram mòbil i confirma l’autorització.');
      },
      password: async hint => {
        const message = `Introdueix la contrasenya de verificació en dos passos de Telegram${hint ? ` (pista: ${hint})` : ''}:`;
        const pw = window.prompt(message);
        if (pw == null) throw new Error('Autorització cancel·lada');
        return pw;
      },
      onError: async err => {status(`Error d’autorització: ${safeError(err)}`,'error');return true;}
    });
    if (!await client.checkAuthorization()) throw new Error('No s’ha pogut confirmar la sessió de Telegram.');
    // Mai desem una StringSession ni un API hash en text pla.
    await vault.update(data => ({...data, auth:{apiId,apiHash,session:client.session.save()}}));
    $('api-hash').value = '';
    status('Sessió autoritzada.','good');
    await authorized();
  } catch (err) {
    status(`No s’ha pogut autoritzar el compte: ${safeError(err)}`,'error');
    $('qr-region').hidden = true;
    if (client) await client.disconnect().catch(()=>{});
    client = null;
  } finally {setBusy(false);$('connect').disabled = false;}
});
$('cancel-auth').addEventListener('click',()=>location.reload());
$('refresh').addEventListener('click',reloadDialogs);
$('disconnect').addEventListener('click',async () => {
  if (busy || !confirm('Vols tancar la sessió MTProto de l’extensió? L’historial es conservarà.')) return;
  setBusy(true);
  let logoutError = '';
  try {if (client) await client.logOut();}
  catch(err){logoutError=safeError(err);}
  try {
    await vault.update(data => ({...data, auth:null}));
    if (client) await client.disconnect().catch(()=>{});
    if (logoutError) alert(`S’ha esborrat la sessió local, però Telegram no ha confirmat la revocació: ${logoutError}. Pots revocar-la des de Dispositius a Telegram.`);
    location.reload();
  } catch (error) {
    status(`No s’ha pogut actualitzar la sessió xifrada: ${safeError(error)}. Torna a obrir el comparador.`, 'error');
    setBusy(false);
  }
});


async function fetchRestrictedMembers(entity) {
  const found = new Map();
  const pageSize = 100;
  let offset = 0;
  // Telegram may restrict this filter to admins. A failure is a coverage
  // warning, not permission to assume a missing user is outside the group.
  for (; offset < LIMIT_PARTICIPANTS;) {
    const response = await client.invoke(new Api.channels.GetParticipants({
      channel: entity,
      filter: new Api.ChannelParticipantsBanned({q: ''}),
      offset,
      limit: Math.min(pageSize, LIMIT_PARTICIPANTS - offset),
      hash: BigInt(0)
    }));
    const page = response?.participants || [];
    for (const user of currentRestrictedUsers(response)) found.set(idString(user.id), user);
    if (page.length < pageSize) return {users: [...found.values()], truncated: false};
    offset += page.length;
  }
  return {users: [...found.values()], truncated: true};
}

function isFloodWait(error) {
  return /FLOOD_WAIT|FLOOD_PREMIUM_WAIT/i.test(String(error?.errorMessage || error?.message || error));
}

async function readGroup(group) {
  const entity = group.dialog.entity;
  const result = await client.getParticipants(entity, {
    limit: LIMIT_PARTICIPANTS,
    showTotal: true
  });
  const all = new Map([...result].filter(user => user?.id)
    .map(user => [idString(user.id), user]));
  const isSupergroup = entity?.className === 'Channel' && (entity.megagroup || entity.gigagroup);
  const warnings = [];
  let selfVerificationFailed = false;
  let extraTruncated = false;

  const n = Number(result.total);
  const fallback = Number(entity?.participantsCount);
  const expected = result.total != null && Number.isSafeInteger(n) && n >= 0 ? n
    : entity?.participantsCount != null && Number.isSafeInteger(fallback) && fallback >= 0 ? fallback : null;

  if (isSupergroup) {
    // Verify the current user BEFORE invoking the admin-only restricted filter.
    // Some current members have ChannelParticipantBanned(left=false) and are
    // not present in the regular search result.
    const me = await client.getMe();
    if (me?.id && !all.has(idString(me.id))) {
      try {
        const response = await client.invoke(new Api.channels.GetParticipant({
          channel: entity, participant: new Api.InputPeerSelf()
        }));
        const state = participantState(response.participant);
        if (state === 'present') all.set(idString(me.id), me);
        else if (state === 'unknown') selfVerificationFailed = true;
      } catch (error) {
        if (isFloodWait(error)) throw error;
        if (errorCategory(error) !== 'USER_NOT_PARTICIPANT') {
          selfVerificationFailed = true;
          warnings.push('No s’ha pogut verificar el compte propi.');
        }
      }
    }

    // Only try the restricted-members filter if the count still has a gap.
    // Telegram can reject this admin-only operation for ordinary members.
    // If counts already match, a refusal cannot improve this comparison.
    if (expected === null || all.size < expected) {
      try {
        const restricted = await fetchRestrictedMembers(entity);
        for (const user of restricted.users) all.set(idString(user.id), user);
        extraTruncated = restricted.truncated;
      } catch (error) {
        if (isFloodWait(error)) throw error;
        const reason = errorCategory(error);
        if (expected === null || all.size < expected) {
          warnings.push(reason === 'CHAT_ADMIN_REQUIRED'
            ? 'La llista continua incompleta i Telegram requereix permisos d’administrador per consultar els membres restringits.'
            : 'La llista continua incompleta i no s’han pogut consultar els membres restringits.');
        }
      }
    }
  }

  const snapshot = groupSnapshot([...all.values()], expected, {
    finished: result.length < LIMIT_PARTICIPANTS && !extraTruncated
  });
  return {
    ...snapshot,
    complete: snapshot.complete && !selfVerificationFailed,
    id: group.id,
    name: group.name,
    warnings,
    // User entities are transient, never written to chrome.storage.
    rawUsers: all,
    isSupergroup
  };
}

async function verifyMissing(source, target) {
  const knownTargetIds = new Set(target.members.map(p => p.id));
  const missing = source.members.filter(p => !knownTargetIds.has(p.id));
  const statuses = new Map();
  const errors = {};
  let attempts = 0;
  let blocked = null;

  // Basic groups have no channels.getParticipant method. A matching member
  // count supports a list-based absence, not an individual API confirmation.
  if (!target.isSupergroup) return {statuses, attempts, errors, blocked};

  for (const member of missing.slice(0, MAX_INDIVIDUAL_CHECKS)) {
    attempts++;
    if (attempts > 1) await new Promise(resolve => setTimeout(resolve, INDIVIDUAL_CHECK_DELAY_MS));
    try {
      const rawUser = source.rawUsers.get(member.id);
      if (!rawUser) {
        errors.INPUT_ENTITY_UNAVAILABLE = (errors.INPUT_ENTITY_UNAVAILABLE || 0) + 1;
        continue;
      }
      const peer = await client.getInputEntity(rawUser);
      const response = await client.invoke(new Api.channels.GetParticipant({
        channel: target.dialog.entity, participant: peer
      }));
      const state = participantState(response.participant);
      if (state !== 'unknown') statuses.set(member.id, state);
      else errors.UNKNOWN_PARTICIPANT = (errors.UNKNOWN_PARTICIPANT || 0) + 1;
    } catch (error) {
      if (isFloodWait(error)) throw error;
      const reason = errorCategory(error);
      errors[reason] = (errors[reason] || 0) + 1;
      if (shouldStopChecking(reason)) {
        blocked = reason;
        break; // Do not repeat requests the API has explicitly rejected.
      }
    }
  }
  return {statuses, attempts, errors, blocked};
}

function showResult(record) {
  $('result').hidden = false;
  $('result-title').textContent = `${record.source.name} → ${record.target.name}`;
  $('result-summary').textContent =
    `Grup 1: ${record.source.membersFound}/${record.source.memberCount ?? '?'} · ` +
    `Grup 2: ${record.target.membersFound}/${record.target.memberCount ?? '?'} · ` +
    `Coincidències: ${record.matches} (verificades individualment: ${record.verifiedPresent || 0}) · ` +
    `Absències confirmades individualment: ${record.confirmedAbsent || 0} · ` +
    `No trobats segons la llista: ${record.enumeratedAbsent || 0} · ` +
    `No verificables: ${record.unverified || 0}.`;

  $('result-warning').className = record.definitive || record.coverageComplete ? 'complete' : '';
  $('result-warning').textContent = record.definitive
    ? 'Les diferències s’han resolt mitjançant comprovacions individuals, amb cobertura completa del grup d’origen segons l’API.'
    : record.coverageComplete
    ? 'Els recomptes dels dos grups coincideixen amb les llistes accessibles. Les persones «No trobades segons la llista» no tenen una absència confirmada individualment.'
    : 'Comparació parcial segons els recomptes accessibles: pot haver-hi membres que Telegram no enumera. Les persones «No verificables» podrien continuar sent membres del grup 2.';

  const coverageNotes = [...new Set([...(record.source.warnings || []), ...(record.target.warnings || [])])];
  if (coverageNotes.length) $('result-warning').textContent += ' Avís: ' + coverageNotes.join(' ');
  if (record.verificationBlocked === 'CHAT_ADMIN_REQUIRED') {
    $('result-warning').textContent += ' Telegram requereix ser administrador del grup 2 per a la verificació individual. No s’han repetit les consultes rebutjades.';
  }
  const failures = record.verificationErrors || {};
  if (Object.keys(failures).length && !record.verificationBlocked) {
    const detail = Object.entries(failures).map(([reason, count]) => `${reason}: ${count}`).join(', ');
    $('result-warning').textContent += ` Verificacions no resoltes (${detail}).`;
  }

  $('result-saved').textContent = `Comprovació desada a l’historial: ${new Intl.DateTimeFormat('ca-ES',{dateStyle:'medium',timeStyle:'short'}).format(new Date(record.date))}.`;
  $('result-members').replaceChildren();
  for (const person of record.notFound) {
    const tr = document.createElement('tr');
    const label = person.verification === 'absent' ? 'Absència confirmada'
      : person.verification === 'enumerated' ? 'No trobat segons la llista'
      : 'No verificable';
    for (const value of [person.name, person.id, person.bot ? 'Sí' : 'No', label]) {
      const td = document.createElement('td'); td.textContent = String(value); tr.appendChild(td);
    }
    $('result-members').appendChild(tr);
  }
}
$('run').addEventListener('click',async () => {
  const source = dialogs.find(g=>g.id === $('source').value);
  const target = dialogs.find(g=>g.id === $('target').value);
  if (!source || !target || source.id === target.id || busy) return;
  setBusy(true);
  $('result').hidden = true;
  try {
    status(`Consultant membres de «${source.name}»…`);
    const first = await readGroup(source);
    status(`Llegits ${first.membersFound} membres. Consultant «${target.name}»…`);
    const second = await readGroup(target);
    const {statuses, attempts, errors, blocked} = await verifyMissing(first, second);
    const outcome = reconcile(first, second, statuses);
    const strip = ({id,name,memberCount,membersFound,complete,warnings}) => ({id,name,memberCount,membersFound,complete,warnings});
    const record = {
      id: crypto.randomUUID(),date:new Date().toISOString(),method:'mtproto',
      source:strip(first),target:strip(second),...outcome,
      verificationAttempted: attempts, verificationErrors: errors, verificationBlocked: blocked
    };
    await vault.update(data => ({
      ...data,
      history: [record, ...data.history]
    }));
    showResult(record);
    status(`Comprovació finalitzada: ${outcome.confirmedAbsent} absències confirmades, ${outcome.enumeratedAbsent} no trobats segons la llista i ${outcome.unverified} casos no verificables.`, 'good');
  } catch(err) {
    status(`No s’ha completat la comparació: ${safeError(err)}. No s’ha desat cap resultat parcial.`, 'error');
  } finally {setBusy(false);}
});

(async function init() {
  status('Preparant les dades protegides…');
  try {
    if (await vault.isSetup()) {
      $('pin-unlock').hidden = false;
      $('pin-unlock-input').focus();
      status('Introdueix el PIN per desbloquejar l’extensió.');
    } else {
      $('pin-setup').hidden = false;
      $('pin-new').focus();
      status('Crea un PIN de 4 dígits per protegir les dades locals.');
    }
  } catch (error) {
    status(`No s’ha pogut llegir l’emmagatzematge: ${safeError(error)}`, 'error');
  }
})();
