const { Op } = require('sequelize');
const { Entrenamiento, Partido, Categoria } = require('../models');

/**
 * Endpoint de SOLO LECTURA (según el requisito nº3: en el calendario no se
 * puede crear, editar ni eliminar). Devuelve entrenamientos y partidos ya
 * normalizados como "eventos" listos para pintar en un componente tipo
 * Google Calendar (FullCalendar) en el frontend.
 *
 * Filtros soportados vía querystring: desde, hasta, id_categoria
 * (el frontend calcula "desde/hasta" según la vista semana/mes/año elegida).
 */
async function eventos(req, res, next) {
  try {
    const { desde, hasta, id_categoria } = req.query;

    const whereFecha = {};
    if (desde) whereFecha[Op.gte] = new Date(desde);
    if (hasta) whereFecha[Op.lte] = new Date(hasta);

    const whereBase = {};
    if (Object.keys(whereFecha).length) whereBase.fecha = whereFecha;
    if (id_categoria) whereBase.id_categoria = id_categoria;

    const includeCategoria = [{ model: Categoria, as: 'categoria', attributes: ['id', 'nombre', 'temporada'] }];

    const [entrenamientos, partidos] = await Promise.all([
      Entrenamiento.findAll({ where: whereBase, include: includeCategoria }),
      Partido.findAll({ where: whereBase, include: includeCategoria })
    ]);

    const eventosEntrenamiento = entrenamientos.map(e => ({
      id: `entrenamiento-${e.id}`,
      tipo: 'entrenamiento',
      titulo: `Entrenamiento · ${e.categoria?.nombre ?? ''}`,
      inicio: e.fecha,
      lugar: e.lugar,
      incidencias: e.incidencias,
      categoria: e.categoria
    }));

    const eventosPartido = partidos.map(p => ({
      id: `partido-${p.id}`,
      tipo: 'partido',
      titulo: `Partido vs ${p.equipo_rival} · ${p.categoria?.nombre ?? ''}`,
      inicio: p.fecha,
      lugar: p.lugar,
      equipo_rival: p.equipo_rival,
      resultado: p.resultado,
      incidencias: p.incidencias,
      categoria: p.categoria
    }));

    res.json([...eventosEntrenamiento, ...eventosPartido]);
  } catch (err) { next(err); }
}

module.exports = { eventos };
