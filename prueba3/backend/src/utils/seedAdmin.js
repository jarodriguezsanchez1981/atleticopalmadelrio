/**
 * Uso: npm run seed:admin
 * Crea (o actualiza la contraseña de) el usuario administrador inicial
 * a partir de las variables de entorno SEED_ADMIN_USER / SEED_ADMIN_PASSWORD,
 * o de los valores por defecto de abajo si no se definen.
 */
require('../config/env');
const { sequelize, Usuario, Seccion } = require('../models');
const { hashPassword, isPasswordValid } = require('./password.utils');

async function run() {
  const usuario = process.env.SEED_ADMIN_USER || 'admin';
  const password = process.env.SEED_ADMIN_PASSWORD || 'Admin#2026';

  if (!isPasswordValid(password)) {
    throw new Error('La contraseña del admin semilla no cumple la política de seguridad.');
  }

  await sequelize.authenticate();

  const hash = await hashPassword(password);

  const [user, created] = await Usuario.findOrCreate({
    where: { usuario },
    defaults: {
      usuario,
      password: hash,
      nombre: 'Administrador',
      apellidos: 'Sistema',
      activo: true
    }
  });

  // Admin siempre tiene todas las secciones (incluida "Administración")
  const secciones = await Seccion.findAll();
  if (secciones.length) {
    await user.setSecciones(secciones.map((s) => s.id));
  }

  if (!created) {
    user.password = hash;
    await user.save();
    console.log(`🔄 Contraseña actualizada para el usuario "${usuario}".`);
  } else {
    console.log(`✅ Usuario administrador "${usuario}" creado.`);
  }

  console.log(`   Usuario: ${usuario}`);
  console.log(`   Password: ${password}  (cámbiala tras el primer login)`);
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Error al crear el administrador:', err.message);
  process.exit(1);
});
