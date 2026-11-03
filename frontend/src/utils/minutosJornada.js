/**
 * Estadísticas Tiempo, pestaña Jugadores: minutos de cada jugador en el
 * partido de cada jornada (partidos_minutos de GET /estadisticas). Una columna
 * por partido con acta, en orden de jornada; la celda no existe si el jugador
 * no está en el acta de ese partido (0 = convocado sin jugar). Cada celda
 * lleva también las tarjetas de ese partido (amarillas, rojas). `ausencias`:
 * partidos en los que estaba lesionado o sancionado ('lesion' | 'sancion').
 */
export function construirMinutosPorJornada(filas = []) {
  const porPartido = new Map();
  for (const f of filas) {
    for (const p of [...(f.partidos_minutos || []), ...(f.partidos_ausencias || [])]) {
      if (!porPartido.has(p.id_partido)) {
        porPartido.set(p.id_partido, { clave: `p${p.id_partido}`, jornada: p.jornada, fecha: p.fecha, rival: p.rival, es_local: p.es_local });
      }
    }
  }
  const jornadas = [...porPartido.values()].sort((a, b) => (a.jornada ?? 0) - (b.jornada ?? 0));

  return {
    jornadas,
    filas: filas.map((f) => {
      const celdas = {};
      let total = 0;
      for (const p of f.partidos_minutos || []) {
        const minutos = Number(p.minutos) || 0;
        celdas[`p${p.id_partido}`] = {
          minutos, titular: !!p.titular, amarillas: Number(p.amarillas) || 0, rojas: Number(p.rojas) || 0
        };
        total += minutos;
      }
      const ausencias = {};
      for (const a of f.partidos_ausencias || []) {
        if (a.lesion || a.sancion) ausencias[`p${a.id_partido}`] = a.lesion ? 'lesion' : 'sancion';
      }
      return { id_jugador: f.id_jugador, jugador: f.jugador, celdas, ausencias, total };
    })
  };
}

// Colores de las celdas (ARGB, como los pide exceljs; en pantalla, con estiloCss).
// La tabla de la pestaña Jugadores y su hoja de Excel se pintan igual.
const COLOR = {
  amarilla: 'FFFFEB3B', dobleAmarilla: 'FFFF9800', roja: 'FFE53935', sancion: 'FF1E88E5',
  casa: 'FF1E88E5', fuera: 'FFE53935'
};
const BLANCO = 'FFFFFFFF';
// Fondo de una celda y, sobre rojo o azul, el texto en blanco.
const estilo = (fondo) => ({ fondo, colorTexto: fondo === COLOR.roja || fondo === COLOR.sancion ? BLANCO : null });

/** '2026-10-12T16:00:00Z' -> '12/10/2026' (en hora española). */
export function formatoFecha(fecha) {
  if (!fecha) return '';
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid', day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Color de la celda de un partido: doble amarilla (naranja), roja, amarilla o
 * sancionado (azul); sin nada de eso, sin color. */
function colorCelda(celda, ausencia) {
  if (celda) {
    if (celda.amarillas >= 2) return COLOR.dobleAmarilla;
    if (celda.rojas > 0) return COLOR.roja;
    if (celda.amarillas > 0) return COLOR.amarilla;
    return null;
  }
  return ausencia === 'sancion' ? COLOR.sancion : null;
}

/** Estilo de la celda de un partido: el fondo de colorCelda (sobre rojo o
 * azul, texto en blanco, p. ej. un suplente con roja) y la letra en negrita si
 * fue titular (negra) o si entró de suplente (roja). */
export function estiloCelda(celda, ausencia) {
  const fondo = colorCelda(celda, ausencia);
  const base = fondo ? estilo(fondo) : { fondo: null, colorTexto: null };
  if (!celda) return fondo ? base : null;
  const entroDeSuplente = !celda.titular && celda.minutos > 0;
  if (!celda.titular && !entroDeSuplente) return fondo ? base : null;
  return { ...base, negrita: true, colorTexto: base.colorTexto || (entroDeSuplente ? COLOR.roja : null) };
}

/** Celda del rival en la cabecera: azul si el PALMA jugaba en casa, roja si fuera. */
export const estiloEquipo = (j) => ({ fondo: j.es_local ? COLOR.casa : COLOR.fuera, colorTexto: BLANCO });

/** Valor de la celda de un partido: los minutos, "L" si estaba lesionado o nada. */
export const valorCelda = (fila, clave) => fila.celdas[clave]?.minutos ?? (fila.ausencias[clave] === 'lesion' ? 'L' : null);

export const LEYENDA_MINUTOS = [
  { etiqueta: 'Tarjeta amarilla', ...estilo(COLOR.amarilla) },
  { etiqueta: 'Doble amarilla', ...estilo(COLOR.dobleAmarilla) },
  { etiqueta: 'Tarjeta roja', ...estilo(COLOR.roja) },
  { etiqueta: 'Sancionado', ...estilo(COLOR.sancion) },
  { etiqueta: 'L: lesionado' },
  { etiqueta: 'Negrita: titular', negrita: true },
  { etiqueta: 'Roja en negrita: entra de suplente', negrita: true, colorTexto: COLOR.roja },
  { etiqueta: 'Equipo en azul: en casa', fondo: COLOR.casa, colorTexto: BLANCO },
  { etiqueta: 'Equipo en rojo: fuera', fondo: COLOR.fuera, colorTexto: BLANCO },
  { etiqueta: 'Celda vacía: no está en el acta; 0: convocado sin jugar' }
];

/** { fondo, colorTexto, negrita } -> estilo CSS en línea ('FFE53935' -> '#E53935'). */
export function estiloCss(e) {
  if (!e) return null;
  const css = {};
  if (e.fondo) css.backgroundColor = `#${e.fondo.slice(2)}`;
  if (e.colorTexto) css.color = `#${e.colorTexto.slice(2)}`;
  if (e.negrita) css.fontWeight = 600;
  return css;
}

/** Hoja de Excel de la pestaña Jugadores: tres filas de cabecera por partido
 * (Jornada, Fecha y Equipo rival: en azul si el PALMA jugaba en casa, en rojo
 * si fuera), una fila por jugador con sus minutos ("L" si estaba lesionado),
 * la celda coloreada según sus tarjetas o si estaba sancionado y la letra
 * según fuera titular o suplente (estiloCelda), y Total. */
export function hojaMinutosPorJornada(filas = []) {
  const { jornadas, filas: tabla } = construirMinutosPorJornada(filas);
  const total = jornadas.length + 1;
  return {
    cabeceras: [
      ['Jornada', ...jornadas.map((j) => `J${j.jornada}`), 'Total'],
      ['Fecha', ...jornadas.map((j) => formatoFecha(j.fecha)), ''],
      ['Equipo', ...jornadas.map((j) => j.rival || ''), '']
    ],
    estilosCabecera: [[], [], [null, ...jornadas.map(estiloEquipo)]],
    combinadas: [[0, total, 2, total]],
    formatos: [null, ...jornadas.map(() => null), null],
    filas: tabla.map((f) => [
      f.jugador,
      ...jornadas.map((j) => valorCelda(f, j.clave)),
      f.total
    ]),
    estilos: tabla.map((f) => [null, ...jornadas.map((j) => estiloCelda(f.celdas[j.clave], f.ausencias[j.clave])), null]),
    leyenda: LEYENDA_MINUTOS
  };
}
