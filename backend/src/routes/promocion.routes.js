const { Router } = require('express');
const { restringirACategoria, porPlantilla, plantillaSuya } = require('../middlewares/categoria.middleware');
const { Promocion } = require('../models');
const ctrl = require('../controllers/promocion.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');
const requireEditar = require('../middlewares/requireEditar');

const router = Router();

router.use(authenticate, authorize('promociones'));
// Un entrenador solo ve y toca lo de su categoría (middlewares/categoria.middleware.js).
// Una promoción es suya si sale de una plantilla de su categoría o va a su categoría.
const promocionSuya = async (p, ctx) => (p.id_plantilla != null && await plantillaSuya(p.id_plantilla, ctx))
  || (p.id_categoria != null && Number(p.id_categoria) === ctx.categoria);
router.use(restringirACategoria({
  listados: ['/', '/resumen'],
  registro: async (id, ctx) => {
    const p = await Promocion.findByPk(id, { attributes: ['id', 'id_plantilla', 'id_categoria'] });
    return p ? promocionSuya(p, ctx) : null;
  },
  cuerpo: async (body, ctx) => (body.id_plantilla == null && body.id_categoria == null) || promocionSuya(body, ctx),
  enListado: promocionSuya
}));

router.get('/', ctrl.listar);
router.get('/resumen', ctrl.resumen);
router.get('/:id', ctrl.obtener);
router.post('/', requireEditar('promociones'), ctrl.crear);
router.put('/:id', requireEditar('promociones'), ctrl.actualizar);
router.delete('/:id', requireEditar('promociones'), ctrl.eliminar);

module.exports = router;
