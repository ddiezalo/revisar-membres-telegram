'use strict';

function idString(value) { return value == null ? '' : String(value); }

// Rol recuperat de l'objecte Participant retornat per GramJS; no s'infereix
// a partir del nom, ni de la condició d'administrador del mateix usuari en altres grups.
function roleFromUser(user) {
  const participant = user?.participant;
  const type = participant?.className || participant?.constructor?.name || '';
  const admin = ['ChannelParticipantAdmin','ChannelParticipantCreator',
    'ChatParticipantAdmin','ChatParticipantCreator'].includes(type);
  const bot = user?.bot === true;
  if (admin && bot) return 'Admin · Bot';
  if (admin) return 'Admin';
  if (bot) return 'Bot';
  return '';
}
function personFromUser(user) {
  const id = idString(user?.id);
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim()
    || user?.username || `Usuari ${id}`;
  return {id, name, username: String(user?.username || '').replace(/^@/, ''), role: roleFromUser(user)};
}

function groupSnapshot(users, advertisedCount, opts = {}) {
  const seen = new Map();
  for (const user of users) {
    if (!user?.id) continue;
    const member = personFromUser(user);
    seen.set(member.id, member);
  }
  const members = [...seen.values()];
  const n = Number(advertisedCount);
  const expected = advertisedCount != null && Number.isSafeInteger(n) && n >= 0 ? n : null;
  return {
    members, memberCount: expected, membersFound: members.length,
    complete: Boolean(opts.finished && expected !== null && members.length === expected)
  };
}

// A ChannelParticipantBanned with left=false is a RESTRICTED CURRENT member.
function participantState(participant) {
  if (!participant) return 'unknown';
  const type = participant.className || participant.constructor?.name;
  if (type === 'ChannelParticipantLeft') return 'absent';
  if (type === 'ChannelParticipantBanned') return participant.left === true ? 'absent' : 'present';
  if (type?.startsWith('ChannelParticipant')) return 'present';
  return 'unknown';
}

function compare(source, target) {
  const ids = new Set(target.members.map(member => idString(member.id)));
  const notFound = source.members.filter(member => !ids.has(idString(member.id)))
    .sort((a, b) => a.name.localeCompare(b.name, 'ca'));
  return {notFound, matches: source.members.length - notFound.length,
    definitive: Boolean(source.complete && target.complete)};
}

// Status for candidates missing from group 2, without treating failed lookups
// as proof of absence. All IDs are compared as strings (64-bit safe).
function reconcile(source, target, statuses = new Map()) {
  const baseline = compare(source, target);
  const notFound = [];
  let verifiedPresent = 0;
  let confirmedAbsent = 0;
  let enumeratedAbsent = 0;
  let unverified = 0;

  for (const member of baseline.notFound) {
    const status = statuses.get(idString(member.id));
    if (status === 'present') { verifiedPresent++; continue; }
    if (status === 'absent') {
      confirmedAbsent++;
      notFound.push({...member, verification: 'absent'});
    } else if (target.complete) {
      // This is reliable as list evidence, but it is NOT a successful
      // individual lookup. Never label it 'confirmed absent'.
      enumeratedAbsent++;
      notFound.push({...member, verification: 'enumerated'});
    } else {
      unverified++;
      notFound.push({...member, verification: 'unknown'});
    }
  }
  return {
    notFound, matches: baseline.matches + verifiedPresent,
    confirmedAbsent, enumeratedAbsent, verifiedPresent, unverified,
    coverageComplete: Boolean(source.complete && target.complete),
    definitive: Boolean(source.complete && unverified === 0 && enumeratedAbsent === 0)
  };
}

function csvSafe(value) {
  const content = String(value ?? '');
  // CSV quoting is not enough: Excel and similar apps evaluate formulas.
  return /^[\s\u0000-\u001f]*[=+\-@\t\r]/.test(content) ? "'" + content : content;
}

module.exports = {idString, personFromUser, roleFromUser, groupSnapshot, participantState, compare, reconcile, csvSafe};
