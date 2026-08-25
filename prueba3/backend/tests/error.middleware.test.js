import { describe, it, expect, vi } from 'vitest';
import errorHandler from '../src/middlewares/error.middleware.js';

function mockRes() {
  return {
    _status: 200,
    _json: null,
    status(c) { this._status = c; return this; },
    json(p) { this._json = p; return this; }
  };
}

describe('Middleware errorHandler', () => {
  it('maneja errores de unicidad de Sequelize (409)', () => {
    const err = { name: 'SequelizeUniqueConstraintError', errors: [{ message: 'duplicado' }] };
    const res = mockRes();
    errorHandler(err, {}, res, () => {});
    expect(res._status).toBe(409);
    expect(res._json.message).toContain('ya existe');
  });

  it('maneja errores de clave foránea de Sequelize (409)', () => {
    const err = { name: 'SequelizeForeignKeyConstraintError' };
    const res = mockRes();
    errorHandler(err, {}, res, () => {});
    expect(res._status).toBe(409);
  });

  it('maneja errores de validación de Sequelize (400)', () => {
    const err = { name: 'SequelizeValidationError', errors: [{ message: 'inválido' }] };
    const res = mockRes();
    errorHandler(err, {}, res, () => {});
    expect(res._status).toBe(400);
  });

  it('oculta detalles en producción', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const err = new Error('stack secreto');
    const res = mockRes();
    errorHandler(err, {}, res, () => {});
    process.env.NODE_ENV = originalEnv;
    expect(res._status).toBe(500);
    expect(res._json.message).toBe('Error interno del servidor.');
  });

  it('devuelve el mensaje del error en desarrollo', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    const err = new Error('error visible');
    const res = mockRes();
    errorHandler(err, {}, res, () => {});
    process.env.NODE_ENV = originalEnv;
    expect(res._status).toBe(500);
    expect(res._json.message).toBe('error visible');
  });
});
