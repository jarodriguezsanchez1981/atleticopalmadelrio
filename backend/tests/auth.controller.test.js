import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Usuario, Seccion } from './helpers/models.js';
import { passwordUtils, jwtUtils } from './helpers/models.js';
import { mockReqRes } from './helpers/http.js';

import * as ctrl from '../src/controllers/auth.controller.js';

describe('Autenticación · auth.controller', () => {
  beforeEach(() => {
    Usuario.findByPk.mockReset();
    Usuario.findOne.mockReset();
    passwordUtils.verifyPassword.mockReset();
    jwtUtils.signToken.mockReset();
    jwtUtils.signToken.mockReturnValue('token-fake');
  });

  function llamar(fn, overrides = {}) {
    const { req, res, next } = mockReqRes(overrides);
    return { promesa: fn(req, res, next), res, req, next };
  }

  it('login valida campos obligatorios', async () => {
    const { promesa, res } = llamar(ctrl.login, { body: {} });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('Usuario y contraseña son obligatorios.');
  });

  it('login devuelve 401 si el usuario no existe', async () => {
    Usuario.scope = vi.fn().mockReturnValue(Usuario);
    Usuario.findOne.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.login, { body: { usuario: 'x', password: 'Clave123!' } });

    await promesa;

    expect(res._status).toBe(401);
    expect(res._json.message).toBe('Usuario o contraseña incorrectos.');
  });

  it('login devuelve 401 si el usuario está inactivo', async () => {
    Usuario.scope.mockReturnValue(Usuario);
    Usuario.findOne.mockResolvedValue({ id: 1, activo: false, password: 'hash' });
    const { promesa, res } = llamar(ctrl.login, { body: { usuario: 'x', password: 'Clave123!' } });

    await promesa;

    expect(res._status).toBe(401);
  });

  it('login devuelve 401 si la contraseña no coincide', async () => {
    Usuario.scope.mockReturnValue(Usuario);
    Usuario.findOne.mockResolvedValue({ id: 1, activo: true, password: 'hash' });
    passwordUtils.verifyPassword.mockResolvedValue(false);
    const { promesa, res } = llamar(ctrl.login, { body: { usuario: 'x', password: 'Clave123!' } });

    await promesa;

    expect(res._status).toBe(401);
    expect(passwordUtils.verifyPassword).toHaveBeenCalledWith('Clave123!', 'hash');
  });

  it('login devuelve token y usuario', async () => {
    Usuario.scope.mockReturnValue(Usuario);
    Usuario.findOne.mockResolvedValue({
      id: 1,
      usuario: 'admin',
      nombre: 'A',
      apellidos: 'B',
      activo: true,
      rol: 'coordinador',
      id_categoria: null,
      password: 'hash',
      secciones: [
        { clave: 'administracion', usuario_secciones: { puede_ver: 1, puede_editar: 1 } },
        { clave: 'temporadas', usuario_secciones: { puede_ver: 1, puede_editar: 0 } }
      ]
    });
    passwordUtils.verifyPassword.mockResolvedValue(true);
    const { promesa, res } = llamar(ctrl.login, { body: { usuario: 'admin', password: 'Clave123!' } });

    await promesa;

    expect(res._status).toBe(200);
    expect(jwtUtils.signToken).toHaveBeenCalledWith({
      id: 1, usuario: 'admin', secciones: ['administracion', 'temporadas'],
      permisos: { administracion: { ver: true, editar: true }, temporadas: { ver: true, editar: false } },
      rol: 'coordinador', id_categoria: null
    });
    expect(res._json.token).toBe('token-fake');
    expect(res._json.user).toEqual({
      id: 1, usuario: 'admin', nombre: 'A', apellidos: 'B',
      secciones: ['administracion', 'temporadas'],
      permisos: { administracion: { ver: true, editar: true }, temporadas: { ver: true, editar: false } },
      rol: 'coordinador', id_categoria: null
    });
  });

  it('me devuelve 404 si no existe', async () => {
    Usuario.findByPk.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.me, { user: { id: 9 } });

    await promesa;

    expect(res._status).toBe(404);
    expect(res._json.message).toBe('Usuario no encontrado.');
  });

  it('me devuelve el payload del usuario', async () => {
    Usuario.findByPk.mockResolvedValue({
      id: 1, usuario: 'admin', nombre: 'A', apellidos: 'B', rol: 'coordinador', id_categoria: null,
      secciones: [
        { clave: 'temporadas', usuario_secciones: { puede_ver: 1, puede_editar: 1 } }
      ]
    });
    const { promesa, res } = llamar(ctrl.me, { user: { id: 1 } });

    await promesa;

    expect(Usuario.findByPk).toHaveBeenCalledWith(1, expect.objectContaining({ include: expect.any(Array) }));
    expect(res._json).toEqual({
      id: 1, usuario: 'admin', nombre: 'A', apellidos: 'B',
      secciones: ['temporadas'],
      permisos: { temporadas: { ver: true, editar: true } },
      rol: 'coordinador', id_categoria: null
    });
  });

  it('login con usuario sin secciones devuelve permisos vacío', async () => {
    Usuario.scope.mockReturnValue(Usuario);
    Usuario.findOne.mockResolvedValue({
      id: 2, usuario: 'basic', nombre: 'B', apellidos: 'S', activo: true,
      rol: 'coordinador', id_categoria: null, password: 'hash', secciones: []
    });
    passwordUtils.verifyPassword.mockResolvedValue(true);
    const { promesa, res } = llamar(ctrl.login, { body: { usuario: 'basic', password: 'Clave123!' } });

    await promesa;

    expect(res._status).toBe(200);
    expect(res._json.user.permisos).toEqual({});
    expect(res._json.user.secciones).toEqual([]);
  });

  it('login con usuario entrenador incluye id_categoria en token', async () => {
    Usuario.scope.mockReturnValue(Usuario);
    Usuario.findOne.mockResolvedValue({
      id: 3, usuario: 'coach', nombre: 'C', apellidos: 'H', activo: true,
      rol: 'entrenador', id_categoria: 7, password: 'hash', secciones: []
    });
    passwordUtils.verifyPassword.mockResolvedValue(true);
    const { promesa, res } = llamar(ctrl.login, { body: { usuario: 'coach', password: 'Clave123!' } });

    await promesa;

    expect(jwtUtils.signToken).toHaveBeenCalledWith(
      expect.objectContaining({ id_categoria: 7, rol: 'entrenador' })
    );
    expect(res._json.user.id_categoria).toBe(7);
  });

  it('me devuelve el payload con permisos mixtos (ver y editar)', async () => {
    Usuario.findByPk.mockResolvedValue({
      id: 4, usuario: 'mix', nombre: 'M', apellidos: 'X', rol: 'coordinador', id_categoria: null,
      secciones: [
        { clave: 'calendario', usuario_secciones: { puede_ver: 1, puede_editar: 1 } },
        { clave: 'jugadores', usuario_secciones: { puede_ver: 1, puede_editar: 0 } },
        { clave: 'sanciones', usuario_secciones: { puede_ver: 0, puede_editar: 0 } }
      ]
    });
    const { promesa, res } = llamar(ctrl.me, { user: { id: 4 } });

    await promesa;

    expect(res._json.permisos).toEqual({
      calendario: { ver: true, editar: true },
      jugadores: { ver: true, editar: false },
      sanciones: { ver: false, editar: false }
    });
    expect(res._json.secciones).toEqual(['calendario', 'jugadores', 'sanciones']);
  });

  it('login solo envía al token las claves necesarias', async () => {
    Usuario.scope.mockReturnValue(Usuario);
    Usuario.findOne.mockResolvedValue({
      id: 5, usuario: 'tok', nombre: 'T', apellidos: 'K', activo: true,
      rol: 'coordinador', id_categoria: null, password: 'hash', secciones: []
    });
    passwordUtils.verifyPassword.mockResolvedValue(true);
    const { promesa, res } = llamar(ctrl.login, { body: { usuario: 'tok', password: 'Clave123!' } });

    await promesa;

    const tokenPayload = jwtUtils.signToken.mock.calls[0][0];
    expect(Object.keys(tokenPayload).sort()).toEqual(['id', 'id_categoria', 'permisos', 'rol', 'secciones', 'usuario']);
    expect(tokenPayload).not.toHaveProperty('nombre');
    expect(tokenPayload).not.toHaveProperty('password');
  });

  it('login omitir password del user response', async () => {
    Usuario.scope.mockReturnValue(Usuario);
    Usuario.findOne.mockResolvedValue({
      id: 6, usuario: 'nopw', nombre: 'N', apellidos: 'P', activo: true,
      rol: 'coordinador', id_categoria: null, password: 'supersecret', secciones: []
    });
    passwordUtils.verifyPassword.mockResolvedValue(true);
    const { promesa, res } = llamar(ctrl.login, { body: { usuario: 'nopw', password: 'Clave123!' } });

    await promesa;

    expect(res._json.user.password).toBeUndefined();
    expect(res._json.user).not.toHaveProperty('password');
  });
});