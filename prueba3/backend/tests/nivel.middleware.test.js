import { describe, it, expect } from 'vitest';
import requireNivel from '../src/middlewares/nivel.middleware.js';

function mockRes() {
  return {
    _status: 200,
    _json: null,
    status(c) { this._status = c; return this; },
    json(p) { this._json = p; this._sent = true; return this; }
  };
}

describe('Middleware requireNivel', () => {
  it('permite mutar a un usuario con rol write', () => {
    const mw = requireNivel();
    const req = { user: { roles: ['write'] } };
    let paso = false;
    mw(req, mockRes(), () => { paso = true; });
    expect(paso).toBe(true);
  });

  it('bloquea a un usuario con solo read', () => {
    const mw = requireNivel();
    const req = { user: { roles: ['read'] } };
    const res = mockRes();
    mw(req, res, () => {});
    expect(res._status).toBe(403);
  });

  it('bloquea si el usuario no tiene roles (solo lectura)', () => {
    const mw = requireNivel();
    const req = { user: { roles: [] } };
    const res = mockRes();
    mw(req, res, () => {});
    expect(res._status).toBe(403);
  });

  it('devuelve 401 si no hay usuario autenticado', () => {
    const mw = requireNivel();
    const res = mockRes();
    mw({}, res, () => {});
    expect(res._status).toBe(401);
  });
});
