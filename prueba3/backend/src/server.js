const app = require('./app');
const { sequelize, Usuario, Seccion } = require('./models');
const { hashPassword, isPasswordValid } = require('./utils/password.utils');
const { ensureSecciones } = require('./utils/secciones.seed');
const { ensureTiposFutbol } = require('./utils/tipofutbol.seed');

const PORT = process.env.PORT || 4000;
const MAX_RETRIES = 30;
const RETRY_MS = 2000;

// Secrets conocidos que deben cambiarse en producción
const INSECURE_SECRETS = [
  'apr_jwt_secret_dev_change_me_2026_palma_del_rio',
  'cambia_esto_por_un_secreto_largo_y_aleatorio_en_produccion',
  'dev_secret_change_me',
];

function validateSecrets() {
  if (process.env.NODE_ENV === 'production') {
    const jwtSecret = process.env.JWT_SECRET || '';
    if (!jwtSecret || INSECURE_SECRETS.includes(jwtSecret)) {
      console.error('❌ JWT_SECRET no está configurado o usa un valor por defecto. Define un secreto seguro en producción.');
      process.exit(1);
    }
    const dbPass = process.env.DB_PASSWORD || '';
    if (!dbPass || dbPass === 'apr_pass') {
      console.error('❌ DB_PASSWORD usa el valor por defecto. Define una contraseña segura en producción.');
      process.exit(1);
    }
  }
}

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

  let user = await Usuario.findOne({ where: { usuario } });
  if (!user) {
    const hash = await hashPassword(password);
    user = await Usuario.create({
      usuario,
      password: hash,
      nombre: 'Administrador',
      apellidos: 'Sistema',
      activo: true
    });
    console.log(`✅ Usuario administrador "${usuario}" creado.`);
  } else {
    console.log(`ℹ️  Usuario admin "${usuario}" ya existe.`);
  }

  // Admin siempre tiene todas las secciones (incluida "Administración")
  const secciones = await Seccion.findAll();
  if (secciones.length) {
    await user.setSecciones(secciones.map((s) => s.id));
  }

  // Admin siempre tiene el rol máximo (write) para poder editar y borrar
  const { Rol } = require('./models');
  const existeRol = await Rol.findOne({ where: { id_usuario: user.id, nombre: 'write' } });
  if (!existeRol) {
    await Rol.create({ id_usuario: user.id, nombre: 'write' });
  }
}

async function start() {
  try {
    validateSecrets();
    await waitForDb();

    // La BD se gestiona con database/schema.sql + init.sql. NO se usa
    // sequelize.sync: con atributos unique:true Sequelize emite ALTERs
    // en cada arranque que generan índices duplicados (_2, _3...).
    // Los seeds usan findOrCreate, que no altera la estructura.
    await ensureSecciones(Seccion);
    await ensureTiposFutbol(require('./models').TipoFutbol);
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
