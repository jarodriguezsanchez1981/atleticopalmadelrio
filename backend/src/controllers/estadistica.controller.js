const { Partido, PartidoJugador, Jugador } = require('../models');

/** Estadísticas de cada jugador en los partidos de una plantilla (datos de
 * "Finalizar Acta"): partidos jugados (minutos > 0), veces titular y veces que
 * ha entrado de suplente, minutos (total, como local / visitante del PALMA, de
 * titular y desde el banquillo), goles (y los marcados entrando desde el
 * banquillo), partidos en el banquillo sin jugar, tarjetas y porcentajes de
 * goles por partido y desde el banquillo; de más a menos minutos. */
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
        tarjetas_rojas: 0,
        minutos_titular: 0,
        minutos_banquillo: 0,
        goles_banquillo: 0,
        banquillo_no_jugados: 0
      };
      const minutos = Number(f.minutos) || 0;
      if (minutos > 0) fila.partidos += 1;
      fila.minutos += minutos;
      // es_local: el jugador (del PALMA) estaba en el equipo local del partido.
      if (f.es_local) fila.minutos_local += minutos;
      else fila.minutos_visitante += minutos;
      const goles = Number(f.goles) || 0;
      const esTitular = f.titular === true || f.titular === 1;
      const esSuplente = f.titular === false || f.titular === 0;
      if (esTitular) {
        fila.titular += 1;
        fila.minutos_titular += minutos;
      } else if (esSuplente && f.minuto_entrada != null) {
        // Entró desde el banquillo: todos sus goles de ese partido son "desde el banquillo".
        fila.suplente += 1;
        fila.minutos_banquillo += minutos;
        fila.goles_banquillo += goles;
      } else if (esSuplente) {
        fila.banquillo_no_jugados += 1;
      }
      fila.goles += goles;
      fila.tarjetas_amarillas += Number(f.tarjeta_amarilla) || 0;
      fila.tarjetas_rojas += Number(f.tarjeta_roja) || 0;
      porJugador.set(f.id_jugador, fila);
    }
    // Porcentajes con un decimal (null si no se pueden calcular).
    const porcentaje = (parte, total) => (total > 0 ? Math.round((parte / total) * 1000) / 10 : null);
    for (const f of porJugador.values()) {
      f.porcentaje_goles_partido = porcentaje(f.goles, f.partidos);
      f.porcentaje_goles_banquillo = porcentaje(f.goles_banquillo, f.goles);
    }
    const resultado = [...porJugador.values()]
      .filter((f) => f.partidos > 0 || f.goles > 0 || f.tarjetas_amarillas > 0 || f.tarjetas_rojas > 0 || f.banquillo_no_jugados > 0)
      .sort((a, b) => b.minutos - a.minutos || b.partidos - a.partidos
        || `${a.apellidos} ${a.nombre}`.localeCompare(`${b.apellidos} ${b.nombre}`, 'es'));
    res.json(resultado);
  } catch (err) { next(err); }
}

module.exports = { listar };
