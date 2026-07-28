const app = require('./app');
const { sequelize } = require('./models');

const PORT = process.env.PORT || 4000;

async function start() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a MySQL establecida.');

    // En desarrollo, sincroniza el esquema automáticamente.
    // En producción usa el script database/schema.sql y migraciones controladas.
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: false });
    }

    app.listen(PORT, () => {
      console.log(`🚀 API de la intranet escuchando en http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ No se pudo iniciar el servidor:', err);
    process.exit(1);
  }
}

start();
