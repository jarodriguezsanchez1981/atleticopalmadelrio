const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { pipeline } = require('stream/promises');
const { Video } = require('../models');

// Los vídeos van al disco (volumen "videos_data" en Docker), no a la BD.
const carpetaVideos = () => process.env.VIDEOS_DIR || path.join(__dirname, '../../videos');
const MAX_MB = () => Number(process.env.VIDEOS_MAX_MB) || 200;
const TIPOS = { 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov' };

const texto = (v, max) => {
  const s = String(v ?? '').trim();
  return s ? s.slice(0, max) : null;
};

function datosValidos(body) {
  const titulo = texto(body?.titulo, 150);
  if (!titulo) return { error: 'El título es obligatorio.' };
  const origen_url = texto(body?.origen_url, 500);
  if (origen_url && !/^https?:\/\//i.test(origen_url)) return { error: 'El enlace de origen debe empezar por http:// o https://.' };
  return { datos: { titulo, descripcion: texto(body?.descripcion, 5000), origen_url } };
}

// En la respuesta, la URL del fichero en vez del nombre interno en disco.
function aJson(video) {
  const json = video?.toJSON ? video.toJSON() : { ...video };
  if (json.fichero) json.fichero_url = `/api/videos/${json.id}/fichero?v=${encodeURIComponent(json.fichero.split('.')[0].slice(0, 8))}`;
  delete json.fichero;
  return json;
}

async function borrarFichero(nombre) {
  if (!nombre) return;
  await fs.promises.unlink(path.join(carpetaVideos(), path.basename(nombre))).catch(() => {});
}

async function listar(req, res, next) {
  try {
    const videos = await Video.findAll({ order: [['created_at', 'DESC']] });
    res.json((videos || []).map(aJson));
  } catch (err) { next(err); }
}

async function crear(req, res, next) {
  try {
    const { datos, error } = datosValidos(req.body);
    if (error) return res.status(400).json({ message: error });
    const video = await Video.create({ ...datos, id_usuario: req.user?.id || null });
    res.status(201).json(aJson(video));
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const video = await Video.findByPk(req.params.id);
    if (!video) return res.status(404).json({ message: 'Vídeo no encontrado.' });
    const { datos, error } = datosValidos(req.body);
    if (error) return res.status(400).json({ message: error });
    await video.update(datos);
    res.json(aJson(video));
  } catch (err) { next(err); }
}

async function eliminar(req, res, next) {
  try {
    const video = await Video.findByPk(req.params.id);
    if (!video) return res.status(404).json({ message: 'Vídeo no encontrado.' });
    const fichero = video.fichero;
    await video.destroy();
    await borrarFichero(fichero);
    res.json({ message: 'Vídeo eliminado.' });
  } catch (err) { next(err); }
}

/**
 * PUT /:id/fichero: el cuerpo es el vídeo tal cual (Content-Type video/mp4,
 * webm o quicktime; nombre original en la cabecera X-Nombre-Fichero). Se
 * escribe por streaming a un temporal y, si llega entero y cabe en el límite,
 * sustituye al anterior.
 */
async function subirFichero(req, res, next) {
  let temporal = null;
  try {
    const video = await Video.findByPk(req.params.id);
    if (!video) return res.status(404).json({ message: 'Vídeo no encontrado.' });
    const tipo = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
    const ext = TIPOS[tipo];
    if (!ext) return res.status(400).json({ message: 'Formato no admitido: sube un vídeo MP4, WebM o MOV.' });
    const max = MAX_MB() * 1024 * 1024;
    if (Number(req.headers['content-length']) > max) return res.status(413).json({ message: `El vídeo supera el máximo de ${MAX_MB()} MB.` });

    await fs.promises.mkdir(carpetaVideos(), { recursive: true });
    const nombre = `${crypto.randomUUID()}.${ext}`;
    temporal = path.join(carpetaVideos(), `${nombre}.parcial`);
    let bytes = 0;
    let excedido = false;
    req.on('data', (trozo) => {
      bytes += trozo.length;
      if (bytes > max && !excedido) { excedido = true; req.destroy(); }
    });
    try {
      await pipeline(req, fs.createWriteStream(temporal, { mode: 0o600 }));
    } catch (err) {
      if (!excedido) throw err;
    }
    if (excedido) {
      await fs.promises.unlink(temporal).catch(() => {});
      return res.status(413).json({ message: `El vídeo supera el máximo de ${MAX_MB()} MB.` });
    }
    if (!bytes) {
      await fs.promises.unlink(temporal).catch(() => {});
      return res.status(400).json({ message: 'El vídeo está vacío.' });
    }
    await fs.promises.rename(temporal, path.join(carpetaVideos(), nombre));
    temporal = null;

    const anterior = video.fichero;
    const fichero_nombre = texto(decodeURIComponent(String(req.headers['x-nombre-fichero'] || '')), 255) || `video.${ext}`;
    await video.update({ fichero: nombre, fichero_nombre, fichero_tipo: tipo, fichero_tamano: bytes });
    if (anterior && anterior !== nombre) await borrarFichero(anterior);
    res.json(aJson(video));
  } catch (err) {
    if (temporal) await fs.promises.unlink(temporal).catch(() => {});
    next(err);
  }
}

/** GET /:id/fichero: el vídeo, con soporte de Range para poder avanzar en el reproductor. */
async function verFichero(req, res, next) {
  try {
    const video = await Video.findByPk(req.params.id);
    if (!video?.fichero) return res.status(404).json({ message: 'Este vídeo no tiene fichero.' });
    const ruta = path.join(carpetaVideos(), path.basename(video.fichero));
    if (!fs.existsSync(ruta)) return res.status(404).json({ message: 'No se encuentra el fichero del vídeo.' });
    const nombre = (video.fichero_nombre || 'video').replace(/[\r\n"]/g, '');
    const descargar = req.query?.descargar === '1';
    res.set('Content-Disposition', `${descargar ? 'attachment' : 'inline'}; filename="${nombre.replace(/[^\x20-\x7e]/g, '_')}"; filename*=UTF-8''${encodeURIComponent(nombre)}`);
    res.set('Cache-Control', 'private, max-age=86400');
    res.sendFile(ruta, { headers: { 'Content-Type': video.fichero_tipo || 'video/mp4' } }, (err) => {
      if (err && !res.headersSent) next(err);
    });
  } catch (err) { next(err); }
}

module.exports = { listar, crear, actualizar, eliminar, subirFichero, verFichero };
