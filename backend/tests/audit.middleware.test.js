import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import { Cambio, Usuario } from './helpers/models.js';

import auditMiddleware from '../src/middlewares/audit.middleware.js';

function makeRes(statusCode = 201) {
  const res = new EventEmitter();
  res.statusCode = statusCode;
  res._body = null;
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body) => {
    res._body = body;
    return res;
  };
  return res;
}

function flush() {
  return new Promise((resolve) => setImmediate(resolve));
}

describe('Auditoría · audit.middleware', () => {
  beforeEach(() => {
    Cambio.create.mockReset();
    Usuario.findByPk.mockReset();
  });

  it('ignora peticiones GET', async () => {
    const req = { method: 'GET', originalUrl: '/api/usuarios', body: {}, user: { id: 1 } };
    const res = makeRes();
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    auditMiddleware(req, res, next);

    expect(nextCalled).toBe(true);
    res.emit('finish');
    await flush();
    expect(Cambio.create).not.toHaveBeenCalled();
  });

  it('POST registra un cambio de tipo crear con id del registro creado', async () => {
    const req = {
      method: 'POST',
      originalUrl: '/api/usuarios',
      body: { usuario: 'juan', password: 'Clave123!', nombre: 'Juan', apellidos: 'P' },
      user: { id: 1 }
    };
    const res = makeRes(201);
    const next = () => {};

    auditMiddleware(req, res, next);
    res.json({ id: 5, usuario: 'juan', nombre: 'Juan', apellidos: 'P' });
    res.emit('finish');
    await flush();

    expect(Cambio.create).toHaveBeenCalledTimes(1);
    const arg = Cambio.create.mock.calls[0][0];
    expect(arg.entidad).toBe('usuarios');
    expect(arg.accion).toBe('crear');
    expect(arg.id_registro).toBe(5);
    expect(arg.id_usuario).toBe(1);
    expect(arg.datos_previos).toBeNull();
  });

  it('POST nunca guarda contraseñas en datos_nuevos', async () => {
    const req = {
      method: 'POST',
      originalUrl: '/api/usuarios',
      body: { usuario: 'juan', password: 'Clave123!', nombre: 'Juan', apellidos: 'P' },
      user: { id: 1 }
    };
    const res = makeRes(201);
    auditMiddleware(req, res, () => {});
    res.json({ id: 6, usuario: 'juan', password: 'hash', nombre: 'Juan', apellidos: 'P' });
    res.emit('finish');
    await flush();

    const arg = Cambio.create.mock.calls[0][0];
    expect(arg.datos_nuevos.password).toBeUndefined();
  });

  it('PUT registra editar guardando el snapshot previo', async () => {
    const req = {
      method: 'PUT',
      originalUrl: '/api/usuarios/5',
      body: { nombre: 'Juan Actualizado' },
      user: { id: 2 }
    };
    const res = makeRes(200);
    Usuario.findByPk.mockResolvedValue({ toJSON: () => ({ id: 5, usuario: 'juan', nombre: 'Juan', apellidos: 'P' }) });

    auditMiddleware(req, res, () => {});
    await flush();

    res.json({ id: 5, usuario: 'juan', nombre: 'Juan Actualizado', apellidos: 'P' });
    res.emit('finish');
    await flush();

    expect(Cambio.create).toHaveBeenCalledTimes(1);
    const arg = Cambio.create.mock.calls[0][0];
    expect(arg.accion).toBe('editar');
    expect(arg.id_registro).toBe(5);
    expect(arg.datos_previos).toEqual({ id: 5, usuario: 'juan', nombre: 'Juan', apellidos: 'P' });
  });

  it('DELETE registra eliminar con el snapshot previo', async () => {
    const req = {
      method: 'DELETE',
      originalUrl: '/api/usuarios/5',
      body: {},
      user: { id: 3 }
    };
    const res = makeRes(204);
    Usuario.findByPk.mockResolvedValue({ toJSON: () => ({ id: 5, usuario: 'juan', nombre: 'Juan', apellidos: 'P' }) });

    auditMiddleware(req, res, () => {});
    await flush();

    res.status(204).json({});
    res.emit('finish');
    await flush();

    expect(Cambio.create).toHaveBeenCalledTimes(1);
    const arg = Cambio.create.mock.calls[0][0];
    expect(arg.accion).toBe('eliminar');
    expect(arg.id_registro).toBe(5);
    expect(arg.datos_previos).toEqual({ id: 5, usuario: 'juan', nombre: 'Juan', apellidos: 'P' });
    expect(arg.datos_nuevos).toBeNull();
  });

  it('no registra nada si la petición no tiene usuario autenticado', async () => {
    const req = {
      method: 'POST',
      originalUrl: '/api/usuarios',
      body: { nombre: 'X' },
      user: undefined
    };
    const res = makeRes(201);
    auditMiddleware(req, res, () => {});
    res.json({ id: 1 });
    res.emit('finish');
    await flush();

    expect(Cambio.create).not.toHaveBeenCalled();
  });
});