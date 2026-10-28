/** ?limite=N de los listados: entero entre 1 y LIMITE_MAXIMO, o undefined
 * (sin límite) si no viene o no es válido. */
const LIMITE_MAXIMO = 500;

function limiteConsulta(valor) {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? Math.min(n, LIMITE_MAXIMO) : undefined;
}

module.exports = { limiteConsulta, LIMITE_MAXIMO };
