/**
 * Exportar a Excel las tablas de Estadísticas: cada tabla de la pantalla es una
 * hoja del mismo libro. `construirHojaEstadistica` arma la hoja (cabeceras
 * agrupadas como en TablaEstadistica, filas y formatos) y es pura, testeable;
 * `descargarExcel` la escribe con exceljs (cargado solo al exportar).
 */

const GRUPOS = {
  total: { titulo: 'Total', sufijo: '' },
  local: { titulo: 'Local', sufijo: '_local' },
  visitante: { titulo: 'Visitante', sufijo: '_visitante' }
};

const sinSaltos = (t) => String(t ?? '').replace(/\s*\n\s*/g, ' ');

/** Hoja de una TablaEstadistica: las mismas columnas (grupos Total / Local /
 * Visitante, o solo `soloGrupo`, con sus subgrupos) y filas, ordenadas como en
 * pantalla (de mayor a menor por `sortField`). Devuelve { cabeceras (filas de
 * títulos), combinadas ([fila, col, filaFin, colFin], base 0), formatos (por
 * columna: 'porcentaje' | 'decimal' | null), filas, anchoNombre }. */
export function construirHojaEstadistica({ metricas, filas = [], soloGrupo = null, sortField = null,
  columnaNombre = { campo: 'jugador', titulo: 'Jugador' } }) {
  const grupos = soloGrupo ? [soloGrupo] : Object.keys(GRUPOS);
  const conSubgrupos = metricas.some((m) => m.subgrupo);
  const niveles = (conSubgrupos ? 2 : 1) + (soloGrupo ? 0 : 1);
  const cabeceras = Array.from({ length: niveles }, (_, i) => [i === 0 ? sinSaltos(columnaNombre.titulo) : '']);
  const combinadas = niveles > 1 ? [[0, 0, niveles - 1, 0]] : [];
  const columnas = [];

  for (const clave of grupos) {
    const cols = metricas.filter((m) => clave !== 'total' || !m.soloLados);
    const inicio = columnas.length + 1;
    let fila = 0;
    if (!soloGrupo) {
      cabeceras[0].push(GRUPOS[clave].titulo, ...Array(cols.length - 1).fill(''));
      if (cols.length > 1) combinadas.push([0, inicio, 0, inicio + cols.length - 1]);
      fila = 1;
    }
    cols.forEach((m, i) => {
      const col = inicio + i;
      if (conSubgrupos) {
        if (m.subgrupo) {
          const primera = i === 0 || cols[i - 1].subgrupo !== m.subgrupo;
          cabeceras[fila].push(primera ? m.subgrupo : '');
          cabeceras[fila + 1].push(sinSaltos(m.titulo));
          if (primera) {
            let n = 1;
            while (cols[i + n]?.subgrupo === m.subgrupo) n++;
            if (n > 1) combinadas.push([fila, col, fila, col + n - 1]);
          }
        } else {
          // Columna suelta: su título ocupa las dos filas.
          cabeceras[fila].push(sinSaltos(m.titulo));
          cabeceras[fila + 1].push('');
          combinadas.push([fila, col, fila + 1, col]);
        }
      } else {
        cabeceras[fila].push(sinSaltos(m.titulo));
      }
      columnas.push({ field: `${m.campo}${GRUPOS[clave].sufijo}`,
        formato: m.porcentaje ? 'porcentaje' : m.decimal ? 'decimal' : m.unDecimal ? 'unDecimal' : null });
    });
  }

  const campoOrden = sortField ? `${sortField}${soloGrupo ? GRUPOS[soloGrupo].sufijo : ''}` : null;
  const ordenadas = campoOrden
    ? [...filas].sort((a, b) => (Number(b[campoOrden]) || 0) - (Number(a[campoOrden]) || 0))
    : filas;

  return {
    cabeceras,
    combinadas,
    formatos: [null, ...columnas.map((c) => c.formato)],
    filas: ordenadas.map((f) => [f[columnaNombre.campo] ?? '', ...columnas.map((c) => f[c.field] ?? null)])
  };
}

/** Hoja de una tabla sencilla: columnas [{ campo, titulo }]. */
export function construirHojaSimple({ columnas, filas = [] }) {
  return {
    cabeceras: [columnas.map((c) => c.titulo)],
    combinadas: [],
    formatos: columnas.map(() => null),
    filas: filas.map((f) => columnas.map((c) => f[c.campo] ?? null))
  };
}

/** Nombre de hoja válido en Excel: sin []:*?/\ y como mucho 31 caracteres, sin repetir. */
export function nombreHoja(nombre, usados = new Set()) {
  const base = String(nombre || 'Hoja').replace(/[[\]:*?/\\]/g, ' ').trim().slice(0, 31) || 'Hoja';
  let n = base;
  for (let i = 2; usados.has(n.toLowerCase()); i++) n = `${base.slice(0, 31 - String(i).length - 1)} ${i}`;
  usados.add(n.toLowerCase());
  return n;
}

const VERDE = 'FF0B3D2E';
const FORMATO_NUMERO = { porcentaje: '0.0" %"', decimal: '0.00', unDecimal: '0.#' };

/** Escribe y descarga el libro. hojas: [{ nombre, titulo, ...hoja construida }]. */
export async function descargarExcel(nombreFichero, hojas) {
  const { default: ExcelJS } = await import('exceljs');
  const libro = new ExcelJS.Workbook();
  libro.creator = 'Intranet Atlético Palma del Río';
  libro.created = new Date();
  const usados = new Set();

  for (const hoja of hojas) {
    const ws = libro.addWorksheet(nombreHoja(hoja.nombre, usados));
    const ancho = Math.max(1, ...hoja.cabeceras.map((c) => c.length));
    // Fila 1: título de la tabla; fila 2 en blanco; luego las cabeceras.
    ws.addRow([hoja.titulo || hoja.nombre]).font = { bold: true, size: 13, color: { argb: VERDE } };
    ws.addRow([]);
    const desplazamiento = 3;
    hoja.cabeceras.forEach((c) => {
      const fila = ws.addRow(c);
      fila.eachCell({ includeEmpty: true }, (celda, col) => {
        if (col > ancho) return;
        celda.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VERDE } };
        celda.alignment = { horizontal: col === 1 ? 'left' : 'center', vertical: 'middle', wrapText: true };
        celda.border = { top: { style: 'thin', color: { argb: 'FFFFFFFF' } }, left: { style: 'thin', color: { argb: 'FFFFFFFF' } },
          bottom: { style: 'thin', color: { argb: 'FFFFFFFF' } }, right: { style: 'thin', color: { argb: 'FFFFFFFF' } } };
      });
    });
    for (const [f1, c1, f2, c2] of hoja.combinadas) {
      ws.mergeCells(f1 + desplazamiento, c1 + 1, f2 + desplazamiento, c2 + 1);
    }
    hoja.filas.forEach((valores) => {
      const fila = ws.addRow(valores);
      hoja.formatos.forEach((formato, i) => {
        const celda = fila.getCell(i + 1);
        if (formato) celda.numFmt = FORMATO_NUMERO[formato];
        if (i > 0) celda.alignment = { horizontal: 'center' };
      });
    });
    // Anchos: la primera columna según el texto más largo; el resto, fijas.
    const largoNombre = Math.max(10, ...hoja.filas.map((f) => String(f[0] ?? '').length), String(hoja.cabeceras[0]?.[0] ?? '').length);
    ws.getColumn(1).width = Math.min(45, largoNombre + 2);
    for (let c = 2; c <= ancho; c++) ws.getColumn(c).width = 11;
    // Cabeceras y nombre fijos al desplazarse.
    ws.views = [{ state: 'frozen', xSplit: 1, ySplit: desplazamiento - 1 + hoja.cabeceras.length }];
  }

  const buffer = await libro.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = `${nombreFichero}.xlsx`;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** 'Estadísticas Goles' + 'Senior A / 2026/2027' -> 'estadisticas-goles-senior-a-2026-2027-AAAA-MM-DD'. */
export function nombreFicheroExcel(...partes) {
  const slug = partes.filter(Boolean).join(' ')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'estadisticas';
  return `${slug}-${new Date().toISOString().slice(0, 10)}`;
}
