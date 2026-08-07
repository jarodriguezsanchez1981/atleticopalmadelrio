const { Op } = require('sequelize');
const { Entrenamiento, Partido, Categoria, Lugar, Equipo } = require('../models');

/**
 * Endpoint de SOLO LECTURA. Devuelve entrenamientos y partidos normalizados
 * como eventos para FullCalendar.
 */
async function eventos(req, res, next) {
  try {
    const { desde, hasta, id_categoria, tipo } = req.query;

    const fechaDesde = desde ? new Date(desde) : null;
    const fechaHasta = hasta ? new Date(hasta) : null;

    const whereBase = {};
    if (id_categoria) whereBase.id_categoria = id_categoria;
    whereBase.id_usuario = req.user?.id;

    // ---- Consultas ----
    const whereNoRecurrente = { ...whereBase, recurrente: false };
    const whereRecurrente = { ...whereBase, recurrente: true };
    const wherePartido = { ...whereBase };

    if (fechaDesde && fechaHasta) {
      whereNoRecurrente.fecha = { [Op.between]: [fechaDesde, fechaHasta] };
      wherePartido.fecha = { [Op.between]: [fechaDesde, fechaHasta] };
    } else if (fechaDesde) {
      whereNoRecurrente.fecha = { [Op.gte]: fechaDesde };
      wherePartido.fecha = { [Op.gte]: fechaDesde };
    } else if (fechaHasta) {
      whereNoRecurrente.fecha = { [Op.lte]: fechaHasta };
      wherePartido.fecha = { [Op.lte]: fechaHasta };
    }

    // Recurrentes: solo se acotan por el FIN del rango (se repiten por semanas).
    if (fechaHasta) whereRecurrente.fecha = { [Op.lte]: fechaHasta };

    const includesBase = [
      {
        model: Categoria,
        as: 'categoria',
        attributes: ['id', 'nombre', 'id_temporada'],
        include: [{ association: 'temporada', attributes: ['id', 'nombre'] }]
      },
      { model: Lugar, as: 'lugar', attributes: ['id', 'nombre'] }
    ];
    const includesPartido = [...includesBase, { model: Equipo, as: 'equipo', attributes: ['id', 'nombre'] }];

    const incluirEntrenamientos = !tipo || tipo === 'entrenamiento';
    const incluirPartidos = !tipo || tipo === 'partido';

    const [entrenamientos, recurrentes, partidos] = await Promise.all([
      incluirEntrenamientos
        ? Entrenamiento.findAll({ where: whereNoRecurrente, include: includesBase })
        : Promise.resolve([]),
      incluirEntrenamientos
        ? Entrenamiento.findAll({ where: whereRecurrente, include: includesBase })
        : Promise.resolve([]),
      incluirPartidos
        ? Partido.findAll({ where: wherePartido, include: includesPartido })
        : Promise.resolve([])
    ]);

    // ---- Eventos ----
    const eventosEntrenamiento = entrenamientos.map(e => ({
      id: `entrenamiento-${e.id}`,
      tipo: 'entrenamiento',
      titulo: `Entrenamiento · ${e.categoria?.nombre ?? ''}`,
      inicio: e.fecha,
      lugar: e.lugar?.nombre ?? null,
      id_lugar: e.id_lugar,
      incidencias: e.incidencias,
      categoria: e.categoria,
      recurrente: false
    }));

    // Expandir recurrentes: cada 7 días desde su fecha base hasta el fin del rango.
    for (const e of recurrentes) {
      const base = new Date(e.fecha);
      const push = (fecha, oc) => eventosEntrenamiento.push({
        id: `entrenamiento-${e.id}-${oc}`,
        tipo: 'entrenamiento',
        base_id: e.id,
        titulo: `Entrenamiento · ${e.categoria?.nombre ?? ''}`,
        inicio: new Date(fecha),
        lugar: e.lugar?.nombre ?? null,
        id_lugar: e.id_lugar,
        incidencias: e.incidencias,
        categoria: e.categoria,
        recurrente: true
      });

      if (!fechaHasta && !fechaDesde) {
        push(base, 0);
        continue;
      }

      let it = new Date(base);
      let oc = 0;
      while (true) {
        if (fechaDesde && it < fechaDesde) {
          it = new Date(it.getTime() + 7 * 24 * 60 * 60 * 1000);
          continue;
        }
        if (fechaHasta && it > fechaHasta) break;
        push(it, oc);
        oc += 1;
        it = new Date(it.getTime() + 7 * 24 * 60 * 60 * 1000);
      }
    }

    const eventosPartido = partidos.map(p => ({
      id: `partido-${p.id}`,
      tipo: 'partido',
      titulo: `Partido vs ${p.equipo?.nombre ?? ''} · ${p.categoria?.nombre ?? ''}`,
      inicio: p.fecha,
      lugar: p.lugar?.nombre ?? null,
      id_lugar: p.id_lugar,
      id_equipo: p.id_equipo,
      equipo: p.equipo,
      incidencias: p.incidencias,
      categoria: p.categoria
    }));

    res.json([...eventosEntrenamiento, ...eventosPartido]);
  } catch (err) { next(err); }
}

module.exports = { eventos };
