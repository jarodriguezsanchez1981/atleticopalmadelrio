/**
 * authorize(['admin', 'coordinador']) -> solo deja pasar esos roles.
 */
function authorize(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado.' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'No tienes permisos para esta accion.' });
    }
    next();
  };
}

/**
 * Restringe el acceso a una categoria concreta cuando el usuario es 'entrenador'.
 * admin y coordinador ven todas las categorias; entrenador solo las suyas
 * (req.user.categoryIds, incluido en el JWT).
 * Se espera que la ruta tenga :categoryId o que el body/query traiga categoryId.
 */
function scopeToOwnCategory(req, res, next) {
  if (req.user.role === 'admin' || req.user.role === 'coordinador') {
    return next();
  }

  const categoryId = Number(
    req.params.categoryId || req.body.categoryId || req.query.categoryId
  );

  if (!categoryId) {
    return res.status(400).json({ message: 'Falta indicar la categoria.' });
  }

  if (!req.user.categoryIds.includes(categoryId)) {
    return res.status(403).json({ message: 'No tienes acceso a esta categoria.' });
  }

  next();
}

module.exports = { authorize, scopeToOwnCategory };
