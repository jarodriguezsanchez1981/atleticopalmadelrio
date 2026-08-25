import { describe, it, expect } from 'vitest';
import { isPasswordValid, hashPassword, verifyPassword, PASSWORD_REGEX } from '../src/utils/password.utils.js';

describe('Utilidades de contraseña', () => {
  it('acepta contraseñas seguras', () => {
    expect(isPasswordValid('Admin#2026')).toBe(true);
    expect(isPasswordValid('MyP@ssw0rd')).toBe(true);
  });

  it('rechaza contraseñas cortas', () => {
    expect(isPasswordValid('A1!')).toBe(false);
  });

  it('rechaza contraseñas sin mayúscula', () => {
    expect(isPasswordValid('admin#2026')).toBe(false);
  });

  it('rechaza contraseñas sin minúscula', () => {
    expect(isPasswordValid('ADMIN#2026')).toBe(false);
  });

  it('rechaza contraseñas sin número', () => {
    expect(isPasswordValid('Admin#abcd')).toBe(false);
  });

  it('rechaza contraseñas sin carácter especial', () => {
    expect(isPasswordValid('Admin20226')).toBe(false);
  });

  it('genera hashes distintos para la misma contraseña (salt aleatorio)', async () => {
    const h1 = await hashPassword('Admin#2026');
    const h2 = await hashPassword('Admin#2026');
    expect(h1).not.toBe(h2);
  });

  it('verifica correctamente una contraseña contra su hash', async () => {
    const hash = await hashPassword('Admin#2026');
    expect(await verifyPassword('Admin#2026', hash)).toBe(true);
    expect(await verifyPassword('Otra#2026', hash)).toBe(false);
  });

  it('la regex no permite espacios en blanco', () => {
    expect(PASSWORD_REGEX.test('Admin 2026!')).toBe(false);
  });
});
