import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Usuario, mailer } from './helpers/models.js';
import aviso from '../src/utils/avisoSesionRfaf.js';

const ERROR_SESION = 'RFAF ha devuelto el acta vacía: la sesión de RFAF no es válida, hay que poner una JSESSIONID nueva en RFAF_COOKIE.';
const log = { log: vi.fn(), warn: vi.fn() };

describe('Aviso de sesión RFAF caducada · avisoSesionRfaf', () => {
  const entornoOriginal = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.NODE_ENV = 'production';
    delete process.env.SEGURIDAD_AVISO_EMAIL;
    aviso.sesionValida();
    vi.useRealTimers();
    mailer.enviarEmail.mockReset().mockResolvedValue({});
    mailer.mailConfigurado.mockReset().mockResolvedValue(true);
    Usuario.findOne.mockReset().mockResolvedValue({ email: 'admin@club.es' });
  });

  afterEach(() => {
    process.env.NODE_ENV = entornoOriginal;
    vi.useRealTimers();
  });

  it('reconoce solo el error de sesión caducada', () => {
    expect(aviso.esErrorDeSesion(ERROR_SESION)).toBe(true);
    expect(aviso.esErrorDeSesion('RFAF respondió 500 al pedir el acta.')).toBe(false);
    expect(aviso.esErrorDeSesion(undefined)).toBe(false);
  });

  it('envía el aviso al email del usuario admin', async () => {
    expect(await aviso.avisarSiCaducada(ERROR_SESION, log)).toBe(true);
    expect(mailer.enviarEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'admin@club.es',
      subject: expect.stringContaining('sesión ha caducado')
    }));
  });

  it('no avisa de otros errores ni fuera de producción', async () => {
    expect(await aviso.avisarSiCaducada('RFAF respondió 500 al pedir el acta.', log)).toBe(false);
    process.env.NODE_ENV = 'development';
    expect(await aviso.avisarSiCaducada(ERROR_SESION, log)).toBe(false);
    expect(mailer.enviarEmail).not.toHaveBeenCalled();
  });

  it('avisa como mucho una vez cada 24 horas mientras siga caducada', async () => {
    vi.useFakeTimers();
    await aviso.avisarSiCaducada(ERROR_SESION, log);
    vi.advanceTimersByTime(aviso.ESPERA_MS - 1000);
    expect(await aviso.avisarSiCaducada(ERROR_SESION, log)).toBe(false);
    vi.advanceTimersByTime(2000);
    expect(await aviso.avisarSiCaducada(ERROR_SESION, log)).toBe(true);
    expect(mailer.enviarEmail).toHaveBeenCalledTimes(2);
  });

  it('si la sesión vuelve a funcionar, el siguiente fallo avisa otra vez', async () => {
    await aviso.avisarSiCaducada(ERROR_SESION, log);
    aviso.sesionValida();
    expect(await aviso.avisarSiCaducada(ERROR_SESION, log)).toBe(true);
  });

  it('sin correo configurado o sin email del admin no envía ni lanza', async () => {
    mailer.mailConfigurado.mockResolvedValue(false);
    expect(await aviso.avisarSiCaducada(ERROR_SESION, log)).toBe(false);
    aviso.sesionValida();
    mailer.mailConfigurado.mockResolvedValue(true);
    Usuario.findOne.mockResolvedValue({ email: '' });
    expect(await aviso.avisarSiCaducada(ERROR_SESION, log)).toBe(false);
    expect(mailer.enviarEmail).not.toHaveBeenCalled();
  });

  it('un fallo al enviar no lanza', async () => {
    mailer.enviarEmail.mockRejectedValue(new Error('SMTP caído'));
    expect(await aviso.avisarSiCaducada(ERROR_SESION, log)).toBe(false);
  });
});
