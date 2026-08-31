import { describe, it, expect, beforeEach } from 'vitest';
import { Temporada, Jugador } from './helpers/models.js';
import { mockReqRes } from './helpers/http.js';

import * as ctrl from '../src/controllers/import.controller.js';

describe('Importación masiva · import.controller', () => {
  beforeEach(() => {
    Temporada.create.mockReset();
    Jugador.create.mockReset();
  });

  function llamar(fn, overrides = {}) {
    const { req, res, next } = mockReqRes(overrides);
    return { promesa: fn(req, res, next), res, req, next };
  }

  it('rechaza recursos no importables', async () => {
    const { promesa, res } = llamar(ctrl.importar, { params: { recurso: 'noexiste' }, body: { filas: [] } });
    await promesa;
    expect(res._status).toBe(404);
  });

  it('rechaza importación sin filas', async () => {
    const { promesa, res } = llamar(ctrl.importar, { params: { recurso: 'temporadas' }, body: { filas: [] } });
    await promesa;
    expect(res._status).toBe(400);
  });

  it('importa solo campos de la lista blanca', async () => {
    Temporada.create.mockResolvedValue({ id: 1 });
    const { promesa, res } = llamar(ctrl.importar, {
      params: { recurso: 'temporadas' },
      body: { filas: [{ nombre: '2026/27', id: 999, extra: 'ignored' }] }
    });
    await promesa;
    expect(Temporada.create).toHaveBeenCalledWith({ nombre: '2026/27' });
    expect(res._json.insertados).toBe(1);
  });

  it('ignora campos id aunque vengan en las filas', async () => {
    Temporada.create.mockResolvedValue({ id: 1 });
    const { promesa, res } = llamar(ctrl.importar, {
      params: { recurso: 'temporadas' },
      body: { filas: [{ id: 1, nombre: '2027/28' }] }
    });
    await promesa;
    expect(Temporada.create).toHaveBeenCalledWith({ nombre: '2027/28' });
  });

  it('registra errores por fila sin detener el lote', async () => {
    Temporada.create.mockResolvedValueOnce({ id: 1 });
    Temporada.create.mockRejectedValueOnce(new Error('duplicado'));
    const { promesa, res } = llamar(ctrl.importar, {
      params: { recurso: 'temporadas' },
      body: { filas: [{ nombre: 'A' }, { nombre: 'B' }] }
    });
    await promesa;
    expect(res._json.insertados).toBe(1);
    expect(res._json.errores).toHaveLength(1);
    expect(res._json.errores[0].fila).toBe(3);
  });

  it('rechaza filas sin datos válidos para el recurso', async () => {
    const { promesa, res } = llamar(ctrl.importar, {
      params: { recurso: 'temporadas' },
      body: { filas: [{ desconocido: 'x' }] }
    });
    await promesa;
    expect(res._json.insertados).toBe(0);
    expect(res._json.errores).toHaveLength(1);
  });
});
