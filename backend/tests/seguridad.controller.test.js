import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InformeSeguridad } from './helpers/models.js';
import { mockReqRes } from './helpers/http.js';

import * as ctrl from '../src/controllers/seguridad.controller.js';

describe('Seguridad · seguridad.controller', () => {
  beforeEach(() => {
    InformeSeguridad.findOne.mockReset();
  });

  it('estado devuelve el último informe (orden por fecha descendente)', async () => {
    const informe = { id: 3, fecha: '2026-10-21', hay_vulnerabilidades: true, total_high: 5 };
    InformeSeguridad.findOne.mockResolvedValue(informe);
    const { req, res } = mockReqRes();
    const next = vi.fn();

    await ctrl.estado(req, res, next);

    expect(InformeSeguridad.findOne).toHaveBeenCalledWith(expect.objectContaining({
      order: [['fecha', 'DESC'], ['id', 'DESC']]
    }));
    expect(res._json).toEqual({ informe });
    expect(next).not.toHaveBeenCalled();
  });

  it('estado devuelve informe null cuando no hay ninguno (no 404)', async () => {
    InformeSeguridad.findOne.mockResolvedValue(null);
    const { req, res } = mockReqRes();
    const next = vi.fn();

    await ctrl.estado(req, res, next);

    expect(res._json).toEqual({ informe: null });
    expect(res._status).toBe(200);
    expect(next).not.toHaveBeenCalled();
  });

  it('estado propaga el error a next si falla la consulta', async () => {
    const error = new Error('fallo BD');
    InformeSeguridad.findOne.mockRejectedValue(error);
    const { req, res } = mockReqRes();
    const next = vi.fn();

    await ctrl.estado(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});
