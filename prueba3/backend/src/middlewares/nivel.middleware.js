const { Rol } = require('../models');

/**
 * Middleware factory: exige que el usuario tenga el rol `write`
 * (nivel 2) para poder mutar registros (crear/editar/eliminar).
 * Un usuario sin rol `write` (sin roles o solo `read`) queda con
 * acceso de solo lectura.
 * Uso: router.post('/', authenticate, requireNivel, ctrl.crear)
 */
function requireNivel() {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado.' });
    }
    const nivelEfectivo = Rol.nivelDeRoles(req.user.roles);
    if (nivelEfectivo < Rol.ROLES.write.nivel) {
      return res.status(403).json({ message: 'No tienes permisos para realizar esta acción.' });
    }
    return next();
  };
}

module.exports = requireNivel;
