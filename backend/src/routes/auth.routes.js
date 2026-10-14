const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/auth.controller');
const authenticate = require('../middlewares/auth.middleware');

const router = Router();

// Limita intentos de login para mitigar fuerza bruta
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: { message: 'Demasiados intentos de inicio de sesión. Inténtalo de nuevo en unos minutos.' }
});

// Limita los cambios de contraseña (cada uno es un hash bcrypt).
const passwordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: { message: 'Demasiados cambios de contraseña. Inténtalo de nuevo en unos minutos.' }
});

router.post('/login', loginLimiter, authController.login);
router.post('/cambiar-password', authenticate, passwordLimiter, authController.cambiarPassword);
router.get('/me', authenticate, authController.me);
router.post('/logout', authController.logout);

module.exports = router;
