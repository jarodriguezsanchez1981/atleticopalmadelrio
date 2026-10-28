/**
 * Middleware factory: exige permiso de edición sobre la(s) sección(es)
 * indicada(s), no sobre cualquier sección del usuario.
 * Uso: router.use(authorize('jugadores')); ... router.post('/', requireEditar('jugadores'), ctrl.crear)
 */
function requireEditar(...secciones) {
  if (secciones.length === 0) {
    throw new Error('requireEditar() necesita al menos una sección, p.ej. requireEditar("jugadores").');
  }

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado.' });
    }
    const permisos = req.user.permisos || {};
    const tieneEditar = secciones.some((s) => permisos[s]?.editar === true);
    if (!tieneEditar) {
      return res.status(403).json({ message: 'No tienes permisos para realizar esta acción.' });
    }
    return next();
  };
}

module.exports = requireEditar;
