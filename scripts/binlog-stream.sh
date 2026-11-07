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

# Usuario propio con permisos solo de replicación (apr_binlog, ver
# database/init-binlog-user.sh), no root. Las credenciales van en un fichero de
# opciones (solo legible por este proceso), no en la línea de comandos: así no
# se ven en la lista de procesos.
CREDENCIALES=$(mktemp)
chmod 600 "$CREDENCIALES"
printf '[client]\nuser=%s\npassword="%s"\n' "$BINLOG_USER" "$BINLOG_PASSWORD" > "$CREDENCIALES"

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
  START_FILE=$(mysql --defaults-extra-file="$CREDENCIALES" -h "$DB_HOST" -P "$DB_PORT" -N -e "SHOW BINARY LOGS" | head -1 | awk '{print $1}')
  echo "Primer arranque: empezando desde $START_FILE"
fi

exec mysqlbinlog --defaults-extra-file="$CREDENCIALES" \
  --read-from-remote-server \
  --host="$DB_HOST" --port="$DB_PORT" \
  --raw --stop-never \
  --result-file="$BACKUP_DIR/" \
  "$START_FILE"
