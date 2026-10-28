const { Router } = require('express');
const { restringirACategoria, porPlantilla, plantillaSuya } = require('../middlewares/categoria.middleware');
const { EntrenamientoJugador } = require('../models');
const ctrl = require('../controllers/entrenamientoJugador.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');
const requireEditar = require('../middlewares/requireEditar');

const router = Router();

router.use(authenticate, authorize('entrenamientos_jugadores'));
// Un entrenador solo ve y toca lo de su categoría (middlewares/categoria.middleware.js).
router.use(restringirACategoria({
  registro: async (id, ctx) => {
    const r = await EntrenamientoJugador.findByPk(id, { attributes: ['id', 'id_entrenamiento'] });
    return r ? (await ctx.entrenamientos()).has(Number(r.id_entrenamiento)) : null;
  },
  cuerpo: async (body, ctx) => body.id_entrenamiento == null || (await ctx.entrenamientos()).has(Number(body.id_entrenamiento)),
  enListado: async (item, ctx) => (await ctx.entrenamientos()).has(Number(item.id_entrenamiento))
}));

router.get('/', ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/', requireEditar('entrenamientos_jugadores'), ctrl.crear);
router.put('/:id', requireEditar('entrenamientos_jugadores'), ctrl.actualizar);
router.delete('/:id', requireEditar('entrenamientos_jugadores'), ctrl.eliminar);

module.exports = router;