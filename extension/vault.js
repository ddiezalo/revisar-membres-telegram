'use strict';
// Xifrat local per a contextos privilegiats de l'extensió (no per a content scripts).
// El PIN no es desa. Un PIN de 4 dígits NO resisteix un atac exhaustiu fora de línia.
(function (root) {
  const KEY = 'secureVault';
  const LEGACY = ['mtprotoAuth', 'history'];
  const ITERATIONS = 600000;
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  const validPin = pin => typeof pin === 'string' && /^\d{4}$/.test(pin);
  const bytes = len => crypto.getRandomValues(new Uint8Array(len));
  const b64 = input => {
    const arr = new Uint8Array(input);
    let s = '';
    for (const byte of arr) s += String.fromCharCode(byte);
    return btoa(s);
  };
  const unb64 = s => Uint8Array.from(atob(s), char => char.charCodeAt(0));

  async function derive(pin, salt, iterations) {
    const material = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      {name: 'PBKDF2', hash: 'SHA-256', salt, iterations},
      material, {name: 'AES-GCM', length: 256}, false, ['encrypt', 'decrypt']
    );
  }
  async function seal(data, key, salt, iterations, id) {
    const iv = bytes(12);
    const ciphertext = await crypto.subtle.encrypt(
      {name: 'AES-GCM', iv}, key, enc.encode(JSON.stringify(data))
    );
    return {version: 1, id, iterations, salt: b64(salt), iv: b64(iv), ciphertext: b64(ciphertext)};
  }
  async function open(envelope, key) {
    if (!envelope || envelope.version !== 1 || typeof envelope.ciphertext !== 'string') {
      throw new Error('Format de dades xifrades desconegut.');
    }
    try {
      const clear = await crypto.subtle.decrypt(
        {name: 'AES-GCM', iv: unb64(envelope.iv)}, key, unb64(envelope.ciphertext)
      );
      const document = JSON.parse(dec.decode(clear));
      if (!document || typeof document !== 'object' || !Array.isArray(document.history)) {
        throw new Error('Format de dades desades incorrecte.');
      }
      return document;
    } catch {
      throw new Error('PIN incorrecte o dades xifrades malmeses.');
    }
  }
  const generateId = () => b64(bytes(16));

  function createStore(storage) {
    let key = null;
    let id = null;
    // Evitem sobreescriure canvis en diverses finestres del mateix perfil.
    const exclusive = task => globalThis.navigator?.locks?.request
      ? globalThis.navigator.locks.request('tmc-vault-write', task)
      : task();

    async function envelope() {
      const data = await storage.get(KEY);
      return data[KEY] || null;
    }
    async function read() {
      if (!key) throw new Error('Cal desbloquejar les dades amb el PIN.');
      const current = await envelope();
      if (!current || current.id !== id) {
        throw new Error('El PIN o les dades han canviat en una altra finestra. Torna a obrir-la.');
      }
      return open(current, key);
    }

    return {
      async isSetup() { return Boolean(await envelope()); },
      async setup(pin) { return exclusive(async () => {
        if (!validPin(pin)) throw new Error('El PIN ha de contenir exactament 4 dígits.');
        if (await envelope()) throw new Error('Ja hi ha dades xifrades. Introdueix el PIN existent.');
        const legacy = await storage.get(LEGACY);
        const data = {
          auth: legacy.mtprotoAuth?.session ? legacy.mtprotoAuth : null,
          history: Array.isArray(legacy.history) ? legacy.history : []
        };
        const salt = bytes(16);
        const nextKey = await derive(pin, salt, ITERATIONS);
        const nextId = generateId();
        const sealed = await seal(data, nextKey, salt, ITERATIONS, nextId);
        await storage.set({[KEY]: sealed});
        key = nextKey;
        id = nextId;
        // No s'esborren els originals fins que el vault s'ha escrit correctament.
        await storage.remove(LEGACY);
      }); },
      async unlock(pin) {
        if (!validPin(pin)) throw new Error('Introdueix un PIN de 4 dígits.');
        const current = await envelope();
        if (!current) throw new Error('Encara no s’ha configurat el PIN.');
        if (current.version !== 1 || !Number.isInteger(current.iterations) ||
            current.iterations < 100000 || current.iterations > 2000000) {
          throw new Error('Format de dades xifrades desconegut.');
        }
        const proposedKey = await derive(pin, unb64(current.salt), current.iterations);
        await open(current, proposedKey);
        key = proposedKey;
        id = current.id;
        // Netegem un possible residu d'una migració interrompuda.
        await storage.remove(LEGACY);
      },
      async read() { return read(); },
      async update(transform) { return exclusive(async () => {
        const data = await read();
        const updated = await transform(data);
        if (!updated || !Array.isArray(updated.history)) {
          throw new Error('Les dades desades no tenen un format vàlid.');
        }
        // Revalidem la identitat del vault just abans d'escriure.
        const current = await envelope();
        if (!current || current.id !== id) throw new Error('El PIN ha canviat en una altra finestra.');
        const sealed = await seal(updated, key, unb64(current.salt), current.iterations, id);
        await storage.set({[KEY]:sealed});
        return updated;
      }); },
      async changePin(oldPin, newPin) { return exclusive(async () => {
        if (!validPin(newPin)) throw new Error('El PIN nou ha de contenir 4 dígits.');
        const current = await envelope();
        if (!current || current.id !== id) throw new Error('El vault s’ha modificat en una altra finestra.');
        const oldKey = await derive(oldPin, unb64(current.salt), current.iterations);
        const data = await open(current, oldKey);
        const salt = bytes(16);
        const newKey = await derive(newPin, salt, ITERATIONS);
        const newId = generateId();
        await storage.set({[KEY]:await seal(data, newKey, salt, ITERATIONS, newId)});
        key = newKey;
        id = newId;
        await storage.remove(LEGACY);
      }); },
      async reset() { return exclusive(async () => {
        await storage.remove([KEY, ...LEGACY]);
        key = null;
        id = null;
      }); },
      lock() { key = null; id = null; }
    };
  }

  root.TmcVault = Object.freeze({createStore, validPin});
})(globalThis);
