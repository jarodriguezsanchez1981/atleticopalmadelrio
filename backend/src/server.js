require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth.routes');
const categoryRoutes = require('./routes/category.routes');
const playerRoutes = require('./routes/player.routes');
const trainingRoutes = require('./routes/training.routes');
const matchRoutes = require('./routes/match.routes');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/trainings', trainingRoutes);
app.use('/api/matches', matchRoutes);

// Manejador de errores centralizado
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Error interno del servidor.' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`API Intranet Futbol escuchando en http://localhost:${PORT}`);
});
