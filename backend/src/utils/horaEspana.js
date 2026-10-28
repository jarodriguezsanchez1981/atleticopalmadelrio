/**
 * Fechas en hora española (Europe/Madrid) con independencia de la zona del
 * servidor (que es UTC). Sumar 7 × 24 h en UTC haría que, al cruzar el cambio
 * de horario (finales de octubre / finales de marzo), un entrenamiento de las
 * 18:15 pasara a verse a las 17:15; aquí se suman días de calendario
 * conservando la hora española.
 */
const ZONA = 'Europe/Madrid';

const formato = new Intl.DateTimeFormat('en-GB', {
  timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
});

/** Año, mes (1-12), día, hora, minuto y segundo de `fecha` en hora española. */
function partesEspana(fecha) {
  const p = Object.fromEntries(formato.formatToParts(new Date(fecha)).map(({ type, value }) => [type, Number(value)]));
  return { y: p.year, m: p.month, d: p.day, h: p.hour, mi: p.minute, s: p.second };
}

/** Instante correspondiente a una hora española (los días se pueden pasar de
 * mes: Date.UTC los normaliza). */
function desdeHoraEspana(y, m, d, h, mi, s = 0, ms = 0) {
  const objetivo = Date.UTC(y, m - 1, d, h, mi, s, ms);
  let instante = objetivo;
  for (let i = 0; i < 3; i++) {
    const p = partesEspana(new Date(instante));
    const comoUTC = Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s, ms);
    if (comoUTC === objetivo) break;
    instante += objetivo - comoUTC;
  }
  return new Date(instante);
}

/** `fecha` + `dias` días de calendario, a la misma hora española. */
function sumarDiasHoraEspana(fecha, dias) {
  const p = partesEspana(fecha);
  return desdeHoraEspana(p.y, p.m, p.d + dias, p.h, p.mi, p.s, new Date(fecha).getUTCMilliseconds());
}

/** Día (YYYY-MM-DD) de `fecha` en hora española. */
function diaEspana(fecha) {
  const p = partesEspana(fecha);
  return `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`;
}

module.exports = { partesEspana, desdeHoraEspana, sumarDiasHoraEspana, diaEspana };
