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
    me: vi.fn()
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

  it('estado inicial lee localStorage', () => {
    mockLocalStorage.store = {
      apr_token: 'tok',
      apr_user: JSON.stringify({ id: 1, usuario: 'admin', secciones: ['calendario'] })
    };
    const store = useAuthStore();
    expect(store.token).toBe('tok');
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

  it('login guarda token y usuario', async () => {
    authService.login.mockResolvedValue({
      token: 'abc',
      user: { id: 1, usuario: 'admin', secciones: ['calendario'] }
    });
    const store = useAuthStore();
    const user = await store.login('admin', 'Admin#2026');
    expect(user.usuario).toBe('admin');
    expect(store.token).toBe('abc');
    expect(mockLocalStorage.store.apr_token).toBe('abc');
  });

  it('logout limpia estado y localStorage', () => {
    const store = useAuthStore();
    store.token = 'abc';
    store.user = { id: 1 };
    store.logout();
    expect(store.token).toBeNull();
    expect(store.user).toBeNull();
    expect(mockLocalStorage.store.apr_token).toBeUndefined();
  });

  it('restoreSession actualiza usuario', async () => {
    authService.me.mockResolvedValue({ id: 2, usuario: 'x' });
    mockLocalStorage.store.apr_token = 'tok';
    const store = useAuthStore();
    store.token = 'tok';
    await store.restoreSession();
    expect(store.user.usuario).toBe('x');
  });

  it('restoreSession hace logout si falla', async () => {
    authService.me.mockRejectedValue(new Error('expired'));
    mockLocalStorage.store.apr_token = 'tok';
    const store = useAuthStore();
    store.token = 'tok';
    await store.restoreSession();
    expect(store.token).toBeNull();
    expect(mockLocalStorage.store.apr_token).toBeUndefined();
  });
});
