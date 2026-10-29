/**
 * Reparto de partidos de una categoría de un torneo generado (sección
 * Generar Torneo). Función pura y determinista: los partidos no se guardan en
 * la BD, se calculan siempre a partir de la categoría guardada, para la vista
 * previa y para el PDF (utils/pdfGenerarTorneo.js).
 *
 * - Fase de grupos / todos contra todos: método del círculo, jornada a jornada
 *   (en grupos, se intercalan las jornadas del A y del B).
 * - Colocación: turnos sucesivos desde la hora de comienzo, con tantos huecos
 *   como campos; un equipo nunca juega dos turnos seguidos (si hace falta, un
 *   turno queda vacío). Se busca el reparto con menos turnos.
 * - Eliminatorias sin nombres ("1º A", "Ganador SF1"…), porque no se apuntan
 *   resultados.
 */

export const CAMPOS = [
  { clave: 'anexo1', nombre: 'Anexo 1' },
  { clave: 'anexo2', nombre: 'Anexo 2' },
  { clave: 'estadio1', nombre: 'Estadio 1' },
  { clave: 'estadio2', nombre: 'Estadio 2' }
];

/** Hora escrita en formato HH:MM (00:00 a 23:59). */
export const esHoraValida = (texto) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(texto ?? ''));

export const nombreCampo = (clave) => CAMPOS.find((c) => c.clave === clave)?.nombre || clave;

const aMinutos = (hora) => {
  const [h, m] = String(hora || '00:00').split(':').map(Number);
  return h * 60 + (m || 0);
};
const aHora = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

/** Jornadas de todos contra todos (método del círculo). Cada jornada es una
 * lista de [local, visitante]; con número impar, el que "descansa" no juega. */
function jornadasTodosContraTodos(nombres) {
  const lista = [...nombres];
  if (lista.length % 2) lista.push(null);
  const n = lista.length;
  const jornadas = [];
  for (let r = 0; r < n - 1; r++) {
    const jornada = [];
    for (let i = 0; i < n / 2; i++) {
      const a = lista[i];
      const b = lista[n - 1 - i];
      if (a === null || b === null) continue;
      // Alterna local/visitante del equipo fijo para repartir.
      jornada.push(i === 0 && r % 2 ? [b, a] : [a, b]);
    }
    jornadas.push(jornada);
    lista.splice(1, 0, lista.pop());
  }
  return jornadas;
}

function partidosFaseGrupos(cat) {
  if (cat.formato !== 'grupos') {
    return jornadasTodosContraTodos(cat.equipos.map((e) => e.nombre))
      .flat()
      .map(([local, visitante]) => ({ local, visitante }));
  }
  const porGrupo = ['A', 'B'].map((g) => ({
    grupo: g,
    jornadas: jornadasTodosContraTodos(cat.equipos.filter((e) => e.grupo === g).map((e) => e.nombre))
  }));
  const maxJornadas = Math.max(...porGrupo.map((g) => g.jornadas.length));
  const partidos = [];
  for (let r = 0; r < maxJornadas; r++) {
    for (const { grupo, jornadas } of porGrupo) {
      for (const [local, visitante] of jornadas[r] || []) partidos.push({ local, visitante, grupo });
    }
  }
  return partidos;
}

// Descanso fijo antes de semifinales y antes de finales.
const DESCANSO_ELIMINATORIAS_MIN = 10;

// Límite de nodos de la búsqueda del reparto (se queda con el mejor encontrado).
const LIMITE_BUSQUEDA = 20000;
const MAX_OPCIONES_POR_TURNO = 30;

/** Conjuntos de partidos que pueden ir juntos en un turno: sin equipos
 * repetidos, como mucho `numCampos`, primero los más grandes y, a igualdad,
 * en el orden de las jornadas. */
function opcionesDeTurno(disponibles, partidos, numCampos) {
  const opciones = [];
  const elegir = (desde, actual, usados) => {
    if (opciones.length >= MAX_OPCIONES_POR_TURNO * 4) return;
    if (actual.length) opciones.push([...actual]);
    if (actual.length === numCampos) return;
    for (let k = desde; k < disponibles.length; k++) {
      const p = partidos[disponibles[k]];
      if (usados.has(p.local) || usados.has(p.visitante)) continue;
      usados.add(p.local); usados.add(p.visitante); actual.push(disponibles[k]);
      elegir(k + 1, actual, usados);
      actual.pop(); usados.delete(p.local); usados.delete(p.visitante);
    }
  };
  elegir(0, [], new Set());
  return opciones
    .sort((a, b) => b.length - a.length || a[0] - b[0])
    .slice(0, MAX_OPCIONES_POR_TURNO);
}

/** Mínimo de turnos que aún hacen falta: por campos y porque un equipo con r
 * partidos pendientes necesita al menos 2r-1 turnos (2r si jugó el anterior). */
function cotaInferior(pendientes, partidos, numCampos, anteriores) {
  const restantes = new Map();
  for (const i of pendientes) {
    for (const e of [partidos[i].local, partidos[i].visitante]) restantes.set(e, (restantes.get(e) || 0) + 1);
  }
  let cota = Math.ceil(pendientes.length / numCampos);
  for (const [e, r] of restantes) cota = Math.max(cota, 2 * r - 1 + (anteriores.has(e) ? 1 : 0));
  return cota;
}

/**
 * Reparte los partidos en turnos de forma que ningún equipo juegue dos turnos
 * seguidos (regla obligatoria). Busca el reparto con menos turnos; si en algún
 * turno no cabe ningún partido sin romper la regla, ese turno queda vacío.
 * Devuelve una lista de turnos, cada uno una lista de partidos.
 */
function colocarEnTurnos(partidos, numCampos) {
  let mejor = null;
  let nodos = 0;
  const buscar = (pendientes, anteriores, turnos) => {
    if (!pendientes.length) {
      if (!mejor || turnos.length < mejor.length) mejor = turnos.map((t) => [...t]);
      return;
    }
    if (nodos++ > LIMITE_BUSQUEDA) return;
    if (mejor && turnos.length + cotaInferior(pendientes, partidos, numCampos, anteriores) >= mejor.length) return;

    const disponibles = pendientes.filter((i) => !anteriores.has(partidos[i].local) && !anteriores.has(partidos[i].visitante));
    const opciones = opcionesDeTurno(disponibles, partidos, numCampos);
    if (!opciones.length) {
      // Nadie puede jugar sin repetir turno seguido: turno vacío.
      turnos.push([]);
      buscar(pendientes, new Set(), turnos);
      turnos.pop();
      return;
    }
    for (const opcion of opciones) {
      const enTurno = new Set(opcion.flatMap((i) => [partidos[i].local, partidos[i].visitante]));
      turnos.push(opcion);
      buscar(pendientes.filter((i) => !opcion.includes(i)), enTurno, turnos);
      turnos.pop();
    }
  };
  buscar(partidos.map((_, i) => i), new Set(), []);
  return mejor.map((t) => t.map((i) => partidos[i]));
}

function eliminatorias(cat) {
  const grupos = cat.formato === 'grupos';
  const semis = grupos && !!cat.semifinales;
  const semifinales = semis
    ? [
        { local: '1º A', visitante: '2º B', etiqueta: 'SF1' },
        { local: '1º B', visitante: '2º A', etiqueta: 'SF2' }
      ]
    : [];
  const oro = semis
    ? { local: 'Ganador SF1', visitante: 'Ganador SF2', etiqueta: 'ORO' }
    : grupos
      ? { local: '1º A', visitante: '1º B', etiqueta: 'ORO' }
      : { local: '1º', visitante: '2º', etiqueta: 'ORO' };
  const plata = semis
    ? { local: 'Perdedor SF1', visitante: 'Perdedor SF2', etiqueta: 'PLATA' }
    : grupos
      ? { local: '2º A', visitante: '2º B', etiqueta: 'PLATA' }
      : { local: '3º', visitante: '4º', etiqueta: 'PLATA' };
  const finales = [];
  if (cat.final_oro) finales.push(oro);
  if (cat.final_plata) finales.push(plata);
  return { semifinales, finales };
}

/** Reparte en turnos los partidos de una fase de eliminatoria. Con un solo
 * campo, las finales van Plata primero y Oro al final. */
function turnosEliminatoria(partidos, numCampos, esFinal) {
  const orden = numCampos === 1 && esFinal ? [...partidos].reverse() : partidos;
  const turnos = [];
  for (let i = 0; i < orden.length; i += numCampos) turnos.push(orden.slice(i, i + numCampos));
  return turnos;
}

/**
 * @param cat categoría del torneo (forma del GET /torneos-generados/:id):
 *   { hora_inicio, hora_fin, duracion_min, descanso_min, campos, formato,
 *     semifinales, final_oro, final_plata, equipos: [{ nombre, grupo }] }
 * @returns {{ turnos: { hora, fase, partidos: { campo, local, visitante, grupo?, etiqueta? }[] }[],
 *            horaFinReal: string, excedeHoraFin: boolean }}
 */
export function generarCategoria(cat) {
  const campos = CAMPOS.map((c) => c.clave).filter((c) => (cat.campos || []).includes(c));
  const numCampos = Math.max(campos.length, 1);
  const duracion = Number(cat.duracion_min) || 0;
  const descanso = Number(cat.descanso_min) || 0;
  const inicio = aMinutos(cat.hora_inicio);

  const { semifinales, finales } = eliminatorias(cat);
  const bloques = [
    ...colocarEnTurnos(partidosFaseGrupos(cat), numCampos).map((p) => ({ fase: 'grupos', partidos: p })),
    ...turnosEliminatoria(semifinales, numCampos, false).map((p) => ({ fase: 'semifinales', partidos: p })),
    ...turnosEliminatoria(finales, numCampos, true).map((p) => ({ fase: 'finales', partidos: p }))
  ];

  // Horas: cada turno empieza al acabar el anterior más el descanso normal;
  // al pasar a semifinales o a finales, el descanso es de DESCANSO_ELIMINATORIAS_MIN.
  let hora = inicio;
  const turnos = bloques.map((b, n) => {
    if (n > 0) {
      const cambioDeFase = b.fase !== bloques[n - 1].fase;
      hora += duracion + (cambioDeFase ? DESCANSO_ELIMINATORIAS_MIN : descanso);
    }
    return { hora: aHora(hora), fase: b.fase, partidos: b.partidos.map((p, i) => ({ campo: campos[i], ...p })) };
  });

  const finReal = turnos.length ? hora + duracion : inicio;
  return {
    turnos,
    horaFinReal: aHora(finReal),
    excedeHoraFin: cat.hora_fin ? aMinutos(cat.hora_fin) < finReal : false
  };
}
