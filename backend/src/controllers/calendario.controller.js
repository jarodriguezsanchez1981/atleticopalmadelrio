const { Op } = require('sequelize');
const { Entrenamiento, Partido, Plantilla, Categoria, Lugar, Equipo, Jornada, Torneo } = require('../models');
const { categoriaDelUsuario, includesConCategoria } = require('../utils/filtroCategoria');

/**
 * Endpoint de SOLO LECTURA. Devuelve entrenamientos y partidos normalizados como eventos
 * para FullCalendar. Un partido con id_jornada se etiqueta como Liga (con su número de
 * jornada); sin id_jornada, como Amistoso.
 */
async function eventos(req, res, next) {
  try {
    const { desde, hasta, id_plantilla, tipo } = req.query;

    const fechaDesde = desde ? new Date(desde) : null;
    const fechaHasta = hasta ? new Date(hasta) : null;

    const incluirEntrenamientos = !tipo || tipo === 'entrenamiento';
    const incluirPartidos = !tipo || tipo === 'partido';
    const incluirTorneos = !tipo || tipo === 'torneo';

    const includesPlantilla = [
      {
        model: Plantilla,
        as: 'plantilla',
        attributes: ['id', 'id_categoria', 'id_temporada'],
        include: [{ model: Categoria, as: 'categoria', attributes: ['id', 'nombre', 'alias', 'id_tipofutbol', 'tiempopartido', 'tiempoentrenamiento'] }]
      },
      { model: Lugar, as: 'lugar', attributes: ['id', 'nombre'] }
    ];

    // Restricción por categoría para el rol 'entrenador'
    const plantillaFiltrada = includesConCategoria(includesPlantilla, categoriaDelUsuario(req));

    // ---- Consultas ----
    const promesas = [];

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
          include: plantillaFiltrada,
          order: [['fecha', 'ASC']]
        })
      );
    } else {
      promesas.push(Promise.resolve([]));
    }

    // Para partidos: el número de jornada (si lo tiene, para clasificar Liga/Amistoso)
    // se lee directamente del partido a través de id_jornada, sin necesidad de emparejar
    // por plantilla+fecha.
    if (incluirPartidos) {
      const wherePartido = {};
      if (id_plantilla) wherePartido.id_plantilla = id_plantilla;
      if (fechaDesde || fechaHasta) {
        wherePartido.fecha = {};
        if (fechaDesde) wherePartido.fecha[Op.gte] = fechaDesde;
        if (fechaHasta) wherePartido.fecha[Op.lte] = fechaHasta;
      }
      const includesPartido = [
        ...plantillaFiltrada,
        { model: Equipo, as: 'equipoLocal', attributes: ['id', 'nombre', 'escudo', 'localidad', 'camiseta', 'calzonas', 'medias'] },
        { model: Equipo, as: 'equipoVisitante', attributes: ['id', 'nombre', 'escudo', 'localidad', 'camiseta', 'calzonas', 'medias'] },
        { model: Jornada, as: 'jornadaRef', attributes: ['id', 'jornada'] }
      ];
      promesas.push(Partido.findAll({ where: wherePartido, include: includesPartido }));
    } else {
      promesas.push(Promise.resolve([]));
    }

    // ---- Torneos ----
    if (incluirTorneos) {
      const whereTorneo = {};
      if (id_plantilla) whereTorneo.id_plantilla = id_plantilla;
      if (fechaDesde || fechaHasta) {
        whereTorneo.fecha = {};
        if (fechaDesde) whereTorneo.fecha[Op.gte] = fechaDesde;
        if (fechaHasta) whereTorneo.fecha[Op.lte] = fechaHasta;
      }
      promesas.push(Torneo.findAll({
        where: whereTorneo,
        include: [
          { model: Plantilla, as: 'plantilla', attributes: ['id', 'id_categoria', 'id_temporada'], include: [{ model: Categoria, as: 'categoria', attributes: ['id', 'nombre', 'alias'] }] },
          { model: Equipo, as: 'equipo', attributes: ['id', 'nombre', 'escudo', 'localidad'] }
        ],
        order: [['fecha', 'ASC'], ['hora', 'ASC']]
      }));
    } else {
      promesas.push(Promise.resolve([]));
    }

    const [entrenamientos, partidos, torneos] = await Promise.all(promesas);

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
      // PALMA es local cuando su id coincide con el equipo local del partido
      const esLocal = (p.equipoLocal?.id ?? p.id_equipo_local) === PALMA_ID;

      const nombreLocal = p.equipoLocal?.nombre ?? '';
      const nombreVisitante = p.equipoVisitante?.nombre ?? '';
      const titulo = `${nombreLocal} vs ${nombreVisitante}`;

      return {
        id: `partido-${p.id}`,
        tipo: 'partido',
        titulo,
        inicio: p.fecha,
        lugar: p.lugar?.nombre ?? null,
        id_lugar: p.id_lugar,
        es_local: esLocal,
        equipoLocal: p.equipoLocal,
        equipoVisitante: p.equipoVisitante,
        incidencias: p.incidencias,
        plantilla: p.plantilla,
        categoria: p.plantilla?.categoria,
        resultado: p.resultado || null,
        jornada: p.jornadaRef ? p.jornadaRef.jornada : null
      };
    });

    const eventosTorneo = torneos.map((t) => {
      const fecha = String(t.fecha || '').slice(0, 10);
      const hora = String(t.hora || '').slice(0, 5);
      const inicio = fecha ? `${fecha}T${hora || '00:00'}:00` : null;
      return {
        id: `torneo-${t.id}`,
        tipo: 'torneo',
        base_id: t.id,
        titulo: `${t.nombre || t.equipo?.nombre || ''} · Torneo`,
        inicio,
        lugar: null,
        plantilla: t.plantilla,
        categoria: t.plantilla?.categoria,
        equipo: t.equipo,
        nombre: t.nombre,
        es_torneo: true
      };
    });

    res.json([...eventosEntrenamiento, ...eventosPartido, ...eventosTorneo]);
  } catch (err) { next(err); }
}

module.exports = { eventos };