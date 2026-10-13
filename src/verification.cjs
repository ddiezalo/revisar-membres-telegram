'use strict';

// Classification deliberately avoids logging or persisting user IDs, input
// peers, access hashes, sessions, or raw Telegram error messages.
function errorCategory(error) {
  const code = String(error?.errorMessage || error?.message || error || '').toUpperCase();
  if (/CHAT_ADMIN_REQUIRED/.test(code)) return 'CHAT_ADMIN_REQUIRED';
  if (/USER_NOT_PARTICIPANT/.test(code)) return 'USER_NOT_PARTICIPANT';
  if (/PARTICIPANT_ID_INVALID|USER_ID_INVALID|PEER_ID_INVALID/.test(code)) return 'INVALID_PARTICIPANT';
  if (/COULD NOT FIND.*INPUT ENTITY|COULD NOT FIND THE INPUT ENTITY|CANNOT FIND.*INPUT ENTITY/.test(code)) return 'INPUT_ENTITY_UNAVAILABLE';
  if (/CHANNEL_PRIVATE|CHANNEL_INVALID/.test(code)) return 'CHANNEL_UNAVAILABLE';
  return 'OTHER';
}

// The API documents USER_NOT_PARTICIPANT ambiguously with regard to which
// user is absent. Do not infer membership for an arbitrary candidate from
// this error alone. Only an explicit ChannelParticipant can confirm status.
function shouldStopChecking(category) {
  return category === 'CHAT_ADMIN_REQUIRED' || category === 'CHANNEL_UNAVAILABLE';
}

module.exports = {errorCategory, shouldStopChecking};
