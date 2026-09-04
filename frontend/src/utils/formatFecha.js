/**
 * Formatea una fecha como DD/MM/YYYY HH:MM:SS.
 * Acepta string ISO, Date, timestamp o null/undefined.
 */
export function formatFecha(valor) {
  if (!valor) return '—';
  const d = valor instanceof Date ? valor : new Date(valor);
  if (isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}:${ss}`;
}

/**
 * Formatea solo la fecha como DD/MM/YYYY (sin hora).
 * Para campos DATEONLY de la base de datos.
 */
export function formatFechaCorta(valor) {
  if (!valor) return '—';
  if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    const [yyyy, mm, dd] = valor.split('-');
    return `${dd}/${mm}/${yyyy}`;
  }
  const d = valor instanceof Date ? valor : new Date(valor);
  if (isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}
