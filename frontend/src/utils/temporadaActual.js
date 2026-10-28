/** Devuelve la temporada marcada como actual, o null si ninguna lo está. */
export function obtenerTemporadaActual(temporadas) {
  return (temporadas || []).find((t) => t.actual) || null;
}

/** Filtra plantillas a las de la temporada actual; si ninguna temporada está marcada
 * como actual, devuelve todas (evita ocultar todo antes de configurar la temporada). */
export function filtrarPlantillasTemporadaActual(plantillas, temporadas) {
  const actual = obtenerTemporadaActual(temporadas);
  if (!actual) return plantillas;
  return (plantillas || []).filter((p) => p.id_temporada === actual.id);
}
