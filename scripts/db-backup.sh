#!/bin/bash
# Copia diaria de la base de datos, cifrada con age (RGPD: los volcados llevan
# datos personales). En el servidor solo está la clave PÚBLICA (backup-key.pub):
# quien entre en él no puede leer las copias. La clave PRIVADA la guarda el
# responsable fuera del servidor.
#
# Si BACKUP_S3_URI está definido (p.ej. s3://bucket/intranet), cada copia se
# sube además a S3 con el rol de IAM de la instancia (solo s3:PutObject), para
# no depender de este servidor. Si la subida falla, la copia local se conserva.
#
# Binlog en S3: cada 15 minutos, los ficheros del binlog que copia el servicio
# binlog-backup (backups/binlogs/mysql-bin.NNNNNN) que hayan cambiado se cifran
# con la misma clave pública y se suben a <BACKUP_S3_URI>/binlogs/. El fichero
# abierto se vuelve a subir (sobrescribe) mientras crece: si se pierde el
# servidor, en S3 falta como mucho el último cuarto de hora.
#
# Prueba de restauración: los domingos (PRUEBA_RESTAURACION_DIA, 1 = lunes …
# 7 = domingo, UTC) el mismo volcado que se cifra se carga a la vez en un MySQL
# temporal que vive en memoria (tmpfs, nunca en el disco), se compara con la BD
# (tablas y filas) y se borra. No hace falta la clave privada: se prueba
# exactamente lo que se cifra. A mano: docker exec apr_mysql_backup /scripts/db-backup.sh --prueba
#
# Cada copia queda en el panel de Tareas automáticas (tabla tareas_ejecuciones,
# tarea "copias").
#
# Restaurar una copia (con la clave privada):
#   age -d -i clave_privada.txt backups/db_backup_<fecha>.sql.gz.age | gunzip \
#     | docker exec -i apr_mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"'
# y, para llegar a un momento concreto, los binlog posteriores (descifrados con
# age -d, igual) con mysqlbinlog --start-datetime=... --stop-datetime=...
set -euo pipefail
umask 077

BACKUP_DIR=/backups
BINLOG_DIR="$BACKUP_DIR/binlogs"
HORA_UTC="${BACKUP_HOUR_UTC:-3}"
DIAS="${RETENTION_DAYS:-7}"
DIA_PRUEBA="${PRUEBA_RESTAURACION_DIA:-7}"
MINUTOS_BINLOG="${BINLOG_S3_MINUTOS:-15}"
# Tablas cuyas filas deben coincidir en la prueba (cambian poco de madrugada).
TABLAS_PRUEBA="usuarios temporadas categorias plantillas jugadores plantilla_jugadores partidos partido_jugadores"
# MySQL temporal de la prueba: en un tmpfs (ver docker-compose.yml).
PRUEBA_DIR=/tmp/prueba/mysql
PRUEBA_SOCK=/tmp/prueba/mysql.sock
ESTADO_BINLOG="$BACKUP_DIR/.binlogs_s3"
FALLOS_BINLOG="$BACKUP_DIR/.binlogs_s3_fallos"
# La contraseña llega en un fichero (Docker secret, DB_PASS_FILE) o, si no, en DB_PASS.
export MYSQL_PWD="${DB_PASS:-$(cat "${DB_PASS_FILE:?Falta DB_PASS o DB_PASS_FILE}")}"

[ -s "$AGE_RECIPIENTS_FILE" ] || { echo "Falta la clave pública de cifrado ($AGE_RECIPIENTS_FILE)."; exit 1; }
mkdir -p "$BACKUP_DIR"

ahora() { date -u +%FT%TZ; }

# --- Registro en el panel de Tareas automáticas -----------------------------
LINEAS=""
ESTADO=ok
apunta() { echo "$(ahora) $*"; LINEAS="${LINEAS:+$LINEAS$'\n'}$*"; }
aviso() { apunta "AVISO: $*"; [ "$ESTADO" = error ] || ESTADO=avisos; }
fallo() { apunta "ERROR: $*"; ESTADO=error; }

bd() { mysql -h "$DB_HOST" -P "$DB_PORT" -u"$DB_USER" -N "$DB_NAME" "$@"; }
sql_texto() { printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e "s/'/\\\\'/g"; }

registrar() { # $1 = inicio (UTC)
  local resumen="${LINEAS##*$'\n'}"
  bd -e "INSERT INTO tareas_ejecuciones (tarea, inicio, fin, estado, resumen, detalle)
         VALUES ('copias', '$1', UTC_TIMESTAMP(), '$ESTADO', '$(sql_texto "${resumen:0:255}")', '$(sql_texto "${LINEAS:0:10000}")')" \
    || echo "$(ahora) AVISO: no se pudo guardar la ejecución en el panel de Tareas automáticas"
}

# --- S3 ---------------------------------------------------------------------
subir() {
  [ -n "${BACKUP_S3_URI:-}" ] || return 0
  if aws s3 cp "$1" "${BACKUP_S3_URI%/}/$(basename "$1")" --only-show-errors; then
    apunta "Subida a S3: $(basename "$1")"
  else
    aviso "no se pudo subir $(basename "$1") a S3 (la copia local se conserva)"
  fi
}

# Sube cifrados los ficheros del binlog nuevos o que han crecido desde la última
# vez. $ESTADO_BINLOG guarda "fichero tamaño" de lo ya subido.
subir_binlogs() {
  [ -n "${BACKUP_S3_URI:-}" ] && [ -d "$BINLOG_DIR" ] || return 0
  touch "$ESTADO_BINLOG"
  local nuevo f n t previo
  nuevo=$(mktemp)
  for f in "$BINLOG_DIR"/mysql-bin.[0-9]*; do
    [ -f "$f" ] || continue
    n=$(basename "$f")
    t=$(stat -c %s "$f")
    previo=$(awk -v n="$n" '$1 == n { print $2 }' "$ESTADO_BINLOG")
    if [ "$previo" = "$t" ]; then
      echo "$n $t" >> "$nuevo"
      continue
    fi
    # head -c: se sube exactamente lo que había al medirlo, aunque siga creciendo.
    if head -c "$t" "$f" | age -R "$AGE_RECIPIENTS_FILE" \
        | aws s3 cp - "${BACKUP_S3_URI%/}/binlogs/$n.age" --only-show-errors; then
      echo "$n $t" >> "$nuevo"
    else
      [ -z "$previo" ] || echo "$n $previo" >> "$nuevo"
      echo "$(ahora) ERROR: no se pudo subir el binlog $n a S3"
      echo "$(ahora) $n" >> "$FALLOS_BINLOG"
    fi
  done
  mv "$nuevo" "$ESTADO_BINLOG"
}

# Resumen del binlog en S3 para la copia diaria (y pone a cero los fallos).
resumen_binlogs() {
  [ -n "${BACKUP_S3_URI:-}" ] || { apunta "Binlog en S3: desactivado (sin BACKUP_S3_URI)."; return 0; }
  local subidos=0 fallos=0
  [ -f "$ESTADO_BINLOG" ] && subidos=$(wc -l < "$ESTADO_BINLOG")
  [ -f "$FALLOS_BINLOG" ] && fallos=$(wc -l < "$FALLOS_BINLOG")
  rm -f "$FALLOS_BINLOG"
  if [ "$fallos" -gt 0 ]; then
    aviso "binlog en S3: $fallos subidas fallidas desde la copia anterior ($subidos ficheros subidos)"
  else
    apunta "Binlog en S3: $subidos ficheros subidos, sin fallos desde la copia anterior."
  fi
}

# --- Prueba de restauración (MySQL temporal en tmpfs) -----------------------
temporal() { env -u MYSQL_PWD mysql --no-defaults -uroot -S "$PRUEBA_SOCK" -N "$@"; }

arrancar_temporal() {
  rm -rf "$PRUEBA_DIR" && mkdir -p "$PRUEBA_DIR"
  local opciones=(--no-defaults --user=root --datadir="$PRUEBA_DIR/datos" --tmpdir="$PRUEBA_DIR"
    --innodb-redo-log-capacity=8M --innodb-buffer-pool-size=64M --secure-file-priv=NULL
    --log-error="$PRUEBA_DIR/error.log")
  mysqld "${opciones[@]}" --initialize-insecure || return 1
  mysqld "${opciones[@]}" --socket="$PRUEBA_SOCK" --pid-file="$PRUEBA_DIR/mysqld.pid" \
    --skip-networking --mysqlx=OFF --skip-log-bin --performance-schema=OFF &
  local i
  for i in $(seq 60); do
    temporal -e "SELECT 1" >/dev/null 2>&1 && temporal -e "CREATE DATABASE prueba" && return 0
    sleep 1
  done
  return 1
}

parar_temporal() {
  temporal -e "SHUTDOWN" >/dev/null 2>&1 || true
  local i
  for i in $(seq 60); do
    [ -f "$PRUEBA_DIR/mysqld.pid" ] || break
    sleep 1
  done
  rm -rf "$PRUEBA_DIR"
}

# Compara la BD restaurada con la real: mismas tablas, las de $TABLAS_PRUEBA
# con las mismas filas y alguna fila en total.
comprobar_restauracion() {
  local consulta="SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE' ORDER BY 1"
  local origen copia
  origen=$(bd -e "$consulta") || { fallo "prueba de restauración: no se pudo leer la BD"; return 0; }
  copia=$(temporal prueba -e "$consulta") || { fallo "prueba de restauración: no se pudo leer la copia restaurada"; return 0; }
  if [ "$origen" != "$copia" ]; then
    fallo "prueba de restauración: las tablas no coinciden con la BD ($(echo "$copia" | grep -c .) de $(echo "$origen" | grep -c .))"
    return 0
  fi
  local tabla distintas="" total=0 a b
  for tabla in $TABLAS_PRUEBA; do
    echo "$origen" | grep -qx "$tabla" || continue
    a=$(bd -e "SELECT COUNT(*) FROM \`$tabla\`") || a="?"
    b=$(temporal prueba -e "SELECT COUNT(*) FROM \`$tabla\`") || b=0
    total=$((total + b))
    [ "$a" = "$b" ] || distintas="$distintas $tabla ($b de $a)"
  done
  if [ -n "$distintas" ]; then
    aviso "prueba de restauración: filas distintas en$distintas (puede ser un cambio durante la copia)"
  elif [ "$total" -eq 0 ]; then
    fallo "prueba de restauración: la copia restaurada no tiene filas"
  else
    apunta "Prueba de restauración correcta: $(echo "$copia" | grep -c .) tablas, $total filas comprobadas en $(echo "$TABLAS_PRUEBA" | wc -w) tablas principales."
  fi
}

# --- Copia diaria -----------------------------------------------------------
copia() { # $1 = 1 para hacer también la prueba de restauración
  local probar="${1:-0}" inicio
  inicio=$(date -u '+%F %T')
  LINEAS=""; ESTADO=ok
  local destino="$BACKUP_DIR/db_backup_$(date -u +%Y-%m-%dT%H-%M-%SZ).sql.gz.age"
  local volcado=(mysqldump -h "$DB_HOST" -P "$DB_PORT" -u"$DB_USER" --single-transaction --no-tablespaces "$DB_NAME")

  if [ "$probar" = 1 ] && ! arrancar_temporal; then
    fallo "prueba de restauración: no arrancó el MySQL temporal ($(tail -1 "$PRUEBA_DIR/error.log" 2>/dev/null))"
    parar_temporal
    probar=0
  fi

  local copia_ok=0 restaurada=0
  if [ "$probar" = 1 ]; then
    # El volcado comprimido va a la vez a age (por un fifo) y a la restauración.
    # tee -p: si la restauración falla, la copia cifrada sigue completa.
    local fifo="$PRUEBA_DIR/fifo" pid_age st st_age
    mkfifo "$fifo"
    age -R "$AGE_RECIPIENTS_FILE" < "$fifo" > "$destino.tmp" &
    pid_age=$!
    set +e
    "${volcado[@]}" | gzip | tee -p "$fifo" | gunzip | temporal prueba
    st=("${PIPESTATUS[@]}")
    wait "$pid_age"; st_age=$?
    set -e
    # Copia: mysqldump, gzip, tee y age bien. Restauración: gunzip y mysql bien.
    [ "${st[0]}${st[1]}${st[2]}$st_age" = 0000 ] && copia_ok=1
    [ "${st[3]}${st[4]}" = 00 ] && restaurada=1
  elif "${volcado[@]}" | gzip | age -R "$AGE_RECIPIENTS_FILE" > "$destino.tmp"; then
    copia_ok=1
  fi
  [ "$(head -c 21 "$destino.tmp" 2>/dev/null)" = "age-encryption.org/v1" ] || copia_ok=0

  if [ "$copia_ok" = 1 ]; then
    mv "$destino.tmp" "$destino"
    apunta "Copia cifrada: $(basename "$destino") ($(du -h "$destino" | cut -f1))"
    subir "$destino"
    if [ "$probar" = 1 ]; then
      if [ "$restaurada" = 1 ]; then comprobar_restauracion
      else fallo "prueba de restauración: la copia no se pudo cargar en un MySQL vacío ($(tail -1 "$PRUEBA_DIR/error.log" 2>/dev/null))"
      fi
    fi
  else
    rm -f "$destino.tmp"
    fallo "no se pudo hacer la copia"
  fi
  [ "$probar" != 1 ] || parar_temporal

  find "$BACKUP_DIR" -maxdepth 1 -type f -name 'db_backup_*' -mtime +"$DIAS" -print -delete
  resumen_binlogs
  case "$ESTADO" in
    ok) apunta "Copia del día correcta." ;;
    avisos) apunta "Copia del día hecha, con avisos." ;;
    error) apunta "La copia del día ha fallado: revisa el detalle." ;;
  esac
  registrar "$inicio"
}

if [ "${1:-}" = "--once" ]; then
  copia 0
  exit 0
fi

if [ "${1:-}" = "--prueba" ]; then
  copia 1
  exit 0
fi

# Sube a S3 copias ya existentes (p.ej. las anteriores a configurar S3).
if [ "${1:-}" = "--subir-existentes" ]; then
  for f in "$BACKUP_DIR"/*.age; do
    [ -f "$f" ] && subir "$f"
  done
  subir_binlogs
  exit 0
fi

# Binlog a S3 cada $MINUTOS_BINLOG minutos, en segundo plano.
(
  while true; do
    subir_binlogs || echo "$(ahora) ERROR: fallo al subir el binlog a S3"
    sleep $((MINUTOS_BINLOG * 60))
  done
) &

while true; do
  ahora_s=$(date -u +%s)
  siguiente=$(date -u -d "today ${HORA_UTC}:00" +%s)
  [ "$siguiente" -gt "$ahora_s" ] || siguiente=$(date -u -d "tomorrow ${HORA_UTC}:00" +%s)
  echo "Próxima copia: $(date -u -d "@$siguiente" +%FT%TZ)"
  sleep $((siguiente - ahora_s))
  if [ "$(date -u +%u)" = "$DIA_PRUEBA" ]; then copia 1; else copia 0; fi
done
