/**
 * Middleware factory: solo deja pasar a los usuarios con las secciones indicadas.
 * Uso: router.get('/', authenticate, authorize('administracion'), ctrl.listar)
 */
function authorize(...seccionesPermitidas) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado.' });
    }
    const secciones = req.user.secciones || [];
    if (!seccionesPermitidas.some((s) => secciones.includes(s))) {
      return res.status(403).json({ message: 'No tienes permisos para acceder a este recurso.' });
    }
    return next();
  };
}

module.exports = authorize;
