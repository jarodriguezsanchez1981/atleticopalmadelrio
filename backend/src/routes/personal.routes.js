const { Router } = require('express');
const { restringirACategoria } = require('../middlewares/categoria.middleware');
const ctrl = require('../controllers/personal.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');
const requireEditar = require('../middlewares/requireEditar');

const router = Router();

router.use(authenticate, authorize('personal'));
// Un entrenador solo ve el personal de las plantillas de su categoría.
router.use(restringirACategoria({
  registro: async (id, ctx) => (await ctx.personal()).has(id),
  enListado: async (item, ctx) => (await ctx.personal()).has(Number(item.id))
}));

router.get('/', ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/', requireEditar('personal'), ctrl.crear);
router.put('/:id', requireEditar('personal'), ctrl.actualizar);
router.delete('/:id', requireEditar('personal'), ctrl.eliminar);

module.exports = router;
