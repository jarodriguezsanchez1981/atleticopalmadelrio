import { describe, it, expect } from 'vitest';
import { grupoDeEvento, ORDEN_GRUPOS } from '../utils/gruposCalendario.js';

describe('gruposCalendario · grupoDeEvento', () => {
  it('separa los entrenamientos del estadio y del anexo por el nombre del lugar', () => {
    expect(grupoDeEvento({ tipo: 'entrenamiento', lugar: 'Estadio B - 1' })).toBe('ENTRENAMIENTO_ESTADIO');
    expect(grupoDeEvento({ tipo: 'entrenamiento', lugar: 'Estadio' })).toBe('ENTRENAMIENTO_ESTADIO');
    expect(grupoDeEvento({ tipo: 'entrenamiento', lugar: 'Anexo A - 2' })).toBe('ENTRENAMIENTO_ANEXO');
    expect(grupoDeEvento({ tipo: 'entrenamiento', lugar: { nombre: 'anexo' } })).toBe('ENTRENAMIENTO_ANEXO');
    expect(grupoDeEvento({ tipo: 'entrenamiento', lugar: 'Polideportivo' })).toBe('ENTRENAMIENTO');
    expect(grupoDeEvento({ tipo: 'entrenamiento', lugar: null })).toBe('ENTRENAMIENTO');
  });

  it('agrupa los partidos en liga casa / fuera, amistoso y suspendido', () => {
    expect(grupoDeEvento({ tipo: 'partido', jornada: 3, es_local: true })).toBe('LIGA_CASA');
    expect(grupoDeEvento({ tipo: 'partido', jornada: 3, es_local: false })).toBe('LIGA_FUERA');
    expect(grupoDeEvento({ tipo: 'partido', jornada: null })).toBe('AMISTOSO');
    expect(grupoDeEvento({ tipo: 'partido', jornada: 3, suspendido: true })).toBe('SUSPENDIDO');
  });

  it('ordena estadio antes que anexo y los suspendidos al final', () => {
    expect(ORDEN_GRUPOS.ENTRENAMIENTO_ESTADIO).toBeLessThan(ORDEN_GRUPOS.ENTRENAMIENTO_ANEXO);
    expect(Math.max(...Object.values(ORDEN_GRUPOS))).toBe(ORDEN_GRUPOS.SUSPENDIDO);
  });
});
