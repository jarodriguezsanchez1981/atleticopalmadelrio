import { describe, it, expect, vi } from 'vitest';
import soloAdmin from '../src/middlewares/soloAdmin.js';
import { mockReqRes } from './helpers/http.js';

describe('middleware soloAdmin', () => {
  it('deja pasar al usuario admin', () => {
    const { res } = mockReqRes();
    const next = vi.fn();
    soloAdmin({ user: { usuario: 'admin' } }, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('bloquea a cualquier otro usuario con 403', () => {
    const { res } = mockReqRes();
    const next = vi.fn();
    soloAdmin({ user: { usuario: 'pepe' } }, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(403);
  });

  it('bloquea si no hay usuario', () => {
    const { res } = mockReqRes();
    const next = vi.fn();
    soloAdmin({}, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(403);
  });
});
