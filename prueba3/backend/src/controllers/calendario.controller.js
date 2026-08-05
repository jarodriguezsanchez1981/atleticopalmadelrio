const { Op } = require('sequelize');
const { Entrenamiento, Partido, Categoria, Lugar } = require('../models');

/**
 * Endpoint de SOLO LECTURA. Devuelve entrenamientos y partidos normalizados
 * como eventos para FullCalendar.
 */
async function eventos(req, res, next) {
  try {
    const { desde, hasta, id_categoria, tipo } = req.query;

    const whereFecha = {};
    if (desde) whereFecha[Op.gte] = new Date(desde);
    if (hasta) whereFecha[Op.lte] = new Date(hasta);

    const whereBase = {};
    if (desde || hasta) whereBase.fecha = whereFecha;
    if (id_categoria) whereBase.id_categoria = id_categoria;

    const includes = [
      {
        model: Categoria,
        as: 'categoria',
        attributes: ['id', 'nombre', 'id_temporada'],
        include: [{ association: 'temporada', attributes: ['id', 'nombre'] }]
      },
      { model: Lugar, as: 'lugar', attributes: ['id', 'nombre'] }
    ];

    const incluirEntrenamientos = !tipo || tipo === 'entrenamiento';
    const incluirPartidos = !tipo || tipo === 'partido';

    const [entrenamientos, partidos] = await Promise.all([
      incluirEntrenamientos
        ? Entrenamiento.findAll({ where: whereBase, include: includes })
        : Promise.resolve([]),
      incluirPartidos
        ? Partido.findAll({ where: whereBase, include: includes })
        : Promise.resolve([])
    ]);

    const eventosEntrenamiento = entrenamientos.map(e => ({
      id: `entrenamiento-${e.id}`,
      tipo: 'entrenamiento',
      titulo: `Entrenamiento · ${e.categoria?.nombre ?? ''}`,
      inicio: e.fecha,
      lugar: e.lugar?.nombre ?? null,
      id_lugar: e.id_lugar,
      incidencias: e.incidencias,
      categoria: e.categoria
    }));

    const eventosPartido = partidos.map(p => ({
      id: `partido-${p.id}`,
      tipo: 'partido',
      titulo: `Partido vs ${p.equipo_rival} · ${p.categoria?.nombre ?? ''}`,
      inicio: p.fecha,
      lugar: p.lugar?.nombre ?? null,
      id_lugar: p.id_lugar,
      equipo_rival: p.equipo_rival,
      incidencias: p.incidencias,
      categoria: p.categoria
    }));

    res.json([...eventosEntrenamiento, ...eventosPartido]);
  } catch (err) { next(err); }
}

module.exports = { eventos };
