const crypto = require('crypto');

/**
 * Fotos y escudos guardados en base64 (data URL) en la BD: en las respuestas
 * JSON se sustituyen por la URL de GET /api/imagenes/:tipo/:id?v=<hash>, que
 * el navegador descarga una sola vez (caché larga; el hash cambia si cambia la
 * imagen). Así los listados no llevan cientos de KB de base64 repetidos.
 */

// Tipo de imagen -> campo de la tabla. La clave es también el segmento de la URL.
const CAMPO_IMAGEN = {
  jugadores: 'foto',
  entrenadores: 'foto',
  delegados: 'foto',
  equipos: 'escudo'
};

// Propiedad de un objeto JSON -> tipo de los objetos que cuelgan de ella
// (p. ej. plantilla.jugadores[], partidoJugador.jugador, partido.equipoLocal).
const TIPO_POR_PROPIEDAD = {
  jugadores: 'jugadores',
  jugador: 'jugadores',
  entrenadores: 'entrenadores',
  entrenador: 'entrenadores',
  delegados: 'delegados',
  delegado: 'delegados',
  equipos: 'equipos',
  equipo: 'equipos',
  equipoLocal: 'equipos',
  equipoVisitante: 'equipos'
};

const PREFIJO_URL = '/api/imagenes/';
const DATA_URL = /^data:(image\/[a-z0-9.+-]+);base64,/i;

/** Hash corto del contenido, para que la URL cambie cuando cambia la imagen. */
function versionImagen(valor) {
  return crypto.createHash('sha1').update(valor).digest('hex').slice(0, 12);
}

/** data URL -> URL de /api/imagenes; cualquier otro valor (null, http…), igual. */
function urlImagen(tipo, id, valor) {
  if (typeof valor !== 'string' || !DATA_URL.test(valor) || id == null) return valor;
  return `${PREFIJO_URL}${tipo}/${id}?v=${versionImagen(valor)}`;
}

/** true si el valor es una URL de /api/imagenes (la imagen que ya estaba): al
 * guardar se ignora para no machacar el base64 con su propia URL. */
function esUrlImagen(valor) {
  return typeof valor === 'string' && valor.startsWith(PREFIJO_URL);
}

/**
 * Devuelve una copia del JSON (objeto o lista, o instancias de Sequelize) con
 * las imágenes en base64 cambiadas por su URL. `tipoRaiz` es el tipo de los
 * objetos de primer nivel (o null si no son personas/equipos); los anidados se
 * reconocen por el nombre de la propiedad que los contiene.
 */
function conImagenesUrl(datos, tipoRaiz = null) {
  const visitar = (valor, tipo) => {
    if (Array.isArray(valor)) return valor.map((v) => visitar(v, tipo));
    if (!valor || typeof valor !== 'object' || valor instanceof Date) return valor;
    const plano = typeof valor.toJSON === 'function' ? valor.toJSON() : valor;
    const copia = {};
    for (const [clave, v] of Object.entries(plano)) {
      copia[clave] = v && typeof v === 'object' ? visitar(v, TIPO_POR_PROPIEDAD[clave] || null) : v;
    }
    const campo = tipo && CAMPO_IMAGEN[tipo];
    if (campo && campo in copia) copia[campo] = urlImagen(tipo, copia.id, copia[campo]);
    return copia;
  };
  return visitar(datos, tipoRaiz);
}

/** data URL -> { tipoMime, buffer }; null si no es una imagen en base64. */
function decodificarDataUrl(valor) {
  const m = typeof valor === 'string' ? DATA_URL.exec(valor) : null;
  if (!m) return null;
  return { tipoMime: m[1].toLowerCase(), buffer: Buffer.from(valor.slice(m[0].length), 'base64') };
}

module.exports = { CAMPO_IMAGEN, urlImagen, esUrlImagen, conImagenesUrl, decodificarDataUrl, versionImagen };
