/**
 * Middleware factory: permite crear/editar/eliminar a usuarios con permisos
 * de edición en alguna de sus secciones.
 * Compatibilidad: acepta visibilidad global (antiguo) o permisos por sección.
 */
function requireEditar() {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado.' });
    }
    const tieneEditar =
      req.user.visibilidad === 'editar' ||
      req.user.rol === 'editar' ||
      (Array.isArray(req.user.roles) && req.user.roles.includes('write')) ||
      (req.user.permisos && typeof req.user.permisos === 'object' &&
        Object.values(req.user.permisos).some(p => p && p.editar));
    if (!tieneEditar) {
      return res.status(403).json({ message: 'No tienes permisos para realizar esta acción.' });
    }
    return next();
  };
}

module.exports = requireEditar;
