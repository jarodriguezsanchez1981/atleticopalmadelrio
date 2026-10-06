const { Partido, PartidoJugador, Jugador } = require('../models');

/** Minutos jugados por cada jugador en los partidos de una plantilla (datos
 * de "Finalizar Acta"): partidos en los que ha jugado (minutos > 0) y total de
 * minutos, de más a menos minutos. */
async function listar(req, res, next) {
  try {
    const idPlantilla = Number(req.query.id_plantilla);
    if (!idPlantilla) return res.status(400).json({ message: 'Indica la plantilla.' });

    const partidos = await Partido.findAll({ where: { id_plantilla: idPlantilla }, attributes: ['id'] });
    if (!partidos.length) return res.json([]);

    const filas = await PartidoJugador.findAll({
      where: { id_partido: partidos.map((p) => p.id) },
      attributes: ['id_partido', 'id_jugador', 'minutos'],
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
        minutos: 0
      };
      const minutos = Number(f.minutos) || 0;
      if (minutos > 0) fila.partidos += 1;
      fila.minutos += minutos;
      porJugador.set(f.id_jugador, fila);
    }
    const resultado = [...porJugador.values()]
      .filter((f) => f.partidos > 0)
      .sort((a, b) => b.minutos - a.minutos || b.partidos - a.partidos
        || `${a.apellidos} ${a.nombre}`.localeCompare(`${b.apellidos} ${b.nombre}`, 'es'));
    res.json(resultado);
  } catch (err) { next(err); }
}

module.exports = { listar };
