const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('./config/env');

const apiRoutes = require('./routes');
const errorHandler = require('./middlewares/error.middleware');
const auditMiddleware = require('./middlewares/audit.middleware');

const app = express();

// Número de proxies nginx delante del backend, para que express-rate-limit
// lea la IP real desde X-Forwarded-For. Por defecto 1 (solo el nginx del
// frontend); con el reverse proxy HTTPS delante son 2 (TRUST_PROXY_HOPS=2).
// Si se queda corto, todos los clientes comparten la IP del proxy y el límite
// de intentos de login se agota para todos a la vez.
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS) || 1);

app.use(helmet());

const corsOrigins = process.env.CORS_ORIGIN?.split(',').map((o) => o.trim()).filter(Boolean);
if (process.env.NODE_ENV === 'production' && (!corsOrigins || !corsOrigins.length)) {
  throw new Error('CORS_ORIGIN debe estar configurado en producción.');
}
app.use(cors({ origin: corsOrigins || '*', credentials: true }));

// Rate limiting global: 10000 peticiones por 15 minutos por IP (prácticamente ilimitado)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Demasiadas peticiones. Inténtalo de nuevo más tarde.' }
});
app.use('/api', globalLimiter);

// Body parser con límite reducido (2mb en vez de 10mb)
app.use(express.json({ limit: '2mb' }));

app.get('/health', (req, res) => res.json({ status: 'ok', club: 'Atlético Palma del Río' }));

// Auditoría automática: intercepta POST/PUT/DELETE y registra cambios
app.use('/api', auditMiddleware);

app.use('/api', apiRoutes);

// 404
app.use((req, res) => res.status(404).json({ message: 'Recurso no encontrado.' }));

// Manejador de errores centralizado (siempre el último)
app.use(errorHandler);

module.exports = app;
