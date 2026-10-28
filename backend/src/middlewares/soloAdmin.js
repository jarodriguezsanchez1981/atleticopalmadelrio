/**
 * Restringe el acceso al usuario cuyo nombre de login es exactamente `admin`.
 * Se usa en recursos muy sensibles (p. ej. las cuentas de correo internas), que
 * no van por el sistema de permisos por sección: ni siquiera otros
 * coordinadores con permiso de Administración pueden verlos.
 *
 * Debe ir SIEMPRE después de `authenticate` (necesita `req.user`).
 */
module.exports = function soloAdmin(req, res, next) {
  if (req.user && req.user.usuario === 'admin') return next();
  return res.status(403).json({ message: 'Solo el administrador principal puede acceder a este recurso.' });
};
