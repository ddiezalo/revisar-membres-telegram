'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {groupSnapshot, participantState, reconcile, compare, csvSafe} = require('../src/membership.cjs');
const {currentRestrictedUsers} = require('../src/restricted.cjs');
const {errorCategory, shouldStopChecking} = require('../src/verification.cjs');
const u = (id, name = id, bot = false) => ({id, firstName:name, bot});
const snapshot = (users,count) => groupSnapshot(users,count,{finished:true});

test('deduplica IDs grans i conserva bots', () => {
  const result = snapshot([u('900719925474099313','A'),u('900719925474099313','A'),u('2','Bot',true)],2);
  assert.equal(result.membersFound,2);
  assert.equal(result.members[1].bot,true);
  assert.equal(result.complete,true);
});
test('interpreta Banned left=false com a membre restringit', () => {
  assert.equal(participantState({className:'ChannelParticipantBanned',left:false}),'present');
  assert.equal(participantState({className:'ChannelParticipantBanned',left:true}),'absent');
  assert.equal(participantState({className:'ChannelParticipantSelf'}),'present');
  assert.equal(participantState({className:'ChannelParticipantLeft'}),'absent');
});
test('el filtre restringits descarta expulsats i no duplica', () => {
  const response = {
    participants: [
      {className:'ChannelParticipantBanned',left:false,peer:{userId:'5'}},
      {className:'ChannelParticipantBanned',left:true,peer:{userId:'6'}}
    ],
    users:[u('5'),u('6')]
  };
  assert.deepEqual(currentRestrictedUsers(response).map(u=>String(u.id)),['5']);
});
test('afegeix membre propi restringit i resol el 8/9', () => {
  const members = Array.from({length:8},(_,i)=>u(String(i+1)));
  assert.equal(snapshot(members,9).complete,false);
  assert.equal(snapshot([...members,u('9')],9).complete,true);
});
test('verificació individual evita un fals positiu', () => {
  const a = snapshot([u('1'),u('2')],2);
  const b = snapshot([u('2')],1);
  const result = reconcile(a,b,new Map([['1','present']]));
  assert.equal(result.matches,2);
  assert.equal(result.notFound.length,0);
  assert.equal(result.verifiedPresent,1);
  assert.equal(result.definitive,true);
});
test('amb el recompte quadrat, absència per llista no és confirmació individual', () => {
  const a = snapshot([u('1'),u('2')],2);
  const b = snapshot([u('2')],1);
  const result = reconcile(a,b,new Map());
  assert.equal(result.unverified,0);
  assert.equal(result.enumeratedAbsent,1);
  assert.equal(result.coverageComplete,true);
  assert.equal(result.definitive,false);
  assert.equal(result.notFound[0].verification,'enumerated');
});
test('absència explícita es distingeix de no trobada', () => {
  const a = snapshot([u('1'),u('2')],2);
  const b = snapshot([u('2')],1);
  const result = reconcile(a,b,new Map([['1','absent']]));
  assert.equal(result.confirmedAbsent,1);
  assert.equal(result.definitive,true);
  assert.equal(result.notFound[0].verification,'absent');
});
test('llista origen incompleta mai és resultat global complet', () => {
  const a = snapshot([u('1')],2);
  const b = snapshot([u('2')],1);
  assert.equal(reconcile(a,b,new Map([['1','absent']])).definitive,false);
});
test('comparació antiga conserva l’esquema històric', () => {
  assert.equal(compare(snapshot([u('1')],1),snapshot([],0)).notFound.length,1);
});
test('CSV neutralitza fórmules', () => {
  for (const input of ['=SUM(1,2)','+CMD','-1+2','@SUM(A1)','  =HYPERLINK("x")'])
    assert.equal(csvSafe(input).startsWith("'"),true);
  assert.equal(csvSafe('Anna'), 'Anna');
});


test('amb grup 2 incomplet, les absències sense resposta continuen no verificables', () => {
  const a = snapshot([u('1'),u('2')],2);
  const b = snapshot([u('2')],2);
  const result = reconcile(a,b,new Map());
  assert.equal(result.unverified,1);
  assert.equal(result.enumeratedAbsent,0);
  assert.equal(result.coverageComplete,false);
  assert.equal(result.notFound[0].verification,'unknown');
});
test('els errors sense permisos no són prova de no pertinença', () => {
  assert.equal(errorCategory({errorMessage:'CHAT_ADMIN_REQUIRED'}),'CHAT_ADMIN_REQUIRED');
  assert.equal(errorCategory({errorMessage:'USER_NOT_PARTICIPANT'}),'USER_NOT_PARTICIPANT');
  assert.equal(shouldStopChecking('CHAT_ADMIN_REQUIRED'),true);
  assert.equal(shouldStopChecking('USER_NOT_PARTICIPANT'),false);
});
