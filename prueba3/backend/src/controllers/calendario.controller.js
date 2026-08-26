const { Op } = require('sequelize');
const { Entrenamiento, Partido, Plantilla, Categoria, Lugar, Equipo, Resultado, Jornada } = require('../models');

/**
 * Endpoint de SOLO LECTURA. Devuelve entrenamientos y partidos normalizados como eventos
 * para FullCalendar.
 * Solo se muestran partidos que tengan una jornada asociada (misma plantilla y fecha).
 */
async function eventos(req, res, next) {
  try {
    const { desde, hasta, id_plantilla, tipo } = req.query;

    const fechaDesde = desde ? new Date(desde) : null;
    const fechaHasta = hasta ? new Date(hasta) : null;

    const incluirEntrenamientos = !tipo || tipo === 'entrenamiento';
    const incluirPartidos = !tipo || tipo === 'partido';

    const includesPlantilla = [
      {
        model: Plantilla,
        as: 'plantilla',
        attributes: ['id', 'id_categoria', 'id_temporada'],
        include: [{ model: Categoria, as: 'categoria', attributes: ['id', 'nombre', 'alias', 'id_tipofutbol', 'tiempopartido', 'tiempoentrenamiento'] }]
      },
      { model: Lugar, as: 'lugar', attributes: ['id', 'nombre'] }
    ];

    // ---- Consultas ----
    const promesas = [];
    let jornadas = [];

    if (incluirEntrenamientos) {
      const whereEntrenamiento = {};
      if (id_plantilla) whereEntrenamiento.id_plantilla = id_plantilla;
      if (fechaDesde || fechaHasta) {
        whereEntrenamiento.fecha = {};
        if (fechaDesde) whereEntrenamiento.fecha[Op.gte] = fechaDesde;
        if (fechaHasta) whereEntrenamiento.fecha[Op.lte] = fechaHasta;
      }

      promesas.push(
        Entrenamiento.findAll({
          where: whereEntrenamiento,
          include: includesPlantilla,
          order: [['fecha', 'ASC']]
        })
      );
    } else {
      promesas.push(Promise.resolve([]));
    }

    // Para partidos: buscar jornadas para clasificar Liga/Amistoso
    if (incluirPartidos) {
      const whereJornada = {};
      if (id_plantilla) whereJornada.id_plantilla = id_plantilla;
      if (fechaDesde || fechaHasta) {
        whereJornada.fecha = {};
        if (fechaDesde) whereJornada.fecha[Op.gte] = fechaDesde;
        if (fechaHasta) whereJornada.fecha[Op.lte] = fechaHasta;
      }

      // Consultar todas las jornadas del rango (para clasificar Liga/Amistoso)
      jornadas = await Jornada.findAll({
        where: whereJornada,
        attributes: ['id_plantilla', 'fecha', 'jornada', 'id_equipo_local', 'id_equipo_visitante'],
        include: [
          { model: Equipo, as: 'equipoLocal', attributes: ['id', 'nombre', 'escudo', 'localidad'] },
          { model: Equipo, as: 'equipoVisitante', attributes: ['id', 'nombre', 'escudo', 'localidad'] }
        ]
      });
      jornadas = jornadas.map(j => j.toJSON());

      const wherePartido = {};
      if (id_plantilla) wherePartido.id_plantilla = id_plantilla;
      if (fechaDesde || fechaHasta) {
        wherePartido.fecha = {};
        if (fechaDesde) wherePartido.fecha[Op.gte] = fechaDesde;
        if (fechaHasta) wherePartido.fecha[Op.lte] = fechaHasta;
      }
      const includesPartido = [
        ...includesPlantilla,
        { model: Equipo, as: 'equipo', attributes: ['id', 'nombre', 'escudo', 'localidad'] },
        { model: Resultado, as: 'Resultados', attributes: ['id', 'resultado', 'incidencias'] }
      ];
      promesas.push(Partido.findAll({ where: wherePartido, include: includesPartido }));
    } else {
      promesas.push(Promise.resolve([]));
    }

    const [entrenamientos, partidos] = await Promise.all(promesas);

    // ---- Eventos ----
    const eventosEntrenamiento = entrenamientos.map((e) => {
      return {
        id: `entrenamiento-${e.id}`,
        tipo: 'entrenamiento',
        base_id: e.id,
        titulo: `Entrenamiento · ${e.plantilla?.categoria?.nombre ?? ''}`,
        inicio: e.fecha,
        lugar: e.lugar?.nombre ?? null,
        id_lugar: e.id_lugar,
        incidencias: null,
        plantilla: e.plantilla,
        categoria: e.plantilla?.categoria,
        recurrente: e.recurrente ? true : false
      };
    });

    const PALMA_ID = 73;

    const eventosPartido = partidos.map((p) => {
      const nombreCat = p.plantilla?.categoria?.nombre ?? '';

      // Buscar jornada correspondiente a este partido
      const jornadaMatch = jornadas.find(j =>
        j.id_plantilla === p.id_plantilla &&
        new Date(j.fecha).toISOString().split('T')[0] === new Date(p.fecha).toISOString().split('T')[0]
      );

      // es_local desde la perspectiva de PALMA DEL RIO
      const esLocal = jornadaMatch ? jornadaMatch.id_equipo_local === PALMA_ID : p.es_local === 1;

      // Título: Local vs Visitante siempre desde perspectiva del partido
      let nombreLocal, nombreVisitante;
      if (jornadaMatch) {
        nombreLocal = jornadaMatch.equipoLocal?.nombre ?? '';
        nombreVisitante = jornadaMatch.equipoVisitante?.nombre ?? '';
      } else {
        nombreLocal = esLocal ? 'PALMA DEL RIO ATLETICO C.F.' : (p.equipo?.nombre ?? '');
        nombreVisitante = esLocal ? (p.equipo?.nombre ?? '') : 'PALMA DEL RIO ATLETICO C.F.';
      }
      const titulo = `${nombreLocal} vs ${nombreVisitante}`;

      return {
        id: `partido-${p.id}`,
        tipo: 'partido',
        titulo,
        inicio: p.fecha,
        lugar: p.lugar?.nombre ?? null,
        id_lugar: p.id_lugar,
        id_equipo: p.id_equipo,
        es_local: esLocal,
        equipo: p.equipo,
        equipoLocal: jornadaMatch?.equipoLocal ?? (esLocal ? p.equipo : null),
        equipoVisitante: jornadaMatch?.equipoVisitante ?? (!esLocal ? p.equipo : null),
        incidencias: p.incidencias,
        plantilla: p.plantilla,
        categoria: p.plantilla?.categoria,
        resultado: p.Resultados?.[0]?.resultado || null,
        jornada: jornadaMatch ? jornadaMatch.jornada : null
      };
    });

    res.json([...eventosEntrenamiento, ...eventosPartido]);
  } catch (err) { next(err); }
}

module.exports = { eventos };