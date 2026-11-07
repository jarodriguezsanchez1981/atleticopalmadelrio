#!/bin/bash
# Crea (una vez) el usuario de MySQL de binlog-backup en una BD que ya existe:
# genera BINLOG_PASSWORD en el env file si aún no está y crea apr_binlog con
# permisos solo de replicación. No muestra la contraseña. En una BD nueva no
# hace falta: lo hace database/init-binlog-user.sh.
# Uso (desde la carpeta del proyecto):  ./scripts/crear-usuario-binlog.sh [.env.development]
set -euo pipefail

ENV_FILE="${1:-.env.development}"
[ -f "$ENV_FILE" ] || { echo "No existe $ENV_FILE (ejecútalo desde la carpeta del proyecto)." >&2; exit 1; }

if ! grep -q '^BINLOG_PASSWORD=' "$ENV_FILE"; then
  printf '\n# Usuario solo de replicación de binlog-backup (apr_binlog)\nBINLOG_PASSWORD=%s\n' "$(openssl rand -hex 24)" >> "$ENV_FILE"
  echo "BINLOG_PASSWORD añadida a $ENV_FILE."
fi
BP="$(grep -m1 '^BINLOG_PASSWORD=' "$ENV_FILE" | cut -d= -f2-)"

# El SQL va por la entrada estándar (no en la línea de comandos) y la
# contraseña de root la pone el propio contenedor.
docker exec -i apr_mysql sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot -N' <<SQL
CREATE USER IF NOT EXISTS 'apr_binlog'@'%' IDENTIFIED BY '${BP}';
ALTER USER 'apr_binlog'@'%' IDENTIFIED BY '${BP}';
GRANT REPLICATION SLAVE, REPLICATION CLIENT ON *.* TO 'apr_binlog'@'%';
SHOW GRANTS FOR 'apr_binlog'@'%';
SQL
echo "listo"
