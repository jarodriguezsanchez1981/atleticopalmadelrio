import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Convocatoria, ConvocatoriaJugador, ConvocatoriaSinJugador, Temporada, Plantilla, Partido, PlantillaJugador, PartidoJugador, Categoria, Promocion, ConvocatoriaPromocion } from './helpers/models.js';
import { mockReqRes } from './helpers/http.js';
import { mailer } from './helpers/models.js';

import * as ctrl from '../src/controllers/convocatoria.controller.js';

describe('Sección Convocatorias · convocatoria.controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function llamar(fn, overrides = {}) {
    const { req, res, next } = mockReqRes(overrides);
    return { promesa: fn(req, res, next), res, req, next };
  }

  it('listar devuelve las convocatorias', async () => {
    Convocatoria.findAll.mockResolvedValue([{ id: 1, toJSON: () => ({ id: 1 }) }]);
    const { promesa, res } = llamar(ctrl.listar);
    await promesa;
    expect(res._json).toHaveLength(1);
  });

  it('listar filtra por temporada, plantilla y partido', async () => {
    Convocatoria.findAll.mockResolvedValue([]);
    const { promesa } = llamar(ctrl.listar, { query: { id_temporada: '2', id_plantilla: '5', id_partido: '9' } });
    await promesa;
    const where = Convocatoria.findAll.mock.calls[0][0].where;
    expect(where).toMatchObject({ id_temporada: '2', id_plantilla: '5', id_partido: '9' });
  });

  it('obtener devuelve 404 si no existe', async () => {
    Convocatoria.findByPk.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.obtener, { params: { id: '99' } });
    await promesa;
    expect(res._status).toBe(404);
  });

  it('crear exige temporada, plantilla y partido', async () => {
    const { promesa, res } = llamar(ctrl.crear, { body: { id_temporada: 1 } });
    await promesa;
    expect(res._status).toBe(400);
    expect(Convocatoria.create).not.toHaveBeenCalled();
  });

  it('crear valida que la temporada exista', async () => {
    Temporada.findByPk.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.crear, {
      body: { id_temporada: 1, id_plantilla: 2, id_partido: 3, jugadores: [10] }
    });
    await promesa;
    expect(res._status).toBe(400);
    expect(res._json.message).toBe('La temporada indicada no existe.');
  });

  it('crear valida que la plantilla pertenezca a la temporada', async () => {
    Temporada.findByPk.mockResolvedValue({ id: 1 });
    Plantilla.findByPk.mockResolvedValue({ id: 2, id_temporada: 99 });
    const { promesa, res } = llamar(ctrl.crear, {
      body: { id_temporada: 1, id_plantilla: 2, id_partido: 3, jugadores: [10] }
    });
    await promesa;
    expect(res._status).toBe(400);
    expect(res._json.message).toBe('La plantilla no pertenece a la temporada indicada.');
  });

  it('crear valida que el partido pertenezca a la plantilla', async () => {
    Temporada.findByPk.mockResolvedValue({ id: 1 });
    Plantilla.findByPk.mockResolvedValue({ id: 2, id_temporada: 1 });
    Partido.findByPk.mockResolvedValue({ id: 3, id_plantilla: 99 });
    const { promesa, res } = llamar(ctrl.crear, {
      body: { id_temporada: 1, id_plantilla: 2, id_partido: 3, jugadores: [10] }
    });
    await promesa;
    expect(res._status).toBe(400);
    expect(res._json.message).toBe('El partido no pertenece a la plantilla indicada.');
  });

  it('crear rechaza un segundo registro para el mismo partido', async () => {
    Temporada.findByPk.mockResolvedValue({ id: 1 });
    Plantilla.findByPk.mockResolvedValue({ id: 2, id_temporada: 1 });
    Partido.findByPk.mockResolvedValue({ id: 3, id_plantilla: 2, id_equipo_local: 73 });
    Convocatoria.findOne.mockResolvedValue({ id: 5 });
    const { promesa, res } = llamar(ctrl.crear, {
      body: { id_temporada: 1, id_plantilla: 2, id_partido: 3, jugadores: [10] }
    });
    await promesa;
    expect(res._status).toBe(409);
  });

  it('crear rechaza jugadores que no pertenecen a la plantilla', async () => {
    Temporada.findByPk.mockResolvedValue({ id: 1 });
    Plantilla.findByPk.mockResolvedValue({ id: 2, id_temporada: 1 });
    Partido.findByPk.mockResolvedValue({ id: 3, id_plantilla: 2, id_equipo_local: 73 });
    Convocatoria.findOne.mockResolvedValue(null);
    PlantillaJugador.findAll.mockResolvedValue([{ id_jugador: 10 }]);
    const { promesa, res } = llamar(ctrl.crear, {
      body: { id_temporada: 1, id_plantilla: 2, id_partido: 3, jugadores: [10, 11] }
    });
    await promesa;
    expect(res._status).toBe(400);
    expect(res._json.message).toBe('Algún jugador indicado no pertenece a la plantilla.');
    expect(Convocatoria.create).not.toHaveBeenCalled();
  });

  it('crear rechaza jugadores no convocados que no pertenecen a la plantilla', async () => {
    Temporada.findByPk.mockResolvedValue({ id: 1 });
    Plantilla.findByPk.mockResolvedValue({ id: 2, id_temporada: 1 });
    Partido.findByPk.mockResolvedValue({ id: 3, id_plantilla: 2, id_equipo_local: 73 });
    Convocatoria.findOne.mockResolvedValue(null);
    PlantillaJugador.findAll.mockResolvedValue([{ id_jugador: 10 }]);
    const { promesa, res } = llamar(ctrl.crear, {
      body: { id_temporada: 1, id_plantilla: 2, id_partido: 3, jugadores: [10], no_convocados: [{ id_jugador: 99, observaciones: 'lesión' }] }
    });
    await promesa;
    expect(res._status).toBe(400);
    expect(res._json.message).toBe('Algún jugador indicado no pertenece a la plantilla.');
    expect(Convocatoria.create).not.toHaveBeenCalled();
  });

  it('crear guarda los jugadores no convocados con sus observaciones', async () => {
    Temporada.findByPk.mockResolvedValue({ id: 1 });
    Plantilla.findByPk.mockResolvedValue({ id: 2, id_temporada: 1 });
    Partido.findByPk.mockResolvedValue({ id: 3, id_plantilla: 2, id_equipo_local: 73, id_equipo_visitante: 50 });
    Convocatoria.findOne.mockResolvedValue(null);
    PlantillaJugador.findAll.mockResolvedValue([{ id_jugador: 10 }, { id_jugador: 11 }]);
    Convocatoria.create.mockResolvedValue({ id: 7 });
    ConvocatoriaJugador.bulkCreate.mockResolvedValue([]);
    ConvocatoriaSinJugador.bulkCreate.mockResolvedValue([]);
    PartidoJugador.findOrCreate.mockResolvedValue([{ id: 1 }, true]);
    Convocatoria.findByPk.mockResolvedValue({ id: 7, toJSON: () => ({ id: 7 }) });

    const { promesa, res } = llamar(ctrl.crear, {
      body: {
        id_temporada: 1, id_plantilla: 2, id_partido: 3,
        jugadores: [10],
        no_convocados: [{ id_jugador: 11, observaciones: 'Lesionado' }]
      }
    });
    await promesa;

    expect(ConvocatoriaSinJugador.bulkCreate).toHaveBeenCalledWith(
      [{ id_convocatoria: 7, id_plantilla: 2, id_jugador: 11, observaciones: 'Lesionado', lesion: false, sancion: false }],
      { ignoreDuplicates: true }
    );
    expect(res._status).toBe(201);
  });

  it('crear guarda los lesionados con lesion=true (y cuentan como lesionado aunque vengan también como no convocados)', async () => {
    Temporada.findByPk.mockResolvedValue({ id: 1 });
    Plantilla.findByPk.mockResolvedValue({ id: 2, id_temporada: 1 });
    Partido.findByPk.mockResolvedValue({ id: 3, id_plantilla: 2, id_equipo_local: 73, id_equipo_visitante: 50 });
    Convocatoria.findOne.mockResolvedValue(null);
    PlantillaJugador.findAll.mockResolvedValue([{ id_jugador: 10 }, { id_jugador: 11 }, { id_jugador: 12 }]);
    Convocatoria.create.mockResolvedValue({ id: 7 });
    ConvocatoriaJugador.bulkCreate.mockResolvedValue([]);
    ConvocatoriaSinJugador.bulkCreate.mockResolvedValue([]);
    PartidoJugador.findOrCreate.mockResolvedValue([{ id: 1 }, true]);
    Convocatoria.findByPk.mockResolvedValue({ id: 7, toJSON: () => ({ id: 7 }) });

    const { promesa, res } = llamar(ctrl.crear, {
      body: {
        id_temporada: 1, id_plantilla: 2, id_partido: 3,
        jugadores: [10],
        no_convocados: [{ id_jugador: 11, observaciones: 'Técnico' }, { id_jugador: 12 }],
        lesionados: [{ id_jugador: 12, observaciones: 'Rodilla' }, { id_jugador: 10, observaciones: 'convocado' }]
      }
    });
    await promesa;

    expect(ConvocatoriaSinJugador.bulkCreate).toHaveBeenCalledWith(
      [
        { id_convocatoria: 7, id_plantilla: 2, id_jugador: 12, observaciones: 'Rodilla', lesion: true, sancion: false },
        { id_convocatoria: 7, id_plantilla: 2, id_jugador: 11, observaciones: 'Técnico', lesion: false, sancion: false }
      ],
      { ignoreDuplicates: true }
    );
    expect(res._status).toBe(201);
  });

  it('crear guarda los sancionados con sancion=true (el lesionado tiene prioridad)', async () => {
    Temporada.findByPk.mockResolvedValue({ id: 1 });
    Plantilla.findByPk.mockResolvedValue({ id: 2, id_temporada: 1 });
    Partido.findByPk.mockResolvedValue({ id: 3, id_plantilla: 2, id_equipo_local: 73, id_equipo_visitante: 50 });
    Convocatoria.findOne.mockResolvedValue(null);
    PlantillaJugador.findAll.mockResolvedValue([{ id_jugador: 10 }, { id_jugador: 11 }, { id_jugador: 12 }]);
    Convocatoria.create.mockResolvedValue({ id: 7 });
    ConvocatoriaJugador.bulkCreate.mockResolvedValue([]);
    ConvocatoriaSinJugador.bulkCreate.mockResolvedValue([]);
    PartidoJugador.findOrCreate.mockResolvedValue([{ id: 1 }, true]);
    Convocatoria.findByPk.mockResolvedValue({ id: 7, toJSON: () => ({ id: 7 }) });

    const { promesa } = llamar(ctrl.crear, {
      body: {
        id_temporada: 1, id_plantilla: 2, id_partido: 3, jugadores: [10],
        lesionados: [{ id_jugador: 12 }],
        sancionados: [{ id_jugador: 11, observaciones: '5 amarillas' }, { id_jugador: 12 }]
      }
    });
    await promesa;

    expect(ConvocatoriaSinJugador.bulkCreate).toHaveBeenCalledWith(
      [
        { id_convocatoria: 7, id_plantilla: 2, id_jugador: 12, observaciones: null, lesion: true, sancion: false },
        { id_convocatoria: 7, id_plantilla: 2, id_jugador: 11, observaciones: '5 amarillas', lesion: false, sancion: true }
      ],
      { ignoreDuplicates: true }
    );
  });

  it('crear prioriza convocado si el mismo jugador viene también como no convocado', async () => {
    Temporada.findByPk.mockResolvedValue({ id: 1 });
    Plantilla.findByPk.mockResolvedValue({ id: 2, id_temporada: 1 });
    Partido.findByPk.mockResolvedValue({ id: 3, id_plantilla: 2, id_equipo_local: 73, id_equipo_visitante: 50 });
    Convocatoria.findOne.mockResolvedValue(null);
    PlantillaJugador.findAll.mockResolvedValue([{ id_jugador: 10 }]);
    Convocatoria.create.mockResolvedValue({ id: 7 });
    ConvocatoriaJugador.bulkCreate.mockResolvedValue([]);
    ConvocatoriaSinJugador.bulkCreate.mockResolvedValue([]);
    PartidoJugador.findOrCreate.mockResolvedValue([{ id: 1 }, true]);
    Convocatoria.findByPk.mockResolvedValue({ id: 7, toJSON: () => ({ id: 7 }) });

    const { promesa } = llamar(ctrl.crear, {
      body: {
        id_temporada: 1, id_plantilla: 2, id_partido: 3,
        jugadores: [10],
        no_convocados: [{ id_jugador: 10, observaciones: 'no debería guardarse' }]
      }
    });
    await promesa;

    expect(ConvocatoriaJugador.bulkCreate).toHaveBeenCalledWith(
      [{ id_convocatoria: 7, id_jugador: 10 }],
      { ignoreDuplicates: true }
    );
    expect(ConvocatoriaSinJugador.bulkCreate).not.toHaveBeenCalled();
  });

  function prepararCrearConPromocion({ ordenOrigen = 8, temporadaOrigen = 1 } = {}) {
    Temporada.findByPk.mockResolvedValue({ id: 1 });
    Plantilla.findByPk.mockImplementation(async (id) => (
      Number(id) === 2
        ? { id: 2, id_temporada: 1, id_categoria: 30 }
        : { id: 9, id_temporada: temporadaOrigen, id_categoria: 40, categoria: { id: 40, orden: ordenOrigen } }
    ));
    Categoria.findByPk.mockResolvedValue({ id: 30, orden: 11 });
    Partido.findByPk.mockResolvedValue({ id: 3, id_plantilla: 2, id_equipo_local: 73, id_equipo_visitante: 50 });
    Convocatoria.findOne.mockResolvedValue(null);
    PlantillaJugador.findAll.mockImplementation(async ({ where }) => where.id_jugador.map((id_jugador) => ({ id_jugador })));
    Convocatoria.create.mockResolvedValue({ id: 7 });
    ConvocatoriaJugador.bulkCreate.mockResolvedValue([]);
    PartidoJugador.findOrCreate.mockResolvedValue([{ id: 1 }, true]);
    Promocion.findOrCreate.mockResolvedValue([{ id: 1 }, true]);
    Convocatoria.findByPk.mockResolvedValue({ id: 7, toJSON: () => ({ id: 7 }) });
  }

  it('crear guarda en promociones los jugadores promocionados, con la categoría de la convocatoria como destino', async () => {
    prepararCrearConPromocion();

    const { promesa, res } = llamar(ctrl.crear, {
      body: {
        id_temporada: 1, id_plantilla: 2, id_partido: 3, jugadores: [10],
        promociones: [{ id_plantilla: 9, id_jugador: 50 }, { id_plantilla: 9, id_jugador: 50 }]
      }
    });
    await promesa;

    expect(res._status).toBe(201);
    expect(ConvocatoriaPromocion.bulkCreate).toHaveBeenCalledWith(
      [{ id_convocatoria: 7, id_plantilla: 9, id_jugador: 50 }],
      { ignoreDuplicates: true }
    );
    expect(Promocion.findOrCreate).toHaveBeenCalledTimes(1);
    expect(Promocion.findOrCreate).toHaveBeenCalledWith({
      where: { id_plantilla: 9, id_jugador: 50 },
      defaults: { id_plantilla: 9, id_jugador: 50, id_categoria: 30 }
    });
  });

  it('crear rechaza promociones desde una categoría de orden superior', async () => {
    prepararCrearConPromocion({ ordenOrigen: 14 });

    const { promesa, res } = llamar(ctrl.crear, {
      body: { id_temporada: 1, id_plantilla: 2, id_partido: 3, jugadores: [10], promociones: [{ id_plantilla: 9, id_jugador: 50 }] }
    });
    await promesa;

    expect(res._status).toBe(400);
    expect(Convocatoria.create).not.toHaveBeenCalled();
    expect(Promocion.findOrCreate).not.toHaveBeenCalled();
  });

  it('crear rechaza promociones desde una plantilla de otra temporada', async () => {
    prepararCrearConPromocion({ temporadaOrigen: 99 });

    const { promesa, res } = llamar(ctrl.crear, {
      body: { id_temporada: 1, id_plantilla: 2, id_partido: 3, jugadores: [10], promociones: [{ id_plantilla: 9, id_jugador: 50 }] }
    });
    await promesa;

    expect(res._status).toBe(400);
    expect(Convocatoria.create).not.toHaveBeenCalled();
  });

  it('crear crea la convocatoria, sus jugadores y los sincroniza con partido_jugadores', async () => {
    Temporada.findByPk.mockResolvedValue({ id: 1 });
    Plantilla.findByPk.mockResolvedValue({ id: 2, id_temporada: 1 });
    Partido.findByPk.mockResolvedValue({ id: 3, id_plantilla: 2, id_equipo_local: 73, id_equipo_visitante: 50 });
    Convocatoria.findOne.mockResolvedValue(null);
    PlantillaJugador.findAll.mockResolvedValue([{ id_jugador: 10 }, { id_jugador: 11 }]);
    Convocatoria.create.mockResolvedValue({ id: 7 });
    ConvocatoriaJugador.bulkCreate.mockResolvedValue([]);
    PartidoJugador.findOrCreate.mockResolvedValue([{ id: 1 }, true]);
    Convocatoria.findByPk.mockResolvedValue({ id: 7, toJSON: () => ({ id: 7 }) });

    const { promesa, res } = llamar(ctrl.crear, {
      body: { id_temporada: 1, id_plantilla: 2, id_partido: 3, jugadores: [10, 11, 10] }
    });
    await promesa;

    expect(Convocatoria.create).toHaveBeenCalledWith({ id_temporada: 1, id_plantilla: 2, id_partido: 3 });
    expect(ConvocatoriaJugador.bulkCreate).toHaveBeenCalledWith(
      [{ id_convocatoria: 7, id_jugador: 10 }, { id_convocatoria: 7, id_jugador: 11 }],
      { ignoreDuplicates: true }
    );
    // El PALMA es local en este partido: es_local debe ser true.
    expect(PartidoJugador.findOrCreate).toHaveBeenCalledWith({
      where: { id_partido: 3, id_jugador: 10, es_local: true },
      defaults: { id_partido: 3, id_jugador: 10, es_local: true }
    });
    expect(res._status).toBe(201);
  });

  it('crear marca es_local=false si el PALMA juega como visitante', async () => {
    Temporada.findByPk.mockResolvedValue({ id: 1 });
    Plantilla.findByPk.mockResolvedValue({ id: 2, id_temporada: 1 });
    Partido.findByPk.mockResolvedValue({ id: 3, id_plantilla: 2, id_equipo_local: 50, id_equipo_visitante: 73 });
    Convocatoria.findOne.mockResolvedValue(null);
    PlantillaJugador.findAll.mockResolvedValue([{ id_jugador: 10 }]);
    Convocatoria.create.mockResolvedValue({ id: 7 });
    ConvocatoriaJugador.bulkCreate.mockResolvedValue([]);
    PartidoJugador.findOrCreate.mockResolvedValue([{ id: 1 }, true]);
    Convocatoria.findByPk.mockResolvedValue({ id: 7, toJSON: () => ({ id: 7 }) });

    const { promesa } = llamar(ctrl.crear, {
      body: { id_temporada: 1, id_plantilla: 2, id_partido: 3, jugadores: [10] }
    });
    await promesa;

    expect(PartidoJugador.findOrCreate).toHaveBeenCalledWith({
      where: { id_partido: 3, id_jugador: 10, es_local: false },
      defaults: { id_partido: 3, id_jugador: 10, es_local: false }
    });
  });

  it('actualizar devuelve 404 si no existe', async () => {
    Convocatoria.findByPk.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '99' }, body: { jugadores: [] } });
    await promesa;
    expect(res._status).toBe(404);
  });

  it('actualizar reemplaza la lista de jugadores y sincroniza partido_jugadores', async () => {
    const registro = { id: 7, id_partido: 3, id_plantilla: 2 };
    Convocatoria.findByPk
      .mockResolvedValueOnce(registro)
      .mockResolvedValueOnce({ id: 7, toJSON: () => ({ id: 7 }) });
    Partido.findByPk.mockResolvedValue({ id: 3, id_equipo_local: 73, id_equipo_visitante: 50 });
    PlantillaJugador.findAll.mockResolvedValue([{ id_jugador: 12 }]);
    ConvocatoriaJugador.destroy.mockResolvedValue(1);
    ConvocatoriaJugador.bulkCreate.mockResolvedValue([]);
    PartidoJugador.findOrCreate.mockResolvedValue([{ id: 1 }, true]);

    const { promesa, res } = llamar(ctrl.actualizar, {
      params: { id: '7' }, body: { jugadores: [12] }
    });
    await promesa;

    expect(ConvocatoriaJugador.destroy).toHaveBeenCalledWith({ where: { id_convocatoria: 7 } });
    expect(ConvocatoriaJugador.bulkCreate).toHaveBeenCalledWith(
      [{ id_convocatoria: 7, id_jugador: 12 }],
      { ignoreDuplicates: true }
    );
    expect(res._status).toBe(200);
  });

  it('actualizar reemplaza también la lista de no convocados', async () => {
    const registro = { id: 7, id_partido: 3, id_plantilla: 2 };
    Convocatoria.findByPk
      .mockResolvedValueOnce(registro)
      .mockResolvedValueOnce({ id: 7, toJSON: () => ({ id: 7 }) });
    Partido.findByPk.mockResolvedValue({ id: 3, id_equipo_local: 73, id_equipo_visitante: 50 });
    PlantillaJugador.findAll.mockResolvedValue([{ id_jugador: 12 }, { id_jugador: 13 }]);
    ConvocatoriaJugador.destroy.mockResolvedValue(1);
    ConvocatoriaJugador.bulkCreate.mockResolvedValue([]);
    ConvocatoriaSinJugador.destroy.mockResolvedValue(1);
    ConvocatoriaSinJugador.bulkCreate.mockResolvedValue([]);
    PartidoJugador.findOrCreate.mockResolvedValue([{ id: 1 }, true]);

    const { promesa } = llamar(ctrl.actualizar, {
      params: { id: '7' },
      body: { jugadores: [12], no_convocados: [{ id_jugador: 13, observaciones: 'Sanción' }] }
    });
    await promesa;

    expect(ConvocatoriaSinJugador.destroy).toHaveBeenCalledWith({ where: { id_convocatoria: 7 } });
    expect(ConvocatoriaSinJugador.bulkCreate).toHaveBeenCalledWith(
      [{ id_convocatoria: 7, id_plantilla: 2, id_jugador: 13, observaciones: 'Sanción', lesion: false, sancion: false }],
      { ignoreDuplicates: true }
    );
  });

  it('actualizar: si un no convocado pasa a convocado, desaparece de no convocados', async () => {
    const registro = { id: 7, id_partido: 3, id_plantilla: 2 };
    Convocatoria.findByPk
      .mockResolvedValueOnce(registro)
      .mockResolvedValueOnce({ id: 7, toJSON: () => ({ id: 7 }) });
    Partido.findByPk.mockResolvedValue({ id: 3, id_equipo_local: 73, id_equipo_visitante: 50 });
    PlantillaJugador.findAll.mockResolvedValue([{ id_jugador: 13 }]);
    ConvocatoriaJugador.destroy.mockResolvedValue(1);
    ConvocatoriaJugador.bulkCreate.mockResolvedValue([]);
    ConvocatoriaSinJugador.destroy.mockResolvedValue(1);
    ConvocatoriaSinJugador.bulkCreate.mockResolvedValue([]);
    PartidoJugador.findOrCreate.mockResolvedValue([{ id: 1 }, true]);

    // El jugador 13 estaba en "no convocados" y ahora se manda también en
    // "jugadores" (se ha movido a convocado): debe quedarse solo ahí.
    const { promesa } = llamar(ctrl.actualizar, {
      params: { id: '7' },
      body: { jugadores: [13], no_convocados: [{ id_jugador: 13, observaciones: 'ya no aplica' }] }
    });
    await promesa;

    expect(ConvocatoriaJugador.bulkCreate).toHaveBeenCalledWith(
      [{ id_convocatoria: 7, id_jugador: 13 }],
      { ignoreDuplicates: true }
    );
    expect(ConvocatoriaSinJugador.bulkCreate).not.toHaveBeenCalled();
  });

  it('eliminar responde 404 si no existe', async () => {
    Convocatoria.findByPk.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.eliminar, { params: { id: '99' } });
    await promesa;
    expect(res._status).toBe(404);
  });

  it('eliminar quita de promociones a sus promocionados salvo que otra convocatoria los use', async () => {
    const destroy = vi.fn().mockResolvedValue();
    Convocatoria.findByPk.mockResolvedValue({ id: 1, id_partido: 3, destroy });
    Partido.findByPk.mockResolvedValue({ id: 3, fecha: new Date(Date.now() + 24 * 60 * 60 * 1000) });
    ConvocatoriaPromocion.findAll.mockResolvedValue([
      { id_plantilla: 9, id_jugador: 50 },
      { id_plantilla: 9, id_jugador: 51 }
    ]);
    ConvocatoriaPromocion.count.mockImplementation(async ({ where }) => (where.id_jugador === 51 ? 1 : 0));
    Promocion.destroy.mockResolvedValue(1);

    const { promesa, res } = llamar(ctrl.eliminar, { params: { id: '1' } });
    await promesa;

    expect(res._status).toBe(204);
    expect(Promocion.destroy).toHaveBeenCalledTimes(1);
    expect(Promocion.destroy).toHaveBeenCalledWith({ where: { id_plantilla: 9, id_jugador: 50 } });
  });

  it('eliminar responde 204 si el partido todavía no se ha jugado', async () => {
    const destroy = vi.fn().mockResolvedValue();
    ConvocatoriaPromocion.findAll.mockResolvedValue([]);
    Convocatoria.findByPk.mockResolvedValue({ id: 1, id_partido: 3, destroy });
    const enElFuturo = new Date(Date.now() + 24 * 60 * 60 * 1000);
    Partido.findByPk.mockResolvedValue({ id: 3, fecha: enElFuturo });
    const { promesa, res } = llamar(ctrl.eliminar, { params: { id: '1' } });
    await promesa;
    expect(destroy).toHaveBeenCalled();
    expect(res._status).toBe(204);
  });

  it('eliminar rechaza borrar la convocatoria de un partido ya jugado', async () => {
    const destroy = vi.fn();
    Convocatoria.findByPk.mockResolvedValue({ id: 1, id_partido: 3, destroy });
    const enElPasado = new Date(Date.now() - 24 * 60 * 60 * 1000);
    Partido.findByPk.mockResolvedValue({ id: 3, fecha: enElPasado });
    const { promesa, res } = llamar(ctrl.eliminar, { params: { id: '1' } });
    await promesa;
    expect(destroy).not.toHaveBeenCalled();
    expect(res._status).toBe(409);
  });

  it('eliminar permite a un administrador borrar la convocatoria de un partido ya jugado', async () => {
    const destroy = vi.fn().mockResolvedValue();
    ConvocatoriaPromocion.findAll.mockResolvedValue([]);
    Convocatoria.findByPk.mockResolvedValue({ id: 1, id_partido: 3, destroy });
    const enElPasado = new Date(Date.now() - 24 * 60 * 60 * 1000);
    Partido.findByPk.mockResolvedValue({ id: 3, fecha: enElPasado });
    const user = { id: 1, usuario: 'admin', secciones: ['administracion'], permisos: { administracion: { ver: true, editar: true } } };
    const { promesa, res } = llamar(ctrl.eliminar, { params: { id: '1' }, user });
    await promesa;
    expect(destroy).toHaveBeenCalled();
    expect(res._status).toBe(204);
  });
  describe('enviarCorreo', () => {
    const convocatoria = (categoria = 'Senior A') => ({
      id: 3,
      plantilla: { categoria: { nombre: categoria } },
      partido: {
        jornada: 9,
        fecha: '2026-11-01T16:30:00.000Z', // 17:30 en España (horario de invierno)
        equipoLocal: { nombre: 'PALMA DEL RIO ATLETICO C.F.' },
        equipoVisitante: { nombre: 'C.D. Rival <B>' }
      },
      jugadores: [
        { jugador: { nombre: 'Zoe', apellidos: 'Álvarez' } },
        { jugador: { nombre: 'Ana', apellidos: 'Pérez' } }
      ],
      promocionados: [{ jugador: { nombre: 'Luis', apellidos: 'García' } }],
      noConvocados: [
        { jugador: { nombre: 'Juan', apellidos: 'Ruiz' }, observaciones: 'Lesionado' },
        { jugador: { nombre: 'Pedro', apellidos: 'Sanz' }, observaciones: 'Tobillo', lesion: true },
        { jugador: { nombre: 'Raúl', apellidos: 'Gil' }, observaciones: 'Roja', sancion: true }
      ]
    });

    beforeEach(() => {
      mailer.enviarDesde.mockReset();
      mailer.enviarDesde.mockResolvedValue({});
    });

    it('envía desde convocatoria@ con la jornada y el partido en el asunto y los jugadores ordenados', async () => {
      Convocatoria.findByPk.mockResolvedValue(convocatoria());
      const { promesa, res } = llamar(ctrl.enviarCorreo, { params: { id: '3' } });
      await promesa;
      expect(res._status).not.toBe(400);
      const [desde, correo] = mailer.enviarDesde.mock.calls[0];
      expect(desde).toBe('convocatoria@atleticopalmadelrio.com');
      expect(correo.to).toBe('pablo.navarro.corredera@atleticopalmadelrio.com');
      expect(correo.subject).toBe('Jornada 9: PALMA DEL RIO ATLETICO C.F. - C.D. Rival <B>');
      expect(correo.text).toContain('domingo 01/11/2026 a las 17:30');
      expect(correo.text).toContain('1. Zoe Álvarez\n2. Luis García (promoción)\n3. Ana Pérez');
      expect(correo.text).toContain('No convocados (1):\n- Juan Ruiz: Lesionado');
      expect(correo.text).toContain('Lesionados (1):\n- Pedro Sanz: Tobillo');
      expect(correo.text).toContain('Sancionados (1):\n- Raúl Gil: Roja');
      expect(correo.html).toContain('C.D. Rival &lt;B&gt;');
    });

    it('solo para Senior A', async () => {
      Convocatoria.findByPk.mockResolvedValue(convocatoria('Juvenil A'));
      const { promesa, res } = llamar(ctrl.enviarCorreo, { params: { id: '3' } });
      await promesa;
      expect(res._status).toBe(400);
      expect(mailer.enviarDesde).not.toHaveBeenCalled();
    });

    it('avisa si la cuenta de convocatorias no está en Correos', async () => {
      Convocatoria.findByPk.mockResolvedValue(convocatoria());
      mailer.enviarDesde.mockRejectedValue(Object.assign(new Error('La cuenta de correo convocatoria@atleticopalmadelrio.com no está registrada en Correos.'), { sinCuenta: true }));
      const { promesa, res } = llamar(ctrl.enviarCorreo, { params: { id: '3' } });
      await promesa;
      expect(res._status).toBe(400);
      expect(res._json.message).toContain('no está registrada en Correos');
    });

    it('404 si no existe', async () => {
      Convocatoria.findByPk.mockResolvedValue(null);
      const { promesa, res } = llamar(ctrl.enviarCorreo, { params: { id: '99' } });
      await promesa;
      expect(res._status).toBe(404);
    });
  });
});
