import { partidosService, entrenamientosService, torneosService } from '../services';

/** Sección cuyo permiso de edición hace falta para mover cada tipo de evento
 * arrastrándolo en el calendario (los festivos no se mueven). */
const SECCION_POR_TIPO = { partido: 'partidos', entrenamiento: 'entrenamientos', torneo: 'torneo' };

export function puedeMoverEvento(evento, auth) {
  const seccion = SECCION_POR_TIPO[evento?.tipo];
  return !!seccion && auth.puedeEditar(seccion);
}

function fechaLocalISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Días naturales (hora local) entre dos fechas. */
function diasEntre(desde, hasta) {
  const a = new Date(desde.getFullYear(), desde.getMonth(), desde.getDate());
  const b = new Date(hasta.getFullYear(), hasta.getMonth(), hasta.getDate());
  return Math.round((b - a) / 86400000);
}

/** Guarda en el backend el nuevo día de un evento soltado en otro día del
 * calendario (eventDrop de FullCalendar), manteniendo su hora. */
export async function moverEvento(evento, eventoAnterior) {
  const e = evento.extendedProps;
  const id = e.base_id ?? Number(String(evento.id).split('-').pop());
  if (e.tipo === 'partido') {
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
  if (e.tipo === 'entrenamiento') return entrenamientosService.mover(id, evento.start.toISOString());
  if (e.tipo === 'torneo') return torneosService.actualizar(id, { fecha: fechaLocalISO(evento.start) });
  throw new Error('Este evento no se puede mover.');
}
