'use strict';
const $ = id => document.getElementById(id);
const vault = window.TmcVault.createStore(chrome.storage.local, chrome.storage.session);
function notify(text) { $('message').textContent = text; }
function showSettings() {
  $('pin-unlock-section').hidden = true;
  $('pin-not-setup').hidden = true;
  $('pin-settings').hidden = false;
  notify('Credencials desbloquejades per a aquesta sessió de Chrome.');
}
$('open-dashboard').addEventListener('click', () =>
  chrome.windows.create({url: chrome.runtime.getURL('dashboard.html'), type: 'popup', width: 760, height: 790}));
$('pin-unlock-form').addEventListener('submit', async event => {
  event.preventDefault();
  try {
    await vault.unlock($('pin-unlock-input').value);
    $('pin-unlock-input').value = '';
    showSettings();
  } catch (error) {
    $('pin-unlock-input').value = '';
    notify('No s’ha pogut desbloquejar: ' + error.message);
  }
});
$('pin-change-form').addEventListener('submit', async event => {
  event.preventDefault();
  const oldPin = $('pin-old').value;
  const next = $('pin-next').value;
  if (!window.TmcVault.validPin(next) || next !== $('pin-next-confirm').value) {
    notify('El PIN nou ha de tenir quatre dígits i les dues entrades han de coincidir.');
    return;
  }
  try {
    await vault.changePin(oldPin, next);
    notify('PIN canviat. Les altres finestres obertes s’hauran de tornar a obrir.');
  } catch (error) {
    notify('No s’ha pogut canviar el PIN: ' + error.message);
  } finally {
    for (const id of ['pin-old','pin-next','pin-next-confirm']) $(id).value = '';
  }
});
(async () => {
  try {
    if (await vault.resume()) showSettings();
    else if (await vault.isSetup()) $('pin-unlock-section').hidden = false;
    else $('pin-not-setup').hidden = false;
  } catch (error) { notify('No s’ha pogut llegir la configuració: ' + error.message); }
})();
