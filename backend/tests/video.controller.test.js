import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { Readable } from 'stream';
import { Video } from './helpers/models.js';
import { mockReqRes } from './helpers/http.js';

import * as ctrl from '../src/controllers/video.controller.js';

const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'videos-test-'));
process.env.VIDEOS_DIR = carpeta;

// Petición con el vídeo como cuerpo (stream), como la que llega de Express.
function cuerpoVideo(buffer, headers = {}) {
  const req = Readable.from([buffer]);
  req.headers = { 'content-type': 'video/mp4', 'content-length': String(buffer.length), ...headers };
  req.params = { id: '7' };
  req.query = {};
  return req;
}

function filaVideo(datos = {}) {
  const fila = { id: 7, titulo: 'Rondo', fichero: null, ...datos };
  fila.update = vi.fn(async (cambios) => Object.assign(fila, cambios));
  fila.destroy = vi.fn();
  fila.toJSON = () => {
    const { update, destroy, toJSON, ...resto } = fila;
    return resto;
  };
  return fila;
}

describe('Entrenamientos · Videos · video.controller', () => {
  beforeEach(() => {
    Video.findAll.mockReset();
    Video.findByPk.mockReset();
    Video.create.mockReset();
    delete process.env.VIDEOS_MAX_MB;
  });
  afterAll(() => fs.rmSync(carpeta, { recursive: true, force: true }));

  it('listar devuelve la URL del fichero, no su nombre en disco', async () => {
    Video.findAll.mockResolvedValue([filaVideo({ fichero: 'abcdef12-3456.mp4' }), filaVideo({ id: 8 })]);
    const { req, res, next } = mockReqRes();
    await ctrl.listar(req, res, next);
    expect(res._json[0].fichero_url).toBe('/api/videos/7/fichero?v=abcdef12');
    expect(res._json[0].fichero).toBeUndefined();
    expect(res._json[1].fichero_url).toBeUndefined();
  });

  it('crear exige título y un enlace http(s)', async () => {
    let { req, res, next } = mockReqRes({ body: { titulo: '  ' } });
    await ctrl.crear(req, res, next);
    expect(res._status).toBe(400);

    ({ req, res, next } = mockReqRes({ body: { titulo: 'Rondo', origen_url: 'javascript:alert(1)' } }));
    await ctrl.crear(req, res, next);
    expect(res._status).toBe(400);
    expect(Video.create).not.toHaveBeenCalled();
  });

  it('crear guarda los datos y el usuario', async () => {
    Video.create.mockImplementation(async (d) => filaVideo({ id: 9, ...d }));
    const { req, res, next } = mockReqRes({
      body: { titulo: ' Juegos de posición ', origen_url: 'https://app.alonbalon.com/es/tasks/x' },
      user: { id: 3 }
    });
    await ctrl.crear(req, res, next);
    expect(Video.create).toHaveBeenCalledWith({
      titulo: 'Juegos de posición', descripcion: null, origen_url: 'https://app.alonbalon.com/es/tasks/x', id_usuario: 3
    });
    expect(res._status).toBe(201);
  });

  it('subirFichero guarda el vídeo en disco y borra el anterior', async () => {
    fs.writeFileSync(path.join(carpeta, 'viejo.mp4'), 'x');
    const fila = filaVideo({ fichero: 'viejo.mp4' });
    Video.findByPk.mockResolvedValue(fila);
    const req = cuerpoVideo(Buffer.from('contenido-mp4'), { 'x-nombre-fichero': encodeURIComponent('Juegos posición.mp4') });
    const { res } = mockReqRes();
    const next = vi.fn();
    await ctrl.subirFichero(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(fila.update).toHaveBeenCalledWith(expect.objectContaining({
      fichero_nombre: 'Juegos posición.mp4', fichero_tipo: 'video/mp4', fichero_tamano: 13
    }));
    expect(fs.readFileSync(path.join(carpeta, fila.fichero), 'utf8')).toBe('contenido-mp4');
    expect(fs.existsSync(path.join(carpeta, 'viejo.mp4'))).toBe(false);
    expect(fs.readdirSync(carpeta).some((f) => f.endsWith('.parcial'))).toBe(false);
  });

  it('subirFichero rechaza formatos que no son vídeo', async () => {
    Video.findByPk.mockResolvedValue(filaVideo());
    const req = cuerpoVideo(Buffer.from('x'), { 'content-type': 'application/pdf' });
    const { res, next } = mockReqRes();
    await ctrl.subirFichero(req, res, next);
    expect(res._status).toBe(400);
  });

  it('subirFichero rechaza un vídeo que supera el máximo', async () => {
    process.env.VIDEOS_MAX_MB = '1';
    const fila = filaVideo();
    Video.findByPk.mockResolvedValue(fila);
    const req = cuerpoVideo(Buffer.alloc(10), { 'content-length': String(2 * 1024 * 1024) });
    const { res, next } = mockReqRes();
    await ctrl.subirFichero(req, res, next);
    expect(res._status).toBe(413);
    expect(fila.update).not.toHaveBeenCalled();
  });

  it('eliminar borra la fila y el fichero', async () => {
    fs.writeFileSync(path.join(carpeta, 'borrar.mp4'), 'x');
    const fila = filaVideo({ fichero: 'borrar.mp4' });
    Video.findByPk.mockResolvedValue(fila);
    const { req, res, next } = mockReqRes({ params: { id: '7' } });
    await ctrl.eliminar(req, res, next);
    expect(fila.destroy).toHaveBeenCalled();
    expect(fs.existsSync(path.join(carpeta, 'borrar.mp4'))).toBe(false);
  });

  it('verFichero da 404 si el vídeo no tiene fichero', async () => {
    Video.findByPk.mockResolvedValue(filaVideo());
    const { req, res, next } = mockReqRes({ params: { id: '7' } });
    await ctrl.verFichero(req, res, next);
    expect(res._status).toBe(404);
  });
});
