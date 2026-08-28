import { describe, it, expect } from 'vitest';
import requireEditar from '../src/middlewares/requireEditar.js';

describe('Permisos · requireEditar', () => {
  function ejecutar(user) {
    const req = { user };
    const res = {
      _status: 200,
      _json: null,
      status(code) { this._status = code; return this; },
      json(payload) { this._json = payload; return this; }
    };
    let nextLlamado = false;
    const next = () => { nextLlamado = true; };
    requireEditar()(req, res, next);
    return { res, nextLlamado };
  }

  it('permite el paso al rol "editar"', () => {
    const { nextLlamado } = ejecutar({ rol: 'editar' });
    expect(nextLlamado).toBe(true);
  });

  it('bloquea al rol "leer" con 403', () => {
    const { res, nextLlamado } = ejecutar({ rol: 'leer' });
    expect(nextLlamado).toBe(false);
    expect(res._status).toBe(403);
    expect(res._json.message).toBe('No tienes permisos para realizar esta acción.');
  });

  it('bloquea sin usuario autenticado con 401', () => {
    const { res, nextLlamado } = ejecutar(undefined);
    expect(nextLlamado).toBe(false);
    expect(res._status).toBe(401);
  });

  it('acepta token antiguo con roles: ["write"] (compatibilidad)', () => {
    const { nextLlamado } = ejecutar({ roles: ['write'] });
    expect(nextLlamado).toBe(true);
  });

  it('bloquea token antiguo con roles: ["read"]', () => {
    const { res, nextLlamado } = ejecutar({ roles: ['read'] });
    expect(nextLlamado).toBe(false);
    expect(res._status).toBe(403);
  });

  it('bloquea sin rol ni roles', () => {
    const { res, nextLlamado } = ejecutar({ secciones: ['calendario'] });
    expect(nextLlamado).toBe(false);
    expect(res._status).toBe(403);
  });
});
