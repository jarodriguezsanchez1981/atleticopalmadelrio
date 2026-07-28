/**
 * Ejecuta schema.sql contra el fichero SQLite y crea el usuario administrador inicial.
 * Uso: npm run db:init  (desde la carpeta backend/)
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'intranet_futbol.db');
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
console.log('-> Creando tablas en', dbPath);
db.exec(schema);

const existing = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@club.com');

if (!existing) {
  const passwordHash = bcrypt.hashSync('Admin123!', 10);
  db.prepare(
    `INSERT INTO users (name, surname, email, password_hash, role_id, active)
     VALUES (?, ?, ?, ?, (SELECT id FROM roles WHERE name = 'admin'), 1)`
  ).run('Admin', 'Club', 'admin@club.com', passwordHash);
  console.log('-> Usuario admin creado: admin@club.com / Admin123!  (cambialo tras el primer login)');
} else {
  console.log('-> El usuario admin ya existe, no se vuelve a crear.');
}

console.log('-> Base de datos lista.');
