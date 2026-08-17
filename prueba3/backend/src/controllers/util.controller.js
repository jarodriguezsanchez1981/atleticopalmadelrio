const https = require('https');
const http = require('http');
const { URL } = require('url');

const MAX_BYTES = 3 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const TIMEOUT = 10000;

function descargar(url, redirecciones = 0) {
  return new Promise((resolve, reject) => {
    let destino;
    try {
      destino = new URL(url);
    } catch {
      return reject(new Error('URL inválida.'));
    }
    if (destino.protocol !== 'http:' && destino.protocol !== 'https:') {
      return reject(new Error('Solo se admiten URLs http/https.'));
    }

    const cliente = destino.protocol === 'https:' ? https : http;
    const peticion = cliente.get(url, { timeout: TIMEOUT, headers: { 'User-Agent': 'atletico-palma-intranet' } }, (res) => {
      const status = res.statusCode || 0;

      if ([301, 302, 303, 307, 308].includes(status) && res.headers.location) {
        res.resume();
        if (redirecciones >= MAX_REDIRECTS) return reject(new Error('Demasiadas redirecciones.'));
        let siguiente = res.headers.location;
        try {
          siguiente = new URL(res.headers.location, destino).href;
        } catch {
          return reject(new Error('Redirección inválida.'));
        }
        return resolve(descargar(siguiente, redirecciones + 1));
      }

      if (status >= 400) {
        res.resume();
        return reject(new Error(`El servidor respondió ${status}.`));
      }

      const tipo = res.headers['content-type'] || '';
      if (!tipo.startsWith('image/')) {
        res.resume();
        return reject(new Error('La URL no devuelve una imagen.'));
      }

      const chunks = [];
      let recibido = 0;
      res.on('data', (d) => {
        recibido += d.length;
        if (recibido > MAX_BYTES) res.destroy(new Error('La imagen supera el tamaño máximo.'));
        else chunks.push(d);
      });
      res.on('end', () => resolve({ tipo, buffer: Buffer.concat(chunks) }));
      res.on('error', (err) => reject(err));
    });

    peticion.on('timeout', () => { peticion.destroy(new Error('Tiempo de espera agotado.')); });
    peticion.on('error', (err) => reject(err));
  });
}

/**
 * GET /api/util/imagen?url=... -> { dataUrl, formato }
 * Descarga imágenes externas (escudos de equipos) y las devuelve como
 * data-URL, resolviendo los problemas de CORS al incrustarlas en el PDF.
 */
async function imagen(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ message: 'Parámetro "url" obligatorio.' });

  try {
    const { tipo, buffer } = await descargar(url);
    const formato = tipo.toLowerCase().includes('png') ? 'PNG' : 'JPEG';
    res.json({ dataUrl: `data:${tipo};base64,${buffer.toString('base64')}`, formato });
  } catch (err) {
    res.status(502).json({ message: err.message || 'No se pudo descargar la imagen.' });
  }
}

module.exports = { imagen };