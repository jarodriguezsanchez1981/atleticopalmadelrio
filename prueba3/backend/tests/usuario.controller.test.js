import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Usuario, Seccion } from './helpers/models.js';
import { passwordUtils } from './helpers/models.js';
import { mockReqRes } from './helpers/http.js';

import * as ctrl from '../src/controllers/usuario.controller.js';

describe('Sección Usuarios · usuario.controller', () => {
  beforeEach(() => {
    Usuario.findAll.mockReset();
    Usuario.findByPk.mockReset();
    Usuario.create.mockReset();
    Usuario.destroy.mockReset();
    passwordUtils.isPasswordValid.mockReset();
    passwordUtils.hashPassword.mockReset();
    passwordUtils.isPasswordValid.mockReturnValue(true);
    passwordUtils.hashPassword.mockResolvedValue('hash');
  });

  function llamar(fn, overrides = {}) {
    const { req, res, next } = mockReqRes(overrides);
    return { promesa: fn(req, res, next), res, req, next };
  }

  it('listar devuelve los usuarios serializados sin password', async () => {
    const usuario = { id: 1, usuario: 'admin', password: 'secret', nombre: 'A', apellidos: 'B', secciones: [{ id: 2 }] };
    Usuario.findAll.mockResolvedValue([usuario]);
    const { promesa, res } = llamar(ctrl.listar);

    await promesa;

    expect(res._json).toEqual([{
      id: 1, usuario: 'admin', nombre: 'A', apellidos: 'B', secciones: [{ id: 2 }], ids_secciones: [2]
    }]);
    expect(res._json[0].password).toBeUndefined();
  });

  it('obtener devuelve 404 si no existe', async () => {
    Usuario.findByPk.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.obtener, { params: { id: '99' } });

    await promesa;

    expect(res._status).toBe(404);
    expect(res._json).toEqual({ message: 'Usuario no encontrado.' });
  });

  it('crear valida campos obligatorios', async () => {
    const { promesa, res } = llamar(ctrl.crear, { body: { usuario: 'x' } });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('Faltan los campos obligatorios: contraseña, nombre, apellidos.');
  });

  it('crear permite crear un usuario sin secciones', async () => {
    const nuevo = { id: 6, setSecciones: vi.fn().mockResolvedValue() };
    const completo = { id: 6, usuario: 'sinesc', password: 'hash', nombre: 'A', apellidos: 'B', secciones: [] };
    Usuario.create.mockResolvedValue(nuevo);
    Usuario.findByPk.mockResolvedValue(completo);
    const { promesa, res } = llamar(ctrl.crear, {
      body: { usuario: 'sinesc', password: 'Clave123!', nombre: 'A', apellidos: 'B', ids_secciones: [] }
    });

    await promesa;

    expect(Usuario.create).toHaveBeenCalledWith({
      usuario: 'sinesc', password: 'hash', nombre: 'A', apellidos: 'B', rol: 'leer'
    });
    expect(nuevo.setSecciones).toHaveBeenCalledWith([]);
    expect(res._status).toBe(201);
  });

  it('crear valida la fortaleza de la contraseña', async () => {
    passwordUtils.isPasswordValid.mockReturnValue(false);
    const { promesa, res } = llamar(ctrl.crear, {
      body: { usuario: 'x', password: 'corta', nombre: 'A', apellidos: 'B', ids_secciones: ['2'] }
    });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toContain('La contraseña debe tener mínimo 8 caracteres');
  });

  it('crear crea el usuario con la contraseña hasheada y devuelve 201', async () => {
    const nuevo = { id: 5, setSecciones: vi.fn().mockResolvedValue() };
    const completo = { id: 5, usuario: 'juan', password: 'hash', nombre: 'A', apellidos: 'B', secciones: [{ id: 2 }] };
    Usuario.create.mockResolvedValue(nuevo);
    Usuario.findByPk.mockResolvedValue(completo);
    const { promesa, res } = llamar(ctrl.crear, {
      body: { usuario: 'juan', password: 'Clave123!', nombre: 'A', apellidos: 'B', ids_secciones: ['2'] }
    });

    await promesa;

    expect(Usuario.create).toHaveBeenCalledWith({
      usuario: 'juan', password: 'hash', nombre: 'A', apellidos: 'B', rol: 'leer'
    });
    expect(nuevo.setSecciones).toHaveBeenCalledWith([2]);
    expect(res._status).toBe(201);
    expect(res._json.password).toBeUndefined();
  });

  it('crear usa el rol proporcionado o "leer" por defecto', async () => {
    const nuevo = { id: 7, setSecciones: vi.fn().mockResolvedValue() };
    const completo = { id: 7, usuario: 'lore', password: 'hash', nombre: 'A', apellidos: 'B', rol: 'leer', secciones: [] };
    Usuario.create.mockResolvedValue(nuevo);
    Usuario.findByPk.mockResolvedValue(completo);
    const { promesa, res } = llamar(ctrl.crear, {
      body: { usuario: 'lore', password: 'Clave123!', nombre: 'A', apellidos: 'B', rol: 'leer', ids_secciones: [] }
    });

    await promesa;

    expect(res._status).toBe(201);
    expect(Usuario.create).toHaveBeenCalledWith(expect.objectContaining({ rol: 'leer' }));
  });

  it('actualizar cambia el rol del usuario', async () => {
    const usuario = { id: 1, save: vi.fn().mockResolvedValue() };
    const completo = { id: 1, usuario: 'juan', nombre: 'A', apellidos: 'B', rol: 'leer', secciones: [] };
    Usuario.findByPk.mockResolvedValueOnce(usuario).mockResolvedValueOnce(completo);
    const { promesa, res } = llamar(ctrl.actualizar, {
      params: { id: '1' }, body: { rol: 'editar' }
    });

    await promesa;

    expect(usuario.rol).toBe('editar');
    expect(usuario.save).toHaveBeenCalled();
    expect(res._status).toBe(200);
  });

  it('actualizar usa scope withPassword', async () => {
    const usuario = { id: 1, save: vi.fn().mockResolvedValue() };
    const completo = { id: 1, usuario: 'juan', nombre: 'A', apellidos: 'B', secciones: [] };
    Usuario.scope.mockReturnValue(Usuario);
    Usuario.findByPk.mockResolvedValueOnce(usuario).mockResolvedValueOnce(completo);
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '1' }, body: { nombre: 'Nuevo' } });

    await promesa;

    expect(Usuario.scope).toHaveBeenCalledWith('withPassword');
    expect(res._json).toEqual({ id: 1, usuario: 'juan', nombre: 'A', apellidos: 'B', secciones: [], ids_secciones: [] });
  });

  it('actualizar permite cambiar el nombre de login (usuario)', async () => {
    const usuario = { id: 1, save: vi.fn().mockResolvedValue() };
    const completo = { id: 1, usuario: 'fpalacios', nombre: 'A', apellidos: 'B', secciones: [] };
    Usuario.findByPk.mockResolvedValueOnce(usuario).mockResolvedValueOnce(completo);
    const { promesa, res } = llamar(ctrl.actualizar, {
      params: { id: '1' }, body: { usuario: 'fpalacios' }
    });

    await promesa;

    expect(usuario.usuario).toBe('fpalacios');
    expect(usuario.save).toHaveBeenCalled();
  });

  it('actualizar valida la contraseña si se cambia', async () => {
    const usuario = { id: 1, save: vi.fn() };
    Usuario.findByPk.mockResolvedValue(usuario);
    passwordUtils.isPasswordValid.mockReturnValue(false);
    const { promesa, res } = llamar(ctrl.actualizar, {
      params: { id: '1' }, body: { password: 'corta' }
    });

    await promesa;

    expect(res._status).toBe(400);
    expect(usuario.save).not.toHaveBeenCalled();
  });

  it('actualizar permite quitar todas las secciones', async () => {
    const usuario = { id: 1, save: vi.fn().mockResolvedValue(), setSecciones: vi.fn().mockResolvedValue() };
    const completo = { id: 1, usuario: 'juan', nombre: 'A', apellidos: 'B', secciones: [] };
    Usuario.findByPk.mockResolvedValueOnce(usuario).mockResolvedValueOnce(completo);
    const { promesa, res } = llamar(ctrl.actualizar, {
      params: { id: '1' }, body: { ids_secciones: [] }
    });

    await promesa;

    expect(usuario.setSecciones).toHaveBeenCalledWith([]);
    expect(res._status).toBe(200);
  });

  it('eliminar impide borrar el propio usuario', async () => {
    const { promesa, res } = llamar(ctrl.eliminar, { params: { id: '1' } });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('No puedes eliminar tu propio usuario.');
    expect(Usuario.destroy).not.toHaveBeenCalled();
  });

  it('eliminar elimina y responde 204', async () => {
    Usuario.destroy.mockResolvedValue(1);
    const { promesa, res } = llamar(ctrl.eliminar, { params: { id: '2' } });

    await promesa;

    expect(Usuario.destroy).toHaveBeenCalledWith({ where: { id: '2' } });
    expect(res._status).toBe(204);
  });

  it('eliminar devuelve 404 si no encuentra nada', async () => {
    const { req, res, next } = mockReqRes({ params: { id: '2' } });
    Usuario.destroy.mockResolvedValue(0);
    await ctrl.eliminar(req, res, next);

    expect(res._status).toBe(404);
  });
});