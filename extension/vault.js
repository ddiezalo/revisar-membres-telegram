'use strict';
// Les credencials MTProto es desen xifrades al disc. La clau derivada del PIN
// només es guarda temporalment a chrome.storage.session (contextos de confiança).
// Un PIN de quatre dígits NO resisteix un atac exhaustiu fora de línia.
(function (root) {
  const KEY = 'secureVault';
  const SESSION_KEY = 'tmcUnlockedKey';
  const LEGACY = ['mtprotoAuth', 'history'];
  const ITERATIONS = 600000;
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const validPin = pin => typeof pin === 'string' && /^\d{4}$/.test(pin);
  const bytes = count => crypto.getRandomValues(new Uint8Array(count));
  const b64 = input => {
    let text = '';
    for (const byte of new Uint8Array(input)) text += String.fromCharCode(byte);
    return btoa(text);
  };
  const unb64 = value => Uint8Array.from(atob(value), char => char.charCodeAt(0));
  const freshId = () => b64(bytes(16));
  const importKey = raw => crypto.subtle.importKey('raw', raw, {name: 'AES-GCM'}, false, ['encrypt','decrypt']);

  async function derive(pin, salt, iterations) {
    const material = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']);
    const raw = new Uint8Array(await crypto.subtle.deriveBits(
      {name: 'PBKDF2', hash: 'SHA-256', salt, iterations}, material, 256
    ));
    return {raw, key: await importKey(raw)};
  }
  async function seal(data, key, salt, iterations, id) {
    const iv = bytes(12);
    const ciphertext = await crypto.subtle.encrypt(
      {name: 'AES-GCM', iv}, key, enc.encode(JSON.stringify({auth: data.auth || null}))
    );
    return {version: 2, id, iterations, salt: b64(salt), iv: b64(iv), ciphertext: b64(ciphertext)};
  }
  async function open(envelope, key) {
    if (!envelope || ![1,2].includes(envelope.version) || typeof envelope.ciphertext !== 'string')
      throw new Error('Format de dades xifrades desconegut.');
    try {
      const clear = await crypto.subtle.decrypt(
        {name: 'AES-GCM', iv: unb64(envelope.iv)}, key, unb64(envelope.ciphertext)
      );
      const data = JSON.parse(dec.decode(clear));
      if (!data || typeof data !== 'object' || !Object.prototype.hasOwnProperty.call(data,'auth') ||
          (envelope.version === 1 && !Array.isArray(data.history)))
        throw new Error('Dades desades incorrectes.');
      // MAI retornem l'historial, ni tan sols en migrar un vault v1.
      return {auth: data.auth || null};
    } catch {
      throw new Error('PIN incorrecte o dades xifrades malmeses.');
    }
  }
  function checkEnvelope(current) {
    if (!current || ![1,2].includes(current.version) || !Number.isInteger(current.iterations) ||
        current.iterations < 100000 || current.iterations > 2000000 ||
        typeof current.id !== 'string' || typeof current.salt !== 'string' ||
        typeof current.iv !== 'string' || typeof current.ciphertext !== 'string')
      throw new Error('Format de dades xifrades desconegut.');
  }

  function createStore(storage, session = chrome.storage.session) {
    let key = null;
    let id = null;
    const exclusive = action => globalThis.navigator?.locks?.request
      ? globalThis.navigator.locks.request('tmc-vault-write', action) : action();
    async function envelope() { return (await storage.get(KEY))[KEY] || null; }
    async function remember(currentId, raw) {
      await session.set({[SESSION_KEY]: {id: currentId, key: b64(raw)}});
    }
    async function read() {
      if (!key) throw new Error('Cal desbloquejar les credencials amb el PIN.');
      const current = await envelope();
      if (!current || current.id !== id || current.version !== 2)
        throw new Error('Les credencials han canviat en una altra finestra. Torna a obrir-la.');
      return open(current, key);
    }
    return {
      async isSetup() { return Boolean(await envelope()); },
      async setup(pin) { return exclusive(async () => {
        if (!validPin(pin)) throw new Error('El PIN ha de contenir exactament 4 dígits.');
        if (await envelope()) throw new Error('Ja hi ha credencials xifrades. Introdueix el PIN existent.');
        const old = await storage.get(LEGACY);
        const data = {auth: old.mtprotoAuth?.session ? old.mtprotoAuth : null};
        const salt = bytes(16);
        const derived = await derive(pin, salt, ITERATIONS);
        const nextId = freshId();
        await storage.set({[KEY]: await seal(data, derived.key, salt, ITERATIONS, nextId)});
        key = derived.key; id = nextId;
        await storage.remove(LEGACY);
        await remember(nextId, derived.raw);
      }); },
      async unlock(pin) { return exclusive(async () => {
        if (!validPin(pin)) throw new Error('Introdueix un PIN de 4 dígits.');
        const current = await envelope();
        checkEnvelope(current);
        const derived = await derive(pin, unb64(current.salt), current.iterations);
        const data = await open(current, derived.key);
        if (current.version === 1) {
          // Migració v0.3.3 → v0.3.4: conserva auth i DESCARTA definitivament history.
          const nextId = freshId();
          await storage.set({[KEY]:await seal(data, derived.key, unb64(current.salt), current.iterations, nextId)});
          id = nextId;
        } else id = current.id;
        key = derived.key;
        await storage.remove(LEGACY);
        await remember(id, derived.raw);
      }); },
      async resume() {
        const saved = (await session.get(SESSION_KEY))[SESSION_KEY];
        const current = await envelope();
        if (!saved || !current || current.version !== 2 || current.id !== saved.id) return false;
        try {
          const raw = unb64(saved.key);
          if (raw.length !== 32) return false;
          const candidate = await importKey(raw);
          await open(current, candidate);
          // Comprovar que cap altra finestra no ha modificat el vault durant el resume.
          if ((await envelope())?.id !== current.id) return false;
          key = candidate; id = current.id;
          return true;
        } catch { return false; }
      },
      async read() { return read(); },
      async update(transform) { return exclusive(async () => {
        const data = await read();
        const updated = await transform(data);
        if (!updated || !Object.prototype.hasOwnProperty.call(updated,'auth'))
          throw new Error('Format de credencials incorrecte.');
        const current = await envelope();
        if (!current || current.id !== id || current.version !== 2)
          throw new Error('El PIN ha canviat en una altra finestra.');
        await storage.set({[KEY]: await seal({auth:updated.auth}, key, unb64(current.salt), current.iterations, id)});
        return {auth: updated.auth || null};
      }); },
      async changePin(oldPin, newPin) { return exclusive(async () => {
        if (!validPin(newPin)) throw new Error('El PIN nou ha de tenir 4 dígits.');
        const current = await envelope();
        if (!current || current.version !== 2 || current.id !== id)
          throw new Error('Les credencials han canviat en una altra finestra.');
        const oldKey = await derive(oldPin, unb64(current.salt), current.iterations);
        const data = await open(current, oldKey.key);
        const salt = bytes(16);
        const next = await derive(newPin, salt, ITERATIONS);
        const nextId = freshId();
        await storage.set({[KEY]: await seal(data, next.key, salt, ITERATIONS, nextId)});
        key = next.key; id = nextId;
        await remember(nextId, next.raw);
      }); },
      async reset() { return exclusive(async () => {
        await storage.remove([KEY, ...LEGACY]);
        await session.remove(SESSION_KEY);
        key = null; id = null;
      }); },
      async lockSession() {
        await session.remove(SESSION_KEY);
        key = null; id = null;
      },
      lock() { key = null; id = null; }
    };
  }
  root.TmcVault = Object.freeze({createStore, validPin});
})(globalThis);
