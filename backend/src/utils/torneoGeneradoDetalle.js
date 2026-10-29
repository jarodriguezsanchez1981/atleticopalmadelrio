const { TorneoGeneradoCategoria, TorneoGeneradoEquipo, Categoria, Equipo } = require('../models');

/** Opciones de consulta del detalle de un torneo generado (categorías e
 * inscripciones, en orden). Las usan el controlador (respuestas) y la
 * auditoría (foto previa al editar/borrar). El escudo de los equipos (base64,
 * pesa mucho) solo se pide con `conEscudos` (detalle para el PDF); en la
 * respuesta sale como URL de /api/imagenes (middleware imagenesUrl). */
function opcionesDetalleTorneo({ conEscudos = false } = {}) {
  return {
    include: [{
      model: TorneoGeneradoCategoria,
      as: 'categorias',
      include: [
        { model: Categoria, as: 'categoria', attributes: ['id', 'nombre', 'id_tipofutbol', 'tiempopartido'] },
        {
          model: TorneoGeneradoEquipo,
          as: 'equipos',
          include: [{ model: Equipo, as: 'equipo', attributes: conEscudos ? ['id', 'nombre', 'escudo'] : ['id', 'nombre'] }]
        }
      ]
    }],
    order: [
      [{ model: TorneoGeneradoCategoria, as: 'categorias' }, 'id', 'ASC'],
      [{ model: TorneoGeneradoCategoria, as: 'categorias' }, { model: TorneoGeneradoEquipo, as: 'equipos' }, 'orden', 'ASC']
    ]
  };
}

module.exports = { opcionesDetalleTorneo };
