/**
 * Aviso por email al administrador cuando la sesión de RFAF (RFAF_COOKIE) ha
 * caducado, para que ponga una JSESSIONID nueva (skill /rfaf-cookie) solo
 * cuando haga falta. No pide nada a rfaf.es: lo llama utils/rfafActa.js al
 * ver el error de sesión de los scripts. Un aviso como mucho cada 24 horas
 * mientras siga caducada; en cuanto una petición funciona, se olvida. Solo en
 * producción. Destino: SEGURIDAD_AVISO_EMAIL o el email del usuario `admin`.
 */
const ESPERA_MS = 24 * 60 * 60 * 1000;

let ultimoAviso = null;

const esErrorDeSesion = (mensaje) => /sesi[oó]n de RFAF no es v[aá]lida/i.test(String(mensaje || ''));

const ASUNTO = 'RFAF: la sesión ha caducado — Atlético Palma del Río';
const TEXTO =
  'La sesión de rfaf.es que usa la intranet (RFAF_COOKIE) ha caducado.\n\n' +
  'Mientras no se ponga una nueva no funcionan «Finalizar Acta», la copia de la clasificación ' +
  'ni la de las actas de la liga de Senior A.\n\n' +
  'Para arreglarlo: abre rfaf.es en el navegador, copia la cookie JSESSIONID y pégala en Claude Code ' +
  '(skill /rfaf-cookie).\n\nNo se repetirá este aviso hasta dentro de 24 horas si sigue caducada.';
const HTML =
  '<p>La sesión de <strong>rfaf.es</strong> que usa la intranet (<code>RFAF_COOKIE</code>) ha caducado.</p>' +
  '<p>Mientras no se ponga una nueva no funcionan <strong>Finalizar Acta</strong>, la copia de la ' +
  'clasificación ni la de las actas de la liga de Senior A.</p>' +
  '<p>Para arreglarlo: abre rfaf.es en el navegador, copia la cookie <code>JSESSIONID</code> y pégala ' +
  'en Claude Code (skill <code>/rfaf-cookie</code>).</p>' +
  '<p style="color:#777777;">No se repetirá este aviso hasta dentro de 24 horas si sigue caducada.</p>';

/** La sesión ha vuelto a funcionar: el próximo fallo de sesión avisa otra vez. */
function sesionValida() {
  ultimoAviso = null;
}

/** Si `mensaje` es un error de sesión caducada, avisa al administrador (como
 * mucho una vez cada 24 horas). Nunca lanza: devuelve true si ha enviado. */
async function avisarSiCaducada(mensaje, log = console) {
  if (!esErrorDeSesion(mensaje) || process.env.NODE_ENV !== 'production') return false;
  if (ultimoAviso && Date.now() - ultimoAviso < ESPERA_MS) return false;
  ultimoAviso = Date.now();
  try {
    const { mailConfigurado, enviarEmail } = require('./mailer');
    const { Usuario } = require('../models');
    if (!(await mailConfigurado())) {
      log.warn('⚠️  RFAF: sesión caducada, pero no hay correo configurado para avisar.');
      return false;
    }
    const destino = (process.env.SEGURIDAD_AVISO_EMAIL || '').trim()
      || (await Usuario.findOne({ where: { usuario: 'admin' } }))?.email
      || '';
    if (!destino) {
      log.warn('⚠️  RFAF: sesión caducada, pero el usuario admin no tiene email.');
      return false;
    }
    await enviarEmail({ to: destino, subject: ASUNTO, text: TEXTO, html: HTML });
    log.log(`📧 RFAF: aviso de sesión caducada enviado a ${destino}.`);
    return true;
  } catch (err) {
    log.warn('⚠️  RFAF: no se pudo enviar el aviso de sesión caducada:', err.message);
    return false;
  }
}

module.exports = { avisarSiCaducada, sesionValida, esErrorDeSesion, ESPERA_MS };
