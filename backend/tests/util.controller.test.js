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

  it('detecta IPv6 entre corchetes e IPv4 escritas como IPv6 (metadatos de AWS)', () => {
    for (const url of ['http://[::1]:3000/', 'http://[::ffff:127.0.0.1]/', 'http://[::ffff:a9fe:a9fe]/', 'http://[fd00::1]/', 'http://100.100.1.1/', 'http://0x7f.1/', 'http://2130706433/']) {
      expect(esDireccionPrivada(new URL(url).hostname), url).toBe(true);
    }
    expect(esDireccionPrivada('[2606:4700:4700::1111]')).toBe(false);
  });

  it('descargar rechaza una IPv4 escrita como IPv6', async () => {
    await expect(descargar('http://[::ffff:a9fe:a9fe]/latest/meta-data/')).rejects.toThrow(/internas/);
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
