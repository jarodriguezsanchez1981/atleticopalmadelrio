/**
 * Color de la posición del PALMA en la gráfica de Clasificación según cómo
 * cambió respecto a la jornada anterior: subió (mejor puesto, menos número)
 * verde, bajó rojo, se mantiene igual amarillo. La primera jornada (sin
 * anterior con la que comparar) y la jornada en la que descansa (no ha
 * jugado, así que bajar no es culpa suya) van en amarillo. Lo usan las dos vistas de
 * Clasificación (Senior A y por categoría).
 */
export const COLOR_SUBIDA = '#16a34a';
export const COLOR_BAJADA = '#dc2626';
export const COLOR_IGUAL = '#eab308';

/** Color del punto/tramo de la jornada `i` comparando `posiciones[i]` con
 * `posiciones[i-1]` (menos número = mejor posición = subida). `descansos[i]`
 * true = esa jornada descansó (ver `jornadasDescanso`): siempre amarillo. */
export function colorPosicion(posiciones, i, descansos = []) {
  if (i <= 0 || descansos[i]) return COLOR_IGUAL;
  const anterior = posiciones[i - 1];
  const actual = posiciones[i];
  if (actual == null || anterior == null) return COLOR_IGUAL;
  if (actual < anterior) return COLOR_SUBIDA;
  if (actual > anterior) return COLOR_BAJADA;
  return COLOR_IGUAL;
}

/** Jornadas en las que el PALMA descansó: los partidos jugados no cambian
 * respecto a la jornada anterior. `jugados[i]` = partidos jugados tras la
 * jornada `i`. */
export function jornadasDescanso(jugados) {
  return jugados.map((j, i) => i > 0 && j != null && jugados[i - 1] != null && j === jugados[i - 1]);
}
