/** Informes → Semanal: opciones del selector de fin de semana. Cada fin de
 * semana se identifica por su lunes (YYYY-MM-DD) y se muestra con su viernes. */

function sumarDias(dia, dias) {
  const [y, m, d] = dia.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + dias)).toISOString().slice(0, 10);
}

const formatoDia = (dia) => dia.split('-').reverse().join('/');

/** Los `n` fines de semana hasta el del lunes `ultimoLunes`, del más reciente al más antiguo. */
export function opcionesFinDeSemana(ultimoLunes, n = 12) {
  if (!ultimoLunes) return [];
  return Array.from({ length: n }, (_, i) => {
    const lunes = sumarDias(ultimoLunes, -7 * i);
    return { value: lunes, label: `Fin de semana del ${formatoDia(sumarDias(lunes, -3))}` };
  });
}
