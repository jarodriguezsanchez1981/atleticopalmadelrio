import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Usuario, Seccion, UsuarioCodigoRecuperacion } from './helpers/models.js';
import { passwordUtils, jwtUtils, mailer } from './helpers/models.js';
import { mockReqRes } from './helpers/http.js';
import * as totp from '../src/utils/totp.js';
import * as aes from '../src/utils/aesCrypto.js';

import * as ctrl from '../src/controllers/auth.controller.js';

describe('Autenticación · auth.controller', () => {
  beforeEach(() => {
    Usuario.findByPk.mockReset();
    Usuario.findOne.mockReset();
    Usuario.scope.mockReturnValue(Usuario);
    UsuarioCodigoRecuperacion.findAll.mockReset();
    UsuarioCodigoRecuperacion.destroy.mockReset();
    UsuarioCodigoRecuperacion.bulkCreate.mockReset();
    passwordUtils.verifyPassword.mockReset();
    passwordUtils.hashPassword.mockReset();
    passwordUtils.hashPassword.mockResolvedValue('hash-codigo');
    jwtUtils.signToken.mockReset();
    jwtUtils.signToken.mockReturnValue('token-fake');
  });

  function llamar(fn, overrides = {}) {
    const { req, res, next } = mockReqRes(overrides);
    return { promesa: fn(req, res, next), res, req, next };
  }

  it('login valida campos obligatorios', async () => {
    const { promesa, res } = llamar(ctrl.login, { body: {} });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('Usuario y contraseña son obligatorios.');
  });

  it('login rechaza usuario o contraseña que no son texto (400)', async () => {
    const { promesa, res } = llamar(ctrl.login, { body: { usuario: { $ne: 1 }, password: 'x' } });

    await promesa;

    expect(res._status).toBe(400);
    expect(Usuario.findOne).not.toHaveBeenCalled();
  });

  it('login devuelve 401 si el usuario no existe', async () => {
    Usuario.scope = vi.fn().mockReturnValue(Usuario);
    Usuario.findOne.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.login, { body: { usuario: 'x', password: 'Clave123!' } });

    await promesa;

    expect(res._status).toBe(401);
    expect(res._json.message).toBe('Usuario o contraseña incorrectos.');
  });

  it('login devuelve 401 si el usuario está inactivo', async () => {
    Usuario.scope.mockReturnValue(Usuario);
    Usuario.findOne.mockResolvedValue({ id: 1, activo: false, password: 'hash' });
    const { promesa, res } = llamar(ctrl.login, { body: { usuario: 'x', password: 'Clave123!' } });

    await promesa;

    expect(res._status).toBe(401);
  });

  it('login devuelve 401 si la contraseña no coincide y cuenta el intento fallido', async () => {
    Usuario.scope.mockReturnValue(Usuario);
    const update = vi.fn().mockResolvedValue();
    Usuario.findOne.mockResolvedValue({ id: 1, activo: true, password: 'hash', intentos_fallidos: 0, update });
    passwordUtils.verifyPassword.mockResolvedValue(false);
    const { promesa, res } = llamar(ctrl.login, { body: { usuario: 'x', password: 'Clave123!' } });

    await promesa;

    expect(res._status).toBe(401);
    expect(passwordUtils.verifyPassword).toHaveBeenCalledWith('Clave123!', 'hash');
    expect(update).toHaveBeenCalledWith({ intentos_fallidos: 1 });
  });

  it('login bloquea la cuenta al 5º intento fallido', async () => {
    Usuario.scope.mockReturnValue(Usuario);
    const update = vi.fn().mockResolvedValue();
    Usuario.findOne.mockResolvedValue({ id: 1, activo: true, password: 'hash', intentos_fallidos: 4, update });
    passwordUtils.verifyPassword.mockResolvedValue(false);
    const { promesa, res } = llamar(ctrl.login, { body: { usuario: 'x', password: 'mal' } });

    await promesa;

    expect(res._status).toBe(401);
    const arg = update.mock.calls[0][0];
    expect(arg.intentos_fallidos).toBe(0);
    expect(arg.bloqueado_hasta).toBeInstanceOf(Date);
  });

  it('login rechaza con 429 si la cuenta está bloqueada', async () => {
    Usuario.scope.mockReturnValue(Usuario);
    const update = vi.fn();
    Usuario.findOne.mockResolvedValue({
      id: 1, activo: true, password: 'hash',
      bloqueado_hasta: new Date(Date.now() + 10 * 60 * 1000), update
    });
    const { promesa, res } = llamar(ctrl.login, { body: { usuario: 'x', password: 'Clave123!' } });

    await promesa;

    expect(res._status).toBe(429);
    expect(passwordUtils.verifyPassword).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('login con contraseña correcta reinicia el contador de fallos', async () => {
    Usuario.scope.mockReturnValue(Usuario);
    const update = vi.fn().mockResolvedValue();
    Usuario.findOne.mockResolvedValue({
      id: 1, usuario: 'admin', nombre: 'A', activo: true,
      totp_activado: true, totp_secret: 'cifrado', password: 'hash',
      intentos_fallidos: 3, update
    });
    passwordUtils.verifyPassword.mockResolvedValue(true);
    const { promesa, res } = llamar(ctrl.login, { body: { usuario: 'admin', password: 'Clave123!' } });

    await promesa;

    expect(update).toHaveBeenCalledWith({ intentos_fallidos: 0, bloqueado_hasta: null });
    expect(res._json.twofa).toBe('verificar');
  });

  it('login con contraseña correcta y 2FA ya activo pide el código (no da sesión)', async () => {
    Usuario.findOne.mockResolvedValue({
      id: 1, usuario: 'admin', nombre: 'A', activo: true,
      totp_activado: true, totp_secret: 'cifrado', password: 'hash', secciones: []
    });
    passwordUtils.verifyPassword.mockResolvedValue(true);
    const { promesa, res } = llamar(ctrl.login, { body: { usuario: 'admin', password: 'Clave123!' } });

    await promesa;

    expect(res._status).toBe(200);
    expect(res._json).toEqual({ twofa: 'verificar', nombre: 'A' });
    // No hay sesión todavía: la cookie de sesión se limpia y se pone la temporal.
    expect(res._cookies.apr_sesion.valor).toBeNull();
    expect(res._cookies.apr_2fa.valor).toBe('token-fake');
    // El token temporal es de tipo 2fa/fase verificar, no una sesión.
    expect(jwtUtils.signToken).toHaveBeenCalledWith(expect.objectContaining({
      tipo: '2fa', fase: 'verificar', id: 1, usuario: 'admin'
    }));
  });

  it('login con contraseña correcta y sin 2FA fuerza a configurarlo', async () => {
    Usuario.findOne.mockResolvedValue({
      id: 2, usuario: 'nuevo', nombre: 'N', activo: true,
      totp_activado: false, totp_secret: null, password: 'hash', secciones: []
    });
    passwordUtils.verifyPassword.mockResolvedValue(true);
    const { promesa, res } = llamar(ctrl.login, { body: { usuario: 'nuevo', password: 'Clave123!' } });

    await promesa;

    expect(res._json).toEqual({ twofa: 'configurar', nombre: 'N' });
    expect(res._cookies.apr_sesion.valor).toBeNull();
    expect(jwtUtils.signToken).toHaveBeenCalledWith(expect.objectContaining({
      tipo: '2fa', fase: 'configurar', id: 2
    }));
  });

  it('me devuelve 404 si no existe', async () => {
    Usuario.findByPk.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.me, { user: { id: 9 } });

    await promesa;

    expect(res._status).toBe(404);
    expect(res._json.message).toBe('Usuario no encontrado.');
  });

  it('me devuelve el payload del usuario', async () => {
    Usuario.findByPk.mockResolvedValue({
      id: 1, usuario: 'admin', nombre: 'A', apellidos: 'B', rol: 'coordinador', id_categoria: null,
      secciones: [
        { clave: 'temporadas', usuario_secciones: { puede_ver: 1, puede_editar: 1 } }
      ]
    });
    const { promesa, res } = llamar(ctrl.me, { user: { id: 1 } });

    await promesa;

    expect(Usuario.findByPk).toHaveBeenCalledWith(1, expect.objectContaining({ include: expect.any(Array) }));
    expect(res._json).toEqual({
      id: 1, usuario: 'admin', nombre: 'A', apellidos: 'B',
      secciones: ['temporadas'],
      permisos: { temporadas: { ver: true, editar: true } },
      rol: 'coordinador', id_categoria: null, categoria_nombre: null
    });
    // Token renovado (en la cookie) con los permisos actuales (no los del login).
    expect(res._cookies.apr_sesion.valor).toBe('token-fake');
    expect(jwtUtils.signToken).toHaveBeenCalledWith(expect.objectContaining({
      id: 1, s: ['temporadas'], e: '*'
    }));
  });

  it('me renueva el token sin alargar la sesión (1 hora desde el login)', async () => {
    Usuario.findByPk.mockResolvedValue({ id: 1, usuario: 'admin', rol: 'coordinador', secciones: [] });
    const ini = Math.floor(Date.now() / 1000) - 1800;
    const { promesa } = llamar(ctrl.me, { user: { id: 1, ini, iat: ini + 1000 } });
    await promesa;
    expect(jwtUtils.signToken).toHaveBeenCalledWith(expect.objectContaining({ ini, exp: ini + 3600 }));
  });

  it('me rechaza a un usuario desactivado', async () => {
    Usuario.findByPk.mockResolvedValue({ id: 3, usuario: 'baja', activo: false, secciones: [] });
    const { promesa, res } = llamar(ctrl.me, { user: { id: 3 } });
    await promesa;
    expect(res._status).toBe(401);
    expect(jwtUtils.signToken).not.toHaveBeenCalled();
  });

  it('me devuelve el payload con permisos mixtos (ver y editar)', async () => {
    Usuario.findByPk.mockResolvedValue({
      id: 4, usuario: 'mix', nombre: 'M', apellidos: 'X', rol: 'coordinador', id_categoria: null,
      secciones: [
        { clave: 'calendario', usuario_secciones: { puede_ver: 1, puede_editar: 1 } },
        { clave: 'jugadores', usuario_secciones: { puede_ver: 1, puede_editar: 0 } },
        { clave: 'sanciones', usuario_secciones: { puede_ver: 0, puede_editar: 0 } }
      ]
    });
    const { promesa, res } = llamar(ctrl.me, { user: { id: 4 } });

    await promesa;

    expect(res._json.permisos).toEqual({
      calendario: { ver: true, editar: true },
      jugadores: { ver: true, editar: false },
      sanciones: { ver: false, editar: false }
    });
    expect(res._json.secciones).toEqual(['calendario', 'jugadores', 'sanciones']);
  });

  it('login no filtra en la respuesta el hash ni el secreto TOTP', async () => {
    Usuario.findOne.mockResolvedValue({
      id: 6, usuario: 'nopw', nombre: 'N', activo: true,
      totp_activado: true, totp_secret: 'cifrado', password: 'supersecret', secciones: []
    });
    passwordUtils.verifyPassword.mockResolvedValue(true);
    const { promesa, res } = llamar(ctrl.login, { body: { usuario: 'nopw', password: 'Clave123!' } });

    await promesa;

    expect(res._json).not.toHaveProperty('user');
    expect(JSON.stringify(res._json)).not.toContain('supersecret');
    expect(JSON.stringify(res._json)).not.toContain('cifrado');
  });

  describe('verificar2fa', () => {
    const pendiente = { tipo: '2fa', fase: 'verificar', id: 1, usuario: 'admin' };

    it('rechaza si no se envía código (400)', async () => {
      const { promesa, res } = llamar(ctrl.verificar2fa, { pendiente2fa: pendiente, body: {} });
      await promesa;
      expect(res._status).toBe(400);
    });

    it('acepta un token TOTP válido, emite sesión y devuelve el payload', async () => {
      const secret = totp.generarSecreto();
      const token = (await import('otplib')).authenticator.generate(secret);
      Usuario.findByPk.mockResolvedValue({
        id: 1, usuario: 'admin', nombre: 'A', apellidos: 'B', activo: true,
        rol: 'coordinador', id_categoria: null, totp_activado: true,
        totp_secret: aes.encrypt(secret),
        secciones: [{ clave: 'administracion', usuario_secciones: { puede_ver: 1, puede_editar: 1 } }]
      });
      const { promesa, res } = llamar(ctrl.verificar2fa, { pendiente2fa: pendiente, body: { codigo: token } });

      await promesa;

      expect(res._json.user).toEqual(expect.objectContaining({
        id: 1, usuario: 'admin', secciones: ['administracion']
      }));
      expect(res._cookies.apr_sesion.valor).toBe('token-fake');
      expect(res._cookies.apr_2fa.valor).toBeNull(); // cookie temporal borrada
    });

    it('rechaza un token incorrecto (401)', async () => {
      const secret = totp.generarSecreto();
      Usuario.findByPk.mockResolvedValue({
        id: 1, activo: true, totp_activado: true, totp_secret: aes.encrypt(secret), secciones: []
      });
      UsuarioCodigoRecuperacion.findAll.mockResolvedValue([]);
      const { promesa, res } = llamar(ctrl.verificar2fa, { pendiente2fa: pendiente, body: { codigo: '000000' } });

      await promesa;

      expect(res._status).toBe(401);
      expect(res._cookies.apr_sesion).toBeUndefined();
    });

    it('acepta un código de recuperación válido y lo marca como usado', async () => {
      const fila = { codigo_hash: 'hash', usado: false, update: vi.fn().mockResolvedValue() };
      Usuario.findByPk.mockResolvedValue({
        id: 1, usuario: 'admin', activo: true, totp_activado: true,
        totp_secret: aes.encrypt(totp.generarSecreto()), secciones: []
      });
      UsuarioCodigoRecuperacion.findAll.mockResolvedValue([fila]);
      passwordUtils.verifyPassword.mockResolvedValue(true);
      const { promesa, res } = llamar(ctrl.verificar2fa, { pendiente2fa: pendiente, body: { codigo: 'ABCDE-12345' } });

      await promesa;

      expect(fila.update).toHaveBeenCalledWith({ usado: true });
      expect(res._json.user).toBeDefined();
    });
  });

  describe('enrolar2fa', () => {
    it('inicio devuelve QR y secreto y re-emite la cookie temporal con el secreto', async () => {
      Usuario.findByPk.mockResolvedValue({ id: 2, usuario: 'nuevo', activo: true });
      const { promesa, res } = llamar(ctrl.enrolar2faInicio, {
        pendiente2fa: { tipo: '2fa', fase: 'configurar', id: 2, usuario: 'nuevo' }
      });

      await promesa;

      expect(res._json.qr).toMatch(/^data:image\/png;base64,/);
      expect(typeof res._json.secret).toBe('string');
      expect(res._cookies.apr_2fa.valor).toBe('token-fake');
      expect(jwtUtils.signToken).toHaveBeenCalledWith(expect.objectContaining({
        fase: 'configurar', id: 2, secret: expect.any(String)
      }));
    });

    it('confirmar rechaza un código incorrecto (400) y no activa el 2FA', async () => {
      const secret = totp.generarSecreto();
      const user = { id: 2, activo: true, update: vi.fn() };
      Usuario.findByPk.mockResolvedValue(user);
      const { promesa, res } = llamar(ctrl.enrolar2faConfirmar, {
        pendiente2fa: { tipo: '2fa', fase: 'configurar', id: 2, usuario: 'nuevo', secret },
        body: { codigo: '000000' }
      });

      await promesa;

      expect(res._status).toBe(400);
      expect(user.update).not.toHaveBeenCalled();
    });

    it('confirmar con código válido activa el 2FA, guarda el secreto cifrado y devuelve los códigos', async () => {
      const secret = totp.generarSecreto();
      const token = (await import('otplib')).authenticator.generate(secret);
      const user = { id: 2, usuario: 'nuevo', activo: true, update: vi.fn().mockResolvedValue() };
      // 1ª llamada: findByPk para confirmar; 2ª: emitirSesion (con secciones).
      Usuario.findByPk
        .mockResolvedValueOnce(user)
        .mockResolvedValueOnce({ id: 2, usuario: 'nuevo', nombre: 'N', apellidos: 'U', rol: 'coordinador', secciones: [] });
      const { promesa, res } = llamar(ctrl.enrolar2faConfirmar, {
        pendiente2fa: { tipo: '2fa', fase: 'configurar', id: 2, usuario: 'nuevo', secret },
        body: { codigo: token }
      });

      await promesa;

      expect(user.update).toHaveBeenCalledWith(
        expect.objectContaining({ totp_activado: true, totp_secret: expect.any(String) }),
        expect.any(Object)
      );
      // El secreto se guarda cifrado (no en claro).
      const guardado = user.update.mock.calls[0][0].totp_secret;
      expect(guardado).not.toBe(secret);
      expect(aes.decrypt(guardado)).toBe(secret);
      expect(UsuarioCodigoRecuperacion.bulkCreate).toHaveBeenCalled();
      expect(Array.isArray(res._json.codigos_recuperacion)).toBe(true);
      expect(res._json.codigos_recuperacion.length).toBe(10);
      expect(res._cookies.apr_sesion.valor).toBe('token-fake');
    });
  });

  it('logout borra la cookie de sesión', () => {
    const { res } = llamar(ctrl.logout);
    expect(res._cookies.apr_sesion).toEqual({ valor: null, opciones: expect.objectContaining({ httpOnly: true, path: '/api' }) });
    expect(res._json.message).toBe('Sesión cerrada.');
  });

  describe('cambiarPassword', () => {
    const user = { id: 7 };
    const valida = 'Nueva#2026';
    const cuerpo = (extra) => ({ password_actual: 'Vieja#2026', password: valida, confirmacion: valida, ...extra });

    beforeEach(() => {
      Usuario.scope = vi.fn().mockReturnValue(Usuario);
      passwordUtils.isPasswordValid.mockReset();
      passwordUtils.isPasswordValid.mockReturnValue(true);
      passwordUtils.hashPassword.mockReset();
      passwordUtils.hashPassword.mockResolvedValue('hash-nuevo');
    });

    it('exige la contraseña actual (400)', async () => {
      const { promesa, res } = llamar(ctrl.cambiarPassword, { user, body: cuerpo({ password_actual: '' }) });
      await promesa;
      expect(res._status).toBe(400);
      expect(Usuario.findByPk).not.toHaveBeenCalled();
    });

    it('rechaza si falta la confirmación (400)', async () => {
      const { promesa, res } = llamar(ctrl.cambiarPassword, { user, body: cuerpo({ confirmacion: undefined }) });
      await promesa;
      expect(res._status).toBe(400);
      expect(Usuario.findByPk).not.toHaveBeenCalled();
    });

    it('rechaza si las dos contraseñas no coinciden (400)', async () => {
      const { promesa, res } = llamar(ctrl.cambiarPassword, { user, body: cuerpo({ confirmacion: 'Otra#2026' }) });
      await promesa;
      expect(res._status).toBe(400);
      expect(res._json.message).toBe('Las dos contraseñas no coinciden.');
    });

    it('rechaza una contraseña que no cumple la política (400)', async () => {
      passwordUtils.isPasswordValid.mockReturnValue(false);
      const { promesa, res } = llamar(ctrl.cambiarPassword, { user, body: cuerpo({ password: 'abc', confirmacion: 'abc' }) });
      await promesa;
      expect(res._status).toBe(400);
      expect(Usuario.findByPk).not.toHaveBeenCalled();
    });

    it('rechaza una contraseña actual incorrecta con 400 (no 401) y no la cambia', async () => {
      const registro = { password: 'hash-viejo', update: vi.fn() };
      Usuario.findByPk.mockResolvedValue(registro);
      passwordUtils.verifyPassword.mockResolvedValue(false);
      const { promesa, res } = llamar(ctrl.cambiarPassword, { user, body: cuerpo() });
      await promesa;
      expect(res._status).toBe(400);
      expect(res._json.message).toBe('La contraseña actual no es correcta.');
      expect(registro.update).not.toHaveBeenCalled();
    });

    it('guarda el hash del propio usuario y cierra la sesión', async () => {
      const registro = { password: 'hash-viejo', update: vi.fn().mockResolvedValue() };
      Usuario.findByPk.mockResolvedValue(registro);
      passwordUtils.verifyPassword.mockResolvedValue(true);
      const { promesa, res } = llamar(ctrl.cambiarPassword, { user, body: cuerpo({ id: 1 }) });
      await promesa;
      expect(Usuario.findByPk).toHaveBeenCalledWith(7);
      expect(passwordUtils.verifyPassword).toHaveBeenCalledWith('Vieja#2026', 'hash-viejo');
      expect(registro.update).toHaveBeenCalledWith({ password: 'hash-nuevo' });
      expect(res._cookies.apr_sesion.valor).toBeNull();
      expect(res._status ?? 200).toBe(200);
    });
  });

  describe('recuperar contraseña (por email)', () => {
    beforeEach(() => {
      mailer.enviarEmail.mockReset();
      mailer.mailConfigurado.mockReset();
      mailer.enviarEmail.mockResolvedValue({});
      mailer.mailConfigurado.mockReturnValue(true);
    });

    it('recuperar exige identificador', async () => {
      const { promesa, res } = llamar(ctrl.recuperarPassword, { body: {} });
      await promesa;
      expect(res._status).toBe(400);
    });

    it('recuperar responde genérico y no envía si el usuario no existe', async () => {
      Usuario.findOne.mockResolvedValue(null);
      const { promesa, res } = llamar(ctrl.recuperarPassword, { body: { identificador: 'fantasma' } });
      await promesa;
      expect(mailer.enviarEmail).not.toHaveBeenCalled();
      expect(res._json.message).toContain('Si los datos corresponden');
    });

    it('recuperar genera token y envía el email si el usuario tiene email', async () => {
      const registro = { id: 3, activo: true, email: 'u@club.es', nombre: 'Ana', update: vi.fn().mockResolvedValue() };
      Usuario.findOne.mockResolvedValue(registro);
      const { promesa, res } = llamar(ctrl.recuperarPassword, { body: { identificador: 'ana' } });
      await promesa;
      // Se guarda el HASH del token y una caducidad; nunca el token en claro.
      const guardado = registro.update.mock.calls[0][0];
      expect(guardado.reset_token).toMatch(/^[0-9a-f]{64}$/);
      expect(guardado.reset_expira instanceof Date).toBe(true);
      expect(mailer.enviarEmail).toHaveBeenCalledTimes(1);
      expect(mailer.enviarEmail.mock.calls[0][0].to).toBe('u@club.es');
      expect(res._json.message).toContain('Si los datos corresponden');
    });

    it('recuperar no envía (pero responde igual) si no hay email o SMTP', async () => {
      Usuario.findOne.mockResolvedValue({ id: 3, activo: true, email: null, update: vi.fn() });
      const { promesa, res } = llamar(ctrl.recuperarPassword, { body: { identificador: 'ana' } });
      await promesa;
      expect(mailer.enviarEmail).not.toHaveBeenCalled();
      expect(res._json.message).toContain('Si los datos corresponden');
    });

    it('restablecer rechaza un token inválido o caducado', async () => {
      Usuario.findOne.mockResolvedValue(null);
      const { promesa, res } = llamar(ctrl.restablecerPassword, {
        body: { token: 'loquesea', password: 'Nueva#2026', confirmacion: 'Nueva#2026' }
      });
      passwordUtils.isPasswordValid.mockReturnValue(true);
      await promesa;
      expect(res._status).toBe(400);
      expect(res._json.message).toContain('no es válido o ha caducado');
    });

    it('restablecer exige que las contraseñas coincidan', async () => {
      const { promesa, res } = llamar(ctrl.restablecerPassword, {
        body: { token: 'x', password: 'Nueva#2026', confirmacion: 'Otra#2026' }
      });
      await promesa;
      expect(res._status).toBe(400);
      expect(res._json.message).toContain('no coinciden');
    });

    it('restablecer fija la nueva contraseña con un token válido y limpia el token', async () => {
      passwordUtils.isPasswordValid.mockReturnValue(true);
      passwordUtils.hashPassword.mockResolvedValue('hash-nuevo');
      const registro = {
        id: 3, activo: true,
        reset_expira: new Date(Date.now() + 10 * 60 * 1000),
        update: vi.fn().mockResolvedValue()
      };
      Usuario.findOne.mockResolvedValue(registro);
      const { promesa, res } = llamar(ctrl.restablecerPassword, {
        body: { token: 'tok', password: 'Nueva#2026', confirmacion: 'Nueva#2026' }
      });
      await promesa;
      const guardado = registro.update.mock.calls[0][0];
      expect(guardado.password).toBe('hash-nuevo');
      expect(guardado.reset_token).toBeNull();
      expect(guardado.reset_expira).toBeNull();
      expect(res._json.message).toContain('restablecida');
    });

    it('validarTokenReset indica si el token es válido', async () => {
      Usuario.findOne.mockResolvedValue({ activo: true, reset_expira: new Date(Date.now() + 60000) });
      const { promesa, res } = llamar(ctrl.validarTokenReset, { query: { token: 'tok' } });
      await promesa;
      expect(res._json).toEqual({ valido: true });
    });
  });
});
