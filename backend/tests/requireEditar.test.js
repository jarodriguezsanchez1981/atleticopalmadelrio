import { describe, it, expect } from 'vitest';
import requireEditar from '../src/middlewares/requireEditar.js';

describe('Permisos · requireEditar', () => {
  function ejecutar(user, ...secciones) {
    const req = { user };
    const res = {
      _status: 200,
      _json: null,
      status(code) { this._status = code; return this; },
      json(payload) { this._json = payload; return this; }
    };
    let nextLlamado = false;
    const next = () => { nextLlamado = true; };
    requireEditar(...secciones)(req, res, next);
    return { res, nextLlamado };
  }

  it('lanza un error si no se indica ninguna sección', () => {
    expect(() => requireEditar()).toThrow();
  });

  it('bloquea sin usuario autenticado con 401', () => {
    const { res, nextLlamado } = ejecutar(undefined, 'jugadores');
    expect(nextLlamado).toBe(false);
    expect(res._status).toBe(401);
  });

  it('permite con permiso de editar en la sección pedida', () => {
    const { nextLlamado } = ejecutar({
      permisos: { jugadores: { ver: true, editar: true } }
    }, 'jugadores');
    expect(nextLlamado).toBe(true);
  });

  it('bloquea con permiso de ver pero no de editar en la sección pedida', () => {
    const { res, nextLlamado } = ejecutar({
      permisos: { jugadores: { ver: true, editar: false } }
    }, 'jugadores');
    expect(nextLlamado).toBe(false);
    expect(res._status).toBe(403);
  });

  it('bloquea con permiso de editar en OTRA sección distinta a la pedida', () => {
    // Regresión: un usuario con editar solo en "jugadores" no debe poder
    // editar en "administracion" (ni en ninguna otra sección).
    const { res, nextLlamado } = ejecutar({
      permisos: { jugadores: { ver: true, editar: true } }
    }, 'administracion');
    expect(nextLlamado).toBe(false);
    expect(res._status).toBe(403);
  });

  it('bloquea sin permisos en absoluto', () => {
    const { res, nextLlamado } = ejecutar({ permisos: {} }, 'jugadores');
    expect(nextLlamado).toBe(false);
    expect(res._status).toBe(403);
  });

  it('permite si tiene editar en alguna de varias secciones aceptadas', () => {
    const { nextLlamado } = ejecutar({
      permisos: {
        administracion: { ver: true, editar: false },
        usuarios: { ver: true, editar: true }
      }
    }, 'administracion', 'usuarios');
    expect(nextLlamado).toBe(true);
  });
});
