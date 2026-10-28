const { Router } = require('express');
const ctrl = require('../controllers/imagen.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');
const { restringirACategoria } = require('../middlewares/categoria.middleware');

const router = Router();

router.use(authenticate);

// Fotos (datos personales, también de menores): solo con alguna sección que
// ya las mostraba en sus respuestas. Los escudos se ven en casi todas.
const PERMISO = {
  jugadores: authorize('jugadores', 'plantillas', 'partidos', 'categoria_calendario'),
  entrenadores: authorize('entrenadores', 'plantillas'),
  delegados: authorize('delegados', 'plantillas'),
  personal: authorize('personal', 'plantillas'),
  equipos: (req, res, next) => next()
};

router.get('/:tipo/:id', (req, res, next) => {
  const permiso = PERMISO[req.params.tipo];
  if (!permiso) return res.status(404).json({ message: 'Imagen no encontrada.' });
  return permiso(req, res, next);
}, (req, res, next) => {
  // Un entrenador solo ve las fotos de las personas de su categoría.
  const tipo = req.params.tipo;
  if (tipo === 'equipos') return next();
  return restringirACategoria({ registro: async (id, ctx) => (await ctx[tipo]()).has(id) })(
    { ...req, path: `/${req.params.id}`, query: {}, method: 'GET', user: req.user }, res, next);
}, ctrl.obtener);

module.exports = router;
