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
    mailer.verificarConfig.mockReset().mockResolvedValue(true);
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

  it('crear guarda la firma (datos + HTML) y sin HTML no guarda ninguna', async () => {
    CuentaCorreo.create.mockImplementation(async (data) => ({ id: 7, ...data }));
    CuentaCorreo.findByPk.mockResolvedValue({ id: 7, toJSON: () => ({ id: 7 }) });
    await llamar(ctrl.crear, { body: cuerpoValido({ firma_datos: { nombre: 'Pepe' }, firma_html: '<table>firma</table>' }) }).promesa;
    expect(CuentaCorreo.create.mock.calls[0][0]).toMatchObject({ firma_datos: { nombre: 'Pepe' }, firma_html: '<table>firma</table>' });

    await llamar(ctrl.crear, { body: cuerpoValido({ firma_datos: { nombre: 'Pepe' }, firma_html: '' }) }).promesa;
    expect(CuentaCorreo.create.mock.calls[1][0]).toMatchObject({ firma_datos: null, firma_html: null });
  });

  it('crear rechaza una firma demasiado larga', async () => {
    const { promesa, res } = llamar(ctrl.crear, { body: cuerpoValido({ firma_datos: {}, firma_html: 'x'.repeat(50001) }) });
    await promesa;
    expect(res._status).toBe(400);
  });

  it('crear con activa=true no desmarca las demás cuentas (puede haber varias activas)', async () => {
    CuentaCorreo.create.mockResolvedValue({ id: 4 });
    CuentaCorreo.findByPk.mockResolvedValue({ toJSON: () => ({ id: 4, smtp_password: 'c', activa: true }) });
    const { promesa, res } = llamar(ctrl.crear, { body: cuerpoValido({ activa: true }) });
    await promesa;
    expect(res._status).toBe(201);
    expect(CuentaCorreo.create).toHaveBeenCalledWith(expect.objectContaining({ activa: true }));
    expect(CuentaCorreo.update).not.toHaveBeenCalled();
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

  it('crear con activa=true y una configuración que no funciona responde 400 y no guarda', async () => {
    mailer.verificarConfig.mockRejectedValue(new Error('Invalid login: 535 Incorrect authentication data'));
    const { promesa, res } = llamar(ctrl.crear, { body: cuerpoValido({ activa: true }) });
    await promesa;
    expect(res._status).toBe(400);
    expect(res._json.message).toMatch(/No se puede marcar como activa.*535/);
    expect(CuentaCorreo.create).not.toHaveBeenCalled();
  });

  it('crear sin activa no hace la prueba interna', async () => {
    CuentaCorreo.create.mockResolvedValue({ id: 7 });
    CuentaCorreo.findByPk.mockResolvedValue({ toJSON: () => ({ id: 7, smtp_password: 'c' }) });
    const { promesa } = llamar(ctrl.crear, { body: cuerpoValido({ activa: false }) });
    await promesa;
    expect(mailer.verificarConfig).not.toHaveBeenCalled();
  });

  it('actualizar con activa=true prueba con la contraseña guardada si no llega una nueva', async () => {
    const cuenta = { id: 8, smtp_password: aes.encrypt('Guardada#1'), update: vi.fn().mockResolvedValue() };
    CuentaCorreo.findByPk
      .mockResolvedValueOnce(cuenta)
      .mockResolvedValueOnce({ toJSON: () => ({ id: 8, smtp_password: 'x', activa: true }) });
    const { promesa } = llamar(ctrl.actualizar, { params: { id: '8' }, body: cuerpoValido({ smtp_password: '', activa: true }) });
    await promesa;
    expect(mailer.verificarConfig).toHaveBeenCalledWith(expect.objectContaining({ pass: 'Guardada#1', port: 587, secure: false }));
    expect(cuenta.update).toHaveBeenCalled();
  });

  it('verificar: configuración correcta responde ok sin enviar correo', async () => {
    const { promesa, res } = llamar(ctrl.verificar, { body: cuerpoValido() });
    await promesa;
    expect(res._json.ok).toBe(true);
    expect(mailer.enviarConConfig).not.toHaveBeenCalled();
  });

  it('verificar: con id y sin contraseña usa la guardada; si falla responde 400', async () => {
    CuentaCorreo.findByPk.mockResolvedValue({ smtp_password: aes.encrypt('Guardada#2') });
    mailer.verificarConfig.mockRejectedValue(new Error('wrong version number'));
    const { promesa, res } = llamar(ctrl.verificar, { body: cuerpoValido({ id: 9, smtp_password: '', smtp_secure: true }) });
    await promesa;
    expect(mailer.verificarConfig).toHaveBeenCalledWith(expect.objectContaining({ pass: 'Guardada#2', secure: true }));
    expect(res._status).toBe(400);
    expect(res._json.ok).toBe(false);
  });

  it('verificar: sin contraseña (cuenta nueva) responde 400', async () => {
    const { promesa, res } = llamar(ctrl.verificar, { body: cuerpoValido({ smtp_password: '' }) });
    await promesa;
    expect(res._status).toBe(400);
    expect(mailer.verificarConfig).not.toHaveBeenCalled();
  });
});
