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

loadEnv();