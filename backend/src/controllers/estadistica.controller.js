const { Partido, PartidoJugador, PartidoTarjeta, PartidoGol, Jugador } = require('../models');

// Minuto en que acaba la 1ª parte (los partidos con estadísticas son de 90').
const FIN_PRIMERA_PARTE = 45;
const CAMPOS_TARJETAS = [
  'amarillas_primera', 'amarillas_segunda', 'amarillas_ganando', 'amarillas_perdiendo',
  'rojas_primera', 'rojas_segunda', 'rojas_ganando', 'rojas_perdiendo'
];

// Contadores de cada jugador; cada uno se guarda en total (campo) y según el
// PALMA jugara en casa o fuera (campo_local / campo_visitante).
const CONTADORES = [
  'convocatorias', 'partidos', 'titular', 'suplente', 'banquillo_no_jugados',
  'minutos', 'minutos_titular', 'minutos_banquillo',
  'goles', 'goles_titular', 'goles_banquillo', 'goles_primera', 'goles_segunda',
  'tarjetas_amarillas', 'tarjetas_rojas', ...CAMPOS_TARJETAS
];
const LADOS = ['local', 'visitante'];

/** Porcentaje con un decimal (null si no se puede calcular). */
const porcentaje = (parte, total) => (total > 0 ? Math.round((parte / total) * 1000) / 10 : null);

/** Estadísticas de cada jugador en los partidos de una plantilla (datos de
 * "Finalizar Acta"): convocatorias (está en el acta), partidos jugados
 * (minutos > 0), titular / suplente que entra / suplente sin jugar, minutos,
 * goles (por parte, de titular y desde el banquillo) y tarjetas (por parte y
 * según el marcador). Todo en total y como local / visitante del PALMA (sufijos
 * _local / _visitante), más porcentajes; de más a menos minutos. */
async function listar(req, res, next) {
  try {
    const idPlantilla = Number(req.query.id_plantilla);
    if (!idPlantilla) return res.status(400).json({ message: 'Indica la plantilla.' });

    const partidos = await Partido.findAll({ where: { id_plantilla: idPlantilla }, attributes: ['id'] });
    if (!partidos.length) return res.json([]);
    const idsPartidos = partidos.map((p) => p.id);

    const filas = await PartidoJugador.findAll({
      where: { id_partido: idsPartidos },
      attributes: ['id_partido', 'id_jugador', 'es_local', 'titular', 'minuto_entrada', 'minutos', 'goles', 'tarjeta_amarilla', 'tarjeta_roja'],
      include: [{ model: Jugador, as: 'jugador', attributes: ['id', 'nombre', 'apellidos'] }]
    });

    const porJugador = new Map();
    // Lado del PALMA (local / visitante) de cada jugador en cada partido, para
    // repartir las tarjetas y los goles con minuto.
    const ladoEnPartido = new Map();
    const sumar = (fila, campo, valor, lado) => {
      fila[campo] += valor;
      fila[`${campo}_${lado}`] += valor;
    };
    for (const f of filas) {
      if (!f.id_jugador) continue;
      let fila = porJugador.get(f.id_jugador);
      if (!fila) {
        fila = { id_jugador: f.id_jugador, nombre: f.jugador?.nombre || '', apellidos: f.jugador?.apellidos || '' };
        for (const c of CONTADORES) {
          fila[c] = 0;
          for (const l of LADOS) fila[`${c}_${l}`] = 0;
        }
        porJugador.set(f.id_jugador, fila);
      }
      // es_local: el jugador (del PALMA) estaba en el equipo local del partido.
      const lado = f.es_local ? 'local' : 'visitante';
      ladoEnPartido.set(`${f.id_partido}-${f.id_jugador}`, lado);
      const minutos = Number(f.minutos) || 0;
      const goles = Number(f.goles) || 0;
      const esTitular = f.titular === true || f.titular === 1;
      const esSuplente = f.titular === false || f.titular === 0;
      // Convocado: está en el acta del partido (haya jugado o no).
      sumar(fila, 'convocatorias', 1, lado);
      if (minutos > 0) sumar(fila, 'partidos', 1, lado);
      sumar(fila, 'minutos', minutos, lado);
      sumar(fila, 'goles', goles, lado);
      if (esTitular) {
        sumar(fila, 'titular', 1, lado);
        sumar(fila, 'minutos_titular', minutos, lado);
        sumar(fila, 'goles_titular', goles, lado);
      } else if (esSuplente && f.minuto_entrada != null) {
        // Entró desde el banquillo: todos sus goles de ese partido son "desde el banquillo".
        sumar(fila, 'suplente', 1, lado);
        sumar(fila, 'minutos_banquillo', minutos, lado);
        sumar(fila, 'goles_banquillo', goles, lado);
      } else if (esSuplente) {
        sumar(fila, 'banquillo_no_jugados', 1, lado);
      }
      sumar(fila, 'tarjetas_amarillas', Number(f.tarjeta_amarilla) || 0, lado);
      sumar(fila, 'tarjetas_rojas', Number(f.tarjeta_roja) || 0, lado);
    }

    // Tarjetas por parte del partido y según el marcador en ese momento
    // (partido_tarjetas, de Finalizar Acta). Empatando no cuenta en ninguna.
    const tarjetas = await PartidoTarjeta.findAll({ where: { id_partido: idsPartidos } }) || [];
    for (const t of tarjetas) {
      const fila = porJugador.get(t.id_jugador);
      const lado = ladoEnPartido.get(`${t.id_partido}-${t.id_jugador}`);
      if (!fila || !lado) continue;
      const tipo = t.tipo === 'roja' ? 'rojas' : 'amarillas';
      if (t.minuto != null) sumar(fila, `${tipo}_${t.minuto <= FIN_PRIMERA_PARTE ? 'primera' : 'segunda'}`, 1, lado);
      if (t.goles_favor > t.goles_contra) sumar(fila, `${tipo}_ganando`, 1, lado);
      else if (t.goles_favor < t.goles_contra) sumar(fila, `${tipo}_perdiendo`, 1, lado);
    }

    // Goles por parte del partido (partido_goles, de Finalizar Acta).
    const golesConMinuto = await PartidoGol.findAll({ where: { id_partido: idsPartidos } }) || [];
    for (const g of golesConMinuto) {
      const fila = porJugador.get(g.id_jugador);
      const lado = ladoEnPartido.get(`${g.id_partido}-${g.id_jugador}`);
      if (!fila || !lado || g.minuto == null) continue;
      sumar(fila, g.minuto <= FIN_PRIMERA_PARTE ? 'goles_primera' : 'goles_segunda', 1, lado);
    }

    for (const f of porJugador.values()) {
      for (const sufijo of ['', '_local', '_visitante']) {
        f[`porcentaje_goles_partido${sufijo}`] = porcentaje(f[`goles${sufijo}`], f[`partidos${sufijo}`]);
        f[`porcentaje_goles_banquillo${sufijo}`] = porcentaje(f[`goles_banquillo${sufijo}`], f[`goles${sufijo}`]);
      }
      // Parte de sus minutos / goles jugados en casa o fuera.
      for (const l of LADOS) {
        f[`porcentaje_minutos_${l}`] = porcentaje(f[`minutos_${l}`], f.minutos);
        f[`porcentaje_goles_${l}`] = porcentaje(f[`goles_${l}`], f.goles);
      }
    }
    const resultado = [...porJugador.values()]
      .filter((f) => f.partidos > 0 || f.goles > 0 || f.tarjetas_amarillas > 0 || f.tarjetas_rojas > 0 || f.banquillo_no_jugados > 0)
      .sort((a, b) => b.minutos - a.minutos || b.partidos - a.partidos
        || `${a.apellidos} ${a.nombre}`.localeCompare(`${b.apellidos} ${b.nombre}`, 'es'));
    res.json(resultado);
  } catch (err) { next(err); }
}

module.exports = { listar };
