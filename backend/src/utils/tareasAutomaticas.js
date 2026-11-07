const { Op } = require('sequelize');

/**
 * Registro de las tareas programadas del backend para el panel de Tareas
 * automáticas (Panel Administración): cada ejecución guarda en
 * `tareas_ejecuciones` cuándo fue, cómo terminó y los mensajes que ha escrito
 * en el log (los mismos que salen en `docker logs`). Se conservan 90 días.
 * No pide nada a rfaf.es ni cambia lo que hace cada tarea.
 */
const TAREAS = {
  clasificacion: 'Clasificación (RFAF)',
  liga: 'Actas de la liga (RFAF)',
  informes: 'Informes por email',
  horarios: 'Horarios de los partidos (RFAF)',
  acta: 'Finalizar Acta automático (RFAF)'
};
const CONSERVAR_MS = 90 * 24 * 60 * 60 * 1000;
const MAX_DETALLE = 10000;

const texto = (args) => args.map((a) => (a instanceof Error ? a.message : typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
const esDeSesion = (linea) => /sesi[oó]n/i.test(linea);

/** Estado de una ejecución por sus mensajes: error > sesión caducada > avisos > ok. */
function estadoDe({ error, avisos }) {
  if (error) return 'error';
  if (avisos.some(esDeSesion)) return 'sesion';
  return avisos.length ? 'avisos' : 'ok';
}

/**
 * Ejecuta `fn(log)` y guarda la ejecución. `log` escribe en la consola como
 * siempre y además lo apunta. Con `soloConNovedades`, si la tarea no ha
 * escrito nada no se guarda (el Finalizar Acta automático mira cada 5 minutos).
 * Devuelve lo que devuelva `fn`; si `fn` lanza, vuelve a lanzar.
 */
async function ejecutar(tarea, fn, { soloConNovedades = false, consola = console } = {}) {
  const lineas = [];
  const avisos = [];
  const log = {
    log: (...a) => { consola.log(...a); lineas.push(texto(a)); },
    warn: (...a) => { consola.warn(...a); const l = texto(a); lineas.push(l); avisos.push(l); }
  };
  const inicio = new Date();
  let error = null;
  let resultado;
  try {
    resultado = await fn(log);
  } catch (err) {
    error = err;
    lineas.push(`❌ ${err.message}`);
  }
  if (lineas.length || !soloConNovedades) await guardar({ tarea, inicio, lineas, error, avisos });
  if (error) throw error;
  return resultado;
}

async function guardar({ tarea, inicio, lineas, error, avisos }) {
  try {
    const { TareaEjecucion } = require('../models');
    const resumen = lineas.length ? lineas[lineas.length - 1] : 'Sin novedades.';
    await TareaEjecucion.create({
      tarea, inicio, fin: new Date(),
      estado: estadoDe({ error, avisos }),
      resumen: resumen.slice(0, 255),
      detalle: lineas.join('\n').slice(0, MAX_DETALLE) || null
    });
    await TareaEjecucion.destroy({ where: { inicio: { [Op.lt]: new Date(Date.now() - CONSERVAR_MS) } } });
  } catch (err) {
    // El registro nunca debe frenar la tarea.
    console.warn(`⚠️  Tareas automáticas: no se pudo guardar la ejecución de ${tarea}:`, err.message);
  }
}

module.exports = { ejecutar, estadoDe, TAREAS, CONSERVAR_MS };
