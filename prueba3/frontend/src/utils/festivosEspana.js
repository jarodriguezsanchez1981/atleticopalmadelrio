/**
 * Festivos nacionales de España (ámbito estatal).
 * Incluye fijos y variables (basados en Pascua).
 */

function pascua(year) {
  // Algoritmo de Meeus/Jones/Butcher
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function ymd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function festivosDeAnio(year) {
  const easter = pascua(year);
  const fijos = [
    [1, 1, 'Año Nuevo'],
    [1, 6, 'Epifanía del Señor'],
    [2, 28, 'Día de la Comunidad de Andalucía'],
    [5, 1, 'Fiesta del Trabajo'],
    [8, 15, 'Asunción de la Virgen'],
    [10, 12, 'Fiesta Nacional de España'],
    [11, 1, 'Todos los Santos'],
    [12, 6, 'Día de la Constitución Española'],
    [12, 8, 'Inmaculada Concepción'],
    [12, 25, 'Navidad']
  ];

  const lista = fijos.map(([month, day, nombre]) => ({
    fecha: ymd(new Date(year, month - 1, day)),
    nombre
  }));

  lista.push(
    { fecha: ymd(addDays(easter, -3)), nombre: 'Jueves Santo' },
    { fecha: ymd(addDays(easter, -2)), nombre: 'Viernes Santo' }
  );

  return lista;
}

/** Mapa fecha YYYY-MM-DD → nombre del festivo para un año. */
export function mapaFestivosAnio(year) {
  const map = new Map();
  for (const f of festivosDeAnio(year)) {
    map.set(f.fecha, f.nombre);
  }
  return map;
}

/** Nombre del festivo nacional o null. month: 0-indexado (como Date/PrimeVue). */
export function nombreFestivoNacional(year, month, day) {
  const fecha = ymd(new Date(year, month, day));
  return mapaFestivosAnio(year).get(fecha) || null;
}

export function esFestivoNacional(year, month, day) {
  return Boolean(nombreFestivoNacional(year, month, day));
}

/** Devuelve festivos nacionales entre dos fechas ISO (inclusive del rango del calendario). */
export function festivosNacionalesEntre(desde, hasta) {
  const start = new Date(desde);
  const end = new Date(hasta);
  const years = new Set([start.getFullYear(), end.getFullYear()]);
  // margen por si el rango cruza años
  years.add(start.getFullYear() - 1);
  years.add(end.getFullYear() + 1);

  const all = [];
  for (const y of years) {
    all.push(...festivosDeAnio(y));
  }

  const startStr = ymd(start);
  const endStr = ymd(end);

  return all.filter((f) => f.fecha >= startStr && f.fecha <= endStr);
}

export function eventosFestivosFullCalendar(desde, hasta) {
  return festivosNacionalesEntre(desde, hasta).map((f) => ({
    id: `festivo-${f.fecha}`,
    title: `🎉 ${f.nombre}`,
    start: f.fecha,
    allDay: true,
    display: 'background',
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
    textColor: '#92400E',
    classNames: ['fc-festivo-nacional'],
    extendedProps: {
      tipo: 'festivo',
      titulo: f.nombre,
      inicio: f.fecha,
      lugar: null,
      categoria: null
    }
  }));
}
