const { conImagenesUrl, CAMPO_IMAGEN } = require('../utils/imagenes');

/**
 * Cambia en todas las respuestas JSON de /api las fotos y escudos en base64 por
 * la URL de /api/imagenes (ver utils/imagenes.js). El tipo de los objetos de
 * primer nivel sale de la ruta (/api/jugadores, /api/equipos…); el de los
 * anidados, del nombre de la propiedad (jugadores, jugador, equipoLocal…).
 * /calendario/escudos sigue devolviendo el base64 (lo usan los PDF).
 */
function imagenesUrl(req, res, next) {
  if (req.path.startsWith('/calendario/escudos')) return next();
  const segmento = req.path.split('/')[1];
  const tipoRaiz = CAMPO_IMAGEN[segmento] ? segmento : null;
  const json = res.json.bind(res);
  res.json = (datos) => json(conImagenesUrl(datos, tipoRaiz));
  return next();
}

module.exports = imagenesUrl;
