import { partidosService } from '../services';

/** Solo los partidos se pueden mover arrastrándolos en el calendario, y solo
 * con permiso de edición en Partidos. */
export function puedeMoverEvento(evento, auth) {
  return evento?.tipo === 'partido' && auth.puedeEditar('partidos');
}

/** Días naturales (hora local) entre dos fechas. */
function diasEntre(desde, hasta) {
  const a = new Date(desde.getFullYear(), desde.getMonth(), desde.getDate());
  const b = new Date(hasta.getFullYear(), hasta.getMonth(), hasta.getDate());
  return Math.round((b - a) / 86400000);
}

/** Guarda en el backend el nuevo día de un partido soltado en otro día del
 * calendario (eventDrop de FullCalendar), manteniendo su hora. */
export async function moverEvento(evento, eventoAnterior) {
  const e = evento.extendedProps;
  if (e.tipo !== 'partido') throw new Error('Solo se pueden mover partidos.');
  const id = e.base_id ?? Number(String(evento.id).split('-').pop());
  // Un partido sin hora se guarda a las 00:00 UTC: se desplaza el día en UTC
  // para que siga "sin hora" aunque entre medias cambie el horario de verano.
  const original = new Date(e.inicio);
  let fecha = evento.start.toISOString();
  if (original.getUTCHours() === 0 && original.getUTCMinutes() === 0) {
    const d = new Date(original);
    d.setUTCDate(d.getUTCDate() + diasEntre(eventoAnterior.start, evento.start));
    fecha = d.toISOString();
  }
  return partidosService.actualizar(id, { fecha });
}
