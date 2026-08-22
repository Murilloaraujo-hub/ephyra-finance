/**
 * Ephyra Finance — helpers de segurança para a aplicação local.
 *
 * As senhas são derivadas com PBKDF2 e um salt aleatório antes de serem
 * armazenadas no IndexedDB. Isso protege melhor os dados locais, mas não
 * transforma a aplicação estática em um sistema de autenticação de servidor.
 */
const EphyraSecurity = (() => {
  'use strict';

  const ITERATIONS = 210000;
  const encoder = new TextEncoder();

  function bytesToBase64(bytes) {
    let binary = '';
    bytes.forEach(byte => { binary += String.fromCharCode(byte); });
    return btoa(binary);
  }

  function base64ToBytes(value) {
    const binary = atob(value);
    return Uint8Array.from(binary, char => char.charCodeAt(0));
  }

  async function derive(password, salt, iterations) {
    if (!globalThis.crypto?.subtle) {
      throw new Error('Este navegador não oferece a proteção de senha necessária.');
    }

    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(String(password)),
      'PBKDF2',
      false,
      ['deriveBits']
    );

    const bits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        hash: 'SHA-256',
        salt,
        iterations
      },
      key,
      256
    );

    return new Uint8Array(bits);
  }

  async function hashPassword(password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const hash = await derive(password, salt, ITERATIONS);
    return {
      algorithm: 'PBKDF2-SHA256',
      iterations: ITERATIONS,
      salt: bytesToBase64(salt),
      hash: bytesToBase64(hash)
    };
  }

  async function verifyPassword(password, stored) {
    // Compatibilidade temporária com contas criadas pela versão antiga.
    if (typeof stored === 'string') return password === stored;
    if (!stored?.salt || !stored?.hash) return false;

    const iterations = Number(stored.iterations) || ITERATIONS;
    const actual = await derive(password, base64ToBytes(stored.salt), iterations);
    const expected = base64ToBytes(stored.hash);

    if (actual.length !== expected.length) return false;
    let difference = 0;
    for (let index = 0; index < actual.length; index++) {
      difference |= actual[index] ^ expected[index];
    }
    return difference === 0;
  }

  return { hashPassword, verifyPassword };
})();

if (typeof window !== 'undefined') window.EphyraSecurity = EphyraSecurity;
