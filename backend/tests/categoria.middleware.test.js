import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Plantilla, PlantillaJugador, Partido } from './helpers/models.js';

import { restringirACategoria, porPlantilla } from '../src/middlewares/categoria.middleware.js';

const ENTRENADOR = { id: 20, rol: 'entrenador', id_categoria: 30 };
const COORDINADOR = { id: 1, rol: 'coordinador', id_categoria: null };

/** Ejecuta el middleware; devuelve { pasa, status, json } (json: lo que llega al cliente). */
async function pasar(mw, { user = ENTRENADOR, method = 'GET', path = '/', query = {}, body = {} } = {}, datosListado) {
  const res = {
    _status: 200, _json: undefined,
    status(c) { this._status = c; return this; },
    json(d) { this._json = d; return this; }
  };
  let pasa = false;
  await new Promise((resolve) => {
    const next = (err) => { if (err) throw err; pasa = true; resolve(); };
    const r = mw({ user, method, path, query, body }, res, next);
    Promise.resolve(r).then(() => { if (!pasa) resolve(); });
  });
  if (pasa && datosListado) {
    res.json(datosListado);
    await new Promise((r) => setTimeout(r, 0));
  }
  return { pasa, status: res._status, json: res._json };
}

describe('Solo su categoría (rol entrenador) · categoria.middleware', () => {
  beforeEach(() => {
    Plantilla.findAll.mockReset();
    Plantilla.findAll.mockResolvedValue([{ id: 5 }, { id: 6 }]); // plantillas de la categoría 30
    PlantillaJugador.findAll.mockReset();
    Partido.findByPk.mockReset();
  });

  it('a un coordinador no le aplica nada', async () => {
    const r = await pasar(restringirACategoria(porPlantilla(Partido)), { user: COORDINADOR, path: '/99', query: { id_plantilla: '1' } });
    expect(r.pasa).toBe(true);
    expect(Plantilla.findAll).not.toHaveBeenCalled();
  });

  it('rechaza ?id_plantilla= de otra categoría', async () => {
    const mw = restringirACategoria();
    expect((await pasar(mw, { query: { id_plantilla: '9' } })).status).toBe(403);
    expect((await pasar(mw, { query: { id_plantilla: '5' } })).pasa).toBe(true);
  });

  it('registro: ver/editar/borrar/acciones de un partido de otra categoría -> 403; inexistente -> sigue (404 del controlador)', async () => {
    const mw = restringirACategoria(porPlantilla(Partido));
    Partido.findByPk.mockResolvedValueOnce({ id: 7, id_plantilla: 9 });
    expect((await pasar(mw, { path: '/7/finalizar-acta', method: 'POST' })).status).toBe(403);
    Partido.findByPk.mockResolvedValueOnce({ id: 8, id_plantilla: 5 });
    expect((await pasar(mw, { path: '/8' })).pasa).toBe(true);
    Partido.findByPk.mockResolvedValueOnce(null);
    expect((await pasar(mw, { path: '/404', method: 'DELETE' })).pasa).toBe(true);
  });

  it('cuerpo: no puede crear ni mover un registro a una plantilla de otra categoría', async () => {
    const mw = restringirACategoria(porPlantilla(Partido));
    expect((await pasar(mw, { method: 'POST', body: { id_plantilla: 9 } })).status).toBe(403);
    expect((await pasar(mw, { method: 'POST', body: { id_plantilla: 6 } })).pasa).toBe(true);
    Partido.findByPk.mockResolvedValueOnce({ id: 8, id_plantilla: 5 });
    expect((await pasar(mw, { method: 'PUT', path: '/8', body: { id_plantilla: 9 } })).status).toBe(403);
  });

  it('listado: solo los de su categoría', async () => {
    const mw = restringirACategoria(porPlantilla(Partido));
    const r = await pasar(mw, {}, [{ id: 1, id_plantilla: 5 }, { id: 2, id_plantilla: 9 }, { id: 3, id_plantilla: 6 }]);
    expect(r.json.map((p) => p.id)).toEqual([1, 3]);
  });

  it('rutas bloqueadas', async () => {
    const mw = restringirACategoria({ bloqueadas: ['/temporada'] });
    expect((await pasar(mw, { method: 'POST', path: '/temporada' })).status).toBe(403);
  });

  it('personas: solo las de las plantillas de su categoría', async () => {
    PlantillaJugador.findAll.mockResolvedValue([{ id_jugador: 11 }, { id_jugador: 12 }]);
    const mw = restringirACategoria({
      registro: async (id, ctx) => (await ctx.jugadores()).has(id),
      enListado: async (item, ctx) => (await ctx.jugadores()).has(Number(item.id))
    });
    expect((await pasar(mw, { path: '/13' })).status).toBe(403);
    expect((await pasar(mw, { path: '/12' })).pasa).toBe(true);
    const r = await pasar(mw, {}, [{ id: 11 }, { id: 13 }]);
    expect(r.json).toEqual([{ id: 11 }]);
    expect(PlantillaJugador.findAll).toHaveBeenCalledWith({ where: { id_plantilla: [5, 6] }, attributes: ['id_jugador'] });
  });
});
