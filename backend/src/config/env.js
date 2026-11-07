const path = require('node:path');
const fs = require('node:fs');
const dotenv = require('dotenv');

const root = path.resolve(__dirname, '..', '..');

/**
 * Carga el fichero de entorno según NODE_ENV (.env.development /
 * .env.production). Si el fichero específico no existe, cae en `.env`.
 *
 * - En producción (Docker) las variables llegan desde el contenedor y no hay
 *   `.env.*`, así que esta función no sobreescribe `process.env` (dotenv no
 *   pisa variables ya definidas por defecto).
 */
function loadEnv() {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const envFile = path.join(root, `.env.${nodeEnv}`);
  if (fs.existsSync(envFile)) {
    dotenv.config({ path: envFile, override: false });
  } else {
    dotenv.config({ override: false });
  }
}

/** Secretos que pueden llegar en un fichero (Docker secrets, en
 * /run/secrets/...): si está NOMBRE_FILE y no NOMBRE, NOMBRE se lee de ese
 * fichero (sin el salto de línea final). Así no van en las variables de
 * entorno del contenedor ni se ven con `docker inspect`. Si el fichero no se
 * puede leer, el backend no arranca (nunca sigue con un secreto vacío). */
const SECRETOS = ['DB_PASSWORD', 'JWT_SECRET', 'AES_SECRET_KEY', 'SEED_ADMIN_PASSWORD'];

function cargarSecretos(env = process.env, leer = (ruta) => fs.readFileSync(ruta, 'utf8')) {
  for (const nombre of SECRETOS) {
    const ruta = env[`${nombre}_FILE`];
    if (ruta && !env[nombre]) env[nombre] = leer(ruta).replace(/\r?\n$/, '');
  }
}

loadEnv();
cargarSecretos();

module.exports = { loadEnv, cargarSecretos, SECRETOS };