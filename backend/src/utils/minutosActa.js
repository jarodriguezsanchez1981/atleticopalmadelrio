/** Minutos jugados según el acta: el titular juega desde el 0 y el suplente
 * desde que entra (si no entra, 0); los dos hasta que salen o hasta el final.
 * Lo usan Finalizar Acta y las actas de la liga (Estadísticas Rivales). */
function minutosJugados(jugador, duracion) {
  const entrada = jugador.titular ? 0 : jugador.minuto_entrada;
  if (entrada === null || entrada === undefined) return 0;
  const salida = jugador.minuto_salida ?? duracion;
  return Math.max(0, Math.min(salida, duracion) - entrada);
}

module.exports = { minutosJugados };
