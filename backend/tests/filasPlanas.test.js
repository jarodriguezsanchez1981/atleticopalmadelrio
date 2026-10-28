import { describe, it, expect } from 'vitest';
import { filasPlanas } from '../src/utils/filasPlanas.js';

describe('filasPlanas (listados con raw + nest)', () => {
  it('deja a null los includes sin registro y pasa los BOOLEAN a true/false', () => {
    const fecha = new Date('2026-10-01T10:00:00Z');
    const [fila] = filasPlanas([{
      id: 1, fecha, suspendido: 1,
      lugar: { id: null, nombre: null },
      plantilla: { id: 5, categoria: { id: null, nombre: null } },
      equipoLocal: { id: 73, nombre: 'PALMA' }
    }], ['suspendido']);
    expect(fila).toEqual({
      id: 1, fecha, suspendido: true,
      lugar: null,
      plantilla: { id: 5, categoria: null },
      equipoLocal: { id: 73, nombre: 'PALMA' }
    });
  });
});
