#!/bin/sh
# Streaming continuo del binary log de MySQL a backups/binlogs/.
# Captura cada cambio (INSERT/UPDATE/DELETE/DDL) casi en tiempo real, no solo
# el estado del volcado diario. Pensado para restauración point-in-time:
# restaurar el último volcado completo (backups/dump_*.sql) y luego reproducir
# estos ficheros mysql-bin.NNNNNN desde la fecha/hora del volcado con:
#   mysqlbinlog --start-datetime="..." backups/binlogs/mysql-bin.* | mysql ...
set -eu

BACKUP_DIR=/backups
DIAS="${RETENTION_DAYS:-7}"
mkdir -p "$BACKUP_DIR"

# Una vez al día, borra las copias de binlog de más de $DIAS días (mismo plazo
# que los volcados diarios), salvo la última, que es desde donde se reanuda.
(
  while true; do
    ULTIMO=$(ls "$BACKUP_DIR" 2>/dev/null | grep -E '^mysql-bin\.[0-9]+$' | sort | tail -1 || true)
    find "$BACKUP_DIR" -maxdepth 1 -type f -name 'mysql-bin.*' ! -name "${ULTIMO:-ninguno}" -mtime +"$DIAS" -print -delete || true
    sleep 86400
  done
) &

LAST_LOCAL=$(ls "$BACKUP_DIR" 2>/dev/null | grep -E '^mysql-bin\.[0-9]+$' | sort | tail -1 || true)

if [ -n "$LAST_LOCAL" ]; then
  START_FILE="$LAST_LOCAL"
  echo "Reanudando binlog streaming desde $START_FILE"
else
  START_FILE=$(mysql -h "$DB_HOST" -P "$DB_PORT" -uroot -p"$MYSQL_ROOT_PASSWORD" -N -e "SHOW BINARY LOGS" | head -1 | awk '{print $1}')
  echo "Primer arranque: empezando desde $START_FILE"
fi

exec mysqlbinlog \
  --read-from-remote-server \
  --host="$DB_HOST" --port="$DB_PORT" --user=root --password="$MYSQL_ROOT_PASSWORD" \
  --raw --stop-never \
  --result-file="$BACKUP_DIR/" \
  "$START_FILE"
