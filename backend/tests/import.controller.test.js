import { describe, it, expect, beforeEach } from 'vitest';
import { Op } from 'sequelize';
import { Temporada, Jugador, Categoria, Plantilla, Equipo, Jornada, Partido } from './helpers/models.js';
import { mockReqRes } from './helpers/http.js';

import * as ctrl from '../src/controllers/import.controller.js';

describe('Importación masiva · import.controller', () => {
  beforeEach(() => {
    Temporada.create.mockReset();
    Jugador.create.mockReset();
    Temporada.findOne.mockReset();
    Categoria.findOne.mockReset();
    Plantilla.findOne.mockReset();
    Equipo.findOne.mockReset();
    Equipo.create.mockReset();
    Jornada.findOne.mockReset();
    Jornada.create.mockReset();
    Partido.create.mockReset();
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

  describe('importación especial de jornadas', () => {
    function filaOk(overrides = {}) {
      return {
        Plantilla: 'Alevin A / 2026/2027',
        Jornada: 3,
        Fecha: '01/03/2026',
        EquipoLocal: 'Atlético Palma',
        EquipoVisitante: 'Nuevo CF',
        ...overrides
      };
    }

    function mockPlantillaOk() {
      Categoria.findOne.mockResolvedValue({ id: 1, nombre: 'Alevin A' });
      Temporada.findOne.mockResolvedValue({ id: 2, nombre: '2026/2027' });
      Plantilla.findOne.mockResolvedValue({ id: 5 });
    }

    it('reconoce las columnas en minúsculas y con cualquier capitalización', async () => {
      mockPlantillaOk();
      Equipo.findOne.mockResolvedValue({ id: 10 }); // ambos equipos ya existen
      Jornada.findOne.mockResolvedValue(null);
      Jornada.create.mockResolvedValue({ id: 100 });
      Partido.create.mockResolvedValue({ id: 200 });

      const { promesa, res } = llamar(ctrl.importar, {
        params: { recurso: 'jornadas' },
        body: { filas: [filaOk()] }
      });
      await promesa;

      expect(res._json.insertados).toBe(1);
      expect(res._json.errores).toHaveLength(0);
      expect(Jornada.create).toHaveBeenCalledWith(
        expect.objectContaining({ id_plantilla: 5, id_equipo_local: 10, id_equipo_visitante: 10, jornada: 3, fecha: '2026-03-01' })
      );
    });

    it('crea el equipo si no existe y avisa una sola vez por equipo', async () => {
      mockPlantillaOk();
      // Simula persistencia real: una vez creado, la siguiente búsqueda por el mismo nombre lo encuentra.
      const creados = new Map();
      let nextId = 20;
      Equipo.findOne.mockImplementation(async ({ where }) => {
        const nombre = where.nombre[Op.like];
        return creados.get(String(nombre).toLowerCase()) || null;
      });
      Equipo.create.mockImplementation(async ({ nombre }) => {
        const equipo = { id: nextId++, nombre };
        creados.set(nombre.toLowerCase(), equipo);
        return equipo;
      });
      Jornada.findOne.mockResolvedValue(null);
      Jornada.create.mockResolvedValue({ id: 100 });
      Partido.create.mockResolvedValue({ id: 200 });

      const { promesa, res } = llamar(ctrl.importar, {
        params: { recurso: 'jornadas' },
        body: {
          filas: [
            filaOk({ Jornada: 1, Fecha: '01/03/2026' }),
            filaOk({ Jornada: 2, Fecha: '08/03/2026' }) // mismo equipo local/visitante otra vez
          ]
        }
      });
      await promesa;

      expect(res._json.insertados).toBe(2);
      expect(res._json.avisos).toEqual(
        expect.arrayContaining([
          'Se ha añadido el equipo "Atlético Palma" en Equipos.',
          'Se ha añadido el equipo "Nuevo CF" en Equipos.'
        ])
      );
      // Solo un aviso por equipo, aunque aparezca en dos filas
      expect(res._json.avisos).toHaveLength(2);
    });

    it('reporta un error por fila si la plantilla no existe', async () => {
      Categoria.findOne.mockResolvedValue(null);
      const { promesa, res } = llamar(ctrl.importar, {
        params: { recurso: 'jornadas' },
        body: { filas: [filaOk({ Plantilla: 'Inexistente / 2026/2027' })] }
      });
      await promesa;

      expect(res._json.insertados).toBe(0);
      expect(res._json.errores).toHaveLength(1);
      expect(res._json.errores[0].mensaje).toMatch(/Plantilla no encontrada/);
    });

    it('rechaza una jornada duplicada (misma plantilla y fecha)', async () => {
      mockPlantillaOk();
      Equipo.findOne.mockResolvedValue({ id: 10 });
      Jornada.findOne.mockResolvedValue({ id: 999 }); // ya existe

      const { promesa, res } = llamar(ctrl.importar, {
        params: { recurso: 'jornadas' },
        body: { filas: [filaOk()] }
      });
      await promesa;

      expect(res._json.insertados).toBe(0);
      expect(res._json.errores).toHaveLength(1);
      expect(res._json.errores[0].mensaje).toMatch(/ya tiene una jornada programada/);
      expect(Jornada.create).not.toHaveBeenCalled();
    });
  });
});
