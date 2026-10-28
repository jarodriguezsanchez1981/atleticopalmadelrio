import { describe, it, expect, beforeEach } from 'vitest';
import { Categoria, Plantilla, Promocion } from './helpers/models.js';

import router from '../src/routes/promocion.routes.js';

// Grupos: Juvenil A (18) grupo 7; Senior B (23) y Senior A (20) grupo 8.
const GRUPO = { 18: 7, 23: 8, 20: 8 };
const ENTRENADOR_SENIOR_A = { id: 20, rol: 'entrenador', id_categoria: 20, secciones: ['promociones'] };

/** La capa de restringirACategoria del router (tras authenticate y authorize). */
const capa = () => router.stack.filter((l) => !l.route).at(-1).handle;

async function listar(datos, ruta = '/resumen') {
  const res = { _json: undefined, status() { return this; }, json(d) { this._json = d; return this; } };
  await new Promise((ok) => capa()({ user: ENTRENADOR_SENIOR_A, method: 'GET', path: ruta, query: {}, body: {} }, res, ok));
  res.json(datos);
  await new Promise((r) => setTimeout(r, 0));
  return res._json;
}

describe('Promociones · entrenador (solo del grupo anterior a su categoría)', () => {
  beforeEach(() => {
    Categoria.findByPk.mockReset();
    Categoria.findByPk.mockImplementation(async (id) => ({ id, grupo: GRUPO[id] }));
    Plantilla.findAll.mockReset();
    Plantilla.findAll.mockResolvedValue([{ id: 40 }]);
    Plantilla.findByPk.mockReset();
    Promocion.findByPk.mockReset();
  });

  it('el de Senior A ve las de Juvenil a Senior A, pero no las de Senior B ni las que van a otra categoría', async () => {
    const r = await listar([
      { id: 1, id_plantilla: 31, id_categoria: 20, plantilla: { id_categoria: 18 } }, // Juvenil A -> Senior A
      { id: 2, id_plantilla: 32, id_categoria: 20, plantilla: { id_categoria: 23 } }, // Senior B -> Senior A
      { id: 3, id_plantilla: 31, id_categoria: 23, plantilla: { id_categoria: 18 } } // Juvenil A -> Senior B
    ]);
    expect(r.map((p) => p.id)).toEqual([1]);
  });

  it('ver una promoción de Senior B a Senior A -> 403', async () => {
    Promocion.findByPk.mockResolvedValue({ id: 2, id_plantilla: 32, id_categoria: 20 });
    Plantilla.findByPk.mockResolvedValue({ id: 32, id_categoria: 23 });
    let status = 200;
    const res = { status(c) { status = c; return this; }, json() { return this; } };
    await capa()({ user: ENTRENADOR_SENIOR_A, method: 'GET', path: '/2', query: {}, body: {} }, res, () => {});
    expect(status).toBe(403);
  });
});
