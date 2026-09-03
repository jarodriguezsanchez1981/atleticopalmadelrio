import { describe, it, expect } from 'vitest';
import authorize from '../src/middlewares/role.middleware.js';

function mockRes() {
  return {
    _status: 200,
    _json: null,
    status(c) { this._status = c; return this; },
    json(p) { this._json = p; return this; }
  };
}

describe('Middleware authorize', () => {
  it('permite el acceso si el usuario tiene una sección autorizada', () => {
    const mw = authorize('jugadores', 'entrenadores');
    const req = { user: { secciones: ['entrenadores'] } };
    let paso = false;
    mw(req, mockRes(), () => { paso = true; });
    expect(paso).toBe(true);
  });

  it('bloquea el acceso si el usuario no tiene ninguna sección autorizada', () => {
    const mw = authorize('administracion');
    const req = { user: { secciones: ['calendario'] } };
    const res = mockRes();
    mw(req, res, () => {});
    expect(res._status).toBe(403);
    expect(res._json.message).toBe('No tienes permisos para acceder a este recurso.');
  });

  it('devuelve 401 si no hay usuario autenticado', () => {
    const mw = authorize('calendario');
    const res = mockRes();
    mw({}, res, () => {});
    expect(res._status).toBe(401);
  });

  it('funciona con secciones vacías', () => {
    const mw = authorize('calendario');
    const req = { user: { secciones: [] } };
    const res = mockRes();
    mw(req, res, () => {});
    expect(res._status).toBe(403);
  });

  it('permite acceso si tiene una de varias secciones requeridas', () => {
    const mw = authorize('jugadores', 'entrenadores', 'equipos');
    const req = { user: { secciones: ['equipos'] } };
    let paso = false;
    mw(req, mockRes(), () => { paso = true; });
    expect(paso).toBe(true);
  });

  it('bloquea si tiene secciones pero ninguna coincide', () => {
    const mw = authorize('administracion');
    const req = { user: { secciones: ['calendario', 'jugadores'] } };
    const res = mockRes();
    mw(req, res, () => {});
    expect(res._status).toBe(403);
  });

  it('permite con secciones duplicadas en el token', () => {
    const mw = authorize('calendario');
    const req = { user: { secciones: ['calendario', 'calendario'] } };
    let paso = false;
    mw(req, mockRes(), () => { paso = true; });
    expect(paso).toBe(true);
  });

  it('devuelve 401 si req.user es undefined', () => {
    const mw = authorize('calendario');
    const res = mockRes();
    mw({}, res, () => {});
    expect(res._status).toBe(401);
    expect(res._json.message).toBe('No autenticado.');
  });

  it('bloquea si user.secciones es undefined', () => {
    const mw = authorize('calendario');
    const req = { user: {} };
    const res = mockRes();
    mw(req, res, () => {});
    expect(res._status).toBe(403);
  });

  it('permite si tiene todas las secciones requeridas', () => {
    const mw = authorize('calendario', 'jugadores');
    const req = { user: { secciones: ['calendario', 'jugadores', 'equipos'] } };
    let paso = false;
    mw(req, mockRes(), () => { paso = true; });
    expect(paso).toBe(true);
  });

  it('funciona con una sola sección autorizada', () => {
    const mw = authorize('sanciones');
    const req = { user: { secciones: ['sanciones'] } };
    let paso = false;
    mw(req, mockRes(), () => { paso = true; });
    expect(paso).toBe(true);
  });
});
