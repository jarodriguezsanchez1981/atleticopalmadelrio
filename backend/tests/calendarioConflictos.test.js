import { describe, it, expect, vi } from 'vitest';
import { otroTipoDeEventoMismoDia } from '../src/utils/calendarioConflictos.js';

/** Modelos falsos: hay un entrenamiento ese día y un partido de liga (jornada 3). */
function modelos({ entrenamientos = 1, partidosLiga = 1, amistosos = 0, torneos = 0 } = {}) {
  return {
    Entrenamiento: { count: vi.fn().mockResolvedValue(entrenamientos) },
    Partido: {
      count: vi.fn(async ({ where }) => (where.jornada === null ? amistosos : partidosLiga + amistosos))
    },
    Torneo: { count: vi.fn().mockResolvedValue(torneos) }
  };
}

const base = { idPlantilla: 5, fecha: '2026-10-10T18:00:00' };

describe('calendarioConflictos · partido de liga y entrenamiento el mismo día', () => {
  it('un partido de liga puede coincidir con un entrenamiento', async () => {
    const models = modelos({ partidosLiga: 0 });
    expect(await otroTipoDeEventoMismoDia({ ...base, models, tipoActual: 'partido', esLiga: true })).toBeNull();
    expect(models.Entrenamiento.count).not.toHaveBeenCalled();
  });

  it('un amistoso sigue sin poder coincidir con un entrenamiento', async () => {
    const models = modelos({ partidosLiga: 0 });
    expect(await otroTipoDeEventoMismoDia({ ...base, models, tipoActual: 'partido', esLiga: false })).toBe('entrenamiento');
  });

  it('un entrenamiento puede coincidir con un partido de liga, pero no con un amistoso', async () => {
    const conLiga = modelos({ entrenamientos: 0, partidosLiga: 1 });
    expect(await otroTipoDeEventoMismoDia({ ...base, models: conLiga, tipoActual: null, esEntrenamiento: true })).toBeNull();
    const conAmistoso = modelos({ entrenamientos: 0, partidosLiga: 0, amistosos: 1 });
    expect(await otroTipoDeEventoMismoDia({ ...base, models: conAmistoso, tipoActual: null, esEntrenamiento: true })).toBe('partido');
  });

  it('dos entrenamientos o un torneo siguen chocando', async () => {
    expect(await otroTipoDeEventoMismoDia({ ...base, models: modelos({ entrenamientos: 1 }), tipoActual: null, esEntrenamiento: true })).toBe('entrenamiento');
    expect(await otroTipoDeEventoMismoDia({ ...base, models: modelos({ entrenamientos: 0, partidosLiga: 0, torneos: 1 }), tipoActual: 'partido', esLiga: true })).toBe('torneo');
  });
});
