/**
 * Envío de correo con nodemailer. La configuración se lee de variables de
 * entorno (nunca se versiona el secreto), igual que el resto de secretos:
 *
 *   SMTP_HOST      servidor SMTP (p. ej. smtp.gmail.com)
 *   SMTP_PORT      puerto (465 TLS implícito, 587 STARTTLS)        [opcional, 587]
 *   SMTP_SECURE    'true' para conexión TLS directa (puerto 465)   [opcional, auto]
 *   SMTP_USER      usuario del buzón
 *   SMTP_PASS      contraseña del buzón (o app password)
 *   SMTP_FROM      remitente, p. ej. "Atlético Palma del Río <no-reply@...>" [opcional, = SMTP_USER]
 *
 * Si no está configurado, `mailConfigurado()` es false y `enviarEmail` lanza:
 * quien llama decide qué hacer (p. ej. recuperar contraseña responde igual para
 * no revelar si el envío funciona o no).
 */
require('../config/env');

let transporterCache = null;

/** ¿Hay configuración mínima de SMTP (host + usuario + contraseña)? */
function mailConfigurado() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransporter() {
  if (!mailConfigurado()) return null;
  if (transporterCache) return transporterCache;
  const nodemailer = require('nodemailer');
  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = process.env.SMTP_SECURE
    ? process.env.SMTP_SECURE === 'true'
    : port === 465; // 465 = TLS directo; 587 = STARTTLS
  transporterCache = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
  return transporterCache;
}

/** Remitente a usar (SMTP_FROM si está, si no el propio usuario SMTP). */
function remitente() {
  return process.env.SMTP_FROM || process.env.SMTP_USER;
}

/**
 * Envía un correo. Lanza si SMTP no está configurado o si falla el envío.
 * @param {{to:string, subject:string, html:string, text?:string}} opciones
 */
async function enviarEmail({ to, subject, html, text }) {
  const transporter = getTransporter();
  if (!transporter) throw new Error('SMTP no está configurado (faltan SMTP_HOST/SMTP_USER/SMTP_PASS).');
  return transporter.sendMail({ from: remitente(), to, subject, html, text });
}

module.exports = { enviarEmail, mailConfigurado, remitente };
