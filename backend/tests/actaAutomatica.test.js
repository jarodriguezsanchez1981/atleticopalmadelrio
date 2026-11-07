import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRequire } from 'module';
import { Partido, Cambio } from './helpers/models.js';

import * as actaAutomatica from '../src/utils/actaAutomatica.js';

// Mismas instancias CommonJS que usa la comprobación, para poder espiarlas.
const require = createRequire(import.meta.url);
const rfafActa = require('../src/utils/rfafActa.js');
const partidoCtrl = require('../src/controllers/partido.controller.js');
const { Op } = require('sequelize');

const PLANTILLA = {
  id: 36, codigo_primaria: '1000120', codigo_grupo: '49641343', codigo_competicion: '48466530', codigo_equipo: '111',
  categoria: { id: 1, nombre: 'Senior A', tiempopartido: 120 }
};

const conUpdate = (fila) => {
  fila.update = vi.fn(async (cambios) => Object.assign(fila, cambios));
  return fila;
};
/** Partido de liga del domingo 08/11 a las 17:00 (16:00 UTC). */
const partido = (datos = {}) => conUpdate({
  id: 5, id_plantilla: 36, jornada: 10, fecha: new Date('2026-11-08T16:00:00Z'),
  codigo_acta: null, codigo_primaria: null, plantilla: PLANTILLA, ...datos
});
// 120' de partido + 1 h: el acta se lee desde las 19:00 UTC.
const DESPUES = new Date('2026-11-08T19:05:00Z');

const jornadaRfaf = (codigoActa) => ({
  jornada: 10,
  partidos: [
    { codigo_acta: '900', equipo_local: 'UNO C.F.', codigo_equipo_local: '900', equipo_visitante: 'DOS C.F.', codigo_equipo_visitante: '901' },
    { codigo_acta: codigoActa, equipo_local: 'PALMA DEL RIO ATLETICO C.F.', codigo_equipo_local: '111', equipo_visitante: 'TRES C.F.', codigo_equipo_visitante: '902' }
  ]
});

const log = { log: vi.fn(), warn: vi.fn() };
const pausa = vi.fn(async () => {});

describe('Finalizar Acta automático · actaAutomatica', () => {
  beforeEach(() => {
    for (const m of [Partido, Cambio]) for (const f of Object.values(m)) f.mockReset?.();
    pausa.mockClear();
    actaAutomatica.reiniciarSesion();
  });
  afterEach(() => vi.restoreAllMocks());

  it('el acta se lee una hora después de terminar (fecha + tiempo de partido de la categoría)', () => {
    expect(actaAutomatica.momentoActa(partido())).toEqual(new Date('2026-11-08T19:00:00Z'));
    // Sin tiempo de partido: 90'.
    expect(actaAutomatica.momentoActa(partido({ plantilla: { categoria: {} } }))).toEqual(new Date('2026-11-08T18:30:00Z'));
    // Segundo intento: tres horas después de terminar.
    expect(actaAutomatica.momentoActa(partido({ acta_auto_intentos: 1 }))).toEqual(new Date('2026-11-08T21:00:00Z'));
    // Sin hora (medianoche UTC): no se sabe cuándo termina.
    expect(actaAutomatica.momentoActa(partido({ fecha: new Date('2026-11-08T00:00:00Z') }))).toBeNull();
  });

  it('antes de esa hora no pide nada', async () => {
    Partido.findAll.mockResolvedValue([partido()]);
    const leer = vi.spyOn(rfafActa, 'leerJornada');

    await actaAutomatica.comprobar({ log, pausa, ahora: new Date('2026-11-08T18:55:00Z') });

    expect(leer).not.toHaveBeenCalled();
  });

  it('saca el código del acta de la jornada (CodTemporada 22) y finaliza el partido como el botón', async () => {
    const p = partido();
    Partido.findAll.mockResolvedValue([p]);
    const leer = vi.spyOn(rfafActa, 'leerJornada').mockResolvedValue(jornadaRfaf('777'));
    const finalizar = vi.spyOn(partidoCtrl, 'finalizarPartido').mockResolvedValue({ resultado: '2-1', actualizados: [], creados: [] });

    const r = await actaAutomatica.comprobar({ log, pausa, ahora: DESPUES });

    expect(Partido.findAll.mock.calls[0][0].where).toMatchObject({ suspendido: false, acta_finalizada_at: null });
    expect(Partido.findAll.mock.calls[0][0].where.acta_auto_intentos).toEqual({ [Op.lt]: 2 });
    expect(leer).toHaveBeenCalledWith({ codPrimaria: '1000120', codGrupo: '49641343', codCompeticion: '48466530', codTemporada: '22' }, 10);
    expect(finalizar).toHaveBeenCalledWith(p, { codigo_acta: '777', codigo_primaria: '1000120' });
    expect(p.update).toHaveBeenCalledWith({ acta_auto_at: expect.any(Date), acta_auto_intentos: 2 });
    expect(Cambio.create).toHaveBeenCalledWith(expect.objectContaining({ entidad: 'partidos', id_registro: 5, accion: 'editar' }));
    expect(r.finalizados).toEqual([{ categoria: 'Senior A', jornada: 10, resultado: '2-1' }]);
  });

  it('si el partido ya tiene código de acta, no pide la jornada', async () => {
    Partido.findAll.mockResolvedValue([partido({ codigo_acta: '555', codigo_primaria: '1000120' })]);
    const leer = vi.spyOn(rfafActa, 'leerJornada');
    const finalizar = vi.spyOn(partidoCtrl, 'finalizarPartido').mockResolvedValue({ resultado: '0-0' });

    await actaAutomatica.comprobar({ log, pausa, ahora: DESPUES });

    expect(leer).not.toHaveBeenCalled();
    expect(finalizar.mock.calls[0][1]).toEqual({ codigo_acta: '555', codigo_primaria: '1000120' });
  });

  it('si el acta aún no está publicada no la pide y deja el segundo intento para 3 horas después de terminar', async () => {
    const p = partido();
    Partido.findAll.mockResolvedValue([p]);
    vi.spyOn(rfafActa, 'leerJornada').mockResolvedValue(jornadaRfaf(null));
    const finalizar = vi.spyOn(partidoCtrl, 'finalizarPartido');

    const r = await actaAutomatica.comprobar({ log, pausa, ahora: DESPUES });

    expect(finalizar).not.toHaveBeenCalled();
    expect(p.acta_auto_at).toBeInstanceOf(Date);
    expect(p.acta_auto_intentos).toBe(1);
    expect(r.sinActa).toEqual([{ categoria: 'Senior A', jornada: 10, segundo: false }]);
    // Hasta las 21:00 UTC (22:00 en España) no toca el segundo.
    Partido.findAll.mockResolvedValue([p]);
    const leer = vi.spyOn(rfafActa, 'leerJornada');
    leer.mockClear();
    await actaAutomatica.comprobar({ log, pausa, ahora: new Date('2026-11-08T20:55:00Z') });
    expect(leer).not.toHaveBeenCalled();
  });

  it('el segundo intento lee el acta si ya está publicada', async () => {
    const p = partido({ acta_auto_intentos: 1, acta_auto_at: new Date('2026-11-08T19:05:00Z') });
    Partido.findAll.mockResolvedValue([p]);
    vi.spyOn(rfafActa, 'leerJornada').mockResolvedValue(jornadaRfaf('777'));
    const finalizar = vi.spyOn(partidoCtrl, 'finalizarPartido').mockResolvedValue({ resultado: '2-1' });

    const r = await actaAutomatica.comprobar({ log, pausa, ahora: new Date('2026-11-08T21:05:00Z') });

    expect(finalizar).toHaveBeenCalledWith(p, { codigo_acta: '777', codigo_primaria: '1000120' });
    expect(r.finalizados).toHaveLength(1);
  });

  it('si en el segundo intento sigue sin publicar, no se intenta más', async () => {
    const p = partido({ acta_auto_intentos: 1 });
    Partido.findAll.mockResolvedValue([p]);
    vi.spyOn(rfafActa, 'leerJornada').mockResolvedValue(jornadaRfaf(null));

    const r = await actaAutomatica.comprobar({ log, pausa, ahora: new Date('2026-11-08T21:05:00Z') });

    expect(p.acta_auto_intentos).toBe(2);
    expect(r.sinActa).toEqual([{ categoria: 'Senior A', jornada: 10, segundo: true }]);
  });

  it('con varios partidos, un minuto entre uno y otro', async () => {
    Partido.findAll.mockResolvedValue([partido({ codigo_acta: '1', codigo_primaria: 'x' }), partido({ id: 6, codigo_acta: '2', codigo_primaria: 'x' })]);
    const finalizar = vi.spyOn(partidoCtrl, 'finalizarPartido').mockResolvedValue({ resultado: '1-1' });

    await actaAutomatica.comprobar({ log, pausa, ahora: DESPUES });

    expect(finalizar).toHaveBeenCalledTimes(2);
    expect(pausa).toHaveBeenCalledTimes(1);
    expect(pausa).toHaveBeenCalledWith(60 * 1000);
  });

  it('con la sesión de RFAF caducada se para, desmarca el partido y no vuelve a pedir hasta otra sesión', async () => {
    const p = partido();
    Partido.findAll.mockResolvedValue([p, partido({ id: 6 })]);
    const leer = vi.spyOn(rfafActa, 'leerJornada').mockRejectedValue(new Error('La sesión de RFAF ha caducado.'));

    const r = await actaAutomatica.comprobar({ log, pausa, ahora: DESPUES });
    expect(leer).toHaveBeenCalledTimes(1);
    expect(p.acta_auto_at).toBeNull();
    expect(p.acta_auto_intentos).toBe(0);
    expect(r.errores).toHaveLength(1);

    await actaAutomatica.comprobar({ log, pausa, ahora: DESPUES });
    expect(leer).toHaveBeenCalledTimes(1);
  });

  it('un fallo que no es de sesión deja el partido marcado (sin reintentos)', async () => {
    const p = partido({ codigo_acta: '555', codigo_primaria: '1000120' });
    Partido.findAll.mockResolvedValue([p]);
    vi.spyOn(partidoCtrl, 'finalizarPartido').mockRejectedValue(new Error('El acta no tiene el formato esperado.'));

    const r = await actaAutomatica.comprobar({ log, pausa, ahora: DESPUES });

    expect(p.acta_auto_at).toBeInstanceOf(Date);
    expect(p.acta_auto_intentos).toBe(2);
    expect(r.errores).toHaveLength(1);
  });

  it('próxima lectura: la del partido que antes termina (también los segundos intentos)', async () => {
    Partido.findAll.mockResolvedValue([partido(), partido({ id: 6, acta_auto_intentos: 1, fecha: new Date('2026-11-08T10:00:00Z') })]);
    expect(await actaAutomatica.proximaLectura(new Date('2026-11-08T12:00:00Z')))
      .toEqual({ momento: new Date('2026-11-08T15:00:00Z'), categoria: 'Senior A', jornada: 10, segundo_intento: true });
  });
});
