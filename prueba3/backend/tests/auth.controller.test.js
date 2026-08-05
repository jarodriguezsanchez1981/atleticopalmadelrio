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
      password: 'hash',
      secciones: [{ clave: 'administracion' }, { clave: 'temporadas' }]
    });
    passwordUtils.verifyPassword.mockResolvedValue(true);
    const { promesa, res } = llamar(ctrl.login, { body: { usuario: 'admin', password: 'Clave123!' } });

    await promesa;

    expect(res._status).toBe(200);
    expect(jwtUtils.signToken).toHaveBeenCalledWith({
      id: 1, usuario: 'admin', secciones: ['administracion', 'temporadas']
    });
    expect(res._json.token).toBe('token-fake');
    expect(res._json.user).toEqual({
      id: 1, usuario: 'admin', nombre: 'A', apellidos: 'B', secciones: ['administracion', 'temporadas']
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
      id: 1, usuario: 'admin', nombre: 'A', apellidos: 'B', secciones: [{ clave: 'temporadas' }]
    });
    const { promesa, res } = llamar(ctrl.me, { user: { id: 1 } });

    await promesa;

    expect(Usuario.findByPk).toHaveBeenCalledWith(1, expect.objectContaining({ include: expect.any(Array) }));
    expect(res._json).toEqual({
      id: 1, usuario: 'admin', nombre: 'A', apellidos: 'B', secciones: ['temporadas']
    });
  });
});