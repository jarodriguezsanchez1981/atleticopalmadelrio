const { Router } = require('express');
const { crearControlador } = require('../controllers/informeSemanal.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');
const requireEditar = require('../middlewares/requireEditar');

// Secciones del submenú Informes de Club: "Semanal" (informe_semanal) y
// "Sanciones" (informe_sanciones). No van ligadas a plantillas: las controla
// el permiso de cada sección.
function crearRutas(tipo, seccion) {
  const ctrl = crearControlador(tipo);
  const router = Router();
  router.use(authenticate, authorize(seccion));
  router.get('/', ctrl.vista);
  router.get('/historial', ctrl.historial);
  router.post('/enviar', requireEditar(seccion), ctrl.enviar);
  router.put('/destinatarios', requireEditar(seccion), ctrl.guardarDestinatarios);
  return router;
}

module.exports = { semanal: crearRutas('semanal', 'informe_semanal'), sanciones: crearRutas('sanciones', 'informe_sanciones') };
