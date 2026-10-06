const { PartidoJugador } = require('../models');

// Datos que pone Finalizar Acta (ver partido.controller.finalizarActa).
const CAMPOS_ACTA = ['titular', 'minuto_entrada', 'minuto_salida', 'minutos'];

/** Guarda los jugadores convocados (local y visitante) de un partido; lo usan
 * Partidos y Jornadas. */
async function guardarJugadores(idPartido, jugadoresLocal, jugadoresVisitante) {
  // Los datos del acta (titular, cambios, minutos) los pone Finalizar Acta: si
  // un jugador llega sin ellos (p.ej. desde una versión antigua del formulario
  // que no los conoce), se conservan los que ya tenía en vez de borrarlos.
  const anteriores = await PartidoJugador.findAll({ where: { id_partido: idPartido } });
  const claveFila = (f, esLocal) => `${esLocal ? 1 : 0}-${f.id_jugador ?? ''}-${f.id_equipo_jugador ?? ''}`;
  const previos = new Map((anteriores || []).map((f) => [claveFila(f, f.es_local), f]));
  const datoActa = (j, esLocal, campo) => {
    if (j[campo] !== undefined) return j[campo];
    return previos.get(claveFila(j, esLocal))?.[campo] ?? null;
  };

  await PartidoJugador.destroy({ where: { id_partido: idPartido } });
  const filas = [];
  const anadir = (j, esLocal) => {
    filas.push({
      id_partido: idPartido,
      id_jugador: j.id_jugador ?? null,
      id_equipo_jugador: j.id_equipo_jugador ?? null,
      es_local: esLocal,
      tarjeta_amarilla: j.tarjeta_amarilla || 0,
      tarjeta_roja: j.tarjeta_roja || 0,
      goles: j.goles || 0,
      ...Object.fromEntries(CAMPOS_ACTA.map((campo) => [campo, datoActa(j, esLocal, campo)]))
    });
  };
  (jugadoresLocal || []).forEach((j) => anadir(j, true));
  (jugadoresVisitante || []).forEach((j) => anadir(j, false));
  if (filas.length) {
    await PartidoJugador.bulkCreate(filas, { ignoreDuplicates: true });
  }
}

module.exports = { guardarJugadores };
