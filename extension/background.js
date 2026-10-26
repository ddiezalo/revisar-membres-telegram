'use strict';
// Keep persistent MTProto credentials and the ephemeral unlock key inaccessible to Telegram Web content scripts.
chrome.storage.local.setAccessLevel({accessLevel: 'TRUSTED_CONTEXTS'}).catch(console.warn);
chrome.storage.session.setAccessLevel({accessLevel: 'TRUSTED_CONTEXTS'}).catch(console.warn);

const AUTH_KEY = 'mtprotoAuth';
const VAULT_KEY = 'secureVault';
const ONBOARDING_DISMISSED_KEY = 'onboardingDismissed';

function fromTelegramWeb(sender) {
  return Boolean(sender.tab && sender.url?.startsWith('https://web.telegram.org/a/'));
}

function openDashboard(query = {}) {
  const url = new URL(chrome.runtime.getURL('dashboard.html'));
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
  return chrome.windows.create({
    url: url.href,
    type: 'popup',
    width: 760,
    height: 790,
    focused: true
  });
}

function replyWith(respond, promise) {
  promise.then(value => respond({ok: true, ...value}))
    .catch(err => respond({ok: false, error: String(err?.message || err)}));
  return true;
}

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (!fromTelegramWeb(sender)) return false;

  if (message?.type === 'CHECK_ONBOARDING') {
    return replyWith(respond, chrome.storage.local.get([AUTH_KEY, VAULT_KEY, ONBOARDING_DISMISSED_KEY])
      .then(data => ({
        show: !data[VAULT_KEY] && !data[AUTH_KEY]?.session && !data[ONBOARDING_DISMISSED_KEY]
      })));
  }

  if (message?.type === 'DISMISS_ONBOARDING') {
    return replyWith(respond, chrome.storage.local.set({[ONBOARDING_DISMISSED_KEY]: true}));
  }

  if (message?.type === 'OPEN_SETUP') {
    return replyWith(respond, openDashboard().then(async () => {
      await chrome.storage.local.set({[ONBOARDING_DISMISSED_KEY]: true});
      return {};
    }));
  }

  if (message?.type === 'OPEN_COMPARISON') {
    const id = String(message.groupId || '');
    if (!/^-\d{1,25}$/.test(id)) return false;
    return replyWith(respond, openDashboard({
      source: id,
      name: String(message.groupName || '').slice(0, 120)
    }).then(() => ({})));
  }

  return false;
});
