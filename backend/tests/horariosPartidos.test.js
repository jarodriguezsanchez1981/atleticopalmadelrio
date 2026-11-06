import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRequire } from 'module';
import { Jornada, Partido, Cambio, Plantilla } from './helpers/models.js';

import * as horarios from '../src/utils/horariosPartidos.js';

// Mismas instancias CommonJS que usa la comprobación, para poder espiarlas.
const require = createRequire(import.meta.url);
const rfafActa = require('../src/utils/rfafActa.js');

const SENIOR_A = {
  id: 36, categoria: { nombre: 'Senior A', orden: 30 }, temporada: { actual: true }, codigo_equipo: '111',
  codigo_primaria: '1000120', codigo_grupo: '49641343', codigo_competicion: '48466530', codigo_temporada: '21'
};
const JUVENIL_A = { ...SENIOR_A, id: 34, categoria: { nombre: 'Juvenil A', orden: 19 }, codigo_equipo: '222' };

const conUpdate = (fila) => {
  fila.update = vi.fn(async (cambios) => Object.assign(fila, cambios));
  return fila;
};
/** Jornada como la devuelve Sequelize (DATEONLY y TIME como texto, hora española). */
const jornada = (datos = {}) => conUpdate({ id: 70, id_plantilla: 36, jornada: 10, fecha: '2026-11-08', hora: '17:00:00', ...datos });
/** Partido: fecha en UTC (16:00 UTC = 17:00 en España en noviembre). */
const partido = (datos = {}) => conUpdate({ id: 5, id_plantilla: 36, id_jornada: 70, jornada: 10, fecha: new Date('2026-11-08T16:00:00Z'), ...datos });

const jornadaRfaf = (fecha, hora, codigoLocal = '111') => ({
  jornada: 10,
  partidos: [
    { codigo_acta: null, equipo_local: 'UNO C.F.', codigo_equipo_local: '900', equipo_visitante: 'DOS C.F.', codigo_equipo_visitante: '901', fecha: '2026-11-08', hora: '12:00' },
    { codigo_acta: null, equipo_local: 'PALMA DEL RIO ATLETICO C.F.', codigo_equipo_local: codigoLocal, equipo_visitante: 'TRES C.F.', codigo_equipo_visitante: '902', fecha, hora }
  ]
});

const log = { log: vi.fn(), warn: vi.fn() };
const pausa = vi.fn(async () => {});

describe('Horarios de los partidos (RFAF) · horariosPartidos', () => {
  beforeEach(() => {
    for (const m of [Jornada, Partido, Cambio, Plantilla]) for (const f of Object.values(m)) f.mockReset?.();
    pausa.mockClear();
    Plantilla.findAll.mockResolvedValue([SENIOR_A]);
  });
  afterEach(() => vi.restoreAllMocks());

  it('pide la próxima jornada de la tabla jornadas con los códigos de la plantilla y CodTemporada 22', async () => {
    Jornada.findOne.mockResolvedValue(jornada());
    Partido.findOne.mockResolvedValue(partido());
    const leer = vi.spyOn(rfafActa, 'leerJornada').mockResolvedValue(jornadaRfaf('2026-11-08', '17:00'));

    await horarios.comprobar({ log, pausa, ahora: new Date('2026-11-06T12:00:00Z') });

    expect(Jornada.findOne.mock.calls[0][0].where.id_plantilla).toBe(36);
    expect(leer).toHaveBeenCalledWith({ codPrimaria: '1000120', codGrupo: '49641343', codCompeticion: '48466530', codTemporada: '22' }, 10);
  });

  it('si RFAF cambia la hora, la pone en la jornada y en su partido y lo deja en Cambios', async () => {
    const j = jornada();
    const p = partido();
    Jornada.findOne.mockResolvedValue(j);
    Partido.findOne.mockResolvedValue(p);
    vi.spyOn(rfafActa, 'leerJornada').mockResolvedValue(jornadaRfaf('2026-11-08', '18:30'));

    const r = await horarios.comprobar({ log, pausa });

    expect(j.update).toHaveBeenCalledWith({ fecha: '2026-11-08', hora: '18:30:00' });
    expect(p.update).toHaveBeenCalledWith({ fecha: new Date('2026-11-08T17:30:00Z') });
    expect(Cambio.create).toHaveBeenCalledWith(expect.objectContaining({ entidad: 'jornadas', id_registro: 70, accion: 'editar' }));
    expect(Cambio.create).toHaveBeenCalledWith(expect.objectContaining({ entidad: 'partidos', id_registro: 5, accion: 'editar' }));
    expect(r.cambiados).toEqual([{ categoria: 'Senior A', jornada: 10, antes: '2026-11-08 17:00', despues: '2026-11-08 18:30' }]);
  });

  it('si RFAF cambia el día también lo cambia (la fecha y la hora que valen son las de RFAF)', async () => {
    const j = jornada({ hora: null });
    const p = partido({ fecha: new Date('2026-11-08T00:00:00Z') });
    Jornada.findOne.mockResolvedValue(j);
    Partido.findOne.mockResolvedValue(p);
    vi.spyOn(rfafActa, 'leerJornada').mockResolvedValue(jornadaRfaf('2026-11-07', '9:30'));

    await horarios.comprobar({ log, pausa });

    expect(j.update).toHaveBeenCalledWith({ fecha: '2026-11-07', hora: '09:30:00' });
    expect(p.update).toHaveBeenCalledWith({ fecha: new Date('2026-11-07T08:30:00Z') });
  });

  it('si la fecha y la hora coinciden no toca nada', async () => {
    const j = jornada();
    const p = partido();
    Jornada.findOne.mockResolvedValue(j);
    Partido.findOne.mockResolvedValue(p);
    vi.spyOn(rfafActa, 'leerJornada').mockResolvedValue(jornadaRfaf('2026-11-08', '17:00'));

    const r = await horarios.comprobar({ log, pausa });

    expect(j.update).not.toHaveBeenCalled();
    expect(p.update).not.toHaveBeenCalled();
    expect(Cambio.create).not.toHaveBeenCalled();
    expect(r).toMatchObject({ comprobados: 1, cambiados: [] });
  });

  it('sin hora en RFAF cambia solo el día y conserva la hora', async () => {
    const j = jornada();
    const p = partido();
    Jornada.findOne.mockResolvedValue(j);
    Partido.findOne.mockResolvedValue(p);
    vi.spyOn(rfafActa, 'leerJornada').mockResolvedValue(jornadaRfaf('2026-11-07', null));

    await horarios.comprobar({ log, pausa });

    expect(j.update).toHaveBeenCalledWith({ fecha: '2026-11-07', hora: '17:00:00' });
    expect(p.update).toHaveBeenCalledWith({ fecha: new Date('2026-11-07T16:00:00Z') });
  });

  it('una petición por plantilla con un minuto de pausa entre una y otra', async () => {
    Plantilla.findAll.mockResolvedValue([JUVENIL_A, SENIOR_A]);
    Jornada.findOne.mockImplementation(async ({ where }) => jornada({ id_plantilla: where.id_plantilla }));
    Partido.findOne.mockResolvedValue(null);
    const leer = vi.spyOn(rfafActa, 'leerJornada').mockImplementation(async () => jornadaRfaf('2026-11-08', '17:00', '222'));

    await horarios.comprobar({ log, pausa });

    expect(leer).toHaveBeenCalledTimes(2);
    expect(pausa).toHaveBeenCalledTimes(1);
    expect(pausa).toHaveBeenCalledWith(60 * 1000);
  });

  it('con la sesión de RFAF caducada se para', async () => {
    Plantilla.findAll.mockResolvedValue([SENIOR_A, JUVENIL_A]);
    Jornada.findOne.mockResolvedValue(jornada());
    const leer = vi.spyOn(rfafActa, 'leerJornada').mockRejectedValue(new Error('La sesión de RFAF ha caducado.'));

    const r = await horarios.comprobar({ log, pausa });

    expect(leer).toHaveBeenCalledTimes(1);
    expect(r.errores).toHaveLength(1);
  });

  it('sin próxima jornada no pide nada', async () => {
    Jornada.findOne.mockResolvedValue(null);
    const leer = vi.spyOn(rfafActa, 'leerJornada');

    await horarios.comprobar({ log, pausa });

    expect(leer).not.toHaveBeenCalled();
  });

  it('se programa los martes, miércoles y jueves a las 13:00 (hora española)', () => {
    // Viernes 06/11/2026 → martes 10/11 a las 13:00 (12:00 UTC).
    expect(horarios.proximaEjecucion(new Date('2026-11-06T10:00:00Z'))).toEqual(new Date('2026-11-10T12:00:00Z'));
    // Martes a las 14:00 → miércoles a las 13:00.
    expect(horarios.proximaEjecucion(new Date('2026-11-10T13:00:00Z'))).toEqual(new Date('2026-11-11T12:00:00Z'));
    // Jueves a las 12:00 → ese mismo jueves a las 13:00.
    expect(horarios.proximaEjecucion(new Date('2026-11-12T11:00:00Z'))).toEqual(new Date('2026-11-12T12:00:00Z'));
  });
});
