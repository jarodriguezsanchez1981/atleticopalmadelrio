const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('./config/env');

const apiRoutes = require('./routes');
const errorHandler = require('./middlewares/error.middleware');

const app = express();

// La app va detrás de un único proxy nginx; permite a
// express-rate-limit leer la IP real desde X-Forwarded-For.
app.set('trust proxy', 1);

app.use(helmet());

const corsOrigins = process.env.CORS_ORIGIN?.split(',').map((o) => o.trim()).filter(Boolean);
if (process.env.NODE_ENV === 'production' && (!corsOrigins || !corsOrigins.length)) {
  throw new Error('CORS_ORIGIN debe estar configurado en producción.');
}
app.use(cors({ origin: corsOrigins || '*', credentials: true }));

// Rate limiting global: 100 peticiones por 15 minutos por IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Demasiadas peticiones. Inténtalo de nuevo más tarde.' }
});
app.use('/api', globalLimiter);

// Body parser con límite reducido (2mb en vez de 10mb)
app.use(express.json({ limit: '2mb' }));

app.get('/health', (req, res) => res.json({ status: 'ok', club: 'Atlético Palma del Río' }));

app.use('/api', apiRoutes);

// 404
app.use((req, res) => res.status(404).json({ message: 'Recurso no encontrado.' }));

// Manejador de errores centralizado (siempre el último)
app.use(errorHandler);

module.exports = app;
