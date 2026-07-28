const { Router } = require('express');

const authRoutes = require('./auth.routes');
const usuarioRoutes = require('./usuario.routes');
const rolRoutes = require('./rol.routes');
const temporadaRoutes = require('./temporada.routes');
const lugarRoutes = require('./lugar.routes');
const seccionRoutes = require('./seccion.routes');
const categoriaRoutes = require('./categoria.routes');
const jugadorRoutes = require('./jugador.routes');
const entrenadorRoutes = require('./entrenador.routes');
const entrenamientoRoutes = require('./entrenamiento.routes');
const partidoRoutes = require('./partido.routes');
const calendarioRoutes = require('./calendario.routes');

const router = Router();

router.use('/auth', authRoutes);
router.use('/usuarios', usuarioRoutes);
router.use('/roles', rolRoutes);
router.use('/temporadas', temporadaRoutes);
router.use('/lugares', lugarRoutes);
router.use('/secciones', seccionRoutes);
router.use('/categorias', categoriaRoutes);
router.use('/jugadores', jugadorRoutes);
router.use('/entrenadores', entrenadorRoutes);
router.use('/entrenamientos', entrenamientoRoutes);
router.use('/partidos', partidoRoutes);
router.use('/calendario', calendarioRoutes);

module.exports = router;
