import { describe, it, expect } from 'vitest';
import { authenticator } from 'otplib';
import * as totp from '../src/utils/totp.js';

describe('2FA · utils/totp', () => {
  it('genera un secreto y verifica su token actual', () => {
    const secret = totp.generarSecreto();
    expect(typeof secret).toBe('string');
    const token = authenticator.generate(secret);
    expect(totp.verificarToken(token, secret)).toBe(true);
  });

  it('acepta el token con espacios', () => {
    const secret = totp.generarSecreto();
    const token = authenticator.generate(secret);
    const espaciado = `${token.slice(0, 3)} ${token.slice(3)}`;
    expect(totp.verificarToken(espaciado, secret)).toBe(true);
  });

  it('rechaza un token que no corresponde', () => {
    const secret = totp.generarSecreto();
    expect(totp.verificarToken('000000', secret) && totp.verificarToken('111111', secret)).toBe(false);
  });

  it('construye una URL otpauth con el emisor', () => {
    const secret = totp.generarSecreto();
    const uri = totp.construirOtpauth('admin', secret);
    expect(uri).toContain('otpauth://totp/');
    expect(uri).toContain(encodeURIComponent(totp.SERVICIO));
    expect(uri).toContain(secret);
  });

  it('genera un QR como data URL PNG', async () => {
    const uri = totp.construirOtpauth('admin', totp.generarSecreto());
    const qr = await totp.qrDataUrl(uri);
    expect(qr).toMatch(/^data:image\/png;base64,/);
  });

  it('genera N códigos de recuperación con formato XXXXX-XXXXX', () => {
    const codigos = totp.generarCodigosRecuperacion(10);
    expect(codigos.length).toBe(10);
    codigos.forEach((c) => expect(c).toMatch(/^[0-9A-F]{5}-[0-9A-F]{5}$/));
    // Deben ser distintos entre sí.
    expect(new Set(codigos).size).toBe(10);
  });

  it('normaliza un código quitando guiones y espacios y en mayúsculas', () => {
    expect(totp.normalizarCodigo(' abcde-12345 ')).toBe('ABCDE12345');
  });
});
