/**
 * Color de la posición del PALMA en la gráfica de Clasificación según cómo
 * cambió respecto a la jornada anterior: subió (mejor puesto, menos número)
 * verde, bajó rojo. Si se mantiene en el mismo puesto (o es la primera
 * jornada, sin anterior con la que comparar), según el resultado de esa
 * jornada: ganó verde, empató amarillo, perdió rojo (amarillo si no se sabe).
 * La jornada en la que descansa (no ha jugado, así que bajar no es culpa
 * suya) va en amarillo. Lo usan las dos vistas de Clasificación (Senior A y
 * por categoría).
 */
export const COLOR_SUBIDA = '#16a34a';
export const COLOR_BAJADA = '#dc2626';
export const COLOR_IGUAL = '#eab308';

const COLOR_RESULTADO = { G: COLOR_SUBIDA, E: COLOR_IGUAL, P: COLOR_BAJADA };

/** Color del punto/tramo de la jornada `i` comparando `posiciones[i]` con
 * `posiciones[i-1]` (menos número = mejor posición = subida). `descansos[i]`
 * true = esa jornada descansó (ver `jornadasDescanso`): siempre amarillo.
 * `resultados[i]` ('G' | 'E' | 'P' | null, ver `resultadosJornadas`): el color
 * cuando el puesto no cambia. */
export function colorPosicion(posiciones, i, descansos = [], resultados = []) {
  if (descansos[i]) return COLOR_IGUAL;
  const anterior = i > 0 ? posiciones[i - 1] : null;
  const actual = posiciones[i];
  if (actual != null && anterior != null) {
    if (actual < anterior) return COLOR_SUBIDA;
    if (actual > anterior) return COLOR_BAJADA;
  }
  return COLOR_RESULTADO[resultados[i]] || COLOR_IGUAL;
}

/** Resultado del PALMA en cada jornada ('G' ganó, 'E' empató, 'P' perdió)
 * comparando sus G/E/P acumulados con los de la jornada anterior (la primera,
 * con 0). null si no cambia ninguno (descansó) o faltan datos. `filas[i]`:
 * { ganados, empatados, perdidos } tras la jornada `i`. */
export function resultadosJornadas(filas) {
  return filas.map((f, i) => {
    const antes = i > 0 ? filas[i - 1] : { ganados: 0, empatados: 0, perdidos: 0 };
    const campos = ['ganados', 'empatados', 'perdidos'];
    if (!f || !antes || campos.some((c) => f[c] == null || antes[c] == null)) return null;
    if (f.ganados > antes.ganados) return 'G';
    if (f.empatados > antes.empatados) return 'E';
    if (f.perdidos > antes.perdidos) return 'P';
    return null;
  });
}

/** Jornadas en las que el PALMA descansó: los partidos jugados no cambian
 * respecto a la jornada anterior. `jugados[i]` = partidos jugados tras la
 * jornada `i`. */
export function jornadasDescanso(jugados) {
  return jugados.map((j, i) => i > 0 && j != null && jugados[i - 1] != null && j === jugados[i - 1]);
}
