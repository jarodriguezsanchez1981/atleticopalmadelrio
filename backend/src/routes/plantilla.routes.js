const { Router } = require('express');
const { restringirACategoria, porPlantilla, plantillaSuya } = require('../middlewares/categoria.middleware');
const { Plantilla } = require('../models');
const ctrl = require('../controllers/plantilla.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');
const requireEditar = require('../middlewares/requireEditar');

const router = Router();

router.use(authenticate, authorize('plantillas'));
// Un entrenador solo ve y toca lo de su categoría (middlewares/categoria.middleware.js).
// Crear las plantillas de una temporada (todas las categorías) no es de un entrenador.
router.use(restringirACategoria({
  bloqueadas: ['/temporada'],
  registro: async (id, ctx) => {
    const p = await Plantilla.findByPk(id, { attributes: ['id', 'id_categoria'] });
    return p ? Number(p.id_categoria) === ctx.categoria : null;
  },
  cuerpo: async (body, ctx) => body.id_categoria == null || Number(body.id_categoria) === ctx.categoria,
  enListado: async (item, ctx) => Number(item.id_categoria) === ctx.categoria
}));

router.get('/', ctrl.listar);
router.post('/temporada', requireEditar('plantillas'), ctrl.crearParaTemporada);
router.get('/:id', ctrl.obtener);
router.post('/', requireEditar('plantillas'), ctrl.crear);
router.put('/:id', requireEditar('plantillas'), ctrl.actualizar);
router.delete('/:id', requireEditar('plantillas'), ctrl.eliminar);

module.exports = router;
