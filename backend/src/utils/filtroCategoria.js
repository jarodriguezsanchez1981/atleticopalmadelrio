/**
 * Ayudas para restringir partidos/entrenamientos a la categoría del usuario
 * con rol 'entrenador'. Los 'coordinador' (y cualquier otro) ven todo.
 */

/** Devuelve la id_categoria del usuario si es entrenador, o null. */
function categoriaDelUsuario(req) {
  if (req?.user?.rol === 'entrenador' && req.user.id_categoria) {
    return req.user.id_categoria;
  }
  return null;
}

/**
 * Dada una lista de includes de Sequelize, convierte el include `plantilla`
 * en un JOIN requerido filtrando por id_categoria. Devuelve la lista original
 * si no hay que filtrar.
 */
function includesConCategoria(includes, idCategoria, alias = 'plantilla') {
  if (!idCategoria || !Array.isArray(includes)) return includes;
  return includes.map((inc) =>
    inc && inc.as === alias
      ? { ...inc, required: true, where: { id_categoria: idCategoria } }
      : inc
  );
}

module.exports = { categoriaDelUsuario, includesConCategoria };
