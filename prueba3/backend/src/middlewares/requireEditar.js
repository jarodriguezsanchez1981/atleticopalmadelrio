/**
 * Middleware factory: solo permite crear/editar/eliminar a usuarios con rol 'editar'.
 * Usuarios con rol 'leer' solo pueden acceder a rutas de lectura.
 * Compatibilidad: si el token antiguo no tiene `rol` pero sí `roles: ['write']`,
 * se acepta como editable (tokens viejos hasta que se re-logueen).
 */
function requireEditar() {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado.' });
    }
    const tieneEditar =
      req.user.rol === 'editar' ||
      (Array.isArray(req.user.roles) && req.user.roles.includes('write'));
    if (!tieneEditar) {
      return res.status(403).json({ message: 'No tienes permisos para realizar esta acción.' });
    }
    return next();
  };
}

module.exports = requireEditar;
