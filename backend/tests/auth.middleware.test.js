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
    expect(req.user).toEqual({ id: 1, usuario: 'admin', secciones: [], permisos: {} });
    expect(jwtUtils.verifyToken).toHaveBeenCalledWith('valid-token');
  });

  it('expande los permisos compactos del token a secciones y permisos', () => {
    jwtUtils.verifyToken.mockReturnValue({ id: 1, usuario: 'ana', rol: 'coordinador', s: ['jugadores', 'temporadas', 'cambios'], e: ['jugadores'], n: ['cambios'] });
    const req = { headers: { authorization: 'Bearer valid-token' } };
    authenticate(req, mockRes(), () => {});
    expect(req.user).toEqual({
      id: 1, usuario: 'ana', rol: 'coordinador',
      secciones: ['jugadores', 'temporadas', 'cambios'],
      permisos: {
        jugadores: { ver: true, editar: true },
        temporadas: { ver: true, editar: false },
        cambios: { ver: false, editar: false }
      }
    });
  });

  it("con e: '*' puede editar todas sus secciones", () => {
    jwtUtils.verifyToken.mockReturnValue({ id: 1, s: ['jugadores', 'temporadas'], e: '*' });
    const req = { headers: { authorization: 'Bearer valid-token' } };
    authenticate(req, mockRes(), () => {});
    expect(req.user.permisos).toEqual({ jugadores: { ver: true, editar: true }, temporadas: { ver: true, editar: true } });
  });

  it('sigue aceptando los tokens antiguos con secciones y permisos', () => {
    const permisos = { jugadores: { ver: true, editar: false } };
    jwtUtils.verifyToken.mockReturnValue({ id: 1, secciones: ['jugadores'], permisos });
    const req = { headers: { authorization: 'Bearer valid-token' } };
    authenticate(req, mockRes(), () => {});
    expect(req.user).toEqual({ id: 1, secciones: ['jugadores'], permisos });
  });

  it('devuelve 401 si el token es inválido', () => {
    jwtUtils.verifyToken.mockImplementation(() => { throw new Error('invalid'); });
    const req = { headers: { authorization: 'Bearer bad-token' } };
    const res = mockRes();
    authenticate(req, res, () => {});
    expect(res._status).toBe(401);
    expect(res._json.message).toBe('Token inválido o caducado.');
  });

  it('acepta el token de la cookie de sesión', () => {
    jwtUtils.verifyToken.mockReturnValue({ id: 1, usuario: 'admin' });
    const req = { method: 'GET', headers: { cookie: 'otra=1; apr_sesion=token-cookie' } };
    let paso = false;
    authenticate(req, mockRes(), () => { paso = true; });
    expect(paso).toBe(true);
    expect(jwtUtils.verifyToken).toHaveBeenCalledWith('token-cookie');
  });

  it('con la cookie, las peticiones que modifican datos exigen X-Requested-With (CSRF)', () => {
    jwtUtils.verifyToken.mockReturnValue({ id: 1 });
    const sinCabecera = mockRes();
    let paso = false;
    authenticate({ method: 'POST', headers: { cookie: 'apr_sesion=t' } }, sinCabecera, () => { paso = true; });
    expect(paso).toBe(false);
    expect(sinCabecera._status).toBe(403);

    authenticate({ method: 'DELETE', headers: { cookie: 'apr_sesion=t', 'x-requested-with': 'XMLHttpRequest' } }, mockRes(), () => { paso = true; });
    expect(paso).toBe(true);
  });

  it('sin cabecera ni cookie devuelve 401', () => {
    const res = mockRes();
    authenticate({ method: 'GET', headers: { cookie: 'otra=1' } }, res, () => {});
    expect(res._status).toBe(401);
  });
});
