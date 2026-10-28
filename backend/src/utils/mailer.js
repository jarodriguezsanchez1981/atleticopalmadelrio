/**
 * Envío de correo con nodemailer.
 *
 * La configuración a usar se resuelve en este orden:
 *   1) la cuenta de correo marcada como ACTIVA en la BD (la primera, si hay varias) (sección "Correos" de
 *      Administración); su contraseña se guarda cifrada con AES.
 *   2) si no hay cuenta activa, las variables de entorno SMTP_* (respaldo):
 *        SMTP_HOST, SMTP_PORT (587), SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM
 *
 * Si no hay ninguna de las dos, `mailConfigurado()` es false y `enviarEmail`
 * lanza: quien llama decide qué hacer (p. ej. recuperar contraseña responde
 * igual para no revelar si el envío funciona o no).
 */
const crypto = require('crypto');
require('../config/env');
const aes = require('./aesCrypto');

let nodemailerCache = null;
const transportes = new Map();

function getNodemailer() {
  if (!nodemailerCache) nodemailerCache = require('nodemailer');
  return nodemailerCache;
}

/** Config SMTP desde variables de entorno, o null si no está completa. */
function configDesdeEnv() {
  if (!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)) return null;
  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465;
  return {
    host: process.env.SMTP_HOST,
    port,
    secure,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM || process.env.SMTP_USER
  };
}

/** Config SMTP de la cuenta activa en la BD (la de menor id si hay varias), o null. */
async function configActivaBD() {
  try {
    const { CuentaCorreo } = require('../models');
    const cuenta = await CuentaCorreo.scope('conPassword').findOne({ where: { activa: true }, order: [['id', 'ASC']] });
    if (!cuenta || !cuenta.smtp_host || !cuenta.smtp_user || !cuenta.smtp_password) return null;
    return {
      host: cuenta.smtp_host,
      port: Number(cuenta.smtp_port) || 587,
      secure: !!cuenta.smtp_secure,
      user: cuenta.smtp_user,
      pass: aes.decrypt(cuenta.smtp_password),
      from: cuenta.etiqueta ? `${cuenta.etiqueta} <${cuenta.email}>` : cuenta.email,
      firma: cuenta.firma_html || null
    };
  } catch (err) {
    console.error('Mailer: no se pudo leer la cuenta de correo activa:', err.message);
    return null;
  }
}

/** Config a usar: cuenta activa en BD y, si no hay, variables de entorno. */
async function resolverConfig() {
  return (await configActivaBD()) || configDesdeEnv();
}

/** Transporte cacheado por configuración (incluye la contraseña en la clave,
 * para que al cambiarla se use uno nuevo). */
function transporteDe(cfg) {
  const clave = crypto.createHash('sha1')
    .update([cfg.host, cfg.port, cfg.secure, cfg.user, cfg.pass].join('|'))
    .digest('hex');
  if (transportes.has(clave)) return transportes.get(clave);
  const t = getNodemailer().createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass }
  });
  transportes.set(clave, t);
  return t;
}

/** Añade la firma de la cuenta (sección Correos) al final del HTML del correo. */
function conFirma(html, firma) {
  if (!html || !firma) return html;
  return `${html}<br><br>${firma}`;
}

/** ¿Hay alguna configuración de correo disponible (BD activa o entorno)? */
async function mailConfigurado() {
  return !!(await resolverConfig());
}

/** Envía un correo con la configuración resuelta. Lanza si no hay ninguna. */
async function enviarEmail({ to, subject, html, text }) {
  const cfg = await resolverConfig();
  if (!cfg) {
    throw new Error('No hay cuenta de correo configurada (ni cuenta activa en BD ni SMTP_* en el entorno).');
  }
  return transporteDe(cfg).sendMail({ from: cfg.from, to, subject, html: conFirma(html, cfg.firma), text });
}

/** Envía desde la cuenta de "Correos" con ese email (esté o no activa). Si no
 * está registrada (o le falta la configuración SMTP) lanza un error con
 * `sinCuenta = true`. */
async function enviarDesde(email, { to, subject, html, text }) {
  const { CuentaCorreo } = require('../models');
  const cuenta = await CuentaCorreo.scope('conPassword').findOne({ where: { email } });
  if (!cuenta || !cuenta.smtp_host || !cuenta.smtp_user || !cuenta.smtp_password) {
    const err = new Error(`La cuenta de correo ${email} no está registrada en Correos.`);
    err.sinCuenta = true;
    throw err;
  }
  const cfg = {
    host: cuenta.smtp_host,
    port: Number(cuenta.smtp_port) || 587,
    secure: !!cuenta.smtp_secure,
    user: cuenta.smtp_user,
    pass: aes.decrypt(cuenta.smtp_password),
    from: cuenta.etiqueta ? `${cuenta.etiqueta} <${cuenta.email}>` : cuenta.email
  };
  return transporteDe(cfg).sendMail({ from: cfg.from, to, subject, html: conFirma(html, cuenta.firma_html), text });
}

/** Envía con una configuración explícita (para "probar" una cuenta concreta). */
async function enviarConConfig(cfg, { to, subject, html, text }) {
  return transporteDe(cfg).sendMail({ from: cfg.from || cfg.user, to, subject, html, text });
}

/** Comprueba la configuración (conexión e inicio de sesión SMTP) sin enviar
 * ningún correo. Lanza con el error del servidor si no funciona. */
async function verificarConfig(cfg) {
  return transporteDe(cfg).verify();
}

module.exports = { enviarEmail, enviarDesde, conFirma, enviarConConfig, verificarConfig, mailConfigurado, resolverConfig };
