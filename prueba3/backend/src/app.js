const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('./config/env');

const apiRoutes = require('./routes');
const errorHandler = require('./middlewares/error.middleware');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || '*', credentials: true }));
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok', club: 'Atlético Palma del Río' }));

app.use('/api', apiRoutes);

// 404
app.use((req, res) => res.status(404).json({ message: 'Recurso no encontrado.' }));

// Manejador de errores centralizado (siempre el último)
app.use(errorHandler);

module.exports = app;
