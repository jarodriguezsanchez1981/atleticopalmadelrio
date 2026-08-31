import { describe, it, expect } from 'vitest';
import { esDireccionPrivada, descargar } from '../src/controllers/util.controller.js';

describe('Utilidad util.controller · protección SSRF', () => {
  it('detecta IPs privadas', () => {
    expect(esDireccionPrivada('127.0.0.1')).toBe(true);
    expect(esDireccionPrivada('10.0.0.1')).toBe(true);
    expect(esDireccionPrivada('192.168.1.1')).toBe(true);
    expect(esDireccionPrivada('172.16.0.1')).toBe(true);
    expect(esDireccionPrivada('::1')).toBe(true);
    expect(esDireccionPrivada('fe80::1')).toBe(true);
  });

  it('detecta hostnames internos', () => {
    expect(esDireccionPrivada('localhost')).toBe(true);
    expect(esDireccionPrivada('db')).toBe(true);
    expect(esDireccionPrivada('mysql')).toBe(true);
    expect(esDireccionPrivada('backend')).toBe(true);
  });

  it('permite direcciones públicas', () => {
    expect(esDireccionPrivada('8.8.8.8')).toBe(false);
    expect(esDireccionPrivada('example.com')).toBe(false);
    expect(esDireccionPrivada('wikipedia.org')).toBe(false);
  });

  it('descargar rechaza URLs con protocolo no http/https', async () => {
    await expect(descargar('ftp://example.com/file')).rejects.toThrow('Solo se admiten URLs http/https');
  });

  it('descargar rechaza IPs privadas', async () => {
    await expect(descargar('http://127.0.0.1/image.png')).rejects.toThrow('Acceso denegado a direcciones internas');
  });

  it('descargar rechaza hostnames privados', async () => {
    await expect(descargar('http://localhost/image.png')).rejects.toThrow('Acceso denegado a direcciones internas');
  });

  it('descargar rechaza URLs inválidas', async () => {
    await expect(descargar('no-es-una-url')).rejects.toThrow('URL inválida');
  });
});
