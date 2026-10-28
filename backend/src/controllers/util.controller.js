const https = require('https');
const http = require('http');
const { URL } = require('url');
const dns = require('dns');
const net = require('net');

const MAX_BYTES = 3 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const TIMEOUT = 10000;

// Bloqueo de direcciones internas para prevenir SSRF (IPv4 e IPv6, incluidas
// las IPv4 escritas como IPv6 "::ffff:a.b.c.d", p.ej. [::ffff:a9fe:a9fe] es
// 169.254.169.254, los metadatos de AWS).
const BLOQUEADAS = new net.BlockList();
for (const [red, prefijo] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16],
  ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['224.0.0.0', 4], ['240.0.0.0', 4]
]) BLOQUEADAS.addSubnet(red, prefijo, 'ipv4');
for (const [red, prefijo] of [
  ['::', 128], ['::1', 128], ['fc00::', 7], ['fe80::', 10], ['ff00::', 8], ['64:ff9b::', 96], ['2001:db8::', 32]
]) BLOQUEADAS.addSubnet(red, prefijo, 'ipv6');

const PRIVATE_HOSTNAMES = new Set([
  'localhost', 'db', 'mysql', 'backend', 'frontend', 'nginx',
  'apr_mysql', 'apr_backend', 'apr_frontend', 'apr_nginx',
]);

/** IPv4 que lleva dentro una IPv6 "mapeada" (::ffff:7f00:1 -> 127.0.0.1), o null. */
function ipv4Mapeada(ip) {
  const m = /^(?:0{0,4}:){0,5}ffff:(.+)$/i.exec(ip.replace(/^::/, ''));
  if (!m) return null;
  if (net.isIPv4(m[1])) return m[1];
  const grupos = m[1].split(':');
  if (grupos.length !== 2) return null;
  const n = grupos.map((g) => parseInt(g, 16));
  if (n.some((x) => Number.isNaN(x) || x > 0xffff)) return null;
  return [n[0] >> 8, n[0] & 255, n[1] >> 8, n[1] & 255].join('.');
}

/** ¿La IP (v4 o v6) es interna? */
function ipPrivada(ip) {
  const limpia = String(ip).replace(/^\[|\]$/g, '').split('%')[0];
  if (net.isIPv4(limpia)) return BLOQUEADAS.check(limpia, 'ipv4');
  if (net.isIPv6(limpia)) {
    const v4 = ipv4Mapeada(limpia);
    return v4 ? BLOQUEADAS.check(v4, 'ipv4') : BLOQUEADAS.check(limpia, 'ipv6');
  }
  return false;
}

function esDireccionPrivada(hostname) {
  const host = String(hostname || '').toLowerCase().replace(/^\[|\]$/g, '');
  if (PRIVATE_HOSTNAMES.has(host)) return true;
  return ipPrivada(host);
}

/** dns.lookup que rechaza las direcciones internas: se comprueba la IP a la
 * que de verdad se conecta (evita el DNS rebinding entre comprobar y conectar). */
function lookupSeguro(hostname, opciones, callback) {
  dns.lookup(hostname, opciones, (err, direccion, familia) => {
    if (err) return callback(err);
    const lista = Array.isArray(direccion) ? direccion : [{ address: direccion, family: familia }];
    if (lista.some((d) => ipPrivada(d.address))) {
      return callback(new Error('Acceso denegado a direcciones internas.'));
    }
    return callback(null, direccion, familia);
  });
}

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
    if (esDireccionPrivada(destino.hostname)) {
      return reject(new Error('Acceso denegado a direcciones internas.'));
    }
    fetchUrl(url, destino, redirecciones, resolve, reject);
  });
}

function fetchUrl(url, destino, redirecciones, resolve, reject) {
  const cliente = destino.protocol === 'https:' ? https : http;
  const peticion = cliente.get(url, { timeout: TIMEOUT, lookup: lookupSeguro, headers: { 'User-Agent': 'atletico-palma-intranet' } }, (res) => {
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
      const sigUrl = new URL(siguiente);
      if (esDireccionPrivada(sigUrl.hostname)) {
        return reject(new Error('Acceso denegado a direcciones internas.'));
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

module.exports = { imagen, descargar, esDireccionPrivada };
