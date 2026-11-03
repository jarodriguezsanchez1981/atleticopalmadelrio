/** "GARCIA LOPEZ, JUAN" (como viene en el acta de RFAF) -> "Juan Garcia Lopez". */
export function nombreJugadorActa(nombre) {
  const [apellidos, nombrePila] = String(nombre || '').split(',').map((t) => t.trim());
  const capitalizar = (t) => t.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase());
  return capitalizar(nombrePila ? `${nombrePila} ${apellidos}` : apellidos || '');
}
