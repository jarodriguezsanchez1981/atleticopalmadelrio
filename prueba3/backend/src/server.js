const app = require('./app');
const { sequelize, Usuario, Rol, Seccion } = require('./models');
const { hashPassword, isPasswordValid } = require('./utils/password.utils');
const { ensureSecciones } = require('./utils/secciones.seed');

const PORT = process.env.PORT || 4000;
const MAX_RETRIES = 30;
const RETRY_MS = 2000;

async function waitForDb() {
  for (let i = 1; i <= MAX_RETRIES; i++) {
    try {
      await sequelize.authenticate();
      console.log('✅ Conexión a MySQL establecida.');
      return;
    } catch (err) {
      console.log(`⏳ Esperando MySQL (${i}/${MAX_RETRIES}): ${err.message}`);
      if (i === MAX_RETRIES) throw err;
      await new Promise((r) => setTimeout(r, RETRY_MS));
    }
  }
}

async function seedAdminIfNeeded() {
  if (process.env.SEED_ON_START !== 'true') return;

  const usuario = process.env.SEED_ADMIN_USER || 'admin';
  const password = process.env.SEED_ADMIN_PASSWORD || 'Admin#2026';

  if (!isPasswordValid(password)) {
    console.warn('⚠️  SEED_ADMIN_PASSWORD no cumple la política; se omite el seed.');
    return;
  }

  const rolAdmin = await Rol.findOne({ where: { nombre: 'administrador' } });
  if (!rolAdmin) {
    console.warn('⚠️  No existe el rol administrador; ejecuta database/init.sql.');
    return;
  }

  let user = await Usuario.findOne({ where: { usuario } });
  if (!user) {
    const hash = await hashPassword(password);
    user = await Usuario.create({
      usuario,
      password: hash,
      nombre: 'Administrador',
      apellidos: 'Sistema',
      id_rol: rolAdmin.id,
      activo: true
    });
    console.log(`✅ Usuario administrador "${usuario}" creado (password: ${password}).`);
  } else {
    console.log(`ℹ️  Usuario admin "${usuario}" ya existe.`);
  }

  // Admin siempre tiene todas las secciones
  const secciones = await Seccion.findAll();
  if (secciones.length) {
    await user.setSecciones(secciones.map((s) => s.id));
  }
}

async function start() {
  try {
    await waitForDb();

    // Crea tablas nuevas (secciones, usuario_secciones) si no existen
    await sequelize.sync({ alter: false });
    await ensureSecciones(Seccion);
    await seedAdminIfNeeded();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 API de la intranet escuchando en el puerto ${PORT}`);
    });
  } catch (err) {
    console.error('❌ No se pudo iniciar el servidor:', err);
    process.exit(1);
  }
}

start();
