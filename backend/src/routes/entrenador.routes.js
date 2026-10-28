const { Router } = require('express');
const { restringirACategoria, porPlantilla, plantillaSuya } = require('../middlewares/categoria.middleware');
const ctrl = require('../controllers/entrenador.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');
const requireEditar = require('../middlewares/requireEditar');

const router = Router();

router.use(authenticate, authorize('entrenadores'));
// Un entrenador solo ve y toca lo de su categoría (middlewares/categoria.middleware.js).
// Las personas de las plantillas de su categoría (las que se den de alta
// nuevas aparecen al añadirlas a una de sus plantillas).
router.use(restringirACategoria({
  registro: async (id, ctx) => (await ctx.entrenadores()).has(id),
  enListado: async (item, ctx) => (await ctx.entrenadores()).has(Number(item.id))
}));

router.get('/', ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/', requireEditar('entrenadores'), ctrl.crear);
router.put('/:id', requireEditar('entrenadores'), ctrl.actualizar);
router.delete('/:id', requireEditar('entrenadores'), ctrl.eliminar);

module.exports = router;
