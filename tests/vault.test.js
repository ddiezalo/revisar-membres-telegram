'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {webcrypto} = require('node:crypto');

const code = fs.readFileSync(require.resolve('../extension/vault.js'), 'utf8');
const context = vm.createContext({
  crypto: webcrypto,
  TextEncoder, TextDecoder, Uint8Array, btoa, atob
});
vm.runInContext(code, context);
const {createStore, validPin} = context.TmcVault;

function storage(initial = {}) {
  const data = {...initial};
  return {
    data,
    async get(keys) {
      const fields = typeof keys === 'string' ? [keys] :
        Array.isArray(keys) ? keys : Object.keys(keys);
      return Object.fromEntries(fields.map(key => [key,
        Object.prototype.hasOwnProperty.call(data,key) ? data[key] :
        (typeof keys === 'object' && !Array.isArray(keys) ? keys[key] : undefined)]));
    },
    async set(obj) {Object.assign(data,obj);},
    async remove(keys) {
      for(const key of (Array.isArray(keys) ? keys : [keys])) delete data[key];
    }
  };
}

test('només accepta quatre dígits, incloent zeros inicials', () => {
  assert.equal(validPin('0042'),true);
  for(const pin of ['42','10000','abcd','1 23',42]) assert.equal(validPin(pin),false);
});

test('migració conserva historial i sessió, i elimina les dades en text pla', async () => {
  const local = storage({
    mtprotoAuth:{apiId:123,apiHash:'sensitivehash',session:'SECRET-STRING-SESSION'},
    history:[{id:'one',notFound:[{name:'Joana'}]}]
  });
  const vault = createStore(local);
  await vault.setup('0042');
  assert.equal('mtprotoAuth' in local.data,false);
  assert.equal('history' in local.data,false);
  assert.ok(local.data.secureVault.ciphertext);
  const serialized=JSON.stringify(local.data);
  for(const secret of ['SECRET-STRING-SESSION','sensitivehash','Joana'])
    assert.equal(serialized.includes(secret),false);
  const copy = createStore(local);
  await assert.rejects(copy.unlock('0000'),/PIN incorrecte/);
  await copy.unlock('0042');
  assert.equal((await copy.read()).auth.apiId,123);
  assert.equal((await copy.read()).history[0].notFound[0].name,'Joana');
});

test('l’historial es modifica i es desa exclusivament xifrat', async () => {
  const local=storage();
  const vault=createStore(local);
  await vault.setup('1234');
  await vault.update(data => ({...data, history:[...data.history,{id:'h',name:'Usuària'}]}));
  assert.equal(JSON.stringify(local.data).includes('Usuària'),false);
  const reader=createStore(local);
  await reader.unlock('1234');
  assert.equal((await reader.read()).history.length,1);
});

test('el canvi de PIN invalida les altres finestres i l’antic PIN', async () => {
  const local=storage();
  const first=createStore(local);
  await first.setup('1111');
  const other=createStore(local);
  await other.unlock('1111');
  await first.changePin('1111','2222');
  await assert.rejects(other.read(),/altra finestra/);
  const next=createStore(local);
  await assert.rejects(next.unlock('1111'),/PIN incorrecte/);
  await next.unlock('2222');
  assert.deepEqual(JSON.parse(JSON.stringify(await next.read())),{auth:null,history:[]});
});

test('el restabliment esborra el vault i les dades antigues', async () => {
  const local=storage();
  const vault=createStore(local);
  await vault.setup('0000');
  await vault.reset();
  assert.equal(await vault.isSetup(),false);
  assert.deepEqual(Object.keys(local.data),[]);
});

test('un registre corrupte no es tracta com a historial buit', async () => {
  const local=storage();
  const vault=createStore(local);
  await vault.setup('4321');
  local.data.secureVault.ciphertext='AAAA';
  await assert.rejects(vault.read(),/PIN incorrecte/);
});
