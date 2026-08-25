import { describe, it, expect, beforeEach } from 'vitest';
import { jwtUtils } from './helpers/models.js';
import authenticate from '../src/middlewares/auth.middleware.js';

function mockRes() {
  return {
    _status: 200,
    _json: null,
    status(c) { this._status = c; return this; },
    json(p) { this._json = p; return this; }
  };
}

describe('Middleware authenticate', () => {
  beforeEach(() => {
    jwtUtils.verifyToken.mockReset();
  });

  it('rechaza petición sin cabecera Authorization', () => {
    const res = mockRes();
    authenticate({ headers: {} }, res, () => {});
    expect(res._status).toBe(401);
    expect(res._json.message).toBe('No autenticado. Falta el token de acceso.');
  });

  it('rechaza esquema distinto a Bearer', () => {
    const res = mockRes();
    authenticate({ headers: { authorization: 'Basic abc' } }, res, () => {});
    expect(res._status).toBe(401);
  });

  it('rechaza token vacío o con espacios extra', () => {
    const res = mockRes();
    authenticate({ headers: { authorization: 'Bearer  ' } }, res, () => {});
    expect(res._status).toBe(401);
  });

  it('rechaza cabecera mal formada con más de dos partes', () => {
    const res = mockRes();
    authenticate({ headers: { authorization: 'Bearer token extra' } }, res, () => {});
    expect(res._status).toBe(401);
  });

  it('adjunta el usuario decodificado y continúa con token válido', () => {
    jwtUtils.verifyToken.mockReturnValue({ id: 1, usuario: 'admin' });
    const req = { headers: { authorization: 'Bearer valid-token' } };
    const res = mockRes();
    let paso = false;
    authenticate(req, res, () => { paso = true; });
    expect(paso).toBe(true);
    expect(req.user).toEqual({ id: 1, usuario: 'admin' });
    expect(jwtUtils.verifyToken).toHaveBeenCalledWith('valid-token');
  });

  it('devuelve 401 si el token es inválido', () => {
    jwtUtils.verifyToken.mockImplementation(() => { throw new Error('invalid'); });
    const req = { headers: { authorization: 'Bearer bad-token' } };
    const res = mockRes();
    authenticate(req, res, () => {});
    expect(res._status).toBe(401);
    expect(res._json.message).toBe('Token inválido o caducado.');
  });
});
