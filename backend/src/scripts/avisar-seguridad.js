/**
 * Aviso de seguridad por correo al administrador.
 *
 * Lo invoca el cron del EC2 (scripts/comprobar-parches-docker.sh) justo después
 * de guardar un informe nuevo en la tabla `informes_seguridad`. Si el último
 * informe tiene algo que revisar (actualizaciones de imagen pendientes o
 * vulnerabilidades) Y ha CAMBIADO respecto al informe anterior, envía un correo
 * al administrador. Así no se repite el mismo aviso cada 2 días por los CVEs
 * residuales que no tienen parche (p. ej. el CRITICAL de mysql).
 *
 * Destinatario: el email del usuario `admin` (o la variable de entorno
 * SEGURIDAD_AVISO_EMAIL si se define). Envío con el mailer (cuenta activa de la
 * sección Correos o, en su defecto, las variables SMTP_* del entorno).
 *
 * Uso:  node src/scripts/avisar-seguridad.js [--forzar]
 *   --forzar  envía aunque no haya cambiado (para probar la configuración).
 */
const { InformeSeguridad, Usuario, sequelize } = require('../models');
const { enviarEmail, mailConfigurado } = require('../utils/mailer');

const forzar = process.argv.includes('--forzar');

function firma(inf) {
  return [inf.hay_actualizaciones, inf.total_high, inf.total_critical, inf.resumen || ''].join('|');
}

function hayPendiente(inf) {
  return !!(inf.hay_actualizaciones || (inf.total_high || 0) > 0 || (inf.total_critical || 0) > 0);
}

function fechaLegible(fecha) {
  try {
    return new Date(fecha).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return String(fecha);
  }
}

function cuerpoTexto(inf) {
  const vulns = (inf.total_critical || 0) + (inf.total_high || 0);
  const lineas = [
    'Aviso de seguridad de la intranet del Atlético Palma del Río.',
    '',
    `Comprobación: ${fechaLegible(inf.fecha)}`,
    `Actualizaciones de imagen pendientes: ${inf.hay_actualizaciones ? 'sí' : 'no'}`,
    `Vulnerabilidades: ${vulns} (CRITICAL: ${inf.total_critical || 0}, HIGH: ${inf.total_high || 0})`,
    ''
  ];
  if (inf.resumen) {
    lineas.push('Detalle:');
    inf.resumen.split('|').forEach((l) => lineas.push(`  - ${l.trim()}`));
    lineas.push('');
  }
  lineas.push('Revisa el detalle completo en el EC2: ~/seguridad-docker/informe_*.log');
  return lineas.join('\n');
}

function cuerpoHtml(inf) {
  const vulns = (inf.total_critical || 0) + (inf.total_high || 0);
  const items = (inf.resumen || '').split('|').filter(Boolean)
    .map((l) => `<li>${l.trim().replace(/</g, '&lt;')}</li>`).join('');
  return (
    `<div style="font-family:Arial,Helvetica,sans-serif;color:#333;max-width:560px;">` +
    `<h2 style="color:#0B3D2E;font-size:18px;">Aviso de seguridad — Atlético Palma del Río</h2>` +
    `<p>El chequeo automático de parches/vulnerabilidades ha detectado algo que revisar:</p>` +
    `<ul>` +
    `<li>Comprobación: <strong>${fechaLegible(inf.fecha)}</strong></li>` +
    `<li>Actualizaciones de imagen pendientes: <strong>${inf.hay_actualizaciones ? 'sí' : 'no'}</strong></li>` +
    `<li>Vulnerabilidades: <strong>${vulns}</strong> (CRITICAL: ${inf.total_critical || 0}, HIGH: ${inf.total_high || 0})</li>` +
    `</ul>` +
    (items ? `<p style="margin-bottom:4px;">Detalle:</p><ul>${items}</ul>` : '') +
    `<p style="font-size:13px;color:#777;">Detalle completo en el servidor: <code>~/seguridad-docker/informe_*.log</code>.</p>` +
    `</div>`
  );
}

async function main() {
  const informes = await InformeSeguridad.findAll({
    order: [['fecha', 'DESC'], ['id', 'DESC']],
    limit: 2
  });
  const ultimo = informes[0];
  const anterior = informes[1];

  if (!ultimo) {
    console.log('avisar-seguridad: no hay informes todavía; nada que enviar.');
    return;
  }

  const pendiente = hayPendiente(ultimo);
  const cambiado = !anterior || firma(ultimo) !== firma(anterior);

  if (!forzar && !(pendiente && cambiado)) {
    console.log(`avisar-seguridad: sin novedades (pendiente=${pendiente}, cambiado=${cambiado}); no se envía.`);
    return;
  }

  if (!(await mailConfigurado())) {
    console.warn('avisar-seguridad: no hay correo configurado (cuenta activa o SMTP_*); no se envía.');
    return;
  }

  const destino = (process.env.SEGURIDAD_AVISO_EMAIL || '').trim()
    || (await Usuario.findOne({ where: { usuario: 'admin' } }))?.email
    || '';
  if (!destino) {
    console.warn('avisar-seguridad: el usuario admin no tiene email y no hay SEGURIDAD_AVISO_EMAIL; no se envía.');
    return;
  }

  await enviarEmail({
    to: destino,
    subject: 'Aviso de seguridad — Atlético Palma del Río',
    text: cuerpoTexto(ultimo),
    html: cuerpoHtml(ultimo)
  });
  console.log(`avisar-seguridad: aviso enviado a ${destino}.`);
}

main()
  .catch((err) => {
    console.error('avisar-seguridad: error:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try { await sequelize.close(); } catch { /* ignorar */ }
  });
