import { describe, it, expect, beforeEach } from 'vitest';
import { Seccion } from './helpers/models.js';
import { mockReqRes } from './helpers/http.js';

import * as ctrl from '../src/controllers/seccion.controller.js';

describe('Secciones · seccion.controller', () => {
  beforeEach(() => {
    Seccion.findAll.mockReset();
  });

  it('listar devuelve las secciones ordenadas por orden y id', async () => {
    const secciones = [{ id: 1, clave: 'inicio' }];
    Seccion.findAll.mockResolvedValue(secciones);
    const { req, res, next } = mockReqRes();
    await ctrl.listar(req, res, next);

    expect(Seccion.findAll).toHaveBeenCalledWith({ order: [['orden', 'ASC'], ['id', 'ASC']] });
    expect(res._json).toEqual(secciones);
  });
});