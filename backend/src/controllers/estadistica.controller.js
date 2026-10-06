const { Partido, PartidoJugador, Jugador } = require('../models');

/** Estadísticas de cada jugador en los partidos de una plantilla (datos de
 * "Finalizar Acta"): partidos jugados (minutos > 0), veces titular y veces que
 * ha entrado de suplente, minutos (total y como local / visitante del PALMA),
 * goles y tarjetas; de más a menos minutos. */
async function listar(req, res, next) {
  try {
    const idPlantilla = Number(req.query.id_plantilla);
    if (!idPlantilla) return res.status(400).json({ message: 'Indica la plantilla.' });

    const partidos = await Partido.findAll({ where: { id_plantilla: idPlantilla }, attributes: ['id'] });
    if (!partidos.length) return res.json([]);

    const filas = await PartidoJugador.findAll({
      where: { id_partido: partidos.map((p) => p.id) },
      attributes: ['id_partido', 'id_jugador', 'es_local', 'titular', 'minuto_entrada', 'minutos', 'goles', 'tarjeta_amarilla', 'tarjeta_roja'],
      include: [{ model: Jugador, as: 'jugador', attributes: ['id', 'nombre', 'apellidos'] }]
    });

    const porJugador = new Map();
    for (const f of filas) {
      if (!f.id_jugador) continue;
      const fila = porJugador.get(f.id_jugador) || {
        id_jugador: f.id_jugador,
        nombre: f.jugador?.nombre || '',
        apellidos: f.jugador?.apellidos || '',
        partidos: 0,
        titular: 0,
        suplente: 0,
        minutos: 0,
        minutos_local: 0,
        minutos_visitante: 0,
        goles: 0,
        tarjetas_amarillas: 0,
        tarjetas_rojas: 0
      };
      const minutos = Number(f.minutos) || 0;
      if (minutos > 0) fila.partidos += 1;
      fila.minutos += minutos;
      // es_local: el jugador (del PALMA) estaba en el equipo local del partido.
      if (f.es_local) fila.minutos_local += minutos;
      else fila.minutos_visitante += minutos;
      if (f.titular === true || f.titular === 1) fila.titular += 1;
      else if ((f.titular === false || f.titular === 0) && f.minuto_entrada != null) fila.suplente += 1;
      fila.goles += Number(f.goles) || 0;
      fila.tarjetas_amarillas += Number(f.tarjeta_amarilla) || 0;
      fila.tarjetas_rojas += Number(f.tarjeta_roja) || 0;
      porJugador.set(f.id_jugador, fila);
    }
    const resultado = [...porJugador.values()]
      .filter((f) => f.partidos > 0 || f.goles > 0 || f.tarjetas_amarillas > 0 || f.tarjetas_rojas > 0)
      .sort((a, b) => b.minutos - a.minutos || b.partidos - a.partidos
        || `${a.apellidos} ${a.nombre}`.localeCompare(`${b.apellidos} ${b.nombre}`, 'es'));
    res.json(resultado);
  } catch (err) { next(err); }
}

module.exports = { listar };
