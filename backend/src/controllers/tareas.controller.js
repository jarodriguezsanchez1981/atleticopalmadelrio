const { TareaEjecucion, InformeSeguridad } = require('../models');
const { TAREAS } = require('../utils/tareasAutomaticas');
const { proximaEjecucion } = require('../utils/clasificacionAutomatica');
const { HORA_ACTUALIZACION, DIA_ACTUALIZACION } = require('./clasificacion.controller');
const { HORA_ENVIO } = require('../utils/informeSemanalAutomatico');
const horarios = require('../utils/horariosPartidos');
const actaAutomatica = require('../utils/actaAutomatica');
const { estadoSesion } = require('../utils/avisoSesionRfaf');

// Parches de Docker: el cron del EC2 los viernes a las 12:00 (hora española).
const HORA_PARCHES = 12;
const VIERNES = 5;
const LUNES = 1;
const MAX_EJECUCIONES = 100;
// Copia diaria del contenedor de copias (BACKUP_HOUR_UTC en docker-compose.yml).
const HORA_COPIA_UTC = 3;

/** Próxima copia diaria (a las HORA_COPIA_UTC en UTC). */
function proximaCopia(ahora) {
  const d = new Date(ahora);
  d.setUTCHours(HORA_COPIA_UTC, 0, 0, 0);
  if (d <= ahora) d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

/** Cuándo se ejecuta cada tarea (texto para el panel). */
const CUANDO = {
  clasificacion: 'Lunes a las 09:00 y al arrancar el backend',
  liga: 'Lunes tras la clasificación y, con atrasos, cada 5 minutos',
  informes: 'Lunes a las 10:00',
  horarios: 'Martes, miércoles y jueves a las 13:00',
  acta: '1 h después de terminar cada partido de liga (y 3 h si el acta no estaba publicada)',
  copias: 'Todos los días a las 03:00 UTC, con prueba de restauración los domingos; el binlog va a S3 cada 15 minutos',
  parches: 'Viernes a las 12:00 (cron del servidor)'
};

/** Último informe de parches como una ejecución más. */
function ejecucionParches(informe) {
  if (!informe) return null;
  const pendiente = informe.hay_actualizaciones || informe.hay_vulnerabilidades;
  const partes = [];
  if (informe.hay_actualizaciones) partes.push('hay actualizaciones pendientes');
  if (informe.hay_vulnerabilidades) partes.push(`${informe.total_critical} CRITICAL y ${informe.total_high} HIGH sin parche`);
  return {
    tarea: 'parches', inicio: informe.fecha, fin: informe.fecha,
    estado: pendiente ? 'avisos' : 'ok',
    resumen: partes.length ? `Parches aplicados; ${partes.join(', ')}.` : 'Parches aplicados; nada pendiente.',
    detalle: informe.resumen || null
  };
}

/**
 * Panel de tareas automáticas: por cada tarea, cuándo se ejecuta, la próxima
 * vez y cómo terminó la última; el estado de la sesión de RFAF (sin pedir nada
 * a rfaf.es) y las últimas ejecuciones con sus mensajes.
 */
async function estado(req, res, next) {
  try {
    const ahora = new Date();
    const ultimas = await Promise.all(Object.keys(TAREAS).map((tarea) =>
      TareaEjecucion.findOne({ where: { tarea }, order: [['inicio', 'DESC'], ['id', 'DESC']] })));
    const informe = await InformeSeguridad.findOne({ order: [['fecha', 'DESC'], ['id', 'DESC']] });
    const lecturaActa = await actaAutomatica.proximaLectura(ahora);
    const lunes = proximaEjecucion(HORA_ACTUALIZACION, ahora, DIA_ACTUALIZACION);
    const proximas = {
      clasificacion: { fecha: lunes },
      liga: { fecha: lunes },
      informes: { fecha: proximaEjecucion(HORA_ENVIO, ahora, LUNES) },
      horarios: { fecha: horarios.proximaEjecucion(ahora) },
      acta: lecturaActa && {
        fecha: lecturaActa.momento,
        detalle: `${lecturaActa.categoria || ''} jornada ${lecturaActa.jornada}${lecturaActa.segundo_intento ? ' (segundo intento)' : ''}`.trim()
      },
      copias: { fecha: proximaCopia(ahora) },
      parches: { fecha: proximaEjecucion(HORA_PARCHES, ahora, VIERNES) }
    };
    const tareas = Object.entries(TAREAS).map(([clave, nombre], i) => ({
      clave, nombre, cuando: CUANDO[clave], proxima: proximas[clave] || null, ultima: ultimas[i] || null
    }));
    tareas.push({
      clave: 'parches', nombre: 'Parches de seguridad', cuando: CUANDO.parches,
      proxima: proximas.parches, ultima: ejecucionParches(informe)
    });
    const ejecuciones = await TareaEjecucion.findAll({ order: [['inicio', 'DESC'], ['id', 'DESC']], limit: MAX_EJECUCIONES });
    res.json({
      ahora,
      // En local las tareas no se ejecutan (solo en producción, el EC2).
      activas: process.env.NODE_ENV === 'production',
      sesion_rfaf: { ...estadoSesion(), acta_parada: actaAutomatica.paradaPorSesion() },
      tareas,
      ejecuciones
    });
  } catch (err) { next(err); }
}

module.exports = { estado, CUANDO, proximaCopia };
