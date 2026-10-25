import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CuentaCorreo, mailer } from './helpers/models.js';
import { mockReqRes } from './helpers/http.js';
import * as aes from '../src/utils/aesCrypto.js';

import * as ctrl from '../src/controllers/cuentaCorreo.controller.js';

describe('Sección Correos · cuentaCorreo.controller', () => {
  beforeEach(() => {
    CuentaCorreo.findAll.mockReset();
    CuentaCorreo.findByPk.mockReset();
    CuentaCorreo.findOne.mockReset();
    CuentaCorreo.create.mockReset();
    CuentaCorreo.update.mockReset();
    CuentaCorreo.destroy.mockReset();
    CuentaCorreo.scope.mockReturnValue(CuentaCorreo);
    mailer.enviarConConfig.mockReset();
  });

  function llamar(fn, overrides = {}) {
    const { req, res, next } = mockReqRes(overrides);
    return { promesa: fn(req, res, next), res, req, next };
  }

  const cuerpoValido = (extra = {}) => ({
    etiqueta: 'no-reply', email: 'no-reply@club.es', smtp_host: 'smtp.club.es',
    smtp_port: 587, smtp_user: 'no-reply@club.es', smtp_password: 'Secreta#2026', ...extra
  });

  it('listar devuelve las cuentas sin la contraseña y con tiene_password', async () => {
    CuentaCorreo.findAll.mockResolvedValue([
      { toJSON: () => ({ id: 1, etiqueta: 'no-reply', email: 'n@club.es', smtp_password: 'cifrada', activa: true }) }
    ]);
    const { promesa, res } = llamar(ctrl.listar);
    await promesa;
    expect(res._json[0].smtp_password).toBeUndefined();
    expect(res._json[0].tiene_password).toBe(true);
    expect(res._json[0].etiqueta).toBe('no-reply');
  });

  it('crear valida campos obligatorios', async () => {
    const { promesa, res } = llamar(ctrl.crear, { body: { etiqueta: 'x' } });
    await promesa;
    expect(res._status).toBe(400);
    expect(CuentaCorreo.create).not.toHaveBeenCalled();
  });

  it('crear valida el formato del email', async () => {
    const { promesa, res } = llamar(ctrl.crear, { body: cuerpoValido({ email: 'no-es-email' }) });
    await promesa;
    expect(res._status).toBe(400);
    expect(res._json.message).toContain('email');
  });

  it('crear exige contraseña al crear', async () => {
    const { promesa, res } = llamar(ctrl.crear, { body: cuerpoValido({ smtp_password: '' }) });
    await promesa;
    expect(res._status).toBe(400);
    expect(res._json.message).toContain('contraseña');
  });

  it('crear cifra la contraseña, no la guarda en claro y responde 201 sin ella', async () => {
    CuentaCorreo.create.mockResolvedValue({ id: 3 });
    CuentaCorreo.findByPk.mockResolvedValue({ toJSON: () => ({ id: 3, etiqueta: 'no-reply', smtp_password: 'cifrada', activa: false }) });
    const { promesa, res } = llamar(ctrl.crear, { body: cuerpoValido() });
    await promesa;
    const guardado = CuentaCorreo.create.mock.calls[0][0];
    expect(guardado.smtp_password).not.toBe('Secreta#2026');
    // Formato AES "iv:tag:data" y descifra al original.
    expect(guardado.smtp_password.split(':')).toHaveLength(3);
    expect(aes.decrypt(guardado.smtp_password)).toBe('Secreta#2026');
    expect(res._status).toBe(201);
    expect(res._json.smtp_password).toBeUndefined();
    expect(res._json.tiene_password).toBe(true);
  });

  it('crear con activa=true desmarca las demás cuentas', async () => {
    CuentaCorreo.create.mockResolvedValue({ id: 4 });
    CuentaCorreo.findByPk.mockResolvedValue({ toJSON: () => ({ id: 4, smtp_password: 'c', activa: true }) });
    const { promesa } = llamar(ctrl.crear, { body: cuerpoValido({ activa: true }) });
    await promesa;
    expect(CuentaCorreo.update).toHaveBeenCalledWith({ activa: false }, expect.any(Object));
  });

  it('actualizar mantiene la contraseña si no se envía una nueva', async () => {
    const cuenta = { id: 5, update: vi.fn().mockResolvedValue() };
    CuentaCorreo.findByPk
      .mockResolvedValueOnce(cuenta)
      .mockResolvedValueOnce({ toJSON: () => ({ id: 5, smtp_password: 'cifrada-vieja' }) });
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '5' }, body: cuerpoValido({ smtp_password: '' }) });
    await promesa;
    const cambios = cuenta.update.mock.calls[0][0];
    expect('smtp_password' in cambios).toBe(false);
    expect(res._status ?? 200).toBe(200);
  });

  it('actualizar cifra la nueva contraseña si se envía', async () => {
    const cuenta = { id: 6, update: vi.fn().mockResolvedValue() };
    CuentaCorreo.findByPk
      .mockResolvedValueOnce(cuenta)
      .mockResolvedValueOnce({ toJSON: () => ({ id: 6, smtp_password: 'nueva-cifrada' }) });
    const { promesa } = llamar(ctrl.actualizar, { params: { id: '6' }, body: cuerpoValido({ smtp_password: 'Nueva#2026' }) });
    await promesa;
    const cambios = cuenta.update.mock.calls[0][0];
    expect(aes.decrypt(cambios.smtp_password)).toBe('Nueva#2026');
  });

  it('actualizar devuelve 404 si no existe', async () => {
    CuentaCorreo.findByPk.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '99' }, body: cuerpoValido() });
    await promesa;
    expect(res._status).toBe(404);
  });

  it('eliminar responde 204 y 404 si no existe', async () => {
    CuentaCorreo.destroy.mockResolvedValueOnce(1);
    const r1 = llamar(ctrl.eliminar, { params: { id: '5' } });
    await r1.promesa;
    expect(r1.res._status).toBe(204);

    CuentaCorreo.destroy.mockResolvedValueOnce(0);
    const r2 = llamar(ctrl.eliminar, { params: { id: '99' } });
    await r2.promesa;
    expect(r2.res._status).toBe(404);
  });

  it('probar envía un correo de prueba con la config de la cuenta', async () => {
    const cifrada = aes.encrypt('Secreta#2026');
    CuentaCorreo.findByPk.mockResolvedValue({
      id: 7, etiqueta: 'no-reply', email: 'n@club.es', smtp_host: 'smtp.club.es',
      smtp_port: 587, smtp_secure: false, smtp_user: 'n@club.es', smtp_password: cifrada
    });
    mailer.enviarConConfig.mockResolvedValue({});
    const { promesa, res } = llamar(ctrl.probar, { params: { id: '7' }, body: { destino: 'test@club.es' } });
    await promesa;
    expect(mailer.enviarConConfig).toHaveBeenCalledTimes(1);
    const [cfg, mail] = mailer.enviarConConfig.mock.calls[0];
    expect(cfg.pass).toBe('Secreta#2026');
    expect(mail.to).toBe('test@club.es');
    expect(res._json.message).toContain('test@club.es');
  });
});
