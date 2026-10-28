import { describe, it, expect, beforeAll } from 'vitest';
import jwt from 'jsonwebtoken';

let signToken, verifyToken;

beforeAll(async () => {
  process.env.JWT_SECRET = 'secreto_de_prueba_para_los_tests_jwt_1234567890';
  ({ signToken, verifyToken } = await import('../src/utils/jwt.utils.js'));
});

describe('jwt.utils', () => {
  it('firma y verifica un token (round-trip) conservando el payload', () => {
    const token = signToken({ id: 7, usuario: 'admin' });
    const payload = verifyToken(token);
    expect(payload.id).toBe(7);
    expect(payload.usuario).toBe('admin');
  });

  it('firma siempre con HS256', () => {
    const token = signToken({ id: 1 });
    const header = JSON.parse(Buffer.from(token.split('.')[0], 'base64').toString('utf8'));
    expect(header.alg).toBe('HS256');
  });

  it('rechaza un token sin firma (alg "none")', () => {
    const inseguro = jwt.sign({ id: 1 }, '', { algorithm: 'none' });
    expect(() => verifyToken(inseguro)).toThrow();
  });

  it('rechaza un token firmado con otro algoritmo HMAC (HS512)', () => {
    const otro = jwt.sign({ id: 1 }, process.env.JWT_SECRET, { algorithm: 'HS512' });
    expect(() => verifyToken(otro)).toThrow();
  });
});
