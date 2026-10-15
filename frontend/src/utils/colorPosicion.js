/**
 * Color de la posición del PALMA en la gráfica de Clasificación según cómo
 * cambió respecto a la jornada anterior: subió (mejor puesto, menos número)
 * verde, bajó rojo, se mantiene igual amarillo. La primera jornada (sin
 * anterior con la que comparar) va en amarillo. Lo usan las dos vistas de
 * Clasificación (Senior A y por categoría).
 */
export const COLOR_SUBIDA = '#16a34a';
export const COLOR_BAJADA = '#dc2626';
export const COLOR_IGUAL = '#eab308';

/** Color del punto/tramo de la jornada `i` comparando `posiciones[i]` con
 * `posiciones[i-1]` (menos número = mejor posición = subida). */
export function colorPosicion(posiciones, i) {
  if (i <= 0) return COLOR_IGUAL;
  const anterior = posiciones[i - 1];
  const actual = posiciones[i];
  if (actual == null || anterior == null) return COLOR_IGUAL;
  if (actual < anterior) return COLOR_SUBIDA;
  if (actual > anterior) return COLOR_BAJADA;
  return COLOR_IGUAL;
}
