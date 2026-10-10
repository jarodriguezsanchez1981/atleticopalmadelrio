const { Partido, PartidoJugador, PartidoTarjeta, PartidoGol, Jugador } = require('../models');

// Los partidos con estadísticas son de 90' (ver Finalizar Acta).
const MINUTOS_PARTIDO = 90;
const FIN_PRIMERA_PARTE = 45;
const CAMPOS_TARJETAS = [
  'amarillas_primera', 'amarillas_segunda', 'amarillas_ganando', 'amarillas_perdiendo',
  'rojas_primera', 'rojas_segunda', 'rojas_ganando', 'rojas_perdiendo'
];

// Contadores de cada jugador; cada uno se guarda en total (campo) y según el
// PALMA jugara en casa o fuera (campo_local / campo_visitante).
const CONTADORES = [
  'convocatorias', 'partidos', 'titular', 'suplente', 'banquillo_no_jugados', 'sustituciones',
  'minutos', 'minutos_titular', 'minutos_banquillo',
  'goles', 'goles_titular', 'goles_banquillo', 'goles_primera', 'goles_segunda',
  'tarjetas_amarillas', 'tarjetas_rojas', ...CAMPOS_TARJETAS
];
const LADOS = ['local', 'visitante'];
const PALMA_ID = 73;
// Contadores del equipo (Estadísticas Equipo), en total y como local / visitante.
const CONTADORES_EQUIPO = [
  'partidos', 'victorias', 'empates', 'derrotas', 'goles_favor', 'goles_contra',
  'goles_penalti_favor', 'goles_penalti_contra', 'tarjetas_amarillas', 'tarjetas_rojas'
];

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
      attributes: ['id_partido', 'id_jugador', 'es_local', 'titular', 'minuto_entrada', 'minuto_salida', 'minutos', 'goles', 'tarjeta_amarilla', 'tarjeta_roja'],
      include: [{ model: Jugador, as: 'jugador', attributes: ['id', 'nombre', 'apellidos'] }]
    });

    const porJugador = new Map();
    // Lado del PALMA (local / visitante) de cada jugador en cada partido, para
    // repartir las tarjetas y los goles con minuto.
    const ladoEnPartido = new Map();
    // Salidas del campo de jugadores con roja: hasta ver sus tarjetas no se sabe
    // si los cambiaron o los expulsaron (el expulsado sale en el minuto de la roja).
    const salidasConRoja = [];
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
      // Sustitución: sale del campo antes del final (y no por expulsión).
      if (f.minuto_salida != null) {
        if (Number(f.tarjeta_roja) > 0) salidasConRoja.push({ fila, lado, id_partido: f.id_partido, minuto: f.minuto_salida });
        else sumar(fila, 'sustituciones', 1, lado);
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

    for (const s of salidasConRoja) {
      const expulsado = tarjetas.some((t) => t.tipo === 'roja' && t.id_partido === s.id_partido
        && t.id_jugador === s.fila.id_jugador && t.minuto === s.minuto);
      if (!expulsado) sumar(s.fila, 'sustituciones', 1, s.lado);
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
        // Parte de sus goles marcados de titular / entrando de suplente.
        f[`porcentaje_goles_titular${sufijo}`] = porcentaje(f[`goles_titular${sufijo}`], f[`goles${sufijo}`]);
        f[`porcentaje_goles_banquillo${sufijo}`] = porcentaje(f[`goles_banquillo${sufijo}`], f[`goles${sufijo}`]);
        // Minutos jugados sobre los posibles en los partidos que ha jugado
        // (3 partidos enteros = 100 %).
        f[`porcentaje_minutos${sufijo}`] = porcentaje(f[`minutos${sufijo}`], f[`partidos${sufijo}`] * MINUTOS_PARTIDO);
      }
      // Parte de sus goles marcados en casa o fuera.
      for (const l of LADOS) f[`porcentaje_goles_${l}`] = porcentaje(f[`goles_${l}`], f.goles);
    }
    const resultado = [...porJugador.values()]
      .filter((f) => f.partidos > 0 || f.goles > 0 || f.tarjetas_amarillas > 0 || f.tarjetas_rojas > 0 || f.banquillo_no_jugados > 0)
      .sort((a, b) => b.minutos - a.minutos || b.partidos - a.partidos
        || `${a.apellidos} ${a.nombre}`.localeCompare(`${b.apellidos} ${b.nombre}`, 'es'));
    res.json(resultado);
  } catch (err) { next(err); }
}

/** Goles de cada equipo a partir del resultado "local-visitante"; null si no es válido. */
function golesResultado(resultado) {
  const m = /^\s*(\d+)\s*-\s*(\d+)\s*$/.exec(String(resultado || ''));
  return m ? { local: Number(m[1]), visitante: Number(m[2]) } : null;
}

/** Estadísticas del equipo en los partidos de una plantilla con resultado (no
 * suspendidos): partidos, victorias / empates / derrotas, goles a favor y en
 * contra (y de penalti), tarjetas de los jugadores del PALMA, y porcentajes
 * por partido. En total y como local / visitante del PALMA. `sin_penaltis`:
 * partidos con resultado cuyo acta no se ha finalizado desde que se guardan
 * los penaltis (sus penaltis en contra no se conocen). */
async function equipo(req, res, next) {
  try {
    const idPlantilla = Number(req.query.id_plantilla);
    if (!idPlantilla) return res.status(400).json({ message: 'Indica la plantilla.' });

    const fila = { id_plantilla: idPlantilla, sin_penaltis: 0 };
    for (const c of CONTADORES_EQUIPO) {
      fila[c] = 0;
      for (const l of LADOS) fila[`${c}_${l}`] = 0;
    }
    const sumar = (campo, valor, lado) => {
      fila[campo] += valor;
      fila[`${campo}_${lado}`] += valor;
    };

    const partidos = (await Partido.findAll({
      where: { id_plantilla: idPlantilla },
      attributes: ['id', 'id_equipo_local', 'id_equipo_visitante', 'resultado', 'suspendido', 'goles_penalti_favor', 'goles_penalti_contra']
    }) || []).filter((p) => !p.suspendido && golesResultado(p.resultado)
      && (Number(p.id_equipo_local) === PALMA_ID || Number(p.id_equipo_visitante) === PALMA_ID));
    const ladoPartido = new Map();
    for (const p of partidos) {
      const lado = Number(p.id_equipo_local) === PALMA_ID ? 'local' : 'visitante';
      ladoPartido.set(p.id, lado);
      const goles = golesResultado(p.resultado);
      const favor = lado === 'local' ? goles.local : goles.visitante;
      const contra = lado === 'local' ? goles.visitante : goles.local;
      sumar('partidos', 1, lado);
      sumar(favor > contra ? 'victorias' : favor < contra ? 'derrotas' : 'empates', 1, lado);
      sumar('goles_favor', favor, lado);
      sumar('goles_contra', contra, lado);
      if (p.goles_penalti_contra != null) sumar('goles_penalti_contra', Number(p.goles_penalti_contra), lado);
      else fila.sin_penaltis += 1;
      if (p.goles_penalti_favor != null) sumar('goles_penalti_favor', Number(p.goles_penalti_favor), lado);
    }

    const idsPartidos = [...ladoPartido.keys()];
    if (idsPartidos.length) {
      // Partidos de antes de guardar los penaltis en el partido: los a favor
      // salen de los goles de los jugadores (partido_goles).
      const sinPenaltisFavor = new Set(partidos.filter((p) => p.goles_penalti_favor == null).map((p) => p.id));
      if (sinPenaltisFavor.size) {
        const goles = await PartidoGol.findAll({ where: { id_partido: [...sinPenaltisFavor], tipo: 'penalti' } }) || [];
        for (const g of goles) sumar('goles_penalti_favor', 1, ladoPartido.get(g.id_partido));
      }
      // Tarjetas de los jugadores del PALMA (los del rival no tienen id_jugador).
      const jugadores = await PartidoJugador.findAll({
        where: { id_partido: idsPartidos },
        attributes: ['id_partido', 'id_jugador', 'es_local', 'tarjeta_amarilla', 'tarjeta_roja']
      }) || [];
      for (const j of jugadores) {
        const lado = ladoPartido.get(j.id_partido);
        if (!j.id_jugador || !lado || !!j.es_local !== (lado === 'local')) continue;
        sumar('tarjetas_amarillas', Number(j.tarjeta_amarilla) || 0, lado);
        sumar('tarjetas_rojas', Number(j.tarjeta_roja) || 0, lado);
      }
    }

    for (const sufijo of ['', '_local', '_visitante']) {
      const n = fila[`partidos${sufijo}`];
      fila[`porcentaje_goles_favor${sufijo}`] = porcentaje(fila[`goles_favor${sufijo}`], n);
      fila[`porcentaje_goles_contra${sufijo}`] = porcentaje(fila[`goles_contra${sufijo}`], n);
      fila[`porcentaje_amarillas${sufijo}`] = porcentaje(fila[`tarjetas_amarillas${sufijo}`], n);
      fila[`porcentaje_rojas${sufijo}`] = porcentaje(fila[`tarjetas_rojas${sufijo}`], n);
    }
    res.json(fila);
  } catch (err) { next(err); }
}

module.exports = { listar, equipo };
