'use strict';
const {idString, participantState} = require('./membership.cjs');

function participantUserId(participant) {
  return idString(participant?.peer?.userId ?? participant?.userId ?? participant?.peer?.user_id);
}

// Only merge actually restricted CURRENT users. The API may include previously
// kicked users in related filters; they must never count as members.
function currentRestrictedUsers(response) {
  const allowed = new Set((response?.participants || [])
    .filter(p => p?.className === 'ChannelParticipantBanned' && participantState(p) === 'present')
    .map(participantUserId).filter(Boolean));
  return (response?.users || []).filter(user => allowed.has(idString(user.id)));
}
module.exports = {participantUserId, currentRestrictedUsers};
