import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Usuario, Seccion } from './helpers/models.js';
import { passwordUtils } from './helpers/models.js';
import { mockReqRes } from './helpers/http.js';

import * as ctrl from '../src/controllers/usuario.controller.js';

describe('Sección Usuarios · usuario.controller', () => {
  beforeEach(() => {
    Usuario.findAll.mockReset();
    Usuario.findByPk.mockReset();
    Usuario.create.mockReset();
    Usuario.destroy.mockReset();
    passwordUtils.isPasswordValid.mockReset();
    passwordUtils.hashPassword.mockReset();
    passwordUtils.isPasswordValid.mockReturnValue(true);
    passwordUtils.hashPassword.mockResolvedValue('hash');
  });

  function llamar(fn, overrides = {}) {
    const { req, res, next } = mockReqRes(overrides);
    return { promesa: fn(req, res, next), res, req, next };
  }

  it('listar devuelve los usuarios serializados sin password', async () => {
    const usuario = {
      id: 1, usuario: 'admin', password: 'secret', nombre: 'A', apellidos: 'B',
      secciones: [{ id: 2, clave: 'temporadas', usuario_secciones: { puede_ver: 1, puede_editar: 1 } }]
    };
    Usuario.findAll.mockResolvedValue([usuario]);
    const { promesa, res } = llamar(ctrl.listar);

    await promesa;

    expect(res._json).toEqual([{
      id: 1, usuario: 'admin', nombre: 'A', apellidos: 'B',
      secciones: [{ id: 2, clave: 'temporadas', usuario_secciones: { puede_ver: 1, puede_editar: 1 } }],
      permisos: { temporadas: { ver: true, editar: true } }
    }]);
    expect(res._json[0].password).toBeUndefined();
  });

  it('obtener devuelve 404 si no existe', async () => {
    Usuario.findByPk.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.obtener, { params: { id: '99' } });

    await promesa;

    expect(res._status).toBe(404);
    expect(res._json).toEqual({ message: 'Usuario no encontrado.' });
  });

  it('crear valida campos obligatorios', async () => {
    const { promesa, res } = llamar(ctrl.crear, { body: { usuario: 'x' } });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('Faltan los campos obligatorios: contraseña, nombre, apellidos.');
  });

  it('crear permite crear un usuario sin secciones', async () => {
    const nuevo = { id: 6, setSecciones: vi.fn().mockResolvedValue() };
    const completo = { id: 6, usuario: 'sinesc', password: 'hash', nombre: 'A', apellidos: 'B', secciones: [] };
    Usuario.create.mockResolvedValue(nuevo);
    Usuario.findByPk.mockResolvedValue(completo);
    const { promesa, res } = llamar(ctrl.crear, {
      body: { usuario: 'sinesc', password: 'Clave123!', nombre: 'A', apellidos: 'B', ids_secciones: [] }
    });

    await promesa;

    expect(Usuario.create).toHaveBeenCalledWith({
      usuario: 'sinesc', password: 'hash', nombre: 'A', apellidos: 'B', rol: 'coordinador', id_categoria: null
    });
    expect(res._status).toBe(201);
  });

  it('crear valida la fortaleza de la contraseña', async () => {
    passwordUtils.isPasswordValid.mockReturnValue(false);
    const { promesa, res } = llamar(ctrl.crear, {
      body: { usuario: 'x', password: 'corta', nombre: 'A', apellidos: 'B', ids_secciones: ['2'] }
    });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toContain('La contraseña debe tener mínimo 8 caracteres');
  });

  it('crear crea el usuario con la contraseña hasheada y devuelve 201', async () => {
    const nuevo = { id: 5, setSecciones: vi.fn().mockResolvedValue() };
    const completo = { id: 5, usuario: 'juan', password: 'hash', nombre: 'A', apellidos: 'B', secciones: [{ id: 2, clave: 'temporadas', usuario_secciones: { puede_ver: 1, puede_editar: 0 } }] };
    Usuario.create.mockResolvedValue(nuevo);
    Usuario.findByPk.mockResolvedValue(completo);
    const { promesa, res } = llamar(ctrl.crear, {
      body: { usuario: 'juan', password: 'Clave123!', nombre: 'A', apellidos: 'B', permisos: { 2: { ver: true, editar: false } } }
    });

    await promesa;

    expect(Usuario.create).toHaveBeenCalledWith({
      usuario: 'juan', password: 'hash', nombre: 'A', apellidos: 'B', rol: 'coordinador', id_categoria: null
    });
    expect(res._status).toBe(201);
    expect(res._json.password).toBeUndefined();
  });

  it('crear usa el rol proporcionado y guarda la categoría del entrenador', async () => {
    const nuevo = { id: 7, setSecciones: vi.fn().mockResolvedValue() };
    const completo = { id: 7, usuario: 'lore', password: 'hash', nombre: 'A', apellidos: 'B', rol: 'entrenador', id_categoria: 20, secciones: [] };
    Usuario.create.mockResolvedValue(nuevo);
    Usuario.findByPk.mockResolvedValue(completo);
    const { promesa, res } = llamar(ctrl.crear, {
      body: { usuario: 'lore', password: 'Clave123!', nombre: 'A', apellidos: 'B', rol: 'entrenador', id_categoria: 20, permisos: {} }
    });

    await promesa;

    expect(res._status).toBe(201);
    expect(Usuario.create).toHaveBeenCalledWith(expect.objectContaining({ rol: 'entrenador', id_categoria: 20 }));
  });

  it('crear rechaza rol "entrenador" sin categoría', async () => {
    const { promesa, res } = llamar(ctrl.crear, {
      body: { usuario: 'lore', password: 'Clave123!', nombre: 'A', apellidos: 'B', rol: 'entrenador', permisos: {} }
    });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('El rol "entrenador" requiere seleccionar una categoría.');
    expect(Usuario.create).not.toHaveBeenCalled();
  });

  it('crear con permisos por sección', async () => {
    const nuevo = { id: 8, setSecciones: vi.fn().mockResolvedValue() };
    const completo = { id: 8, usuario: 'vis', password: 'hash', nombre: 'A', apellidos: 'B', rol: 'coordinador', id_categoria: null, secciones: [] };
    Usuario.create.mockResolvedValue(nuevo);
    Usuario.findByPk.mockResolvedValue(completo);
    const { promesa, res } = llamar(ctrl.crear, {
      body: { usuario: 'vis', password: 'Clave123!', nombre: 'A', apellidos: 'B', permisos: {} }
    });

    await promesa;

    expect(res._status).toBe(201);
  });

  it('actualizar guarda permisos por sección', async () => {
    const usuario = { id: 1, save: vi.fn().mockResolvedValue(), setSecciones: vi.fn().mockResolvedValue() };
    const completo = { id: 1, usuario: 'juan', nombre: 'A', apellidos: 'B', rol: 'coordinador', id_categoria: null, secciones: [] };
    Usuario.findByPk.mockResolvedValueOnce(usuario).mockResolvedValueOnce(completo);
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '1' }, body: { permisos: {} } });

    await promesa;

    expect(usuario.save).toHaveBeenCalled();
    expect(res._status).toBe(200);
  });

  it('actualizar cambia el rol y la categoría del usuario', async () => {
    const usuario = { id: 1, save: vi.fn().mockResolvedValue() };
    const completo = { id: 1, usuario: 'juan', nombre: 'A', apellidos: 'B', rol: 'entrenador', id_categoria: 20, secciones: [] };
    Usuario.findByPk.mockResolvedValueOnce(usuario).mockResolvedValueOnce(completo);
    const { promesa, res } = llamar(ctrl.actualizar, {
      params: { id: '1' }, body: { rol: 'entrenador', id_categoria: 20 }
    });

    await promesa;

    expect(usuario.rol).toBe('entrenador');
    expect(usuario.id_categoria).toBe(20);
    expect(usuario.save).toHaveBeenCalled();
    expect(res._status).toBe(200);
  });

  it('actualizar a "coordinador" limpia la categoría', async () => {
    const usuario = { id: 1, rol: 'entrenador', id_categoria: 20, save: vi.fn().mockResolvedValue() };
    const completo = { id: 1, usuario: 'juan', nombre: 'A', apellidos: 'B', rol: 'coordinador', id_categoria: null, secciones: [] };
    Usuario.findByPk.mockResolvedValueOnce(usuario).mockResolvedValueOnce(completo);
    const { promesa, res } = llamar(ctrl.actualizar, {
      params: { id: '1' }, body: { rol: 'coordinador' }
    });

    await promesa;

    expect(usuario.rol).toBe('coordinador');
    expect(usuario.id_categoria).toBeNull();
    expect(usuario.save).toHaveBeenCalled();
    expect(res._status).toBe(200);
  });

  it('actualizar usa scope withPassword', async () => {
    const usuario = { id: 1, save: vi.fn().mockResolvedValue() };
    const completo = { id: 1, usuario: 'juan', nombre: 'A', apellidos: 'B', secciones: [] };
    Usuario.scope.mockReturnValue(Usuario);
    Usuario.findByPk.mockResolvedValueOnce(usuario).mockResolvedValueOnce(completo);
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '1' }, body: { nombre: 'Nuevo' } });

    await promesa;

    expect(Usuario.scope).toHaveBeenCalledWith('withPassword');
    expect(res._json).toEqual({ id: 1, usuario: 'juan', nombre: 'A', apellidos: 'B', secciones: [], permisos: {} });
  });

  it('actualizar permite cambiar el nombre de login (usuario)', async () => {
    const usuario = { id: 1, save: vi.fn().mockResolvedValue() };
    const completo = { id: 1, usuario: 'fpalacios', nombre: 'A', apellidos: 'B', secciones: [] };
    Usuario.findByPk.mockResolvedValueOnce(usuario).mockResolvedValueOnce(completo);
    const { promesa, res } = llamar(ctrl.actualizar, {
      params: { id: '1' }, body: { usuario: 'fpalacios' }
    });

    await promesa;

    expect(usuario.usuario).toBe('fpalacios');
    expect(usuario.save).toHaveBeenCalled();
  });

  it('actualizar valida la contraseña si se cambia', async () => {
    const usuario = { id: 1, save: vi.fn() };
    Usuario.findByPk.mockResolvedValue(usuario);
    passwordUtils.isPasswordValid.mockReturnValue(false);
    const { promesa, res } = llamar(ctrl.actualizar, {
      params: { id: '1' }, body: { password: 'corta' }
    });

    await promesa;

    expect(res._status).toBe(400);
    expect(usuario.save).not.toHaveBeenCalled();
  });

  it('actualizar permite quitar todas las secciones', async () => {
    const usuario = { id: 1, save: vi.fn().mockResolvedValue(), setSecciones: vi.fn().mockResolvedValue() };
    const completo = { id: 1, usuario: 'juan', nombre: 'A', apellidos: 'B', secciones: [] };
    Usuario.findByPk.mockResolvedValueOnce(usuario).mockResolvedValueOnce(completo);
    const { promesa, res } = llamar(ctrl.actualizar, {
      params: { id: '1' }, body: { permisos: {} }
    });

    await promesa;

    expect(usuario.setSecciones).toHaveBeenCalledWith([]);
    expect(res._status).toBe(200);
  });

  it('eliminar impide borrar el propio usuario', async () => {
    const { promesa, res } = llamar(ctrl.eliminar, { params: { id: '1' } });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('No puedes eliminar tu propio usuario.');
    expect(Usuario.destroy).not.toHaveBeenCalled();
  });

  it('eliminar elimina y responde 204', async () => {
    Usuario.destroy.mockResolvedValue(1);
    const { promesa, res } = llamar(ctrl.eliminar, { params: { id: '2' } });

    await promesa;

    expect(Usuario.destroy).toHaveBeenCalledWith({ where: { id: '2' } });
    expect(res._status).toBe(204);
  });

  it('eliminar devuelve 404 si no encuentra nada', async () => {
    const { req, res, next } = mockReqRes({ params: { id: '2' } });
    Usuario.destroy.mockResolvedValue(0);
    await ctrl.eliminar(req, res, next);

    expect(res._status).toBe(404);
  });

  it('obtener devuelve el usuario serializado sin password', async () => {
    const usuario = {
      id: 3, usuario: 'maria', password: 'secret', nombre: 'M', apellidos: 'R',
      secciones: [{ id: 5, clave: 'jugadores', usuario_secciones: { puede_ver: 1, puede_editar: 0 } }]
    };
    Usuario.findByPk.mockResolvedValue(usuario);
    const { promesa, res } = llamar(ctrl.obtener, { params: { id: '3' } });

    await promesa;

    expect(res._json).toEqual({
      id: 3, usuario: 'maria', nombre: 'M', apellidos: 'R',
      secciones: [{ id: 5, clave: 'jugadores', usuario_secciones: { puede_ver: 1, puede_editar: 0 } }],
      permisos: { jugadores: { ver: true, editar: false } }
    });
    expect(res._json.password).toBeUndefined();
  });

  it('obtener con secciones vacías devuelve permisos vacío', async () => {
    const usuario = { id: 4, usuario: 'sinsec', password: 'h', nombre: 'X', apellidos: 'Y', secciones: [] };
    Usuario.findByPk.mockResolvedValue(usuario);
    const { promesa, res } = llamar(ctrl.obtener, { params: { id: '4' } });

    await promesa;

    expect(res._json.permisos).toEqual({});
  });

  it('crear normaliza rol no reconocido a coordinador', async () => {
    const nuevo = { id: 9, setSecciones: vi.fn().mockResolvedValue() };
    const completo = { id: 9, usuario: 'test', password: 'hash', nombre: 'A', apellidos: 'B', secciones: [] };
    Usuario.create.mockResolvedValue(nuevo);
    Usuario.findByPk.mockResolvedValue(completo);
    const { promesa, res } = llamar(ctrl.crear, {
      body: { usuario: 'test', password: 'Clave123!', nombre: 'A', apellidos: 'B', rol: 'otro' }
    });

    await promesa;

    expect(Usuario.create).toHaveBeenCalledWith(expect.objectContaining({ rol: 'coordinador' }));
    expect(res._status).toBe(201);
  });

  it('crear con permisos con editar activa las flags correctas', async () => {
    const nuevo = { id: 10, setSecciones: vi.fn().mockResolvedValue() };
    const completo = { id: 10, usuario: 'editor', password: 'hash', nombre: 'E', apellidos: 'D', secciones: [] };
    Usuario.create.mockResolvedValue(nuevo);
    Usuario.findByPk.mockResolvedValue(completo);
    const { promesa, res } = llamar(ctrl.crear, {
      body: {
        usuario: 'editor', password: 'Clave123!', nombre: 'E', apellidos: 'D',
        permisos: { 3: { ver: true, editar: true }, 5: { ver: true, editar: false } }
      }
    });

    await promesa;

    expect(nuevo.setSecciones).toHaveBeenCalledWith([
      { id: 3, usuario_secciones: { puede_ver: 1, puede_editar: 1 } },
      { id: 5, usuario_secciones: { puede_ver: 1, puede_editar: 0 } }
    ]);
    expect(res._status).toBe(201);
  });

  it('crear sin permisos ni ids_secciones crea usuario sin secciones', async () => {
    const nuevo = { id: 11, setSecciones: vi.fn().mockResolvedValue() };
    const completo = { id: 11, usuario: 'bare', password: 'hash', nombre: 'B', apellidos: 'R', secciones: [] };
    Usuario.create.mockResolvedValue(nuevo);
    Usuario.findByPk.mockResolvedValue(completo);
    const { promesa, res } = llamar(ctrl.crear, {
      body: { usuario: 'bare', password: 'Clave123!', nombre: 'B', apellidos: 'R' }
    });

    await promesa;

    expect(nuevo.setSecciones).toHaveBeenCalledWith([]);
    expect(res._status).toBe(201);
  });

  it('actualizar devuelve 404 si no existe', async () => {
    Usuario.findByPk.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '999' }, body: { nombre: 'X' } });

    await promesa;

    expect(res._status).toBe(404);
    expect(res._json.message).toBe('Usuario no encontrado.');
  });

  it('actualizar cambia nombre y apellidos', async () => {
    const usuario = { id: 1, save: vi.fn().mockResolvedValue() };
    const completo = { id: 1, usuario: 'juan', nombre: 'Nuevo', apellidos: 'Aguilera', secciones: [] };
    Usuario.findByPk.mockResolvedValueOnce(usuario).mockResolvedValueOnce(completo);
    const { promesa, res } = llamar(ctrl.actualizar, {
      params: { id: '1' }, body: { nombre: 'Nuevo', apellidos: 'Aguilera' }
    });

    await promesa;

    expect(usuario.nombre).toBe('Nuevo');
    expect(usuario.apellidos).toBe('Aguilera');
    expect(usuario.save).toHaveBeenCalled();
    expect(res._status).toBe(200);
  });

  it('actualizar cambia activo', async () => {
    const usuario = { id: 2, save: vi.fn().mockResolvedValue() };
    const completo = { id: 2, usuario: 'test', nombre: 'T', apellidos: 'E', activo: false, secciones: [] };
    Usuario.findByPk.mockResolvedValueOnce(usuario).mockResolvedValueOnce(completo);
    const { promesa, res } = llamar(ctrl.actualizar, {
      params: { id: '2' }, body: { activo: false }
    });

    await promesa;

    expect(usuario.activo).toBe(false);
    expect(usuario.save).toHaveBeenCalled();
  });

  it('actualizar con permisos llama setSecciones con through attributes', async () => {
    const usuario = { id: 5, save: vi.fn().mockResolvedValue(), setSecciones: vi.fn().mockResolvedValue() };
    const completo = { id: 5, usuario: 'edu', nombre: 'E', apellidos: 'U', secciones: [] };
    Usuario.findByPk.mockResolvedValueOnce(usuario).mockResolvedValueOnce(completo);
    const { promesa, res } = llamar(ctrl.actualizar, {
      params: { id: '5' },
      body: { permisos: { 3: { ver: true, editar: true } } }
    });

    await promesa;

    expect(usuario.setSecciones).toHaveBeenCalledWith([
      { id: 3, usuario_secciones: { puede_ver: 1, puede_editar: 1 } }
    ]);
    expect(res._status).toBe(200);
  });

  it('actualizar entrenador valida categoría al cambiar solo id_categoria', async () => {
    const usuario = { id: 1, rol: 'entrenador', id_categoria: null, save: vi.fn() };
    Usuario.findByPk.mockResolvedValue(usuario);
    const { promesa, res } = llamar(ctrl.actualizar, {
      params: { id: '1' }, body: { id_categoria: null }
    });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('El rol "entrenador" requiere seleccionar una categoría.');
    expect(usuario.save).not.toHaveBeenCalled();
  });

  it('actualizar coordinador ignora id_categoria (la pone a null)', async () => {
    const usuario = { id: 1, rol: 'coordinador', id_categoria: 5, save: vi.fn().mockResolvedValue() };
    const completo = { id: 1, usuario: 'coord', nombre: 'C', apellidos: 'O', id_categoria: null, secciones: [] };
    Usuario.findByPk.mockResolvedValueOnce(usuario).mockResolvedValueOnce(completo);
    const { promesa, res } = llamar(ctrl.actualizar, {
      params: { id: '1' }, body: { id_categoria: 10 }
    });

    await promesa;

    expect(usuario.id_categoria).toBeNull();
    expect(usuario.save).toHaveBeenCalled();
    expect(res._status).toBe(200);
  });

  it('crear con ids_secciones (formato legacy) genera permisos ver:true', async () => {
    const nuevo = { id: 12, setSecciones: vi.fn().mockResolvedValue() };
    const completo = { id: 12, usuario: 'legacy', password: 'hash', nombre: 'L', apellidos: 'G', secciones: [] };
    Usuario.create.mockResolvedValue(nuevo);
    Usuario.findByPk.mockResolvedValue(completo);
    const { promesa, res } = llamar(ctrl.crear, {
      body: { usuario: 'legacy', password: 'Clave123!', nombre: 'L', apellidos: 'G', ids_secciones: [3, 7] }
    });

    await promesa;

    expect(nuevo.setSecciones).toHaveBeenCalledWith([
      { id: 3, usuario_secciones: { puede_ver: 1, puede_editar: 0 } },
      { id: 7, usuario_secciones: { puede_ver: 1, puede_editar: 0 } }
    ]);
    expect(res._status).toBe(201);
  });

  it('crear con secciones (array de objetos legacy) genera permisos ver:true', async () => {
    const nuevo = { id: 13, setSecciones: vi.fn().mockResolvedValue() };
    const completo = { id: 13, usuario: 'legacy2', password: 'hash', nombre: 'L', apellidos: '2', secciones: [] };
    Usuario.create.mockResolvedValue(nuevo);
    Usuario.findByPk.mockResolvedValue(completo);
    const { promesa, res } = llamar(ctrl.crear, {
      body: { usuario: 'legacy2', password: 'Clave123!', nombre: 'L', apellidos: '2', secciones: [{ id: 4 }, 6] }
    });

    await promesa;

    expect(nuevo.setSecciones).toHaveBeenCalledWith([
      { id: 4, usuario_secciones: { puede_ver: 1, puede_editar: 0 } },
      { id: 6, usuario_secciones: { puede_ver: 1, puede_editar: 0 } }
    ]);
  });

  it('listar devuelve permisos vacío para usuario sin secciones', async () => {
    const usuario = { id: 8, usuario: 'nosec', password: 'h', nombre: 'N', apellidos: 'S', secciones: [] };
    Usuario.findAll.mockResolvedValue([usuario]);
    const { promesa, res } = llamar(ctrl.listar);

    await promesa;

    expect(res._json).toHaveLength(1);
    expect(res._json[0].permisos).toEqual({});
  });

  it('eliminar compara req.params.id con req.user.id como números', async () => {
    const { promesa, res } = llamar(ctrl.eliminar, { params: { id: '1' }, user: { id: 1 } });

    await promesa;

    expect(res._status).toBe(400);
    expect(Usuario.destroy).not.toHaveBeenCalled();
  });

  it('eliminar con req.user.id diferente sí permite', async () => {
    Usuario.destroy.mockResolvedValue(1);
    const { promesa, res } = llamar(ctrl.eliminar, { params: { id: '5' }, user: { id: 1 } });

    await promesa;

    expect(res._status).toBe(204);
    expect(Usuario.destroy).toHaveBeenCalledWith({ where: { id: '5' } });
  });
});
