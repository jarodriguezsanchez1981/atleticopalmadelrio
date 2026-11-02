const { InformeSemanal, InformeSemanalDestinatario, Usuario, sequelize } = require('../models');
const informe = require('../utils/informeSemanal');

// Sección "Informes → Semanal": vista previa del email semanal, historial de
// envíos y envío manual. El envío automático de los lunes está en
// utils/informeSemanalAutomatico.js. En local nunca se envía nada: la BD local
// puede ser copia de producción, con las cuentas de correo reales.

const enProduccion = () => process.env.NODE_ENV === 'production';

async function vista(req, res, next) {
  try {
    const lunes = req.query.lunes || informe.ultimoLunes();
    if (!informe.esLunes(lunes)) return res.status(400).json({ message: 'Indica el lunes del fin de semana (AAAA-MM-DD).' });
    const datos = await informe.construirInforme(lunes);
    const { asunto, html } = informe.htmlInforme(datos);
    const [destinatarios, usuarios] = await Promise.all([informe.listaDestinatarios(), informe.usuariosConEmail()]);
    res.json({
      lunes,
      remitente: informe.REMITENTE,
      destinatarios,
      usuarios,
      asunto,
      html,
      hayJornada: datos.hayJornada,
      puedeEnviar: enProduccion()
    });
  } catch (err) { next(err); }
}

async function historial(req, res, next) {
  try {
    const envios = await InformeSemanal.findAll({
      include: [{ model: Usuario, as: 'usuario', attributes: ['id', 'nombre'] }],
      order: [['created_at', 'DESC'], ['id', 'DESC']],
      limit: 50
    });
    res.json(envios);
  } catch (err) { next(err); }
}

async function enviar(req, res, next) {
  try {
    if (!enProduccion()) return res.status(403).json({ message: 'En local no se envían emails.' });
    const { lunes } = req.body || {};
    if (!informe.esLunes(lunes)) return res.status(400).json({ message: 'Indica el lunes del fin de semana (AAAA-MM-DD).' });
    if (!(await informe.construirInforme(lunes)).hayJornada) {
      return res.status(400).json({ message: 'Ese fin de semana no hubo jornada.' });
    }
    if (!(await informe.listaDestinatarios()).length) {
      return res.status(400).json({ message: 'Elige al menos un destinatario.' });
    }
    const fila = await informe.enviarInforme({ lunes, automatico: false, idUsuario: req.user?.id ?? null });
    res.json(fila);
  } catch (err) { next(err); }
}

/** Reemplaza los destinatarios por los usuarios `ids` (activos y con email). */
async function guardarDestinatarios(req, res, next) {
  try {
    const { ids } = req.body || {};
    if (!Array.isArray(ids) || ids.some((id) => !Number.isInteger(Number(id)) || Number(id) <= 0)) {
      return res.status(400).json({ message: 'Indica los usuarios destinatarios.' });
    }
    const elegidos = [...new Set(ids.map(Number))];
    if (elegidos.length) {
      const validos = new Set((await informe.usuariosConEmail()).map((u) => u.id));
      if (elegidos.some((id) => !validos.has(id))) {
        return res.status(400).json({ message: 'Solo se pueden elegir usuarios activos con email.' });
      }
    }
    await sequelize.transaction(async (transaction) => {
      await InformeSemanalDestinatario.destroy({ where: {}, transaction });
      if (elegidos.length) {
        await InformeSemanalDestinatario.bulkCreate(elegidos.map((id) => ({ id_usuario: id })), { transaction });
      }
    });
    res.json(await informe.listaDestinatarios());
  } catch (err) { next(err); }
}

module.exports = { vista, historial, enviar, guardarDestinatarios };
