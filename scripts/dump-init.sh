#!/usr/bin/env bash
#
# Vuelca la base de datos MySQL de Docker a backups/ (con datos reales).
# NUNCA escribe en database/init.sql: ese fichero está versionado en git
# y solo debe contener esquema (sin datos), para no filtrar PII/credenciales
# al repositorio. backups/ está en .gitignore.
#
# Para restaurar un volcado en un despliegue (datos reales, no en git):
#   docker exec -i apr_mysql mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$DB_NAME" < backups/<fichero>.sql
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

mkdir -p backups
OUT_FILE="backups/dump_${DB_NAME}_$(date +%Y%m%d_%H%M%S).sql"

echo "Entorno : $ENV_FILE"
echo "BD      : $DB_NAME"
echo "Contenedor: $CONTAINER"
echo "Volcando a $OUT_FILE ..."

docker exec "$CONTAINER" mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" \
  --single-transaction --no-tablespaces \
  "$DB_NAME" > "$OUT_FILE"

LINES=$(wc -l < "$OUT_FILE" || true)
SIZE=$(wc -c < "$OUT_FILE" || true)
echo "OK: $OUT_FILE generado ($LINES líneas, $SIZE bytes)."
echo "Este fichero contiene datos reales y NO se sube a git (backups/ está en .gitignore)."
