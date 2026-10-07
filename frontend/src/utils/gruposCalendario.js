/** Grupo con el que se muestra cada evento en los calendarios (cabeceras de
 * Calendario, Partidos y Entrenamientos, y la vista de lista del móvil), y el
 * orden de los grupos dentro de cada día. */

/** Lugar del evento como texto (en el calendario puede venir como objeto). */
function nombreLugar(e) {
  return String(typeof e.lugar === 'string' ? e.lugar : (e.lugar?.nombre || '')).trim().toLowerCase();
}

export function grupoDeEvento(e) {
  if (e.tipo === 'partido') {
    if (e.suspendido) return 'SUSPENDIDO';
    if (!e.jornada) return 'AMISTOSO';
    return e.es_local ? 'LIGA_CASA' : 'LIGA_FUERA';
  }
  if (e.tipo === 'torneo') return 'TORNEO';
  if (e.tipo === 'festivo') return 'FESTIVO';
  // Entrenamientos según el campo: "Estadio…" (Estadio A, Estadio B - 1…) o "Anexo…".
  const lugar = nombreLugar(e);
  if (lugar.startsWith('estadio')) return 'ENTRENAMIENTO_ESTADIO';
  if (lugar.startsWith('anexo')) return 'ENTRENAMIENTO_ANEXO';
  return 'ENTRENAMIENTO';
}

/** Orden de los grupos en el día; los suspendidos, siempre los últimos. */
export const ORDEN_GRUPOS = {
  FESTIVO: 0,
  LIGA_CASA: 1,
  LIGA_FUERA: 2,
  AMISTOSO: 3,
  TORNEO: 4,
  ENTRENAMIENTO_ESTADIO: 5,
  ENTRENAMIENTO_ANEXO: 6,
  ENTRENAMIENTO: 7,
  SUSPENDIDO: 8
};
