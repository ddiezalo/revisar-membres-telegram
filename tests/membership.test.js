'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {groupSnapshot, participantState, reconcile, compare, csvSafe, roleFromUser, personFromUser} = require('../src/membership.cjs');
const {currentRestrictedUsers} = require('../src/restricted.cjs');
const {errorCategory, shouldStopChecking} = require('../src/verification.cjs');
const u = (id, name = id, bot = false) => ({id, firstName:name, bot});
const snapshot = (users,count) => groupSnapshot(users,count,{finished:true});

test('deduplica IDs grans i conserva bots', () => {
  const result = snapshot([u('900719925474099313','A'),u('900719925474099313','A'),u('2','Bot',true)],2);
  assert.equal(result.membersFound,2);
  assert.equal(result.members[1].role,'Bot');
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

test('conserva @usuari, deixa en blanc si no existeix, i diferencia noms duplicats', () => {
  const members=snapshot([
    {id:'111',firstName:'Alex',username:'alex_a',participant:{className:'ChannelParticipant'}},
    {id:'222',firstName:'Alex',username:'alex_b',participant:{className:'ChannelParticipant'}},
    {id:'333',firstName:'Alex',participant:{className:'ChannelParticipant'}}
  ],3);
  assert.deepEqual(members.members.map(m=>m.username),['alex_a','alex_b','']);
  assert.deepEqual(members.members.map(m=>m.role),['','','']);
  assert.equal(reconcile(members,snapshot([],0)).notFound.length,3);
});

test('identifica administradors, creadors i bots segons el participant del grup', () => {
  for (const type of ['ChannelParticipantAdmin','ChannelParticipantCreator',
    'ChatParticipantAdmin','ChatParticipantCreator']) {
    assert.equal(roleFromUser({participant:{className:type}}),'Admin');
    assert.equal(roleFromUser({participant:{className:type},bot:true}),'Admin · Bot');
  }
  assert.equal(roleFromUser({participant:{className:'ChannelParticipant'},bot:true}),'Bot');
  assert.equal(roleFromUser({participant:{className:'ChatParticipant'},bot:false}),'');
  assert.equal(roleFromUser({bot:false}),'');
  assert.equal(personFromUser({id:'123',username:'un_usuari'}).username,'un_usuari');
});
