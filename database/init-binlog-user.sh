#!/bin/bash
# Usuario de MySQL para el servicio binlog-backup: solo puede leer el binary
# log (REPLICATION SLAVE + REPLICATION CLIENT), sin acceso a los datos.
# Lo ejecuta la imagen oficial de MySQL al crear la BD por primera vez
# (docker-entrypoint-initdb.d). En una BD que ya existe se crea una vez a mano
# (ver README, "Backup continuo (binlog)").
set -eu
if [ -z "${BINLOG_PASSWORD:-}" ]; then
  echo "init-binlog-user: falta BINLOG_PASSWORD, no se crea el usuario de binlog." >&2
  exit 0
fi
clave=${BINLOG_PASSWORD//\'/\'\'}
docker_process_sql --database=mysql <<SQL
CREATE USER IF NOT EXISTS '${BINLOG_USER:-apr_binlog}'@'%' IDENTIFIED BY '${clave}';
GRANT REPLICATION SLAVE, REPLICATION CLIENT ON *.* TO '${BINLOG_USER:-apr_binlog}'@'%';
SQL
