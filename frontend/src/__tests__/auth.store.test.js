import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '../stores/auth.store.js';

const mockLocalStorage = {
  store: {},
  getItem(k) { return this.store[k] || null; },
  setItem(k, v) { this.store[k] = v; },
  removeItem(k) { delete this.store[k]; }
};

vi.mock('../services/index.js', () => ({
  authService: {
    login: vi.fn(),
    me: vi.fn(),
    logout: vi.fn()
  }
}));

import { authService } from '../services/index.js';

describe('Auth Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    Object.defineProperty(window, 'localStorage', { value: mockLocalStorage, writable: true });
    mockLocalStorage.store = {};
    vi.clearAllMocks();
  });

  it('estado inicial lee el usuario de localStorage (el token no: va en la cookie HttpOnly)', () => {
    mockLocalStorage.store = {
      apr_user: JSON.stringify({ id: 1, usuario: 'admin', secciones: ['calendario'] })
    };
    const store = useAuthStore();
    expect(store).not.toHaveProperty('token');
    expect(store.user.usuario).toBe('admin');
    expect(store.isAuthenticated).toBe(true);
  });

  it('puedeVer consulta permisos por sección', () => {
    const store = useAuthStore();
    store.user = { secciones: ['jugadores'], permisos: { jugadores: { ver: true, editar: false } } };
    expect(store.puedeVer('jugadores')).toBe(true);
    expect(store.puedeVer('administracion')).toBe(false);
  });

  it('permiso "editar" en una sección permite crear, editar y eliminar en esa sección', () => {
    const store = useAuthStore();
    store.user = { secciones: ['jugadores'], permisos: { jugadores: { ver: true, editar: true } } };
    expect(store.puedeCrear('jugadores')).toBe(true);
    expect(store.puedeEditar('jugadores')).toBe(true);
    expect(store.puedeEliminar('jugadores')).toBe(true);
  });

  it('solo permiso de "ver" bloquea creación, edición y borrado', () => {
    const store = useAuthStore();
    store.user = { secciones: ['jugadores'], permisos: { jugadores: { ver: true, editar: false } } };
    expect(store.puedeCrear('jugadores')).toBe(false);
    expect(store.puedeEditar('jugadores')).toBe(false);
    expect(store.puedeEliminar('jugadores')).toBe(false);
  });

  it('sin clave, puedeCrear/puedeEditar/puedeEliminar siempre son false', () => {
    const store = useAuthStore();
    store.user = { secciones: ['jugadores'], permisos: { jugadores: { ver: true, editar: true } } };
    expect(store.puedeCrear()).toBe(false);
    expect(store.puedeEditar()).toBe(false);
    expect(store.puedeEliminar()).toBe(false);
  });

  it('login guarda el usuario, no el token, y borra un token antiguo', async () => {
    authService.login.mockResolvedValue({ user: { id: 1, usuario: 'admin', secciones: ['calendario'] } });
    mockLocalStorage.store.apr_token = 'viejo';
    const store = useAuthStore();
    const user = await store.login('admin', 'Admin#2026');
    expect(user.usuario).toBe('admin');
    expect(store.isAuthenticated).toBe(true);
    expect(JSON.parse(mockLocalStorage.store.apr_user).usuario).toBe('admin');
    expect(mockLocalStorage.store.apr_token).toBeUndefined();
  });

  it('logout limpia el estado y cierra la sesión en el backend', async () => {
    authService.logout.mockResolvedValue({});
    mockLocalStorage.store.apr_user = JSON.stringify({ id: 1 });
    const store = useAuthStore();
    await store.logout();
    expect(store.user).toBeNull();
    expect(store.isAuthenticated).toBe(false);
    expect(mockLocalStorage.store.apr_user).toBeUndefined();
    expect(authService.logout).toHaveBeenCalled();
  });

  it('restoreSession sin sesión no llama al backend', async () => {
    const store = useAuthStore();
    await store.restoreSession();
    expect(authService.me).not.toHaveBeenCalled();
  });

  it('restoreSession actualiza el usuario (la cookie la renueva el backend)', async () => {
    authService.me.mockResolvedValue({ id: 2, usuario: 'x' });
    mockLocalStorage.store.apr_user = JSON.stringify({ id: 2, usuario: 'antes' });
    const store = useAuthStore();
    await store.restoreSession();
    expect(authService.me).toHaveBeenCalledWith(undefined);
    expect(store.user.usuario).toBe('x');
  });

  it('restoreSession pasa a la cookie una sesión antigua y borra el token del navegador', async () => {
    authService.me.mockResolvedValue({ id: 2, usuario: 'x' });
    mockLocalStorage.store.apr_token = 'tok-antiguo';
    const store = useAuthStore();
    await store.restoreSession();
    expect(authService.me).toHaveBeenCalledWith('tok-antiguo');
    expect(store.user.usuario).toBe('x');
    expect(mockLocalStorage.store.apr_token).toBeUndefined();
  });

  it('restoreSession cierra la sesión si falla', async () => {
    authService.me.mockRejectedValue(new Error('expired'));
    mockLocalStorage.store.apr_user = JSON.stringify({ id: 2 });
    const store = useAuthStore();
    await store.restoreSession();
    expect(store.user).toBeNull();
    expect(mockLocalStorage.store.apr_user).toBeUndefined();
  });

  it('Firma Email solo la ven los coordinadores aunque un entrenador tenga el permiso', () => {
    const store = useAuthStore();
    const permisos = { firma_email: { ver: true, editar: true }, calendario: { ver: true, editar: false } };
    store.user = { id: 1, rol: 'coordinador', permisos };
    expect(store.puedeVer('firma_email')).toBe(true);
    store.user = { id: 2, rol: 'entrenador', permisos };
    expect(store.puedeVer('firma_email')).toBe(false);
    expect(store.puedeVer('calendario')).toBe(true);
  });
});
