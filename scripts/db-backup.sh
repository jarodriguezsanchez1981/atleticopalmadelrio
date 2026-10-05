#!/bin/bash
# Copia diaria de la base de datos, cifrada con age (RGPD: los volcados llevan
# datos personales). En el servidor solo está la clave PÚBLICA (backup-key.pub):
# quien entre en él no puede leer las copias. La clave PRIVADA la guarda el
# responsable fuera del servidor.
#
# Restaurar una copia (con la clave privada):
#   age -d -i clave_privada.txt backups/db_backup_<fecha>.sql.gz.age | gunzip \
#     | docker exec -i apr_mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"'
set -euo pipefail
umask 077

BACKUP_DIR=/backups
HORA_UTC="${BACKUP_HOUR_UTC:-3}"
DIAS="${RETENTION_DAYS:-30}"
export MYSQL_PWD="$DB_PASS"

[ -s "$AGE_RECIPIENTS_FILE" ] || { echo "Falta la clave pública de cifrado ($AGE_RECIPIENTS_FILE)."; exit 1; }
mkdir -p "$BACKUP_DIR"

copia() {
  local destino="$BACKUP_DIR/db_backup_$(date -u +%Y-%m-%dT%H-%M-%SZ).sql.gz.age"
  if mysqldump -h "$DB_HOST" -P "$DB_PORT" -u"$DB_USER" --single-transaction --no-tablespaces "$DB_NAME" \
      | gzip | age -R "$AGE_RECIPIENTS_FILE" > "$destino.tmp"; then
    mv "$destino.tmp" "$destino"
    echo "$(date -u +%FT%TZ) copia cifrada: $(basename "$destino") ($(du -h "$destino" | cut -f1))"
  else
    rm -f "$destino.tmp"
    echo "$(date -u +%FT%TZ) ERROR: no se pudo hacer la copia"
  fi
  find "$BACKUP_DIR" -maxdepth 1 -type f -name 'db_backup_*' -mtime +"$DIAS" -print -delete
}

if [ "${1:-}" = "--once" ]; then
  copia
  exit 0
fi

while true; do
  ahora=$(date -u +%s)
  siguiente=$(date -u -d "today ${HORA_UTC}:00" +%s)
  [ "$siguiente" -gt "$ahora" ] || siguiente=$(date -u -d "tomorrow ${HORA_UTC}:00" +%s)
  echo "Próxima copia: $(date -u -d "@$siguiente" +%FT%TZ)"
  sleep $((siguiente - ahora))
  copia
done
