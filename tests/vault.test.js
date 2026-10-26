'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {webcrypto} = require('node:crypto');

const code = fs.readFileSync(require.resolve('../extension/vault.js'), 'utf8');
const context = vm.createContext({
  crypto: webcrypto, TextEncoder, TextDecoder, Uint8Array, btoa, atob
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

async function legacyV1(pin, data) {
  const salt=webcrypto.getRandomValues(new Uint8Array(16));
  const iv=webcrypto.getRandomValues(new Uint8Array(12));
  const pass=await webcrypto.subtle.importKey('raw',new TextEncoder().encode(pin),'PBKDF2',false,['deriveKey']);
  const key=await webcrypto.subtle.deriveKey(
    {name:'PBKDF2',hash:'SHA-256',salt,iterations:600000},pass,
    {name:'AES-GCM',length:256},false,['encrypt']
  );
  const ciphertext=await webcrypto.subtle.encrypt(
    {name:'AES-GCM',iv},key,new TextEncoder().encode(JSON.stringify(data))
  );
  return {version:1,id:'legacy-id',iterations:600000,salt:Buffer.from(salt).toString('base64'),
    iv:Buffer.from(iv).toString('base64'),ciphertext:Buffer.from(ciphertext).toString('base64')};
}

test('només accepta quatre dígits, incloent-hi zeros inicials', () => {
  assert.equal(validPin('0042'),true);
  for(const pin of ['42','10000','abcd','1 23',42]) assert.equal(validPin(pin),false);
});

test('inicialitza només amb credencials xifrades i elimina historial i claus en text pla', async () => {
  const local=storage({
    mtprotoAuth:{apiId:123,apiHash:'sensitivehash',session:'SECRET-STRING-SESSION'},
    history:[{id:'one',notFound:[{name:'Joana'}]}]
  });
  const session=storage();
  const vault=createStore(local,session);
  await vault.setup('0042');
  assert.equal('mtprotoAuth' in local.data,false);
  assert.equal('history' in local.data,false);
  assert.ok(local.data.secureVault.ciphertext);
  assert.equal(local.data.secureVault.version,2);
  const serialized=JSON.stringify(local.data);
  for(const secret of ['SECRET-STRING-SESSION','sensitivehash','Joana'])
    assert.equal(serialized.includes(secret),false);
  assert.deepEqual(Object.keys(await vault.read()),['auth']);
  const copy=createStore(local,storage());
  await assert.rejects(copy.unlock('0000'),/PIN incorrecte/);
  await copy.unlock('0042');
  assert.equal((await copy.read()).auth.apiId,123);
});

test('la sessió de desbloqueig es comparteix sense PIN, però no es desen membres', async () => {
  const local=storage(); const session=storage();
  const first=createStore(local,session);
  await first.setup('1234');
  await first.update(data => ({...data, auth:{apiId:456,apiHash:'hash',session:'session'}}));
  const second=createStore(local,session);
  assert.equal(await second.resume(),true);
  assert.equal((await second.read()).auth.session,'session');
  const joined=JSON.stringify({local:local.data,session:session.data});
  assert.equal(joined.includes('session":"session'),false);
  assert.equal(joined.includes('apiHash":"hash'),false);
  const restarted=createStore(local,storage());
  assert.equal(await restarted.resume(),false);
  await assert.rejects(restarted.read(),/Cal desbloquejar/);
  await restarted.unlock('1234');
  assert.equal((await restarted.read()).auth.apiId,456);
});

test('migració d’un vault v1: preserva auth i elimina historial de forma permanent', async () => {
  const old = await legacyV1('0042',{
    auth:{apiId:123,apiHash:'HASH-SENSITIVE',session:'SESSION-SENSITIVE'},
    history:[{id:'one',notFound:[{id:'1111',name:'MEMBRE-SECRET'}]}]
  });
  const local=storage({secureVault:old,history:[{name:'OTHER-HISTORY'}]});
  const session=storage(); const next=createStore(local,session);
  await assert.rejects(next.unlock('2222'),/PIN incorrecte/);
  assert.equal(local.data.secureVault.version,1); // PIN incorrecte no causa pèrdua de dades.
  await next.unlock('0042');
  assert.equal(local.data.secureVault.version,2);
  assert.notEqual(local.data.secureVault.id,old.id);
  assert.deepEqual(Object.keys(await next.read()),['auth']);
  assert.equal((await next.read()).auth.session,'SESSION-SENSITIVE');
  assert.equal('history' in local.data,false);
  assert.equal(JSON.stringify(local.data).includes('MEMBRE-SECRET'),false);
  const after=createStore(local,storage());
  await after.unlock('0042');
  assert.equal((await after.read()).auth.apiId,123);
  assert.equal('history' in await after.read(),false);
});

test('update només emmagatzema credencials, mai historial encara que el transform el retorni', async () => {
  const local=storage(),session=storage(),vault=createStore(local,session);
  await vault.setup('1234');
  await vault.update(data=>({...data,auth:{session:'PRIVATE-SESSION'},history:[{name:'HISTORY-MEMBER'}]}));
  assert.equal(JSON.stringify(local.data).includes('HISTORY-MEMBER'),false);
  assert.equal(JSON.stringify(await vault.read()).includes('HISTORY-MEMBER'),false);
});

test('canvi de PIN invalida finestres antigues i actualitza el desbloqueig temporal',async () => {
  const local=storage(),session=storage();
  const first=createStore(local,session);await first.setup('1111');
  const second=createStore(local,session);assert.equal(await second.resume(),true);
  await first.changePin('1111','2222');
  await assert.rejects(second.read(),/altra finestra/);
  const fresh=createStore(local,session);
  assert.equal(await fresh.resume(),true);
  const newBrowser=createStore(local,storage());
  await assert.rejects(newBrowser.unlock('1111'),/PIN incorrecte/);
  await newBrowser.unlock('2222');
  assert.deepEqual(JSON.parse(JSON.stringify(await newBrowser.read())),{auth:null});
});

test('reset elimina el vault, les dades antigues i el desbloqueig temporal',async () => {
  const local=storage(),session=storage(),v=createStore(local,session);
  await v.setup('0000');await v.reset();
  assert.equal(await v.isSetup(),false);
  assert.deepEqual(Object.keys(local.data),[]);
  assert.deepEqual(Object.keys(session.data),[]);
});

test('un registre corrupte no es tracta com a dades buides',async () => {
  const local=storage(),session=storage(),v=createStore(local,session);
  await v.setup('4321');
  local.data.secureVault.ciphertext='AAAA';
  await assert.rejects(v.read(),/PIN incorrecte/);
  assert.equal(await createStore(local,session).resume(),false);
});
