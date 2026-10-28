/** Goles de cada equipo a partir del resultado "local-visitante" (p.ej. "2-1");
 * null si el partido aún no tiene resultado. */
export function golesPartido(resultado) {
  const partes = String(resultado || '').split('-').map((s) => s.trim());
  if (partes.length !== 2 || partes.some((p) => p === '')) return null;
  return { local: partes[0], visitante: partes[1] };
}
