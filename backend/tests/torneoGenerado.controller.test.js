import { describe, it, expect, beforeEach } from 'vitest';
import { TorneoGenerado, TorneoGeneradoCategoria, TorneoGeneradoEquipo, Categoria } from './helpers/models.js';
import { mockReqRes } from './helpers/http.js';

import * as ctrl from '../src/controllers/torneoGenerado.controller.js';

const equipos = (nombres, grupo = null) => nombres.map((n, i) => ({ id_equipo: i + 1, nombre: n, grupo }));

function categoriaGrupos(extra = {}) {
  return {
    id_categoria: 5,
    hora_inicio: '09:00',
    hora_fin: '13:30',
    duracion_min: 20,
    descanso_min: 5,
    campos: ['anexo1', 'anexo2'],
    formato: 'grupos',
    semifinales: true,
    final_oro: true,
    final_plata: true,
    equipos: [...equipos(['A1', 'A2', 'A3', 'A4'], 'A'), ...equipos(['B1', 'B2', 'B3', 'B4'], 'B')],
    ...extra
  };
}

function torneoValido(extra = {}) {
  return { nombre: 'Torneo de Navidad', fecha: '2026-12-27', categorias: [categoriaGrupos()], ...extra };
}

describe('Generar Torneo · torneoGenerado.controller', () => {
  beforeEach(() => {
    for (const m of [TorneoGenerado, TorneoGeneradoCategoria, TorneoGeneradoEquipo, Categoria]) {
      m.findAll.mockReset();
      m.findByPk.mockReset();
      m.create.mockReset();
      m.destroy.mockReset();
      m.bulkCreate.mockReset();
    }
    Categoria.findAll.mockResolvedValue([{ id: 5, id_tipofutbol: 1 }]);
    TorneoGenerado.create.mockResolvedValue({ id: 10 });
    TorneoGeneradoCategoria.create.mockResolvedValue({ id: 20 });
    TorneoGenerado.findByPk.mockResolvedValue({ id: 10, categorias: [] });
  });

  function llamar(fn, overrides = {}) {
    const { req, res, next } = mockReqRes(overrides);
    return { promesa: fn(req, res, next), res, req, next };
  }

  describe('validarTorneo', () => {
    const casos = [
      ['sin nombre', torneoValido({ nombre: '  ' })],
      ['sin fecha', torneoValido({ fecha: '' })],
      ['sin categorías', torneoValido({ categorias: [] })],
      ['categoría repetida', torneoValido({ categorias: [categoriaGrupos(), categoriaGrupos()] })],
      ['sin campos', torneoValido({ categorias: [categoriaGrupos({ campos: [] })] })],
      ['campo desconocido', torneoValido({ categorias: [categoriaGrupos({ campos: ['playa'] })] })],
      ['duración 0', torneoValido({ categorias: [categoriaGrupos({ duracion_min: 0 })] })],
      ['sin hora de comienzo', torneoValido({ categorias: [categoriaGrupos({ hora_inicio: '' })] })],
      ['hora de comienzo mal escrita', torneoValido({ categorias: [categoriaGrupos({ hora_inicio: '25:00' })] })],
      ['hora de final mal escrita', torneoValido({ categorias: [categoriaGrupos({ hora_fin: '9:7' })] })],
      ['liga con 1 equipo', torneoValido({ categorias: [categoriaGrupos({ formato: 'liga', semifinales: false, final_plata: false, equipos: equipos(['X']) })] })],
      ['liga con Plata y 3 equipos', torneoValido({ categorias: [categoriaGrupos({ formato: 'liga', final_plata: true, equipos: equipos(['X', 'Y', 'Z']) })] })],
      ['grupos con equipo sin grupo', torneoValido({ categorias: [categoriaGrupos({ equipos: [...equipos(['A1', 'A2'], 'A'), ...equipos(['B1', 'B2'], 'B'), { id_equipo: 9, nombre: 'Suelto', grupo: null }] })] })],
      ['grupo con 1 equipo', torneoValido({ categorias: [categoriaGrupos({ equipos: [...equipos(['A1'], 'A'), ...equipos(['B1', 'B2'], 'B')] })] })],
      ['nombres repetidos', torneoValido({ categorias: [categoriaGrupos({ equipos: [...equipos(['PALMA', 'A2'], 'A'), ...equipos(['palma ', 'B2'], 'B')] })] })]
    ];
    for (const [caso, body] of casos) {
      it(`da error: ${caso}`, () => {
        expect(typeof ctrl.validarTorneo(body)).toBe('string');
      });
    }

    it('acepta un torneo válido de 2 grupos de 4', () => {
      expect(ctrl.validarTorneo(torneoValido())).toBeNull();
    });

    it('acepta el mismo equipo dos veces con nombres distintos (PALMA A / PALMA B)', () => {
      const cat = categoriaGrupos({
        equipos: [
          { id_equipo: 1, nombre: 'PALMA A', grupo: 'A' }, { id_equipo: 2, nombre: 'Posadas', grupo: 'A' },
          { id_equipo: 1, nombre: 'PALMA B', grupo: 'B' }, { id_equipo: 3, nombre: 'Lucena', grupo: 'B' }
        ]
      });
      expect(ctrl.validarTorneo(torneoValido({ categorias: [cat] }))).toBeNull();
    });
  });

  it('crear rechaza categorías que no son de Fútbol 7', async () => {
    Categoria.findAll.mockResolvedValue([{ id: 5, id_tipofutbol: 2 }]);
    const { promesa, res } = llamar(ctrl.crear, { body: torneoValido() });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('Solo se pueden elegir categorías de Fútbol 7.');
    expect(TorneoGenerado.create).not.toHaveBeenCalled();
  });

  it('crear devuelve 400 con el mensaje de validación', async () => {
    const { promesa, res } = llamar(ctrl.crear, { body: torneoValido({ nombre: '' }) });

    await promesa;

    expect(res._status).toBe(400);
    expect(TorneoGenerado.create).not.toHaveBeenCalled();
  });

  it('crear guarda torneo, categorías e inscripciones y responde 201', async () => {
    const { promesa, res } = llamar(ctrl.crear, { body: torneoValido() });

    await promesa;

    expect(res._status).toBe(201);
    // Responde con el detalle recargado (categorías e inscripciones) para la auditoría.
    expect(TorneoGenerado.findByPk).toHaveBeenCalledWith(10, expect.objectContaining({ include: expect.any(Array) }));
    expect(res._json).toEqual({ id: 10, categorias: [] });
    expect(TorneoGenerado.create).toHaveBeenCalledWith(
      expect.objectContaining({ nombre: 'Torneo de Navidad', fecha: '2026-12-27' }), expect.anything());
    expect(TorneoGeneradoCategoria.create).toHaveBeenCalledWith(
      expect.objectContaining({ id_torneo_generado: 10, id_categoria: 5, formato: 'grupos', semifinales: true, campos: ['anexo1', 'anexo2'] }),
      expect.anything());
    const filas = TorneoGeneradoEquipo.bulkCreate.mock.calls[0][0];
    expect(filas).toHaveLength(8);
    expect(filas[0]).toEqual(expect.objectContaining({ id_torneo_generado_categoria: 20, nombre: 'A1', grupo: 'A', orden: 0 }));
  });

  it('crear en liga guarda grupo NULL y sin semifinales', async () => {
    const cat = categoriaGrupos({ formato: 'liga', semifinales: true, equipos: equipos(['X', 'Y', 'Z', 'W'], 'A') });
    const { promesa } = llamar(ctrl.crear, { body: torneoValido({ categorias: [cat] }) });

    await promesa;

    expect(TorneoGeneradoCategoria.create).toHaveBeenCalledWith(
      expect.objectContaining({ formato: 'liga', semifinales: false }), expect.anything());
    expect(TorneoGeneradoEquipo.bulkCreate.mock.calls[0][0].every((f) => f.grupo === null)).toBe(true);
  });

  it('actualizar devuelve 404 si no existe', async () => {
    TorneoGenerado.findByPk.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '99' }, body: torneoValido() });

    await promesa;

    expect(res._status).toBe(404);
  });

  it('actualizar reemplaza las categorías en la misma transacción', async () => {
    const torneo = { id: 10, update: async () => {} };
    TorneoGenerado.findByPk.mockResolvedValue(torneo);
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '10' }, body: torneoValido() });

    await promesa;

    expect(res._status).toBe(200);
    expect(TorneoGeneradoCategoria.destroy).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id_torneo_generado: 10 } }));
    expect(TorneoGeneradoCategoria.create).toHaveBeenCalledTimes(1);
  });

  it('obtener trae el escudo de cada equipo (para el PDF); crear responde sin escudos', async () => {
    const escudoPedido = (opciones) => {
      const cat = opciones.include.find((i) => i.as === 'categorias');
      const eq = cat.include.find((i) => i.as === 'equipos').include.find((i) => i.as === 'equipo');
      return eq.attributes.includes('escudo');
    };
    TorneoGenerado.findByPk.mockResolvedValue({ id: 10, categorias: [] });
    const r1 = llamar(ctrl.obtener, { params: { id: '10' } });
    await r1.promesa;
    expect(escudoPedido(TorneoGenerado.findByPk.mock.calls.at(-1)[1])).toBe(true);

    const r2 = llamar(ctrl.crear, { body: torneoValido() });
    await r2.promesa;
    expect(escudoPedido(TorneoGenerado.findByPk.mock.calls.at(-1)[1])).toBe(false);
  });

  it('eliminar devuelve 404 si no existe y 204 si lo borra', async () => {
    TorneoGenerado.findByPk.mockResolvedValue(null);
    const r1 = llamar(ctrl.eliminar, { params: { id: '1' } });
    await r1.promesa;
    expect(r1.res._status).toBe(404);

    let borrado = false;
    TorneoGenerado.findByPk.mockResolvedValue({ id: 1, destroy: async () => { borrado = true; } });
    const r2 = llamar(ctrl.eliminar, { params: { id: '1' } });
    await r2.promesa;
    expect(r2.res._status).toBe(204);
    expect(borrado).toBe(true);
  });
});
