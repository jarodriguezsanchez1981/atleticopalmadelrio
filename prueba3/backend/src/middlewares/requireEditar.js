/**
 * Middleware factory: solo permite crear/editar/eliminar a usuarios con rol 'editar'.
 * Usuarios con rol 'leer' solo pueden acceder a rutas de lectura.
 */
function requireEditar() {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado.' });
    }
    if (req.user.rol !== 'editar') {
      return res.status(403).json({ message: 'No tienes permisos para realizar esta acción.' });
    }
    return next();
  };
}

module.exports = requireEditar;
