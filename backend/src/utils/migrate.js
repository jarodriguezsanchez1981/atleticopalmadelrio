const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const MIGRATIONS_DIR = path.join(__dirname, '..', '..', '..', 'database', 'migrations');

async function migrate(logger = console.log) {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'apr_user',
    password: process.env.DB_PASSWORD || 'apr_pass',
    database: process.env.DB_NAME || 'atletico_palma_intranet_dev',
    multipleStatements: true
  });

  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    const [rows] = await conn.query('SELECT version FROM schema_migrations ORDER BY version');
    const aplicadas = new Set(rows.map((r) => r.version));

    if (!fs.existsSync(MIGRATIONS_DIR)) {
      logger('📁 Directorio de migraciones no existe, saltando.');
      return;
    }

    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    const pendientes = files.filter((f) => !aplicadas.has(f));
    if (!pendientes.length) {
      return;
    }

    logger(`🔄 Aplicando ${pendientes.length} migración(es)...`);
    for (const file of pendientes) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      // Quita las líneas de comentario ANTES de trocear por ';\n': si un
      // comentario precede a una sentencia dentro del mismo bloque (antes
      // del siguiente ';'), el filtro antiguo descartaba el bloque entero
      // (comentario + sentencia real), no solo el comentario.
      const statements = sql
        .split('\n')
        .filter((line) => !/^\s*--/.test(line))
        .join('\n')
        .split(/;\s*\n/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      for (const stmt of statements) {
        await conn.query(stmt);
      }
      await conn.query('INSERT INTO schema_migrations (version) VALUES (?)', [file]);
      logger(`  ✓ ${file}`);
    }
    logger('✅ Migraciones completadas.');
  } finally {
    await conn.end();
  }
}

module.exports = { migrate };
