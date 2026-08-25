import { describe, it, expect, beforeEach } from 'vitest';

describe('Utilidad aesCrypto', () => {
  const VALID_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  beforeEach(() => {
    process.env.AES_SECRET_KEY = VALID_KEY;
  });

  async function loadCrypto() {
    // Volvemos a importar para forzar lectura del entorno actual
    return import('../src/utils/aesCrypto.js');
  }

  it('cifra y descifra un texto correctamente', async () => {
    const { encrypt, decrypt } = await loadCrypto();
    const original = '12345678Z';
    const cipher = encrypt(original);
    expect(cipher).not.toBe(original);
    expect(cipher.split(':')).toHaveLength(3);
    expect(decrypt(cipher)).toBe(original);
  });

  it('produce textos cifrados distintos para el mismo valor (IV aleatorio)', async () => {
    const { encrypt } = await loadCrypto();
    const a = encrypt('mismo');
    const b = encrypt('mismo');
    expect(a).not.toBe(b);
  });

  it('falla si la clave no es hexadecimal válido', async () => {
    process.env.AES_SECRET_KEY = 'no-es-hex-de-64-chars-0123456789abcdef0123456789abcd';
    const { encrypt } = await loadCrypto();
    expect(() => encrypt('x')).toThrow('AES_SECRET_KEY debe ser una cadena hexadecimal de 64 caracteres');
  });

  it('falla si la clave no tiene 64 caracteres', async () => {
    process.env.AES_SECRET_KEY = 'corta';
    const { encrypt } = await loadCrypto();
    expect(() => encrypt('x')).toThrow('AES_SECRET_KEY debe ser una cadena hexadecimal de 64 caracteres');
  });

  it('lanza error al descifrar un payload alterado', async () => {
    const { encrypt, decrypt } = await loadCrypto();
    const cipher = encrypt('secreto');
    const parts = cipher.split(':');
    // Alteramos un carácter en medio del ciphertext para romper la integridad
    const data = parts[2];
    const pos = Math.floor(data.length / 2);
    const changed = data[pos] === 'A' ? 'B' : 'A';
    parts[2] = data.slice(0, pos) + changed + data.slice(pos + 1);
    const altered = parts.join(':');
    expect(() => decrypt(altered)).toThrow();
  });

  it('hashForLookup es determinista e insensible a mayúsculas/espacios', async () => {
    const { hashForLookup } = await loadCrypto();
    expect(hashForLookup('12345678Z')).toBe(hashForLookup(' 12345678z '));
    expect(hashForLookup('12345678Z')).not.toBe(hashForLookup('12345678A'));
    expect(hashForLookup('12345678Z')).toHaveLength(64);
  });
});
