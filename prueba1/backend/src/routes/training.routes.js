const { Router } = require('express');
const ctrl = require('../controllers/training.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

const router = Router();
router.use(authenticate);

router.get('/', ctrl.listByRange);
router.get('/:id/attendance', ctrl.getAttendance);
router.patch('/:id/attendance', ctrl.setAttendance);

router.post('/', authorize(['admin', 'coordinador']), ctrl.create);
router.delete('/:id', authorize(['admin', 'coordinador']), ctrl.remove);

module.exports = router;
