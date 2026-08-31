const { Router } = require('express');
const ctrl = require('../controllers/util.controller');
const authenticate = require('../middlewares/auth.middleware');

const router = Router();

router.use(authenticate);

router.get('/imagen', ctrl.imagen);

module.exports = router;