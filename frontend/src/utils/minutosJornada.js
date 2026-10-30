import { construirHojaSimple } from './excelEstadisticas';

/**
 * Estadísticas Tiempo, pestaña Jugadores: minutos de cada jugador en el
 * partido de cada jornada (partidos_minutos de GET /estadisticas). Una columna
 * por partido con acta, en orden de jornada; la celda no existe si el jugador
 * no está en el acta de ese partido (0 = convocado sin jugar). Cada celda
 * lleva también las tarjetas de ese partido (amarillas, rojas).
 */
export function construirMinutosPorJornada(filas = []) {
  const porPartido = new Map();
  for (const f of filas) {
    for (const p of f.partidos_minutos || []) {
      if (!porPartido.has(p.id_partido)) {
        porPartido.set(p.id_partido, { clave: `p${p.id_partido}`, jornada: p.jornada, rival: p.rival, es_local: p.es_local });
      }
    }
  }
  const jornadas = [...porPartido.values()].sort((a, b) => (a.jornada ?? 0) - (b.jornada ?? 0));

  return {
    jornadas,
    filas: filas.map((f) => {
      const celdas = {};
      let total = 0;
      for (const p of f.partidos_minutos || []) {
        const minutos = Number(p.minutos) || 0;
        celdas[`p${p.id_partido}`] = {
          minutos, titular: !!p.titular, amarillas: Number(p.amarillas) || 0, rojas: Number(p.rojas) || 0
        };
        total += minutos;
      }
      return { id_jugador: f.id_jugador, jugador: f.jugador, celdas, total };
    })
  };
}

/** Hoja de Excel de la pestaña Jugadores: Jugador, una columna por jornada y Total. */
export function hojaMinutosPorJornada(filas = []) {
  const { jornadas, filas: tabla } = construirMinutosPorJornada(filas);
  const planas = tabla.map((f) => ({
    jugador: f.jugador,
    total: f.total,
    ...Object.fromEntries(jornadas.map((j) => [j.clave, f.celdas[j.clave]?.minutos ?? null]))
  }));
  return construirHojaSimple({
    columnas: [
      { campo: 'jugador', titulo: 'Jugador' },
      ...jornadas.map((j) => ({ campo: j.clave, titulo: `J${j.jornada} ${j.rival}`.trim() })),
      { campo: 'total', titulo: 'Total' }
    ],
    filas: planas
  });
}
