import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';

vi.mock('axios');

const mockLocalStorage = (() => {
  let store = {};
  return {
    getItem: vi.fn((k) => store[k] || null),
    setItem: vi.fn((k, v) => { store[k] = v; }),
    removeItem: vi.fn((k) => { delete store[k]; }),
    clear: vi.fn(() => { store = {}; })
  };
})();

describe('Servicio API', () => {
  beforeEach(() => {
    vi.resetModules();
    Object.defineProperty(window, 'localStorage', { value: mockLocalStorage, writable: true });
    Object.defineProperty(window, 'location', { value: { pathname: '/', href: '/' }, writable: true });
    axios.create.mockReturnValue({
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
      }
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('crea instancia de axios con baseURL por defecto', async () => {
    await import('../services/api.js');
    expect(axios.create).toHaveBeenCalledWith(expect.objectContaining({
      baseURL: '/api',
      timeout: 15000
    }));
  });

  it('no adjunta ningún token: la sesión va en la cookie HttpOnly', async () => {
    const { default: api } = await import('../services/api.js');
    expect(api.interceptors.request.use).not.toHaveBeenCalled();
    expect(axios.create).toHaveBeenCalledWith(expect.objectContaining({
      withCredentials: true,
      headers: expect.objectContaining({ 'X-Requested-With': 'XMLHttpRequest' })
    }));
  });

  it('redirige al login en respuesta 401', async () => {
    const { default: api } = await import('../services/api.js');
    const responseInterceptor = api.interceptors.response.use.mock.calls[0][1];
    responseInterceptor({ response: { status: 401 } }).catch(() => {});
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('apr_user');
    expect(window.location.href).toBe('/login');
  });
});
