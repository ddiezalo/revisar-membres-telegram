(() => {
  'use strict';
  if (window.__tmcMtprotoAdded) return;
  window.__tmcMtprotoAdded = true;
  const clean = text => String(text || '').replace(/\s+/g,' ').trim();
  const isVisible = el => !!(el && el.isConnected && el.getClientRects().length);
  function addButton() {
    const root = document.querySelector('#RightColumn');
    if (!root) return;
    const profiles = [...root.querySelectorAll('.Profile')].filter(isVisible)
      .sort((a,b) => Number(b.classList.contains('Transition_slide-active')) - Number(a.classList.contains('Transition_slide-active')));
    const panel = profiles.find(el => /^-\d+$/.test(el.querySelector('.profile-info .Avatar[data-peer-id]')?.dataset.peerId || '') &&
      el.querySelector('.shared-media-tabs'));
    if (!panel) return;
    const tabs = panel.querySelector('.shared-media-tabs');
    if (tabs.nextElementSibling?.id === 'tmc-mtproto-bar') return;
    const old = root.querySelector('#tmc-mtproto-bar');
    if (old) old.remove();
    const bar = document.createElement('div');
    bar.id = 'tmc-mtproto-bar';
    const button = document.createElement('button');
    button.type = 'button'; button.textContent = 'Revisar membres';
    button.addEventListener('click', () => {
      const groupId = panel.querySelector('.profile-info .Avatar[data-peer-id]')?.dataset.peerId;
      const groupName = clean(panel.querySelector('.profile-info .fullName')?.textContent);
      if (!groupId) return;
      chrome.runtime.sendMessage({type:'OPEN_COMPARISON',groupId,groupName}, resp => {
        if (chrome.runtime.lastError || !resp?.ok) {
          alert('No s’ha pogut obrir la finestra de comparació. Recarrega Telegram i torna-ho a provar.');
        }
      });
    });
    const hint = document.createElement('span');
    hint.textContent = 'Comparació mitjançant l’API de Telegram';
    bar.append(button,hint);
    tabs.insertAdjacentElement('afterend',bar);
  }
  // Show first-use instructions within Telegram Web, without reading privileged
  // MTProto credentials from the page or from a content script.
  function showOnboarding() {
    if (document.getElementById('tmc-onboarding-overlay') || !document.body) return;

    const overlay = document.createElement('div');
    overlay.id = 'tmc-onboarding-overlay';
    const dialog = document.createElement('section');
    dialog.id = 'tmc-onboarding-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'tmc-onboarding-title');

    const heading = document.createElement('h2');
    heading.id = 'tmc-onboarding-title';
    heading.textContent = 'Configura Revisar membres';

    const intro = document.createElement('p');
    intro.textContent = 'Per comparar membres, necessites les credencials de l’API de Telegram i autoritzar aquesta extensió una sola vegada.';

    const steps = document.createElement('ol');
    for (const description of [
      'A my.telegram.org/apps, inicia sessió i obre «API development tools».',
      'Si no tens una aplicació, crea-la amb aquests valors: App title: Revisar Membres; Short name: revisarmembres123 (canvia el número si ja existeix); URL: en blanc; Platform: Desktop; Description: Extensió per comparar membres de grups de Telegram.',
      'Copia els valors «App api_id» i «App api_hash». Si ja tens una aplicació, pots reutilitzar les seves credencials.',
      'Prem «Continua amb l’autorització», introdueix les credencials i escaneja el codi QR amb Telegram al mòbil.'
    ]) {
      const item = document.createElement('li');
      item.textContent = description;
      steps.append(item);
    }

    const link = document.createElement('a');
    link.href = 'https://my.telegram.org/apps';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.className = 'tmc-onboarding-link';
    link.textContent = 'Obtén les credencials de l’API ↗';

    const actions = document.createElement('div');
    actions.className = 'tmc-onboarding-actions';
    const later = document.createElement('button');
    later.type = 'button';
    later.className = 'tmc-onboarding-later';
    later.textContent = 'Més tard';
    const continueButton = document.createElement('button');
    continueButton.type = 'button';
    continueButton.className = 'tmc-onboarding-continue';
    continueButton.textContent = 'Continua amb l’autorització';
    const error = document.createElement('p');
    error.setAttribute('role', 'alert');
    error.className = 'tmc-onboarding-error';

    const previousFocus = document.activeElement;
    let closed = false;
    const onKeydown = event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        dismiss();
      }
    };
    function removeOverlay() {
      if (closed) return;
      closed = true;
      document.removeEventListener('keydown', onKeydown, true);
      overlay.remove();
      if (previousFocus?.isConnected && typeof previousFocus.focus === 'function') previousFocus.focus();
    }
    function dismiss() {
      chrome.runtime.sendMessage({type: 'DISMISS_ONBOARDING'}, () => {
        // The dialog can always be reopened via the extension icon.
        void chrome.runtime.lastError;
      });
      removeOverlay();
    }

    later.addEventListener('click', dismiss);
    continueButton.addEventListener('click', () => {
      continueButton.disabled = true;
      chrome.runtime.sendMessage({type: 'OPEN_SETUP'}, response => {
        if (chrome.runtime.lastError || !response?.ok) {
          error.textContent = 'No s’ha pogut obrir l’autorització. Obre-la des de la icona de l’extensió.';
          continueButton.disabled = false;
          return;
        }
        removeOverlay();
      });
    });
    document.addEventListener('keydown', onKeydown, true);
    actions.append(later, continueButton);
    dialog.append(heading, intro, steps, link, actions, error);
    overlay.append(dialog);
    document.body.append(overlay);
    later.focus();
  }

  // Only Telegram Web A injects this content script. The background service
  // worker checks auth state without exposing the session or API hash.
  chrome.runtime.sendMessage({type: 'CHECK_ONBOARDING'}, response => {
    if (chrome.runtime.lastError || !response?.ok || !response.show) return;
    showOnboarding();
  });

  let timer;
  const observer = new MutationObserver(() => {
    clearTimeout(timer); timer = setTimeout(addButton, 180);
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
  addButton();
})();
