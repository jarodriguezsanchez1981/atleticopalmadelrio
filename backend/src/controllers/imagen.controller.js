const { Jugador, Entrenador, Delegado, Personal, Equipo } = require('../models');
const { CAMPO_IMAGEN, decodificarDataUrl } = require('../utils/imagenes');

const MODELO = { jugadores: Jugador, entrenadores: Entrenador, delegados: Delegado, personal: Personal, equipos: Equipo };

/** Tipo real por los primeros bytes (algunas fotos de las actas llegan como
 * image/png siendo JPEG); si no se reconoce, el del data URL. */
function tipoMimeReal(buffer, declarado) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buffer.length >= 6 && /^GIF8[79]a$/.test(buffer.subarray(0, 6).toString('latin1'))) return 'image/gif';
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString('latin1') === 'RIFF' && buffer.subarray(8, 12).toString('latin1') === 'WEBP') return 'image/webp';
  return declarado;
}

/** GET /api/imagenes/:tipo/:id — la foto/escudo guardado en base64, como
 * imagen. La URL lleva ?v=<hash> del contenido, así que se puede cachear sin
 * caducidad: si la imagen cambia, cambia la URL. */
async function obtener(req, res, next) {
  try {
    const { tipo } = req.params;
    const id = Number(req.params.id);
    const Modelo = MODELO[tipo];
    if (!Modelo || !Number.isInteger(id) || id <= 0) return res.status(404).json({ message: 'Imagen no encontrada.' });
    const campo = CAMPO_IMAGEN[tipo];
    const registro = await Modelo.findOne({ where: { id }, attributes: ['id', campo] });
    const imagen = decodificarDataUrl(registro?.[campo]);
    if (!imagen) return res.status(404).json({ message: 'Imagen no encontrada.' });

    res.set({
      'Content-Type': tipoMimeReal(imagen.buffer, imagen.tipoMime),
      'Cache-Control': 'private, max-age=31536000, immutable',
      // Un SVG abierto directamente no puede ejecutar nada.
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox"
    });
    res.send(imagen.buffer);
  } catch (err) { next(err); }
}

module.exports = { obtener, tipoMimeReal };
