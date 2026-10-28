const sharp = require('sharp');

/** Lado máximo (px) con el que se guardan los escudos: se pintan a 35-60 px en
 * pantalla y a pocos milímetros en los PDF, y viajan en base64 dentro de las
 * respuestas JSON, así que un original de cientos de KB solo aporta lentitud. */
const LADO_MAX_ESCUDO = 128;

const DATA_URL_RASTER = /^data:image\/(png|jpe?g|webp|gif);base64,/i;

/**
 * Devuelve el escudo reducido a LADO_MAX_ESCUDO (PNG con transparencia) como
 * data URL. Lo que no sea una imagen raster en base64 (URL externa, SVG, null),
 * lo que ya sea pequeño o lo que no se pueda procesar se devuelve tal cual:
 * nunca debe impedir guardar un equipo.
 */
async function reducirEscudo(valor) {
  if (typeof valor !== 'string' || !DATA_URL_RASTER.test(valor)) return valor;
  try {
    const original = Buffer.from(valor.slice(valor.indexOf(',') + 1), 'base64');
    const { width, height } = await sharp(original).metadata();
    if (Math.max(width || 0, height || 0) <= LADO_MAX_ESCUDO) return valor;

    const reducido = await sharp(original)
      .resize(LADO_MAX_ESCUDO, LADO_MAX_ESCUDO, { fit: 'inside', withoutEnlargement: true })
      .png({ compressionLevel: 9, palette: true })
      .toBuffer();
    if (reducido.length >= original.length) return valor;
    return `data:image/png;base64,${reducido.toString('base64')}`;
  } catch {
    return valor;
  }
}

module.exports = { reducirEscudo, LADO_MAX_ESCUDO };
