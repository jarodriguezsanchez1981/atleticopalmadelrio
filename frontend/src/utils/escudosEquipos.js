/**
 * Escudos de equipos bajo demanda para el calendario.
 * /api/calendario ya no los incluye (son imágenes base64 que se repetían en
 * cada partido); se piden solo al pintarlos y se cachean por equipo mientras
 * dure la sesión de la página.
 */
import { reactive } from 'vue';
import { calendarioService } from '../services';

/** Debe coincidir con MAX_ESCUDOS_POR_PETICION del backend. */
const LOTE = 50;
const cache = reactive({});

/** Escudo ya cargado del equipo, o null si no tiene o aún no se ha pedido (reactivo). */
export function escudoEquipo(id) {
  return id != null ? (cache[id] ?? null) : null;
}

/** Descarga los escudos que falten en la caché. */
export async function cargarEscudos(ids) {
  const faltan = [...new Set(ids.filter((id) => id != null && !(id in cache)))];
  for (let i = 0; i < faltan.length; i += LOTE) {
    const lote = faltan.slice(i, i + LOTE);
    const mapa = await calendarioService.escudos(lote);
    lote.forEach((id) => { cache[id] = mapa[id] ?? null; });
  }
}

/** Rellena `escudo` en los equipos de cada evento (equipoLocal, equipoVisitante, equipo). */
export async function adjuntarEscudos(eventos) {
  const equipos = eventos.flatMap((e) => [e.equipoLocal, e.equipoVisitante, e.equipo]).filter((eq) => eq?.id != null);
  await cargarEscudos(equipos.map((eq) => eq.id));
  equipos.forEach((eq) => { eq.escudo = cache[eq.id] ?? null; });
  return eventos;
}
