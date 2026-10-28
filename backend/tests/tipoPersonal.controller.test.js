import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TipoPersonal, Personal } from './helpers/models.js';
import { mockReqRes } from './helpers/http.js';

import * as ctrl from '../src/controllers/tipoPersonal.controller.js';

describe('Sección Tipo Personal · tipoPersonal.controller', () => {
  beforeEach(() => {
    TipoPersonal.findAll.mockReset();
    TipoPersonal.findOne.mockReset();
    TipoPersonal.create.mockReset();
    TipoPersonal.destroy.mockReset();
    Personal.count.mockReset();
  });

  function llamar(fn, overrides = {}) {
    const { req, res, next } = mockReqRes(overrides);
    return { promesa: fn(req, res, next), res };
  }

  it('crear exige nombre y no admite repetidos', async () => {
    let r = llamar(ctrl.crear, { body: { nombre: '  ' } });
    await r.promesa;
    expect(r.res._status).toBe(400);
    TipoPersonal.findOne.mockResolvedValue({ id: 1, nombre: 'Prensa' });
    r = llamar(ctrl.crear, { body: { nombre: 'Prensa' } });
    await r.promesa;
    expect(r.res._status).toBe(409);
  });

  it('crear guarda el nombre sin espacios', async () => {
    TipoPersonal.findOne.mockResolvedValue(null);
    TipoPersonal.create.mockImplementation(async (d) => ({ id: 3, ...d }));
    const { promesa, res } = llamar(ctrl.crear, { body: { nombre: ' Fisioterapia ' } });
    await promesa;
    expect(TipoPersonal.create).toHaveBeenCalledWith({ nombre: 'Fisioterapia' });
    expect(res._status).toBe(201);
  });

  it('actualizar no deja poner el nombre de otro tipo', async () => {
    const tipo = { id: 1, nombre: 'A', save: vi.fn() };
    TipoPersonal.findOne.mockResolvedValueOnce(tipo).mockResolvedValueOnce({ id: 2, nombre: 'B' });
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '1' }, body: { nombre: 'B' } });
    await promesa;
    expect(res._status).toBe(409);
    expect(tipo.save).not.toHaveBeenCalled();
  });

  it('eliminar no borra un tipo que tiene personal', async () => {
    Personal.count.mockResolvedValue(2);
    const { promesa, res } = llamar(ctrl.eliminar, { params: { id: '1' } });
    await promesa;
    expect(res._status).toBe(409);
    expect(TipoPersonal.destroy).not.toHaveBeenCalled();
  });
});
