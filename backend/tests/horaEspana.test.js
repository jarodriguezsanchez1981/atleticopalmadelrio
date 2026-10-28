import { describe, it, expect } from 'vitest';
import { sumarDiasHoraEspana, partesEspana, diaEspana, desdeHoraEspana } from '../src/utils/horaEspana.js';

const horaLocal = (d) => { const p = partesEspana(d); return `${String(p.h).padStart(2, '0')}:${String(p.mi).padStart(2, '0')}`; };

describe('horaEspana', () => {
  it('sumar semanas conserva la hora española al pasar al horario de invierno (25/10/2026)', () => {
    const lunes = new Date('2026-10-19T16:15:00Z'); // 18:15 en España (verano, UTC+2)
    const siguiente = sumarDiasHoraEspana(lunes, 7);
    expect(diaEspana(siguiente)).toBe('2026-10-26');
    expect(horaLocal(siguiente)).toBe('18:15');
    expect(siguiente.toISOString()).toBe('2026-10-26T17:15:00.000Z'); // invierno, UTC+1
  });

  it('y al volver al horario de verano (28/03/2027)', () => {
    const lunes = new Date('2027-03-22T17:15:00Z'); // 18:15 en España (invierno)
    const siguiente = sumarDiasHoraEspana(lunes, 7);
    expect(diaEspana(siguiente)).toBe('2027-03-29');
    expect(horaLocal(siguiente)).toBe('18:15');
  });

  it('una serie de octubre a junio tiene siempre la misma hora española', () => {
    const base = new Date('2026-10-05T16:15:00Z');
    for (let s = 0; s < 39; s++) expect(horaLocal(sumarDiasHoraEspana(base, 7 * s))).toBe('18:15');
  });

  it('desdeHoraEspana convierte una hora española a su instante', () => {
    expect(desdeHoraEspana(2026, 12, 1, 10, 0).toISOString()).toBe('2026-12-01T09:00:00.000Z');
    expect(desdeHoraEspana(2026, 7, 1, 10, 0).toISOString()).toBe('2026-07-01T08:00:00.000Z');
  });
});
