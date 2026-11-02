const { proximaEjecucion } = require('./clasificacionAutomatica');

/**
 * Envío automático del informe semanal (Informes → Semanal): los lunes a las
 * 10:00 (hora española), una hora después de la copia de la clasificación.
 * Solo en producción y solo a esa hora: al arrancar el backend no se envía
 * nada (un reinicio nunca manda un email inesperado). Si ese fin de semana no
 * hubo jornada o ya se envió bien, no sale (utils/informeSemanal.js).
 */
const HORA_ENVIO = 10;
const LUNES = 1;
const MAX_ESPERA_MS = 6 * 60 * 60 * 1000; // setTimeout no admite esperas muy largas; se recalcula

let temporizador = null;

function programar() {
  const espera = proximaEjecucion(HORA_ENVIO, new Date(), LUNES) - Date.now() + 1000;
  temporizador = setTimeout(() => {
    if (espera <= MAX_ESPERA_MS) {
      require('./informeSemanal').enviarAutomatico()
        .then((fila) => {
          if (fila && !fila.correcto) console.warn('⚠️  Informe semanal: no se pudo enviar:', fila.error);
          else if (fila) console.log('📧 Informe semanal enviado.');
        })
        .catch((err) => console.warn('⚠️  Informe semanal:', err.message))
        .finally(programar);
    } else {
      programar();
    }
  }, Math.min(espera, MAX_ESPERA_MS));
  temporizador.unref?.();
}

/** Arranca el envío automático (server.js). */
function iniciar() {
  if (temporizador || process.env.NODE_ENV !== 'production') return;
  programar();
}

module.exports = { iniciar, HORA_ENVIO };
