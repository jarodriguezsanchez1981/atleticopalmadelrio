/**
 * Middleware factory: permite crear/editar/eliminar a usuarios con
 * `visibilidad` = 'editar'. Los usuarios con `visibilidad` = 'leer' solo
 * pueden leer.
 * Compatibilidad: si el token antiguo trae `rol: 'editar'` o `roles: ['write']`,
 * se acepta como editable (tokens viejos hasta que se re-logueen).
 */
function requireEditar() {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado.' });
    }
    const tieneEditar =
      req.user.visibilidad === 'editar' ||
      req.user.rol === 'editar' ||
      (Array.isArray(req.user.roles) && req.user.roles.includes('write'));
    if (!tieneEditar) {
      return res.status(403).json({ message: 'No tienes permisos para realizar esta acción.' });
    }
    return next();
  };
}

module.exports = requireEditar;
