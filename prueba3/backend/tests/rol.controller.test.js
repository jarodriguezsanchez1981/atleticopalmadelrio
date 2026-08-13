import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Rol, Usuario } from './helpers/models.js';
import { mockReqRes } from './helpers/http.js';

import * as ctrl from '../src/controllers/rol.controller.js';

describe('Sección Roles · rol.controller', () => {
  beforeEach(() => {
    Rol.findAll.mockReset();
    Rol.findByPk.mockReset();
    Rol.findOrCreate.mockReset();
    Rol.destroy.mockReset();
    Usuario.findByPk.mockReset();
  });

  function llamar(fn, overrides = {}) {
    const { req, res, next } = mockReqRes(overrides);
    return { promesa: fn(req, res, next), res, req, next };
  }

  it('listar devuelve los roles', async () => {
    const roles = [{ id: 1, id_usuario: 1, nombre: 'read' }];
    Rol.findAll.mockResolvedValue(roles);
    const { promesa, res } = llamar(ctrl.listar);

    await promesa;

    expect(Rol.findAll).toHaveBeenCalledWith(expect.objectContaining({ include: expect.any(Array) }));
    expect(res._json[0]).toEqual({ id: 1, id_usuario: 1, nombre: 'read', nivel: 1 });
  });

  it('crear valida los campos obligatorios', async () => {
    const { promesa, res } = llamar(ctrl.crear, { body: {} });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('Usuario y rol son obligatorios.');
  });

  it('crear valida que el rol sea read o write', async () => {
    const { promesa, res } = llamar(ctrl.crear, { body: { id_usuario: 1, nombre: 'super' } });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('El rol debe ser read o write.');
  });

  it('crear valida que el usuario exista', async () => {
    Usuario.findByPk.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.crear, { body: { id_usuario: 99, nombre: 'read' } });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('El usuario indicado no existe.');
  });

  it('crear asigna el rol al usuario y devuelve 201', async () => {
    Usuario.findByPk.mockResolvedValue({ id: 1 });
    Rol.findOrCreate.mockResolvedValue([{ id: 5, id_usuario: 1, nombre: 'write' }]);
    Rol.findByPk.mockResolvedValue({ id: 5, id_usuario: 1, nombre: 'write' });
    const { promesa, res } = llamar(ctrl.crear, { body: { id_usuario: 1, nombre: 'write' } });

    await promesa;

    expect(Rol.findOrCreate).toHaveBeenCalledWith({ where: { id_usuario: 1, nombre: 'write' } });
    expect(res._status).toBe(201);
    expect(res._json).toEqual({ id: 5, id_usuario: 1, nombre: 'write', nivel: 2 });
  });

  it('actualizar devuelve 404 si no existe', async () => {
    Rol.findByPk.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '1' }, body: { nombre: 'edit' } });

    await promesa;

    expect(res._status).toBe(404);
  });

  it('actualizar cambia el rol', async () => {
    const rol = { id: 1, id_usuario: 1, nombre: 'read', save: vi.fn().mockResolvedValue() };
    Rol.findByPk.mockResolvedValueOnce(rol).mockResolvedValueOnce({ ...rol, nombre: 'write' });
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '1' }, body: { nombre: 'write' } });

    await promesa;

    expect(rol.nombre).toBe('write');
    expect(rol.save).toHaveBeenCalled();
    expect(res._json.nombre).toBe('write');
    expect(res._json.nivel).toBe(2);
  });

  it('eliminar elimina y responde 204', async () => {
    Rol.destroy.mockResolvedValue(1);
    const { promesa, res } = llamar(ctrl.eliminar, { params: { id: '1' } });

    await promesa;

    expect(Rol.destroy).toHaveBeenCalledWith({ where: { id: '1' } });
    expect(res._status).toBe(204);
  });

  it('eliminar devuelve 404 si no encuentra nada', async () => {
    Rol.destroy.mockResolvedValue(0);
    const { promesa, res } = llamar(ctrl.eliminar, { params: { id: '99' } });

    await promesa;

    expect(res._status).toBe(404);
  });
});
