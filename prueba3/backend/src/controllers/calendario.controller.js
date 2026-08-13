const { Op } = require('sequelize');
const { EntrenamientoSemanal, Entrenamiento, Partido, Categoria, Lugar, Equipo } = require('../models');

/**
 * Endpoint de SOLO LECTURA. Devuelve entrenamientos (desde
 * entrenamientos_semanales) y partidos normalizados como eventos
 * para FullCalendar.
 */
async function eventos(req, res, next) {
  try {
    const { desde, hasta, id_categoria, tipo } = req.query;

    const fechaDesde = desde ? new Date(desde) : null;
    const fechaHasta = hasta ? new Date(hasta) : null;

    const incluirEntrenamientos = !tipo || tipo === 'entrenamiento';
    const incluirPartidos = !tipo || tipo === 'partido';

    const includesCategoria = [
      {
        model: Categoria,
        as: 'categoria',
        attributes: ['id', 'nombre', 'alias', 'id_temporada'],
        include: [{ association: 'temporada', attributes: ['id', 'nombre'] }]
      },
      { model: Lugar, as: 'lugar', attributes: ['id', 'nombre'] }
    ];

    // ---- Consultas ----
    const promesas = [];

    if (incluirEntrenamientos) {
      const whereSemanal = {};
      if (fechaDesde || fechaHasta) {
        whereSemanal.fecha_entrenamiento = {};
        if (fechaDesde) whereSemanal.fecha_entrenamiento[Op.gte] = fechaDesde;
        if (fechaHasta) whereSemanal.fecha_entrenamiento[Op.lte] = fechaHasta;
      }
      const whereEntrenamiento = { id_usuario: req.user?.id };
      if (id_categoria) whereEntrenamiento.id_categoria = id_categoria;

      promesas.push(
        EntrenamientoSemanal.findAll({
          where: whereSemanal,
          include: [{
            model: Entrenamiento,
            as: 'entrenamiento',
            where: whereEntrenamiento,
            attributes: ['id', 'id_categoria', 'id_lugar', 'fecha', 'recurrente'],
            include: includesCategoria
          }]
        })
      );
    } else {
      promesas.push(Promise.resolve([]));
    }

    if (incluirPartidos) {
      const wherePartido = { id_usuario: req.user?.id };
      if (id_categoria) wherePartido.id_categoria = id_categoria;
      if (fechaDesde || fechaHasta) {
        wherePartido.fecha = {};
        if (fechaDesde) wherePartido.fecha[Op.gte] = fechaDesde;
        if (fechaHasta) wherePartido.fecha[Op.lte] = fechaHasta;
      }
      const includesPartido = [
        ...includesCategoria,
        { model: Equipo, as: 'equipo', attributes: ['id', 'nombre', 'escudo'] }
      ];
      promesas.push(
        Partido.findAll({ where: wherePartido, include: includesPartido })
      );
    } else {
      promesas.push(Promise.resolve([]));
    }

    const [semanales, partidos] = await Promise.all(promesas);

    // ---- Eventos ----
    const eventosEntrenamiento = semanales.map((s) => {
      const b = s.entrenamiento;
      return {
        id: `entrenamiento-${s.id}`,
        tipo: 'entrenamiento',
        base_id: b?.id,
        titulo: `Entrenamiento · ${b?.categoria?.nombre ?? ''}`,
        inicio: s.fecha_entrenamiento,
        lugar: b?.lugar?.nombre ?? null,
        id_lugar: b?.id_lugar,
        incidencias: s.incidencias,
        categoria: b?.categoria,
        recurrente: b?.recurrente ? true : false
      };
    });

    const eventosPartido = partidos.map((p) => {
      const esLocal = p.es_local;
      const nombreCat = p.categoria?.nombre ?? '';
      const nombreEquipo = p.equipo?.nombre ?? '';
      const titulo = esLocal
        ? `${nombreCat} vs ${nombreEquipo}`
        : `${nombreEquipo} vs ${nombreCat}`;
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
        incidencias: p.incidencias,
        categoria: p.categoria
      };
    });

    res.json([...eventosEntrenamiento, ...eventosPartido]);
  } catch (err) { next(err); }
}

module.exports = { eventos };