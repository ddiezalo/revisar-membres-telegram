'use strict';
const select = document.getElementById('history-select');
const report = document.getElementById('report');
const message = document.getElementById('message');
const deleteOne = document.getElementById('delete-one');
const deleteAll = document.getElementById('delete-all');
let records = [];
const vault = window.TmcVault.createStore(chrome.storage.local);

function displayDate(iso) {
  try { return new Intl.DateTimeFormat('ca-ES', {dateStyle:'medium',timeStyle:'short'}).format(new Date(iso)); }
  catch { return String(iso); }
}
function addStat(container, label, value) {
  const el = document.createElement('div'); el.className='stat';
  const strong = document.createElement('strong'); strong.textContent=String(value);
  const description = document.createElement('span'); description.textContent=label;
  el.append(strong,description);container.appendChild(el);
}
function showRecord() {
  const record = records.find(item => item.id === select.value);
  report.hidden = !record;
  deleteOne.disabled = !record;
  if (!record) return;
  document.getElementById('report-title').textContent = `${record.source.name} → ${record.target.name}`;
  document.getElementById('report-date').textContent = displayDate(record.date);
  const summary = document.getElementById('summary');
  summary.replaceChildren();
  addStat(summary,'Membres llegits al grup 1',`${record.source.membersFound}${record.source.memberCount == null?'':' / '+record.source.memberCount}`);
  addStat(summary,'Membres llegits al grup 2',`${record.target.membersFound}${record.target.memberCount == null?'':' / '+record.target.memberCount}`);
  addStat(summary,'Coincidències',record.matches);
  addStat(summary,'No trobats al grup 2',record.notFound.length);
  if (record.enumeratedAbsent != null) {
    addStat(summary,'No trobats segons la llista',record.enumeratedAbsent);
    addStat(summary,'No verificables',record.unverified || 0);
  }
  const warning = document.getElementById('warning');
  const legacy = record.confirmedAbsent == null;
  warning.className = record.definitive || record.coverageComplete ? 'success' : 'warning';
  warning.textContent = legacy
    ? 'Registre anterior: no es van verificar les pertinences individualment. «No trobat» no és una absència confirmada.'
    : record.definitive
    ? 'Les diferències s’han resolt individualment segons les comprovacions realitzades.'
    : record.coverageComplete
    ? 'Els recomptes quadren amb les llistes de Telegram. «No trobat segons la llista» no equival a absència confirmada individualment.'
    : 'Comparació parcial: «No verificable» no confirma l’absència del grup 2.';
  const coverageNotes = [...new Set([...(record.source.warnings || []), ...(record.target.warnings || [])])];
  if (coverageNotes.length) warning.textContent += ' Avís: ' + coverageNotes.join(' ');
  if (record.verificationBlocked === 'CHAT_ADMIN_REQUIRED') {
    warning.textContent += ' La verificació individual requeria permisos d’administrador del grup 2.';
  }
  const errors = record.verificationErrors || {};
  if (Object.keys(errors).length && !record.verificationBlocked) {
    warning.textContent += ' Comprovacions no resoltes: ' + Object.entries(errors)
      .map(([reason, count]) => `${reason}: ${count}`).join(', ') + '.';
  }
  document.getElementById('members-heading').textContent = `Membres absents o no verificables (${record.notFound.length})`; 
  const tableBody = document.getElementById('members-body');
  tableBody.replaceChildren();
  for (const member of record.notFound) {
    const tr = document.createElement('tr');
    for (const value of [member.name, member.id, member.bot ? 'Sí' : 'No', member.verification === 'absent' ? 'Absència confirmada' : member.verification === 'enumerated' ? 'No trobat segons la llista' : member.verification === 'unknown' ? 'No verificable' : 'No trobat (registre antic)']) {
      const td = document.createElement('td'); td.textContent = String(value); tr.appendChild(td);
    }
    tableBody.appendChild(tr);
  }
}
function fillSelect(id) {
  select.replaceChildren(new Option('Tria una comprovació…', ''));
  for (const record of records) {
    select.add(new Option(`${record.source.name} · ${displayDate(record.date)} · amb ${record.target.name}`, record.id));
  }
  select.value = id || '';
  showRecord();
  message.textContent = records.length ? `${records.length} comprovacions desades.` : 'Encara no hi ha comprovacions desades.';
}
async function load() {
  const data = await vault.read();
  records = Array.isArray(data.history) ? data.history : [];
  fillSelect(records[0]?.id);
}
select.addEventListener('change',showRecord);
deleteOne.addEventListener('click',async () => {
  if (!select.value) return;
  if (!confirm('Vols esborrar aquesta comprovació?')) return;
  const selectedId = select.value;
  try {
    await vault.update(data => ({...data, history:data.history.filter(item => item.id !== selectedId)}));
    await load();
  } catch (error) {
    message.textContent = 'No s’ha pogut esborrar la comprovació: ' + error.message;
  }
});
deleteAll.addEventListener('click',async () => {
  if (!records.length) return;
  if (!confirm('Vols esborrar definitivament tot l’historial?')) return;
  try {
    await vault.update(data => ({...data, history:[]}));
    await load();
  } catch (error) {
    message.textContent = 'No s’ha pogut esborrar l’historial: ' + error.message;
  }
});
document.getElementById('export-csv').addEventListener('click',() => {
  const record = records.find(item => item.id === select.value);
  if (!record) return;
  const safe = value => {
    const text = String(value ?? '');
    return /^[\s\u0000-\u001f]*[=+\-@\t\r]/.test(text) ? "'" + text : text;
  };
  const quote = input => `"${safe(input).replace(/"/g,'""')}"`;
  const rows = [['Nom','ID de Telegram','Bot','Estat','Grup 1','Grup 2','Data','Comparació completa'],
    ...record.notFound.map(m => [m.name,m.id,m.bot?'Sí':'No',m.verification === 'absent' ? 'Absència confirmada' : m.verification === 'enumerated' ? 'No trobat segons la llista' : m.verification === 'unknown' ? 'No verificable' : 'No trobat (antic)',record.source.name,record.target.name,record.date,record.confirmedAbsent == null?'No verificat (antic)':(record.definitive?'Sí':'No')])];
  const csv = '\uFEFF'+rows.map(row => row.map(quote).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  const link = document.createElement('a');
  link.href=url;link.download=`comprovacio-${record.date.slice(0,10)}.csv`;
  document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),2500);
});
// L'historial només es mostra després de desxifrar-lo amb el PIN.
document.getElementById('history-unlock-form').addEventListener('submit', async event => {
  event.preventDefault();
  const input = document.getElementById('history-pin');
  try {
    await vault.unlock(input.value);
    input.value = '';
    document.getElementById('history-unlock').hidden = true;
    document.getElementById('history-content').hidden = false;
    await load();
  } catch (error) {
    input.value = '';
    message.textContent = 'No s’ha pogut desbloquejar: ' + error.message;
  }
});

document.getElementById('pin-change-form').addEventListener('submit', async event => {
  event.preventDefault();
  const old = document.getElementById('pin-old');
  const next = document.getElementById('pin-next');
  const confirmPin = document.getElementById('pin-next-confirm');
  if (next.value !== confirmPin.value) {
    message.textContent = 'Els dos PIN nous no coincideixen.';
    return;
  }
  try {
    await vault.changePin(old.value, next.value);
    message.textContent = 'PIN modificat. Tanca les altres finestres del comparador i torna-les a obrir.';
    old.value = ''; next.value = ''; confirmPin.value = '';
    await load();
  } catch (error) {
    message.textContent = 'No s’ha pogut canviar el PIN: ' + error.message;
  }
});

document.getElementById('history-reset').addEventListener('click', async () => {
  if (!confirm('S’esborraran DEFINITIVAMENT la sessió de Telegram i tot l’historial xifrat. Continuar?')) return;
  if (!confirm('Confirmes que vols perdre totes les dades? Caldrà autoritzar Telegram de nou i revocar manualment la sessió anterior des de Telegram → Dispositius.')) return;
  try { await vault.reset(); location.reload(); }
  catch (error) { message.textContent = 'Error en restablir: ' + error.message; }
});

document.getElementById('history-open-dashboard').addEventListener('click', () => {
  chrome.windows.create({url:chrome.runtime.getURL('dashboard.html'),type:'popup',width:760,height:790});
});

(async () => {
  try {
    if (await vault.isSetup()) {
      document.getElementById('history-unlock').hidden = false;
      message.textContent = 'L’historial està xifrat. Introdueix el PIN per consultar-lo.';
    } else {
      document.getElementById('history-no-vault').hidden = false;
      message.textContent = 'Cal configurar el PIN abans de consultar les dades.';
    }
  } catch (error) {
    message.textContent = 'Error en comprovar les dades: ' + error.message;
  }
})();
