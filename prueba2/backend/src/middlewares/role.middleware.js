/**
 * Middleware factory: solo deja pasar a los roles indicados.
 * Uso: router.get('/', authenticate, authorize('administrador'), ctrl.listar)
 */
function authorize(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado.' });
    }
    if (!rolesPermitidos.includes(req.user.rol)) {
      return res.status(403).json({ message: 'No tienes permisos para acceder a este recurso.' });
    }
    return next();
  };
}

module.exports = authorize;
