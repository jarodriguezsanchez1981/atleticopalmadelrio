/**
 * Listados grandes con `raw: true, nest: true` (Sequelize no construye una
 * instancia por fila y relación, que era la mayor parte del tiempo): un
 * include sin registro llega como objeto con todo a null y los BOOLEAN como
 * 0/1. Esto los deja como con instancias: null y true/false.
 */
function anidadosVaciosANull(valor) {
  if (!valor || typeof valor !== 'object' || valor instanceof Date || Array.isArray(valor)) return valor;
  const copia = {};
  for (const [clave, v] of Object.entries(valor)) copia[clave] = anidadosVaciosANull(v);
  return Object.values(copia).every((v) => v === null) ? null : copia;
}

function filasPlanas(filas, booleanos = []) {
  return filas.map((fila) => {
    const copia = { ...fila };
    for (const [clave, v] of Object.entries(copia)) {
      if (v && typeof v === 'object' && !(v instanceof Date)) copia[clave] = anidadosVaciosANull(v);
    }
    for (const campo of booleanos) if (campo in copia && copia[campo] !== null) copia[campo] = !!copia[campo];
    return copia;
  });
}

module.exports = { filasPlanas };
