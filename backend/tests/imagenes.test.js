import { describe, it, expect, beforeEach } from 'vitest';
import { Jugador, Equipo } from './helpers/models.js';

import { urlImagen, esUrlImagen, conImagenesUrl, decodificarDataUrl, versionImagen } from '../src/utils/imagenes.js';
import * as ctrl from '../src/controllers/imagen.controller.js';
import imagenesUrl from '../src/middlewares/imagenesUrl.middleware.js';

// 1x1 PNG y la cabecera de un JPEG, en base64.
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const FOTO = `data:image/png;base64,${PNG}`;
const JPEG_COMO_PNG = `data:image/png;base64,${Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]).toString('base64')}`;

describe('Imágenes como URL · utils/imagenes', () => {
  it('cambia un data URL por /api/imagenes/<tipo>/<id>?v=<hash> y deja el resto igual', () => {
    expect(urlImagen('jugadores', 7, FOTO)).toBe(`/api/imagenes/jugadores/7?v=${versionImagen(FOTO)}`);
    expect(urlImagen('jugadores', 7, 'https://api.dicebear.com/x.svg')).toBe('https://api.dicebear.com/x.svg');
    expect(urlImagen('jugadores', 7, null)).toBeNull();
  });

  it('la versión cambia si cambia la imagen', () => {
    expect(versionImagen(FOTO)).not.toBe(versionImagen(JPEG_COMO_PNG));
  });

  it('reconoce sus propias URL (para no guardarlas encima del base64)', () => {
    expect(esUrlImagen('/api/imagenes/equipos/3?v=abc')).toBe(true);
    expect(esUrlImagen(FOTO)).toBe(false);
    expect(esUrlImagen(null)).toBe(false);
  });

  it('recorre el JSON: tipo de primer nivel por la ruta y anidados por el nombre de la propiedad', () => {
    const plantilla = {
      id: 1,
      toJSON() {
        return {
          id: 1,
          jugadores: [{ id: 9, nombre: 'Ana', foto: FOTO }],
          entrenadores: [{ id: 4, foto: FOTO, titulos: [{ id: 2, nombre: 'UEFA' }] }],
          equipoLocal: { id: 73, escudo: FOTO },
          fecha: new Date('2026-10-01T00:00:00Z')
        };
      }
    };
    const [r] = conImagenesUrl([plantilla]);
    expect(r.jugadores[0].foto).toMatch(/^\/api\/imagenes\/jugadores\/9\?v=/);
    expect(r.entrenadores[0].foto).toMatch(/^\/api\/imagenes\/entrenadores\/4\?v=/);
    expect(r.entrenadores[0].titulos).toEqual([{ id: 2, nombre: 'UEFA' }]);
    expect(r.equipoLocal.escudo).toMatch(/^\/api\/imagenes\/equipos\/73\?v=/);
    expect(r.fecha).toBeInstanceOf(Date);
    expect(conImagenesUrl({ id: 3, escudo: FOTO }, 'equipos').escudo).toMatch(/^\/api\/imagenes\/equipos\/3\?v=/);
    // Sin tipo (p. ej. otra entidad con un campo "foto"), no se toca.
    expect(conImagenesUrl({ id: 3, foto: FOTO }).foto).toBe(FOTO);
  });

  it('decodifica el data URL', () => {
    const { tipoMime, buffer } = decodificarDataUrl(FOTO);
    expect(tipoMime).toBe('image/png');
    expect(buffer.length).toBeGreaterThan(0);
    expect(decodificarDataUrl('https://x/y.png')).toBeNull();
  });
});

describe('Imágenes como URL · middleware', () => {
  function pasar(path, datos) {
    let enviado;
    const res = { json: (d) => { enviado = d; return res; } };
    imagenesUrl({ path }, res, () => {});
    res.json(datos);
    return enviado;
  }

  it('usa el tipo de la ruta para los objetos de primer nivel', () => {
    expect(pasar('/jugadores', [{ id: 1, foto: FOTO }])[0].foto).toMatch(/^\/api\/imagenes\/jugadores\/1/);
    expect(pasar('/equipos/5', { id: 5, escudo: FOTO }).escudo).toMatch(/^\/api\/imagenes\/equipos\/5/);
  });

  it('no toca /calendario/escudos (los PDF necesitan el base64)', () => {
    expect(pasar('/calendario/escudos', { 5: FOTO })).toEqual({ 5: FOTO });
  });
});

describe('Imágenes como URL · GET /api/imagenes/:tipo/:id', () => {
  beforeEach(() => {
    Jugador.findOne.mockReset();
    Equipo.findOne.mockReset();
  });

  function llamar(params) {
    const res = {
      _status: 200, _headers: {}, _body: null, _json: null,
      status(c) { this._status = c; return this; },
      set(h) { Object.assign(this._headers, h); return this; },
      send(b) { this._body = b; return this; },
      json(j) { this._json = j; return this; }
    };
    let error;
    return { promesa: ctrl.obtener({ params }, res, (e) => { error = e; }), res, error: () => error };
  }

  it('devuelve la imagen con caché larga', async () => {
    Jugador.findOne.mockResolvedValue({ id: 9, foto: FOTO });
    const { promesa, res } = llamar({ tipo: 'jugadores', id: '9' });
    await promesa;
    expect(Jugador.findOne).toHaveBeenCalledWith({ where: { id: 9 }, attributes: ['id', 'foto'] });
    expect(res._headers['Content-Type']).toBe('image/png');
    expect(res._headers['Cache-Control']).toContain('immutable');
    expect(Buffer.isBuffer(res._body)).toBe(true);
  });

  it('usa el tipo real de los bytes (JPEG declarado como PNG)', async () => {
    Equipo.findOne.mockResolvedValue({ id: 3, escudo: JPEG_COMO_PNG });
    const { promesa, res } = llamar({ tipo: 'equipos', id: '3' });
    await promesa;
    expect(Equipo.findOne).toHaveBeenCalledWith({ where: { id: 3 }, attributes: ['id', 'escudo'] });
    expect(res._headers['Content-Type']).toBe('image/jpeg');
  });

  it('404 si el tipo no existe, el id no es válido o no hay imagen en base64', async () => {
    for (const params of [{ tipo: 'usuarios', id: '1' }, { tipo: 'jugadores', id: 'abc' }]) {
      const { promesa, res } = llamar(params);
      await promesa;
      expect(res._status).toBe(404);
    }
    Jugador.findOne.mockResolvedValue({ id: 9, foto: 'https://api.dicebear.com/x.svg' });
    const { promesa, res } = llamar({ tipo: 'jugadores', id: '9' });
    await promesa;
    expect(res._status).toBe(404);
  });
});
