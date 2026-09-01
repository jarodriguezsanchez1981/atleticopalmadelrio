#!/usr/bin/env bash
#
# Vuelca la base de datos MySQL de Docker a database/init.sql
# para que un despliegue nuevo (o tras `down -v`) incluya todos los datos.
#
# Uso:
#   scripts/dump-init.sh [archivo-env] [contenedor]
#
# Ejemplos:
#   scripts/dump-init.sh                    # usa .env.development y apr_mysql
#   scripts/dump-init.sh .env.production    # usa el entorno de producción
#
set -euo pipefail

cd "$(dirname "$0")/.."

ENV_FILE="${1:-.env.development}"
CONTAINER="${2:-apr_mysql}"

DB_NAME=""
MYSQL_ROOT_PASSWORD=""

if [[ -f "$ENV_FILE" ]]; then
  DB_NAME=$(grep -E '^DB_NAME=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"' || true)
  MYSQL_ROOT_PASSWORD=$(grep -E '^MYSQL_ROOT_PASSWORD=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"' || true)
fi

DB_NAME="${DB_NAME:-atletico_palma_intranet}"
MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-rootpass}"

echo "Entorno : $ENV_FILE"
echo "BD      : $DB_NAME"
echo "Contenedor: $CONTAINER"
echo "Volcando a database/init.sql ..."

docker exec "$CONTAINER" mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" \
  --single-transaction --no-tablespaces \
  "$DB_NAME" > database/init.sql

LINES=$(wc -l < database/init.sql || true)
SIZE=$(wc -c < database/init.sql || true)
echo "OK: database/init.sql generado ($LINES líneas, $SIZE bytes)."
