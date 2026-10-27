const { Partido, PartidoJugador, PartidoTarjeta, PartidoGol, PartidoGolContra, PartidoTarjetaContra, Jugador, Plantilla, Categoria, TipoFutbol, Temporada, Equipo } = require('../models');
const { categoriaDelUsuario } = require('../utils/filtroCategoria');
const { diaEspana } = require('../utils/horaEspana');

/** Lunes (en hora española, 'YYYY-MM-DD') de la semana de una fecha: agrupa los
 * partidos del mismo fin de semana de liga aunque sean de distinta jornada o
 * categoría (p. ej. Benjamín juega la jornada 5 y Alevín la 4 el mismo finde). */
function lunesDeLaSemana(fecha) {
  const [y, m, d] = diaEspana(new Date(fecha)).split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}

// Los partidos con estadísticas son de 90' (ver Finalizar Acta).
const MINUTOS_PARTIDO = 90;
const FIN_PRIMERA_PARTE = 45;
// Solo Senior A registra minutos en el acta. En el resto de categorías las
// sustituciones son ilimitadas y el acta no dice quién jugó: aparecer en ella
// significa haber jugado (ver partido.controller: CATEGORIA_CON_MINUTOS).
const CATEGORIA_CON_MINUTOS = 'Senior A';
const CAMPOS_TARJETAS = [
  'amarillas_primera', 'amarillas_segunda', 'amarillas_ganando', 'amarillas_perdiendo',
  'rojas_primera', 'rojas_segunda', 'rojas_ganando', 'rojas_perdiendo',
  'amarillas_titular', 'rojas_titular', 'amarillas_suplente', 'rojas_suplente'
];
// Goles por tramos dentro de cada parte (de partido_goles, que lleva el minuto):
// 3 tramos por parte, repartidos sobre la duración de juego del tipo de fútbol.
const TIPO_FUTBOL_7 = 1;
// Fútbol 7 no juega 90' (su acta llega a ~60'); Fútbol 11 sí. Un valor por tipo.
const duracionJuego = (idTipoFutbol) => (Number(idTipoFutbol) === TIPO_FUTBOL_7 ? 60 : 90);
const CAMPOS_GOLES_TRAMO = ['goles_1t1', 'goles_1t2', 'goles_1t3', 'goles_2t1', 'goles_2t2', 'goles_2t3'];
// Mismos tramos para los goles del equipo contrario (Estadísticas Goles).
const CAMPOS_CONTRA_TRAMO = ['contra_1t1', 'contra_1t2', 'contra_1t3', 'contra_2t1', 'contra_2t2', 'contra_2t3'];
/** Tramo (1/6) de un gol: 3 por parte sobre la duración `dur`; el añadido de
 * cada parte cae en su último tramo. */
function tramoGol(minuto, dur) {
  const sexto = dur / 6;
  for (let i = 1; i <= 5; i++) if (minuto <= Math.round(i * sexto)) return CAMPOS_GOLES_TRAMO[i - 1];
  return CAMPOS_GOLES_TRAMO[5];
}

// Contadores de cada jugador; cada uno se guarda en total (campo) y según el
// PALMA jugara en casa o fuera (campo_local / campo_visitante).
const CONTADORES = [
  'convocatorias', 'partidos', 'titular', 'suplente', 'banquillo_no_jugados',
  'sustituciones', 'sustituciones_primera', 'sustituciones_segunda',
  'minutos', 'minutos_titular', 'minutos_banquillo',
  'goles', 'partidos_con_gol', 'goles_titular', 'goles_banquillo', 'goles_primera', 'goles_segunda', ...CAMPOS_GOLES_TRAMO,
  'tarjetas_amarillas', 'tarjetas_rojas', 'dobles_amarillas', ...CAMPOS_TARJETAS
];
const LADOS = ['local', 'visitante'];
const PALMA_ID = 73;
// Contadores del equipo (Estadísticas Equipo), en total y como local / visitante.
const CONTADORES_EQUIPO = [
  'partidos', 'victorias', 'empates', 'derrotas', 'goles_favor', 'goles_contra',
  'goles_penalti_favor', 'goles_penalti_contra', 'goles_titulares', 'goles_suplentes',
  'tarjetas_amarillas', 'tarjetas_rojas',
  'amarillas_titulares', 'amarillas_suplentes', 'rojas_titulares', 'rojas_suplentes'
];

/** Porcentaje con un decimal (null si no se puede calcular). */
const porcentaje = (parte, total) => (total > 0 ? Math.round((parte / total) * 1000) / 10 : null);
/** Media con dos decimales (null si no se puede calcular). */
const media = (parte, total) => (total > 0 ? Math.round((parte / total) * 100) / 100 : null);

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

    // En las categorías sin minutos (todo lo que no es Senior A) aparecer en el
    // acta ya cuenta como partido jugado.
    const plantilla = await Plantilla.findByPk(idPlantilla, {
      include: [{ model: Categoria, as: 'categoria', attributes: ['nombre', 'id_tipofutbol'] }]
    });
    const conMinutos = plantilla?.categoria?.nombre === CATEGORIA_CON_MINUTOS;
    const durGoles = duracionJuego(plantilla?.categoria?.id_tipofutbol);

    // Solo los partidos de liga (con jornada), ya finalizados y no suspendidos:
    // las estadísticas salen del acta, no de la convocatoria previa, y un partido
    // suspendido no cuenta (igual que en Estadísticas Equipo).
    const partidos = (await Partido.findAll({
      where: { id_plantilla: idPlantilla },
      attributes: ['id', 'jornada', 'fecha', 'acta_finalizada_at', 'suspendido'],
      include: [
        { model: Equipo, as: 'equipoLocal', attributes: ['nombre'] },
        { model: Equipo, as: 'equipoVisitante', attributes: ['nombre'] }
      ]
    }) || [])
      .filter((p) => Number(p.jornada) > 0 && p.acta_finalizada_at != null && !p.suspendido);
    if (!partidos.length) return res.json([]);
    const idsPartidos = partidos.map((p) => p.id);
    const partidoPorId = new Map(partidos.map((p) => [p.id, p]));
    // Jornada, fecha y rival de un partido para los desplegables por jugador.
    const datosPartido = (idPartido, lado) => {
      const p = partidoPorId.get(idPartido);
      return {
        id_partido: idPartido,
        jornada: p?.jornada ?? null,
        fecha: p?.fecha ?? null,
        es_local: lado === 'local',
        rival: (lado === 'local' ? p?.equipoVisitante?.nombre : p?.equipoLocal?.nombre) || ''
      };
    };

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
    // Una sustitución (sale del campo en `minuto`), también por parte del partido.
    const sumarSustitucion = (fila, minuto, lado) => {
      sumar(fila, 'sustituciones', 1, lado);
      sumar(fila, Number(minuto) <= FIN_PRIMERA_PARTE ? 'sustituciones_primera' : 'sustituciones_segunda', 1, lado);
    };
    for (const f of filas) {
      if (!f.id_jugador) continue;
      let fila = porJugador.get(f.id_jugador);
      if (!fila) {
        // partidos_goles / partidos_tarjetas: partidos en los que marcó / vio
        // alguna tarjeta (desplegables de Estadísticas Goles y Sanciones).
        fila = {
          id_jugador: f.id_jugador, nombre: f.jugador?.nombre || '', apellidos: f.jugador?.apellidos || '',
          partidos_goles: [], partidos_tarjetas: []
        };
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
      // Jugó el partido: con minutos, haber jugado alguno; sin minutos, basta
      // con estar en el acta (sustituciones ilimitadas, no se registra quién no jugó).
      const jugo = conMinutos ? minutos > 0 : true;
      // Convocado: está en el acta del partido (haya jugado o no).
      sumar(fila, 'convocatorias', 1, lado);
      if (jugo) sumar(fila, 'partidos', 1, lado);
      sumar(fila, 'minutos', minutos, lado);
      sumar(fila, 'goles', goles, lado);
      if (goles > 0) sumar(fila, 'partidos_con_gol', 1, lado);
      if (esTitular) {
        sumar(fila, 'titular', 1, lado);
        sumar(fila, 'minutos_titular', minutos, lado);
        sumar(fila, 'goles_titular', goles, lado);
      } else if (esSuplente && (f.minuto_entrada != null || !conMinutos)) {
        // Entró desde el banquillo (o, sin minutos, un suplente que aparece en
        // el acta ha jugado): sus goles de ese partido son "desde el banquillo".
        sumar(fila, 'suplente', 1, lado);
        sumar(fila, 'minutos_banquillo', minutos, lado);
        sumar(fila, 'goles_banquillo', goles, lado);
      } else if (esSuplente) {
        sumar(fila, 'banquillo_no_jugados', 1, lado);
      }
      // Sustitución: sale del campo antes del final (y no por expulsión).
      if (f.minuto_salida != null) {
        if (Number(f.tarjeta_roja) > 0) salidasConRoja.push({ fila, lado, id_partido: f.id_partido, minuto: f.minuto_salida });
        else sumarSustitucion(fila, f.minuto_salida, lado);
      }
      sumar(fila, 'tarjetas_amarillas', Number(f.tarjeta_amarilla) || 0, lado);
      // Partido con 2 o más amarillas al mismo jugador (doble amarilla).
      if ((Number(f.tarjeta_amarilla) || 0) >= 2) sumar(fila, 'dobles_amarillas', 1, lado);
      sumar(fila, 'tarjetas_rojas', Number(f.tarjeta_roja) || 0, lado);
      // Tarjetas siendo titular o suplente; las del suplente cuentan aunque no
      // llegara a entrar (se puede ver tarjeta en el banquillo), igual que en
      // Estadísticas Equipo.
      const rol = esTitular ? 'titular' : esSuplente ? 'suplente' : null;
      if (rol) {
        sumar(fila, `amarillas_${rol}`, Number(f.tarjeta_amarilla) || 0, lado);
        sumar(fila, `rojas_${rol}`, Number(f.tarjeta_roja) || 0, lado);
      }
      const amarillas = Number(f.tarjeta_amarilla) || 0;
      const rojas = Number(f.tarjeta_roja) || 0;
      if (goles > 0) {
        // Minutos de cada gol (partido_goles), si el acta los trae; penalti: true si fue de penalti.
        fila.partidos_goles.push({ ...datosPartido(f.id_partido, lado), titular: esTitular, goles, minutos_goles: [] });
      }
      if (amarillas > 0 || rojas > 0) {
        fila.partidos_tarjetas.push({
          ...datosPartido(f.id_partido, lado),
          amarillas,
          rojas,
          // Minutos de cada tarjeta (partido_tarjetas), si el acta los trae.
          minutos_amarillas: [],
          minutos_rojas: []
        });
      }
    }

    // Tarjetas por parte del partido y según el marcador en ese momento
    // (partido_tarjetas, de Finalizar Acta). Empatando no cuenta en ninguna.
    const tarjetas = await PartidoTarjeta.findAll({ where: { id_partido: idsPartidos } }) || [];
    for (const t of tarjetas) {
      const fila = porJugador.get(t.id_jugador);
      const lado = ladoEnPartido.get(`${t.id_partido}-${t.id_jugador}`);
      if (!fila || !lado) continue;
      const tipo = t.tipo === 'roja' ? 'rojas' : 'amarillas';
      const enPartido = fila.partidos_tarjetas.find((x) => x.id_partido === t.id_partido);
      if (enPartido && t.minuto != null) enPartido[`minutos_${tipo}`].push(t.minuto);
      if (t.minuto != null) sumar(fila, `${tipo}_${t.minuto <= FIN_PRIMERA_PARTE ? 'primera' : 'segunda'}`, 1, lado);
      if (t.goles_favor > t.goles_contra) sumar(fila, `${tipo}_ganando`, 1, lado);
      else if (t.goles_favor < t.goles_contra) sumar(fila, `${tipo}_perdiendo`, 1, lado);
    }

    for (const s of salidasConRoja) {
      const expulsado = tarjetas.some((t) => t.tipo === 'roja' && t.id_partido === s.id_partido
        && t.id_jugador === s.fila.id_jugador && t.minuto === s.minuto);
      if (!expulsado) sumarSustitucion(s.fila, s.minuto, s.lado);
    }

    // Goles por parte del partido (partido_goles, de Finalizar Acta).
    const golesConMinuto = await PartidoGol.findAll({ where: { id_partido: idsPartidos } }) || [];
    for (const g of golesConMinuto) {
      const fila = porJugador.get(g.id_jugador);
      const lado = ladoEnPartido.get(`${g.id_partido}-${g.id_jugador}`);
      if (!fila || !lado || g.minuto == null) continue;
      const enPartido = fila.partidos_goles.find((x) => x.id_partido === g.id_partido);
      if (enPartido) enPartido.minutos_goles.push({ minuto: g.minuto, penalti: g.tipo === 'penalti' });
      sumar(fila, g.minuto <= FIN_PRIMERA_PARTE ? 'goles_primera' : 'goles_segunda', 1, lado);
      sumar(fila, tramoGol(g.minuto, durGoles), 1, lado);
    }

    // Partidos del equipo con acta (los que tienen jugadores), en total y por
    // lado, para el % de minutos sobre todos los partidos. Solo filas del
    // PALMA: las del rival llevan su propio es_local.
    const ladoPartido = new Map();
    for (const f of filas) if (f.id_jugador) ladoPartido.set(f.id_partido, f.es_local ? 'local' : 'visitante');
    const partidosEquipo = { '': ladoPartido.size, _local: 0, _visitante: 0 };
    for (const lado of ladoPartido.values()) partidosEquipo[`_${lado}`] += 1;

    for (const f of porJugador.values()) {
      f.partidos_tarjetas.sort((a, b) => (a.jornada ?? 0) - (b.jornada ?? 0));
      f.partidos_goles.sort((a, b) => (a.jornada ?? 0) - (b.jornada ?? 0));
      for (const x of f.partidos_goles) x.minutos_goles.sort((a, b) => a.minuto - b.minuto);
      for (const x of f.partidos_tarjetas) {
        x.minutos_amarillas.sort((a, b) => a - b);
        x.minutos_rojas.sort((a, b) => a - b);
      }
      for (const sufijo of ['', '_local', '_visitante']) {
        // Partidos jugados en los que marca (como mucho 100 %, aunque meta varios en uno).
        f[`porcentaje_goles_partido${sufijo}`] = porcentaje(f[`partidos_con_gol${sufijo}`], f[`partidos${sufijo}`]);
        // Parte de sus goles marcados de titular / entrando de suplente.
        f[`porcentaje_goles_titular${sufijo}`] = porcentaje(f[`goles_titular${sufijo}`], f[`goles${sufijo}`]);
        f[`porcentaje_goles_banquillo${sufijo}`] = porcentaje(f[`goles_banquillo${sufijo}`], f[`goles${sufijo}`]);
        // Minutos jugados sobre los posibles en los partidos que ha jugado
        // (3 partidos enteros = 100 %).
        f[`porcentaje_minutos${sufijo}`] = porcentaje(f[`minutos${sufijo}`], f[`partidos${sufijo}`] * MINUTOS_PARTIDO);
        // Minutos jugados sobre los de todos los partidos del equipo, los
        // haya jugado o no.
        f[`porcentaje_minutos_equipo${sufijo}`] = porcentaje(f[`minutos${sufijo}`], partidosEquipo[sufijo] * MINUTOS_PARTIDO);
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
 * contra (y de penalti), tarjetas de los jugadores del PALMA, y medias
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
      attributes: ['id', 'jornada', 'id_equipo_local', 'id_equipo_visitante', 'resultado', 'suspendido', 'goles_penalti_favor', 'goles_penalti_contra']
    }) || []).filter((p) => Number(p.jornada) > 0 && !p.suspendido && golesResultado(p.resultado)
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
      // Tarjetas y goles de los jugadores del PALMA (los del rival no tienen
      // id_jugador); los goles, según los marcara un titular o un suplente que entró.
      const jugadores = await PartidoJugador.findAll({
        where: { id_partido: idsPartidos },
        attributes: ['id_partido', 'id_jugador', 'es_local', 'titular', 'minuto_entrada', 'goles', 'tarjeta_amarilla', 'tarjeta_roja']
      }) || [];
      for (const j of jugadores) {
        const lado = ladoPartido.get(j.id_partido);
        if (!j.id_jugador || !lado || !!j.es_local !== (lado === 'local')) continue;
        sumar('tarjetas_amarillas', Number(j.tarjeta_amarilla) || 0, lado);
        sumar('tarjetas_rojas', Number(j.tarjeta_roja) || 0, lado);
        const goles = Number(j.goles) || 0;
        const esTitular = j.titular === true || j.titular === 1;
        const esSuplente = j.titular === false || j.titular === 0;
        if (esTitular) sumar('goles_titulares', goles, lado);
        else if (esSuplente && j.minuto_entrada != null) sumar('goles_suplentes', goles, lado);
        // Tarjetas de los suplentes: también las de los que no llegaron a entrar
        // (se puede ver tarjeta en el banquillo).
        const tipo = esTitular ? 'titulares' : esSuplente ? 'suplentes' : null;
        if (tipo) {
          sumar(`amarillas_${tipo}`, Number(j.tarjeta_amarilla) || 0, lado);
          sumar(`rojas_${tipo}`, Number(j.tarjeta_roja) || 0, lado);
        }
      }
    }

    for (const sufijo of ['', '_local', '_visitante']) {
      const n = fila[`partidos${sufijo}`];
      fila[`media_goles_favor${sufijo}`] = media(fila[`goles_favor${sufijo}`], n);
      fila[`media_goles_contra${sufijo}`] = media(fila[`goles_contra${sufijo}`], n);
      fila[`media_goles_titulares${sufijo}`] = media(fila[`goles_titulares${sufijo}`], n);
      fila[`media_goles_suplentes${sufijo}`] = media(fila[`goles_suplentes${sufijo}`], n);
      fila[`media_amarillas${sufijo}`] = media(fila[`tarjetas_amarillas${sufijo}`], n);
      fila[`media_rojas${sufijo}`] = media(fila[`tarjetas_rojas${sufijo}`], n);
      for (const tipo of ['amarillas', 'rojas']) {
        fila[`media_${tipo}_titulares${sufijo}`] = media(fila[`${tipo}_titulares${sufijo}`], n);
        fila[`media_${tipo}_suplentes${sufijo}`] = media(fila[`${tipo}_suplentes${sufijo}`], n);
      }
    }
    res.json(fila);
  } catch (err) { next(err); }
}

/** Goles del equipo contrario por periodo (tramos de 15') en los partidos de
 * una plantilla: total de goles en contra (del resultado) y su reparto por
 * tramo (de partido_goles_contra, que rellena Finalizar Acta). En total y como
 * local / visitante del PALMA. Una sola fila ("Equipo Contrario") para la tabla
 * de Estadísticas Goles. Los partidos cuya acta no se ha vuelto a finalizar
 * desde que se guardan los goles del rival no tienen el reparto por tramo (el
 * total sí sale del resultado). */
async function golesContra(req, res, next) {
  try {
    const idPlantilla = Number(req.query.id_plantilla);
    if (!idPlantilla) return res.status(400).json({ message: 'Indica la plantilla.' });

    const plantilla = await Plantilla.findByPk(idPlantilla, {
      include: [{ model: Categoria, as: 'categoria', attributes: ['id_tipofutbol'] }]
    });
    const durGoles = duracionJuego(plantilla?.categoria?.id_tipofutbol);

    const fila = { id_plantilla: idPlantilla, equipo: 'Equipo Contrario' };
    for (const c of ['goles_contra', ...CAMPOS_CONTRA_TRAMO]) {
      fila[c] = 0;
      for (const l of LADOS) fila[`${c}_${l}`] = 0;
    }
    const sumar = (campo, valor, lado) => {
      fila[campo] += valor;
      fila[`${campo}_${lado}`] += valor;
    };

    const partidos = (await Partido.findAll({
      where: { id_plantilla: idPlantilla },
      attributes: ['id', 'jornada', 'id_equipo_local', 'id_equipo_visitante', 'resultado', 'suspendido']
    }) || []).filter((p) => Number(p.jornada) > 0 && !p.suspendido && golesResultado(p.resultado)
      && (Number(p.id_equipo_local) === PALMA_ID || Number(p.id_equipo_visitante) === PALMA_ID));
    const ladoPartido = new Map();
    for (const p of partidos) {
      const lado = Number(p.id_equipo_local) === PALMA_ID ? 'local' : 'visitante';
      ladoPartido.set(p.id, lado);
      const goles = golesResultado(p.resultado);
      sumar('goles_contra', lado === 'local' ? goles.visitante : goles.local, lado);
    }

    const idsPartidos = [...ladoPartido.keys()];
    if (idsPartidos.length) {
      const golesRival = await PartidoGolContra.findAll({ where: { id_partido: idsPartidos } }) || [];
      for (const g of golesRival) {
        const lado = ladoPartido.get(g.id_partido);
        if (!lado || g.minuto == null) continue;
        const idx = CAMPOS_GOLES_TRAMO.indexOf(tramoGol(g.minuto, durGoles));
        sumar(CAMPOS_CONTRA_TRAMO[idx], 1, lado);
      }
    }
    res.json(fila);
  } catch (err) { next(err); }
}

// Contadores de cada equipo contrario (Estadísticas Rivales): los mismos de las
// tablas Goles y Sanciones de los jugadores, en total y según el PALMA jugara
// en casa o fuera.
const CONTADORES_RIVAL = [
  'partidos', 'goles', 'partidos_con_gol', 'goles_titular', 'goles_banquillo', ...CAMPOS_GOLES_TRAMO,
  'tarjetas_amarillas', 'tarjetas_rojas', 'dobles_amarillas', ...CAMPOS_TARJETAS
];

/** Goles y tarjetas de cada equipo contrario en los partidos de liga de una
 * plantilla con el acta finalizada (no suspendidos), igual que las tablas Goles
 * y Sanciones de los jugadores: goles por tramo, de titular / suplente y % de
 * partidos con gol (sin las propias puertas del PALMA); tarjetas siendo titular
 * o suplente, por parte y según el marcador del rival en ese momento. En total
 * y como local / visitante del PALMA. `partidos_sin_rival`: partidos
 * finalizados antes de guardar los datos del rival (hay que volver a pulsar
 * "Finalizar Acta"); en ellos solo cuentan los goles y sus tramos. */
async function rivales(req, res, next) {
  try {
    const idPlantilla = Number(req.query.id_plantilla);
    if (!idPlantilla) return res.status(400).json({ message: 'Indica la plantilla.' });

    const plantilla = await Plantilla.findByPk(idPlantilla, {
      include: [{ model: Categoria, as: 'categoria', attributes: ['id_tipofutbol'] }]
    });
    const durGoles = duracionJuego(plantilla?.categoria?.id_tipofutbol);

    const partidos = (await Partido.findAll({
      where: { id_plantilla: idPlantilla },
      attributes: ['id', 'jornada', 'id_equipo_local', 'id_equipo_visitante', 'acta_finalizada_at', 'acta_rival', 'suspendido'],
      include: [
        { model: Equipo, as: 'equipoLocal', attributes: ['id', 'nombre'] },
        { model: Equipo, as: 'equipoVisitante', attributes: ['id', 'nombre'] }
      ]
    }) || []).filter((p) => Number(p.jornada) > 0 && p.acta_finalizada_at != null && !p.suspendido
      && (Number(p.id_equipo_local) === PALMA_ID || Number(p.id_equipo_visitante) === PALMA_ID));

    const porEquipo = new Map();
    // Partido -> { fila del rival, lado del PALMA }.
    const enPartido = new Map();
    const sumar = (fila, campo, valor, lado) => {
      fila[campo] += valor;
      fila[`${campo}_${lado}`] += valor;
    };
    let partidosSinRival = 0;
    for (const p of partidos) {
      const lado = Number(p.id_equipo_local) === PALMA_ID ? 'local' : 'visitante';
      const rival = lado === 'local' ? p.equipoVisitante : p.equipoLocal;
      const idEquipo = Number(lado === 'local' ? p.id_equipo_visitante : p.id_equipo_local);
      let fila = porEquipo.get(idEquipo);
      if (!fila) {
        fila = { id_equipo: idEquipo, equipo: rival?.nombre || '—' };
        for (const c of CONTADORES_RIVAL) {
          fila[c] = 0;
          for (const l of LADOS) fila[`${c}_${l}`] = 0;
        }
        porEquipo.set(idEquipo, fila);
      }
      sumar(fila, 'partidos', 1, lado);
      if (!p.acta_rival) partidosSinRival += 1;
      enPartido.set(p.id, { fila, lado, golesEnPartido: 0 });
    }

    const idsPartidos = [...enPartido.keys()];
    if (idsPartidos.length) {
      const [goles, tarjetas] = await Promise.all([
        PartidoGolContra.findAll({ where: { id_partido: idsPartidos } }),
        PartidoTarjetaContra.findAll({ where: { id_partido: idsPartidos } })
      ]);
      for (const g of goles || []) {
        const ctx = enPartido.get(g.id_partido);
        if (!ctx || g.propia) continue;
        const { fila, lado } = ctx;
        sumar(fila, 'goles', 1, lado);
        ctx.golesEnPartido += 1;
        if (g.titular === true || g.titular === 1) sumar(fila, 'goles_titular', 1, lado);
        else if (g.titular === false || g.titular === 0) sumar(fila, 'goles_banquillo', 1, lado);
        if (g.minuto != null) sumar(fila, tramoGol(g.minuto, durGoles), 1, lado);
      }
      for (const { fila, lado, golesEnPartido } of enPartido.values()) {
        if (golesEnPartido > 0) sumar(fila, 'partidos_con_gol', 1, lado);
      }

      // Amarillas de cada jugador del rival en cada partido (dobles amarillas).
      const amarillasJugador = new Map();
      for (const t of tarjetas || []) {
        const ctx = enPartido.get(t.id_partido);
        if (!ctx) continue;
        const { fila, lado } = ctx;
        const tipo = t.tipo === 'roja' ? 'rojas' : 'amarillas';
        sumar(fila, tipo === 'rojas' ? 'tarjetas_rojas' : 'tarjetas_amarillas', 1, lado);
        if (t.titular === true || t.titular === 1) sumar(fila, `${tipo}_titular`, 1, lado);
        else if (t.titular === false || t.titular === 0) sumar(fila, `${tipo}_suplente`, 1, lado);
        if (t.minuto != null) sumar(fila, `${tipo}_${t.minuto <= FIN_PRIMERA_PARTE ? 'primera' : 'segunda'}`, 1, lado);
        if (t.goles_favor > t.goles_contra) sumar(fila, `${tipo}_ganando`, 1, lado);
        else if (t.goles_favor < t.goles_contra) sumar(fila, `${tipo}_perdiendo`, 1, lado);
        if (tipo === 'amarillas' && t.num_jugador != null) {
          const clave = `${t.id_partido}-${t.num_jugador}`;
          const n = (amarillasJugador.get(clave) || 0) + 1;
          amarillasJugador.set(clave, n);
          if (n === 2) sumar(fila, 'dobles_amarillas', 1, lado);
        }
      }
    }

    for (const f of porEquipo.values()) {
      for (const sufijo of ['', '_local', '_visitante']) {
        f[`porcentaje_goles_partido${sufijo}`] = porcentaje(f[`partidos_con_gol${sufijo}`], f[`partidos${sufijo}`]);
        f[`porcentaje_goles_titular${sufijo}`] = porcentaje(f[`goles_titular${sufijo}`], f[`goles${sufijo}`]);
        f[`porcentaje_goles_banquillo${sufijo}`] = porcentaje(f[`goles_banquillo${sufijo}`], f[`goles${sufijo}`]);
      }
      for (const l of LADOS) f[`porcentaje_goles_${l}`] = porcentaje(f[`goles_${l}`], f.goles);
    }
    const equipos = [...porEquipo.values()].sort((a, b) => b.goles - a.goles || a.equipo.localeCompare(b.equipo, 'es'));
    res.json({ equipos, partidos_sin_rival: partidosSinRival });
  } catch (err) { next(err); }
}

// Plantilla que en el Dashboard tiene su propia gráfica (partido a partido)
// en vez de ir en la de su tipo de fútbol.
const CATEGORIA_GRAFICA_PROPIA = 'Senior A';

/** Resultado del PALMA en un partido: 'victoria' | 'empate' | 'derrota', o
 * null si no cuenta (suspendido, sin resultado o sin el PALMA). */
function resultadoPalma(p) {
  const goles = golesResultado(p.resultado);
  const esLocal = Number(p.id_equipo_local) === PALMA_ID;
  if (p.suspendido || !goles || (!esLocal && Number(p.id_equipo_visitante) !== PALMA_ID)) return null;
  const favor = esLocal ? goles.local : goles.visitante;
  const contra = esLocal ? goles.visitante : goles.local;
  if (favor > contra) return 'victoria';
  return favor < contra ? 'derrota' : 'empate';
}

/** Gráficas de balance del Dashboard (temporada actual), cada una con `clave`
 * y `titulo`:
 * - una por tipo de fútbol con `equipos` (sus plantillas con partidos de
 *   liga, con jornada) y `jornadas` (en realidad, un punto por fin de semana
 *   con liga, por fecha): partidos con resultado (no suspendidos) de ese finde
 *   y victorias / empates / derrotas del PALMA, sumando todas las categorías
 *   (sin Senior A ni los partidos sin jornada, p. ej. amistosos);
 * - la de Senior A con `partidos` (por fecha): resultado de cada partido y
 *   victorias / empates / derrotas acumuladas hasta él.
 * Un entrenador solo ve la de su categoría. */
async function balance(req, res, next) {
  try {
    const temporada = await Temporada.findOne({ where: { actual: true }, attributes: ['id', 'nombre'] });
    if (!temporada) return res.json([]);
    const whereCategoria = categoriaDelUsuario(req) ? { id_categoria: categoriaDelUsuario(req) } : {};
    const plantillas = await Plantilla.findAll({
      where: { id_temporada: temporada.id, ...whereCategoria },
      attributes: ['id', 'id_categoria'],
      include: [{
        model: Categoria, as: 'categoria', attributes: ['id', 'nombre', 'alias', 'orden', 'id_tipofutbol'],
        include: [{ model: TipoFutbol, as: 'tipofutbol', attributes: ['id', 'nombre'] }]
      }]
    }) || [];
    if (!plantillas.length) return res.json([]);

    // Gráfica de cada plantilla: la de su tipo de fútbol o la suya propia.
    const porTipo = new Map();
    const propias = new Map();
    const graficaDe = new Map();
    for (const p of plantillas) {
      if (p.categoria?.nombre === CATEGORIA_GRAFICA_PROPIA) {
        const g = { clave: `plantilla_${p.id}`, id_plantilla: p.id, titulo: `${p.categoria.nombre} / ${temporada.nombre}`, partidos: [] };
        propias.set(p.id, { grafica: g, acumulado: { victorias: 0, empates: 0, derrotas: 0 } });
        continue;
      }
      const id = p.categoria?.id_tipofutbol ?? null;
      if (!porTipo.has(id)) {
        const nombre = p.categoria?.tipofutbol?.nombre || 'Sin tipo';
        porTipo.set(id, { clave: `tipo_${id}`, id_tipofutbol: id, tipofutbol: nombre, titulo: nombre, conLiga: new Set(), porSemana: new Map() });
      }
      graficaDe.set(p.id, porTipo.get(id));
    }

    const partidos = await Partido.findAll({
      where: { id_plantilla: plantillas.map((p) => p.id) },
      attributes: ['id', 'id_plantilla', 'jornada', 'fecha', 'id_equipo_local', 'id_equipo_visitante', 'resultado', 'suspendido'],
      include: [
        { model: Equipo, as: 'equipoLocal', attributes: ['id', 'nombre'] },
        { model: Equipo, as: 'equipoVisitante', attributes: ['id', 'nombre'] }
      ],
      order: [['fecha', 'ASC']]
    }) || [];
    const CONTADOR = { victoria: 'victorias', empate: 'empates', derrota: 'derrotas' };
    for (const p of partidos) {
      if (Number(p.jornada) > 0) graficaDe.get(p.id_plantilla)?.conLiga.add(p.id_plantilla);
      const r = resultadoPalma(p);
      if (!r) continue;
      const propia = propias.get(p.id_plantilla);
      if (propia) {
        propia.acumulado[CONTADOR[r]] += 1;
        const esLocal = Number(p.id_equipo_local) === PALMA_ID;
        propia.grafica.partidos.push({
          id_partido: p.id,
          fecha: p.fecha,
          rival: (esLocal ? p.equipoVisitante?.nombre : p.equipoLocal?.nombre) || '—',
          es_local: esLocal,
          marcador: p.resultado,
          resultado: r,
          ...propia.acumulado
        });
        continue;
      }
      const grafica = graficaDe.get(p.id_plantilla);
      if (!grafica || !(Number(p.jornada) > 0)) continue;
      // Un punto por fin de semana de liga (todas las categorías del tipo juntas).
      const semana = lunesDeLaSemana(p.fecha);
      if (!grafica.porSemana.has(semana)) grafica.porSemana.set(semana, { semana, fecha: p.fecha, partidos: 0, victorias: 0, empates: 0, derrotas: 0 });
      const fila = grafica.porSemana.get(semana);
      if (new Date(p.fecha) < new Date(fila.fecha)) fila.fecha = p.fecha; // la fecha más temprana del finde
      fila.partidos += 1;
      fila[CONTADOR[r]] += 1;
    }

    const graficas = [...porTipo.values()]
      .sort((a, b) => (a.id_tipofutbol ?? 99) - (b.id_tipofutbol ?? 99))
      .map(({ porSemana, conLiga, ...g }) => {
        // Un punto por fin de semana con liga, en orden cronológico (sin huecos).
        const jornadas = [...porSemana.values()]
          .sort((a, b) => (a.semana < b.semana ? -1 : a.semana > b.semana ? 1 : 0))
          .map(({ semana, ...fila }) => fila);
        return { ...g, equipos: conLiga.size, jornadas };
      });
    for (const { grafica } of propias.values()) graficas.push(grafica);
    res.json(graficas);
  } catch (err) { next(err); }
}

/** Plantillas de la temporada actual con sus jugadores, para el selector de las
 * Estadísticas por categoría. Un entrenador solo recibe las de su categoría
 * (categoriaDelUsuario); un coordinador, todas. Si no hay temporada marcada
 * como actual, devuelve las de todas las temporadas (como el filtro del front).
 * No expone datos personales de los jugadores (solo id, nombre y apellidos). */
async function plantillasEstadisticas(req, res, next) {
  try {
    const temporada = await Temporada.findOne({ where: { actual: true }, attributes: ['id'] });
    const where = {
      ...(categoriaDelUsuario(req) ? { id_categoria: categoriaDelUsuario(req) } : {}),
      ...(temporada ? { id_temporada: temporada.id } : {})
    };
    const plantillas = await Plantilla.findAll({
      where,
      attributes: ['id', 'id_categoria', 'id_temporada'],
      include: [
        { model: Categoria, as: 'categoria', attributes: ['id', 'nombre', 'orden', 'id_tipofutbol'] },
        { model: Temporada, as: 'temporada', attributes: ['id', 'nombre'] },
        { model: Jugador, as: 'jugadores', attributes: ['id', 'nombre', 'apellidos'], through: { attributes: [] } }
      ],
      order: [[{ model: Categoria, as: 'categoria' }, 'orden', 'ASC']]
    }) || [];
    res.json(plantillas);
  } catch (err) { next(err); }
}

module.exports = { listar, equipo, golesContra, rivales, balance, plantillasEstadisticas };
