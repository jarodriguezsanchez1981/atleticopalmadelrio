import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'module';
import {
  Temporada, Plantilla, Partido, Clasificacion, Sancion, InformeSemanal, InformeSemanalDestinatario, Usuario, mailer
} from './helpers/models.js';
import { mockReqRes } from './helpers/http.js';

const require = createRequire(import.meta.url);
const informe = require('../src/utils/informeSemanal.js');
const ctrl = require('../src/controllers/informeSemanal.controller.js');

const conJornada = () => {
  Temporada.findOne.mockResolvedValue({ id: 3 });
  Plantilla.findAll.mockResolvedValue([{
    id: 1, codigo_primaria: '1', codigo_grupo: '2', codigo_competicion: '3', categoria: { nombre: 'Benjamin A', orden: 7, id_tipofutbol: 1 }
  }]);
  Partido.findAll.mockResolvedValue([{
    id: 10, id_plantilla: 1, jornada: 7, fecha: new Date('2026-10-31T10:00:00Z'), resultado: '2-1', suspendido: false,
    equipoLocal: { id: 1, nombre: 'A', escudo: 'data:image/png;base64,UEFMTUE=' }, equipoVisitante: { id: 2, nombre: 'B', escudo: null }
  }]);
};
const ANA = { id: 4, nombre: 'Ana', apellidos: 'López', email: 'ana@atleticopalmadelrio.com', activo: true };
const LUIS = { id: 5, nombre: 'Luis', apellidos: 'Pérez', email: 'luis@atleticopalmadelrio.com', activo: true };
const conDestinatarios = (...usuarios) => {
  InformeSemanalDestinatario.findAll.mockResolvedValue(usuarios.map((u) => ({ id_usuario: u.id, usuario: u })));
};
const sinJornada = () => {
  conJornada();
  Partido.findAll.mockResolvedValue([]);
};

async function llamar(fn, req) {
  const { req: r, res, next } = mockReqRes(req);
  await fn(r, res, next);
  return res;
}

describe('Informe semanal · envío', () => {
  const entornoOriginal = process.env.NODE_ENV;
  beforeEach(() => {
    for (const m of [Temporada, Plantilla, Partido, Clasificacion, Sancion, InformeSemanal, InformeSemanalDestinatario, Usuario]) {
      m.findAll.mockReset().mockResolvedValue([]);
      m.findOne.mockReset().mockResolvedValue(null);
      m.create.mockReset().mockImplementation(async (datos) => ({ id: 1, ...datos }));
    }
    mailer.enviarDesde.mockReset().mockResolvedValue({});
    InformeSemanalDestinatario.destroy.mockReset().mockResolvedValue(0);
    InformeSemanalDestinatario.bulkCreate.mockReset().mockResolvedValue([]);
    conDestinatarios(ANA, LUIS);
  });
  afterEach(() => { process.env.NODE_ENV = entornoOriginal; });

  it('enviarInforme envía desde notificaciones a los destinatarios elegidos y guarda el envío', async () => {
    conJornada();
    const fila = await informe.enviarInforme({ lunes: '2026-11-02', automatico: false, idUsuario: 4 });
    expect(mailer.enviarDesde).toHaveBeenCalledWith('notificaciones@atleticopalmadelrio.com', expect.objectContaining({
      to: 'ana@atleticopalmadelrio.com, luis@atleticopalmadelrio.com',
      subject: 'Informe semanal · fin de semana del 30/10/2026',
      // Escudos como imágenes adjuntas (cid): los clientes de correo bloquean las data URL.
      attachments: [{ filename: 'escudo-1.png', content: Buffer.from('PALMA'), contentType: 'image/png', cid: 'escudo-1' }]
    }));
    expect(mailer.enviarDesde.mock.calls[0][1].html).toContain('src="cid:escudo-1"');
    expect(InformeSemanal.create).toHaveBeenCalledWith(expect.objectContaining({
      lunes: '2026-11-02', automatico: false, correcto: true, error: null, id_usuario: 4,
      destinatarios: 'ana@atleticopalmadelrio.com, luis@atleticopalmadelrio.com'
    }));
    expect(fila.correcto).toBe(true);
  });

  it('enviarInforme no envía si no hay destinatarios (o no tienen email o están desactivados) y lo apunta', async () => {
    conJornada();
    conDestinatarios({ ...ANA, email: '' }, { ...LUIS, activo: false });
    const fila = await informe.enviarInforme({ lunes: '2026-11-02', automatico: true });
    expect(mailer.enviarDesde).not.toHaveBeenCalled();
    expect(fila).toMatchObject({ correcto: false, error: 'No hay destinatarios elegidos.', destinatarios: '' });
  });

  it('enviarInforme guarda el error si falla el envío (sin lanzar)', async () => {
    conJornada();
    mailer.enviarDesde.mockRejectedValue(new Error('SMTP caído'));
    const fila = await informe.enviarInforme({ lunes: '2026-11-02', automatico: true });
    expect(fila).toMatchObject({ correcto: false, error: 'SMTP caído', automatico: true, id_usuario: null });
  });

  it('enviarAutomatico no envía sin jornada', async () => {
    sinJornada();
    expect(await informe.enviarAutomatico(new Date('2026-11-02T09:00:00Z'))).toBeNull();
    expect(mailer.enviarDesde).not.toHaveBeenCalled();
  });

  it('enviarAutomatico no envía si ese fin de semana ya se envió bien', async () => {
    conJornada();
    InformeSemanal.findOne.mockResolvedValue({ id: 7, correcto: true });
    expect(await informe.enviarAutomatico(new Date('2026-11-02T09:00:00Z'))).toBeNull();
    expect(InformeSemanal.findOne).toHaveBeenCalledWith(expect.objectContaining({ where: { tipo: 'semanal', lunes: '2026-11-02', correcto: true } }));
    expect(mailer.enviarDesde).not.toHaveBeenCalled();
  });

  it('informe de Sanciones: desde sanciones@, a sus destinatarios, con su tipo', async () => {
    conJornada();
    Plantilla.findAll.mockResolvedValue([{
      id: 1, codigo_primaria: '1', codigo_grupo: '2', codigo_competicion: '3', categoria: { nombre: 'Infantil A', orden: 14, id_tipofutbol: 2 }
    }]);
    const fila = await informe.enviarInforme({ lunes: '2026-11-02', automatico: true, tipo: 'sanciones' });
    expect(InformeSemanalDestinatario.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: { tipo: 'sanciones' } }));
    expect(mailer.enviarDesde).toHaveBeenCalledWith('sanciones@atleticopalmadelrio.com', expect.objectContaining({
      subject: 'Informe de sanciones · fin de semana del 30/10/2026'
    }));
    expect(fila).toMatchObject({ tipo: 'sanciones', correcto: true });
  });

  it('enviarAutomatico envía como automático', async () => {
    conJornada();
    await informe.enviarAutomatico(new Date('2026-11-02T09:00:00Z'));
    expect(InformeSemanal.create).toHaveBeenCalledWith(expect.objectContaining({ lunes: '2026-11-02', automatico: true, correcto: true }));
  });

  it('vista: 400 si la fecha no es un lunes', async () => {
    const res = await llamar(ctrl.vista, { query: { lunes: '2026-11-03' } });
    expect(res._status).toBe(400);
  });

  it('vista: datos del email, destinatarios elegidos, usuarios con email y puedeEnviar según el entorno', async () => {
    conJornada();
    Usuario.findAll.mockResolvedValue([ANA, LUIS, { id: 6, nombre: 'Sin', apellidos: 'Email', email: '  ', activo: true }]);
    conDestinatarios(ANA);
    process.env.NODE_ENV = 'development';
    const res = await llamar(ctrl.vista, { query: { lunes: '2026-11-02' } });
    expect(res._json).toMatchObject({
      lunes: '2026-11-02', remitente: 'notificaciones@atleticopalmadelrio.com', hayJornada: true, puedeEnviar: false,
      asunto: 'Informe semanal · fin de semana del 30/10/2026',
      destinatarios: [{ id: 4, nombre: 'Ana López', email: 'ana@atleticopalmadelrio.com' }],
      usuarios: [
        { id: 4, nombre: 'Ana López', email: 'ana@atleticopalmadelrio.com' },
        { id: 5, nombre: 'Luis Pérez', email: 'luis@atleticopalmadelrio.com' }
      ]
    });
    expect(res._json.html).toContain('Benjamin A');
    process.env.NODE_ENV = 'production';
    expect((await llamar(ctrl.vista, { query: { lunes: '2026-11-02' } }))._json.puedeEnviar).toBe(true);
  });

  it('historial: los últimos envíos, del más reciente al más antiguo', async () => {
    InformeSemanal.findAll.mockResolvedValue([{ id: 2 }, { id: 1 }]);
    const res = await llamar(ctrl.historial, {});
    expect(res._json).toEqual([{ id: 2 }, { id: 1 }]);
    expect(InformeSemanal.findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: { tipo: 'semanal' }, order: [['created_at', 'DESC'], ['id', 'DESC']], limit: 50
    }));
  });

  it('enviar: 403 en local', async () => {
    process.env.NODE_ENV = 'development';
    conJornada();
    const res = await llamar(ctrl.enviar, { body: { lunes: '2026-11-02' }, user: { id: 4 } });
    expect(res._status).toBe(403);
    expect(res._json.message).toBe('En local no se envían emails.');
    expect(mailer.enviarDesde).not.toHaveBeenCalled();
  });

  it('enviar: 400 sin jornada o con una fecha que no es lunes', async () => {
    process.env.NODE_ENV = 'production';
    sinJornada();
    let res = await llamar(ctrl.enviar, { body: { lunes: '2026-11-02' }, user: { id: 4 } });
    expect(res._status).toBe(400);
    expect(res._json.message).toBe('Ese fin de semana no hubo jornada.');
    res = await llamar(ctrl.enviar, { body: { lunes: 'x' }, user: { id: 4 } });
    expect(res._status).toBe(400);
  });

  it('enviar: 400 si no hay destinatarios elegidos', async () => {
    process.env.NODE_ENV = 'production';
    conJornada();
    conDestinatarios();
    const res = await llamar(ctrl.enviar, { body: { lunes: '2026-11-02' }, user: { id: 4 } });
    expect(res._status).toBe(400);
    expect(res._json.message).toBe('Elige al menos un destinatario.');
  });

  it('guardarDestinatarios: reemplaza la lista con usuarios activos con email', async () => {
    Usuario.findAll.mockResolvedValue([ANA, LUIS]);
    const res = await llamar(ctrl.guardarDestinatarios, { body: { ids: [5, 4, 5] } });
    expect(res._status).toBe(200);
    expect(InformeSemanalDestinatario.destroy).toHaveBeenCalledWith(expect.objectContaining({ where: { tipo: 'semanal' } }));
    expect(InformeSemanalDestinatario.bulkCreate).toHaveBeenCalledWith(
      [{ tipo: 'semanal', id_usuario: 5 }, { tipo: 'semanal', id_usuario: 4 }], expect.anything());
  });

  it('guardarDestinatarios: 400 si algún usuario no existe o no tiene email', async () => {
    Usuario.findAll.mockResolvedValue([ANA]);
    let res = await llamar(ctrl.guardarDestinatarios, { body: { ids: [4, 99] } });
    expect(res._status).toBe(400);
    expect(res._json.message).toBe('Solo se pueden elegir usuarios activos con email.');
    res = await llamar(ctrl.guardarDestinatarios, { body: { ids: 'x' } });
    expect(res._status).toBe(400);
    expect(InformeSemanalDestinatario.bulkCreate).not.toHaveBeenCalled();
  });

  it('guardarDestinatarios: lista vacía permitida (no se enviará nada)', async () => {
    const res = await llamar(ctrl.guardarDestinatarios, { body: { ids: [] } });
    expect(res._status).toBe(200);
    expect(InformeSemanalDestinatario.bulkCreate).not.toHaveBeenCalled();
  });

  it('controlador de Sanciones: remitente sanciones@ y destinatarios e historial de su tipo', async () => {
    conJornada();
    Plantilla.findAll.mockResolvedValue([{
      id: 1, codigo_primaria: '1', codigo_grupo: '2', codigo_competicion: '3', categoria: { nombre: 'Infantil A', orden: 14, id_tipofutbol: 2 }
    }]);
    const sanciones = ctrl.crearControlador('sanciones');
    const res = await llamar(sanciones.vista, { query: { lunes: '2026-11-02' } });
    expect(res._json).toMatchObject({ remitente: 'sanciones@atleticopalmadelrio.com', asunto: 'Informe de sanciones · fin de semana del 30/10/2026' });
    expect(InformeSemanalDestinatario.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: { tipo: 'sanciones' } }));
    await llamar(sanciones.historial, {});
    expect(InformeSemanal.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: { tipo: 'sanciones' } }));
  });

  it('enviar: en producción envía a mano con el usuario', async () => {
    process.env.NODE_ENV = 'production';
    conJornada();
    const res = await llamar(ctrl.enviar, { body: { lunes: '2026-11-02' }, user: { id: 4 } });
    expect(res._status).toBe(200);
    expect(res._json).toMatchObject({ lunes: '2026-11-02', automatico: false, correcto: true, id_usuario: 4 });
  });
});
