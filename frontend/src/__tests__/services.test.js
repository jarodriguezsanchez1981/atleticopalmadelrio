import { describe, it, expect, vi, beforeEach } from 'vitest';
import { crudService, authService, calendarioService, utilService, cuentasCorreoService } from '../services/index.js';

vi.mock('../services/api.js', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}));

import api from '../services/api.js';

describe('Servicios CRUD', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('listar realiza GET con params', async () => {
    api.get.mockResolvedValue({ data: [{ id: 1 }] });
    const svc = crudService('temporadas');
    const res = await svc.listar({ activo: true });
    expect(api.get).toHaveBeenCalledWith('/temporadas', { params: { activo: true } });
    expect(res).toEqual([{ id: 1 }]);
  });

  it('crear realiza POST', async () => {
    api.post.mockResolvedValue({ data: { id: 2 } });
    const svc = crudService('categorias');
    const res = await svc.crear({ nombre: 'Alevín' });
    expect(api.post).toHaveBeenCalledWith('/categorias', { nombre: 'Alevín' });
    expect(res).toEqual({ id: 2 });
  });

  it('actualizar realiza PUT', async () => {
    api.put.mockResolvedValue({ data: { id: 3 } });
    const svc = crudService('jugadores');
    const res = await svc.actualizar(3, { nombre: 'Luis' });
    expect(api.put).toHaveBeenCalledWith('/jugadores/3', { nombre: 'Luis' });
    expect(res).toEqual({ id: 3 });
  });

  it('eliminar realiza DELETE', async () => {
    api.delete.mockResolvedValue({});
    const svc = crudService('equipos');
    await svc.eliminar(5);
    expect(api.delete).toHaveBeenCalledWith('/equipos/5');
  });

  it('authService.login envía credenciales', async () => {
    api.post.mockResolvedValue({ data: { token: 'abc' } });
    const res = await authService.login('admin', 'Admin#2026');
    expect(api.post).toHaveBeenCalledWith('/auth/login', { usuario: 'admin', password: 'Admin#2026' });
    expect(res.token).toBe('abc');
  });

  it('authService.recuperarPassword envía el identificador', async () => {
    api.post.mockResolvedValue({ data: { message: 'ok' } });
    await authService.recuperarPassword('ana');
    expect(api.post).toHaveBeenCalledWith('/auth/recuperar-password', { identificador: 'ana' });
  });

  it('authService.validarTokenReset pasa el token como parámetro', async () => {
    api.get.mockResolvedValue({ data: { valido: true } });
    const res = await authService.validarTokenReset('tok123');
    expect(api.get).toHaveBeenCalledWith('/auth/restablecer-password/validar', { params: { token: 'tok123' } });
    expect(res.valido).toBe(true);
  });

  it('authService.restablecerPassword envía token y contraseñas', async () => {
    api.post.mockResolvedValue({ data: { message: 'ok' } });
    await authService.restablecerPassword('tok123', 'Nueva#2026', 'Nueva#2026');
    expect(api.post).toHaveBeenCalledWith('/auth/restablecer-password', { token: 'tok123', password: 'Nueva#2026', confirmacion: 'Nueva#2026' });
  });

  it('cuentasCorreoService.probar envía el destino', async () => {
    api.post.mockResolvedValue({ data: { message: 'ok' } });
    await cuentasCorreoService.probar(7, 'test@club.es');
    expect(api.post).toHaveBeenCalledWith('/cuentas-correo/7/probar', { destino: 'test@club.es' });
  });

  it('calendarioService.eventos pasa parámetros', async () => {
    api.get.mockResolvedValue({ data: [] });
    await calendarioService.eventos({ id_categoria: 1 });
    expect(api.get).toHaveBeenCalledWith('/calendario', { params: { id_categoria: 1 } });
  });

  it('utilService.imagen pasa URL', async () => {
    api.get.mockResolvedValue({ data: { dataUrl: 'data:...' } });
    await utilService.imagen('http://example.com/img.png');
    expect(api.get).toHaveBeenCalledWith('/util/imagen', { params: { url: 'http://example.com/img.png' } });
  });
});
