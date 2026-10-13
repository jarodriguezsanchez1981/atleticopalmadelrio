import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Personal, TipoPersonal } from './helpers/models.js';
import { mockReqRes } from './helpers/http.js';

import * as ctrl from '../src/controllers/personal.controller.js';

describe('Sección Personal · personal.controller', () => {
  beforeEach(() => {
    Personal.findAll.mockReset();
    Personal.findOne.mockReset();
    Personal.create.mockReset();
    Personal.destroy.mockReset();
    TipoPersonal.findOne.mockReset();
  });

  function llamar(fn, overrides = {}) {
    const { req, res, next } = mockReqRes(overrides);
    return { promesa: fn(req, res, next), res };
  }

  it('listar devuelve el personal por apellidos', async () => {
    Personal.findAll.mockResolvedValue([{ id: 1 }]);
    const { promesa, res } = llamar(ctrl.listar);
    await promesa;
    expect(Personal.findAll.mock.calls[0][0].order).toEqual([['apellidos', 'ASC'], ['nombre', 'ASC']]);
    expect(Personal.findAll.mock.calls[0][0].include[0].as).toBe('tipoPersonal');
    expect(res._json).toEqual([{ id: 1 }]);
  });

  it('crear exige nombre y apellidos y valida el email', async () => {
    let r = llamar(ctrl.crear, { body: { nombre: 'Ana' } });
    await r.promesa;
    expect(r.res._status).toBe(400);
    r = llamar(ctrl.crear, { body: { nombre: 'Ana', apellidos: 'Ruiz', email: 'no-es-email' } });
    await r.promesa;
    expect(r.res._status).toBe(400);
    expect(Personal.create).not.toHaveBeenCalled();
  });

  it('crear guarda los campos (vacíos a null) con su tipo de personal', async () => {
    Personal.create.mockImplementation(async (d) => ({ id: 5, ...d }));
    TipoPersonal.findOne.mockResolvedValue({ id: 2 });
    Personal.findOne.mockResolvedValue({ id: 5, tipoPersonal: { id: 2, nombre: 'Fisioterapia' } });
    const { promesa, res } = llamar(ctrl.crear, {
      body: { nombre: ' Ana ', apellidos: 'Ruiz', email: 'ana@club.es', telefono: '', id_tipo_personal: 2, foto: 'data:image/png;base64,AAAA' }
    });
    await promesa;
    expect(Personal.create).toHaveBeenCalledWith({
      nombre: 'Ana', apellidos: 'Ruiz', email: 'ana@club.es', telefono: null, id_tipo_personal: 2, foto: 'data:image/png;base64,AAAA'
    });
    expect(res._status).toBe(201);
    expect(res._json.tipoPersonal.nombre).toBe('Fisioterapia');
  });

  it('crear rechaza un tipo de personal que no existe', async () => {
    TipoPersonal.findOne.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.crear, { body: { nombre: 'Ana', apellidos: 'Ruiz', id_tipo_personal: 99 } });
    await promesa;
    expect(res._status).toBe(400);
    expect(Personal.create).not.toHaveBeenCalled();
  });

  it('actualizar no cambia la foto si llega su propia URL de /api/imagenes', async () => {
    const persona = { id: 1, nombre: 'Ana', foto: 'data:image/png;base64,AAAA', save: vi.fn() };
    Personal.findOne.mockResolvedValue(persona);
    const { promesa } = llamar(ctrl.actualizar, { params: { id: '1' }, body: { id_tipo_personal: '', foto: '/api/imagenes/personal/1?v=x' } });
    await promesa;
    expect(persona.id_tipo_personal).toBeNull();
    expect(persona.foto).toBe('data:image/png;base64,AAAA');
    expect(persona.save).toHaveBeenCalled();
  });

  it('eliminar devuelve 404 si no existe', async () => {
    Personal.destroy.mockResolvedValue(0);
    const { promesa, res } = llamar(ctrl.eliminar, { params: { id: '9' } });
    await promesa;
    expect(res._status).toBe(404);
  });
});
