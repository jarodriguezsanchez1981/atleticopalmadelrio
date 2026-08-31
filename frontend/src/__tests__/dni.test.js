import { describe, it, expect } from 'vitest';
import { validarDNI } from '../utils/dni.js';

describe('Utilidad validarDNI', () => {
  it('acepta DNIs válidos', () => {
    expect(validarDNI('12345678Z')).toBe(true);
    expect(validarDNI('12345678z')).toBe(true);
    expect(validarDNI(' 12345678Z ')).toBe(true);
  });

  it('acepta NIEs válidos', () => {
    expect(validarDNI('X1234567L')).toBe(true);
    expect(validarDNI('Y1234567X')).toBe(true);
    expect(validarDNI('Z1234567R')).toBe(true);
  });

  it('rechaza letra incorrecta', () => {
    expect(validarDNI('12345678A')).toBe(false);
  });

  it('rechaza formatos no válidos', () => {
    expect(validarDNI('1234567A')).toBe(false);
    expect(validarDNI('12345678')).toBe(false);
    expect(validarDNI('')).toBe(false);
    expect(validarDNI(null)).toBe(false);
  });
});
