const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('./config/env');

const apiRoutes = require('./routes');
const errorHandler = require('./middlewares/error.middleware');

const app = express();

// La app va detrás de un único proxy nginx; permite a
// express-rate-limit leer la IP real desde X-Forwarded-For.
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));

app.get('/health', (req, res) => res.json({ status: 'ok', club: 'Atlético Palma del Río' }));

app.use('/api', apiRoutes);

// 404
app.use((req, res) => res.status(404).json({ message: 'Recurso no encontrado.' }));

// Manejador de errores centralizado (siempre el último)
app.use(errorHandler);

module.exports = app;
