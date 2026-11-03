import { describe, it, expect } from 'vitest';
import { alertasSanciones, ultimoPartido } from '../utils/alertasSanciones';

const ahora = new Date('2026-11-03T12:00:00Z');
const plantillas = [{ id: 1, categoria: { nombre: 'Senior A' } }];
const partidos = [
  { id: 10, id_plantilla: 1, jornada: 1, fecha: '2026-10-18T10:00:00Z' },
  { id: 11, id_plantilla: 1, jornada: 2, fecha: '2026-10-25T10:00:00Z' },
  { id: 12, id_plantilla: 1, jornada: 3, fecha: '2026-11-01T10:00:00Z' },
  { id: 13, id_plantilla: 1, jornada: 4, fecha: '2026-11-08T10:00:00Z' }, // futuro
  { id: 14, id_plantilla: 1, jornada: null, fecha: '2026-11-02T10:00:00Z' } // amistoso
];
const jugador = (id) => ({ nombre: `J${id}`, apellidos: 'X' });
const s = (id_jugador, id_partido, amarilla, roja = 0) => ({ id_jugador, id_partido, amarilla, roja, jugador: jugador(id_jugador) });

describe('alertasSanciones', () => {
  it('el último partido es el de liga más reciente ya jugado', () => {
    expect(ultimoPartido(partidos, 1, ahora).id).toBe(12);
  });

  it('4 amarillas: aviso de acumulación', () => {
    const r = alertasSanciones([s(1, 10, 2), s(1, 11, 1), s(1, 12, 1)], partidos, plantillas, ahora);
    expect(r.avisoAmarillas.map((f) => f.jugador)).toEqual(['J1 X']);
    expect(r.sancionAmarillas).toEqual([]);
  });

  it('5 amarillas contando la del último partido: sanción', () => {
    const r = alertasSanciones([s(1, 10, 2), s(1, 11, 2), s(1, 12, 1)], partidos, plantillas, ahora);
    expect(r.sancionAmarillas.map((f) => f.jugador)).toEqual(['J1 X']);
    expect(r.avisoAmarillas).toEqual([]);
  });

  it('5 amarillas sin ninguna en el último partido: no es sanción nueva', () => {
    const r = alertasSanciones([s(1, 10, 3), s(1, 11, 2)], partidos, plantillas, ahora);
    expect(r.sancionAmarillas).toEqual([]);
  });

  it('roja en el último partido; las de partidos anteriores o amistosos no cuentan', () => {
    const r = alertasSanciones([s(1, 12, 0, 1), s(2, 11, 0, 1), s(3, 14, 0, 1)], partidos, plantillas, ahora);
    expect(r.tarjetaRoja.map((f) => f.jugador)).toEqual(['J1 X']);
    expect(r.tarjetaRoja[0].ultimo.id).toBe(12);
  });
});
