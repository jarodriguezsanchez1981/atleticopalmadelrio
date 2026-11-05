#!/usr/bin/env bash
#
# Comprueba parches de seguridad del stack:
#   1) si hay una versión más reciente (parcheada) de cada imagen base fijada,
#   2) vulnerabilidades HIGH/CRITICAL de las imágenes con Trivy, y
#   3) vulnerabilidades HIGH/CRITICAL de las dependencias npm (package-lock.json
#      de backend y frontend) con Trivy en modo filesystem.
#
# Escribe un informe con fecha en ~/seguridad-docker/ (umask 077) y conserva
# los de los últimos 30 días. Hace `docker pull` de los tags, APLICA los
# parches (reconstruye y recrea solo los contenedores cuya imagen ha cambiado;
# permiso del usuario del 05/11/2026; APLICAR_PARCHES=0 para solo comprobar)
# y escanea.
#
# Pensado para una tarea programada cada 2 días (cron). Idempotente.
# Uso manual:  scripts/comprobar-parches-docker.sh
#
# Las imágenes son las bases del stack (docker-compose.yml y los Dockerfile):
#   - mysql:8.4        → db, backup, binlog-backup
#   - node:20-alpine   → backend, frontend (build), test
#   - nginx:alpine     → frontend (runtime) y reverse-proxy
#   - certbot/certbot  → certbot
# Si en el compose/Dockerfile se cambia un tag, actualizar esta lista.

set -uo pipefail
umask 077

IMAGENES=(
  "mysql:8.4"
  "node:20-alpine"
  "nginx:alpine"
  "certbot/certbot"
)

# Carpeta del proyecto (este script vive en <proyecto>/scripts/): desde ahí se
# leen las credenciales de la BD para guardar el resumen del informe.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROYECTO_DIR="$(dirname "$SCRIPT_DIR")"

DIR="${SEGURIDAD_DOCKER_DIR:-$HOME/seguridad-docker}"
TRIVY_CACHE="${TRIVY_CACHE_DIR:-$DIR/trivy-cache}"
mkdir -p "$DIR" "$TRIVY_CACHE"

TS="$(date +%Y%m%d_%H%M%S)"
FECHA_BD="$(date '+%Y-%m-%d %H:%M:%S')"
LOG="$DIR/informe_${TS}.log"
total_high=0
total_critical=0

log() { echo "$@" | tee -a "$LOG"; }

log "== Comprobación de parches de seguridad de Docker =="
log "Fecha: $(date '+%Y-%m-%d %H:%M:%S %Z')"
log "Host:  $(hostname)"
log ""

if ! command -v docker >/dev/null 2>&1; then
  log "❌ No se encuentra el comando docker. Abortando."
  exit 1
fi

digest() { docker image inspect --format '{{range .RepoDigests}}{{.}}{{end}}' "$1" 2>/dev/null; }

# ---- 1) Imágenes desactualizadas (tag fijado con versión parcheada nueva) ----
hay_actualizaciones=0
log "-- 1) Imágenes desactualizadas (tags fijados) --"
for img in "${IMAGENES[@]}"; do
  antes="$(digest "$img")"
  if ! docker pull -q "$img" >/dev/null 2>>"$LOG"; then
    log "  ⚠️  $img: no se pudo hacer pull (¿sin conexión o rate limit de Docker Hub?)"
    continue
  fi
  despues="$(digest "$img")"
  if [ -z "$antes" ]; then
    log "  ℹ️  $img: no estaba en local; descargada."
  elif [ "$antes" != "$despues" ]; then
    log "  🔄 $img: HAY una versión más reciente (parcheada)."
    log "        antes: $antes"
    log "        ahora: $despues"
    hay_actualizaciones=1
  else
    log "  ✅ $img: al día."
  fi
done
log ""

# ---- 1b) Aplicar parches (permiso del usuario del 05/11/2026) ----
# backend, frontend y reverse-proxy hacen `apk upgrade` al construir: si su
# contenedor tiene paquetes de Alpine por actualizar se reconstruyen sin caché.
# El resto (db, backup, binlog-backup, certbot) cambia solo si su imagen base es
# nueva. Se recrean únicamente los contenedores cuya imagen ha cambiado; antes
# de tocar la BD se hace una copia. Solo en el EC2 (con .env.development).
APLICAR_PARCHES="${APLICAR_PARCHES:-1}"
parches_aplicados=""
aplicar_parches() {
  local env_file="$PROYECTO_DIR/.env.development"
  if [ "$APLICAR_PARCHES" != "1" ]; then
    log "  ℹ️  APLICAR_PARCHES=$APLICAR_PARCHES: solo se comprueba."
    return
  fi
  if [ ! -f "$env_file" ]; then
    log "  ℹ️  No se aplican: no se encuentra $env_file (¿fuera del EC2?)."
    return
  fi
  local dc=(docker compose --project-directory "$PROYECTO_DIR" --env-file "$env_file")
  local proyecto s n actual nueva
  proyecto="$(basename "$PROYECTO_DIR")"
  declare -A contenedor=(
    [db]=apr_mysql [backup]=apr_mysql_backup [binlog-backup]=apr_mysql_binlog_backup
    [backend]=apr_backend [frontend]=apr_frontend [reverse-proxy]=apr_reverse_proxy [certbot]=apr_certbot
  )
  declare -A imagen=(
    [db]=mysql:8.4 [certbot]=certbot/certbot
    [backup]="$proyecto-backup" [binlog-backup]="$proyecto-binlog-backup"
    [backend]="$proyecto-backend" [frontend]="$proyecto-frontend" [reverse-proxy]="$proyecto-reverse-proxy"
  )

  local sin_cache=()
  for s in backend frontend reverse-proxy; do
    n="$(docker exec -u 0 "${contenedor[$s]}" apk --no-cache -U list -u 2>/dev/null | grep -c .)"
    if [ "${n:-0}" -gt 0 ]; then
      log "  · $s: $n paquetes de Alpine por actualizar."
      sin_cache+=("$s")
    fi
  done
  if [ ${#sin_cache[@]} -gt 0 ] && ! "${dc[@]}" build --pull --no-cache "${sin_cache[@]}" >>"$LOG" 2>&1; then
    log "  ⚠️  Falló la construcción sin caché de: ${sin_cache[*]} (no se recrea nada)."
    return
  fi
  if ! "${dc[@]}" build --pull backend frontend reverse-proxy backup binlog-backup >>"$LOG" 2>&1; then
    log "  ⚠️  Falló la construcción de las imágenes (no se recrea nada)."
    return
  fi

  local recrear=()
  for s in db backup binlog-backup backend frontend reverse-proxy certbot; do
    actual="$(docker inspect -f '{{.Image}}' "${contenedor[$s]}" 2>/dev/null)"
    nueva="$(docker image inspect -f '{{.Id}}' "${imagen[$s]}" 2>/dev/null)"
    [ -n "$actual" ] && [ -n "$nueva" ] && [ "$actual" != "$nueva" ] && recrear+=("$s")
  done
  if [ ${#recrear[@]} -eq 0 ]; then
    log "  ✅ Todos los contenedores ya usan la imagen más reciente."
    return
  fi
  log "  🔄 Se recrean: ${recrear[*]}"
  local objetivo=("${recrear[@]}")

  if [[ " ${recrear[*]} " == *" db "* ]]; then
    if docker exec apr_mysql_backup bash /scripts/db-backup.sh --once >>"$LOG" 2>&1; then
      log "  ✅ Copia de la BD hecha antes de recrear db."
      "${dc[@]}" up -d --no-deps --force-recreate db >>"$LOG" 2>&1
      for _ in $(seq 1 24); do
        [ "$(docker inspect -f '{{.State.Health.Status}}' apr_mysql 2>/dev/null)" = "healthy" ] && break
        sleep 5
      done
      log "  · db: $(docker inspect -f '{{.State.Health.Status}}' apr_mysql 2>/dev/null)"
    else
      log "  ⚠️  Falló la copia de la BD: no se recrea db."
    fi
    local resto=()
    for s in "${recrear[@]}"; do [ "$s" != "db" ] && resto+=("$s"); done
    recrear=("${resto[@]}")
  fi
  if [ ${#recrear[@]} -gt 0 ]; then
    "${dc[@]}" up -d --no-deps --force-recreate "${recrear[@]}" >>"$LOG" 2>&1
  fi
  docker rm -f apr_backend_test >/dev/null 2>&1

  sleep 20
  local mal=()
  for s in db backup binlog-backup backend frontend reverse-proxy certbot; do
    [ "$(docker inspect -f '{{.State.Running}}' "${contenedor[$s]}" 2>/dev/null)" = "true" ] || mal+=("$s")
    actual="$(docker inspect -f '{{.Image}}' "${contenedor[$s]}" 2>/dev/null)"
    nueva="$(docker image inspect -f '{{.Id}}' "${imagen[$s]}" 2>/dev/null)"
    [ "$actual" = "$nueva" ] && [[ " ${objetivo[*]} " == *" $s "* ]] && parches_aplicados+="$s "
  done
  if [ ${#mal[@]} -gt 0 ]; then
    log "  ❌ No están en marcha tras actualizar: ${mal[*]}"
    parches_aplicados+="(ERROR: parados ${mal[*]}) "
  else
    log "  ✅ Parches aplicados; todos los contenedores en marcha."
    hay_actualizaciones=0
  fi
}
log "-- 1b) Aplicar parches --"
aplicar_parches
log ""

# ---- 2) Vulnerabilidades HIGH/CRITICAL (Trivy en contenedor) ----
# La BD de CVEs se cachea en $TRIVY_CACHE entre ejecuciones (menos descargas).
log "-- 2) Vulnerabilidades HIGH/CRITICAL (Trivy) --"
resumen_vulns=""
for img in "${IMAGENES[@]}"; do
  log "  · $img"
  salida="$(docker run --rm \
    -v /var/run/docker.sock:/var/run/docker.sock \
    -v "$TRIVY_CACHE:/root/.cache/" \
    aquasec/trivy:latest image --quiet --scanners vuln \
    --severity HIGH,CRITICAL --no-progress "$img" 2>>"$LOG")"
  if [ -z "$salida" ]; then
    log "      (Trivy no devolvió datos; revisa el log más arriba)"
    resumen_vulns+="    $img: sin datos\n"
    continue
  fi
  printf '%s\n' "$salida" >> "$LOG"
  # Línea "Total: N (HIGH: x, CRITICAL: y)" que imprime Trivy por objetivo.
  totales="$(printf '%s\n' "$salida" | grep -E 'Total: [0-9]+ \(' | head -1)"
  [ -z "$totales" ] && totales="Total: 0 (HIGH: 0, CRITICAL: 0)"
  log "      $totales"
  resumen_vulns+="    $img: $totales\n"
  # Acumular HIGH y CRITICAL de todas las imágenes para el resumen de la BD.
  h="$(printf '%s' "$totales" | sed -nE 's/.*HIGH: ([0-9]+).*/\1/p')"
  c="$(printf '%s' "$totales" | sed -nE 's/.*CRITICAL: ([0-9]+).*/\1/p')"
  total_high=$((total_high + ${h:-0}))
  total_critical=$((total_critical + ${c:-0}))
done
log ""

# ---- 3) Vulnerabilidades en dependencias npm (Trivy fs sobre los lockfiles) ----
# Trivy lee package-lock.json directamente (no hace falta node_modules), así que
# detecta CVEs de las librerías de la app, no solo de las imágenes base. Se monta
# el repo en solo lectura. Si no se encuentra el lockfile, se omite esa carpeta.
log "-- 3) Vulnerabilidades HIGH/CRITICAL en dependencias npm (Trivy fs) --"
resumen_deps=""
for dep in "backend" "frontend"; do
  if [ ! -f "$PROYECTO_DIR/$dep/package-lock.json" ]; then
    log "  · $dep: sin package-lock.json, se omite."
    continue
  fi
  log "  · $dep"
  salida="$(docker run --rm \
    -v "$PROYECTO_DIR:/repo:ro" \
    -v "$TRIVY_CACHE:/root/.cache/" \
    aquasec/trivy:latest fs --quiet --scanners vuln \
    --severity HIGH,CRITICAL --no-progress "/repo/$dep/package-lock.json" 2>>"$LOG")"
  if [ -z "$salida" ]; then
    log "      (Trivy no devolvió datos; revisa el log más arriba)"
    resumen_deps+="    npm:$dep: sin datos\n"
    continue
  fi
  printf '%s\n' "$salida" >> "$LOG"
  totales="$(printf '%s\n' "$salida" | grep -E 'Total: [0-9]+ \(' | head -1)"
  [ -z "$totales" ] && totales="Total: 0 (HIGH: 0, CRITICAL: 0)"
  log "      $totales"
  resumen_deps+="    npm:$dep: $totales\n"
  h="$(printf '%s' "$totales" | sed -nE 's/.*HIGH: ([0-9]+).*/\1/p')"
  c="$(printf '%s' "$totales" | sed -nE 's/.*CRITICAL: ([0-9]+).*/\1/p')"
  total_high=$((total_high + ${h:-0}))
  total_critical=$((total_critical + ${c:-0}))
done
# Las dependencias se suman al mismo resumen que las imágenes.
resumen_vulns+="$resumen_deps"
log ""

# ---- Resumen ----
log "== Resumen =="
log "Imágenes con versión nueva disponible: $([ "$hay_actualizaciones" -eq 1 ] && echo 'SÍ — conviene reconstruir/redeplegar' || echo 'no')"
log "Parches aplicados: ${parches_aplicados:-ninguno}"
log "Vulnerabilidades HIGH/CRITICAL (imágenes y dependencias npm):"
printf "%b" "$resumen_vulns" | tee -a "$LOG"
log "Informe completo: $LOG"

# ---- Guardar el resumen en la BD (para el aviso dentro de la intranet) ----
# Best-effort: si la BD no está disponible, no se aborta (el log ya está escrito).
# Lee solo las variables necesarias del .env.development del proyecto; nunca
# hace `source` del fichero entero (tiene secretos con caracteres especiales).
guardar_en_bd() {
  local env_file="$PROYECTO_DIR/.env.development"
  if [ ! -f "$env_file" ]; then
    log "  ℹ️  No se guarda en la BD: no se encuentra $env_file (¿fuera del EC2?)."
    return 0
  fi
  if ! docker ps --format '{{.Names}}' 2>/dev/null | grep -qx 'apr_mysql'; then
    log "  ℹ️  No se guarda en la BD: el contenedor apr_mysql no está en marcha."
    return 0
  fi
  local dbpw dbn
  dbpw="$(grep -m1 '^MYSQL_ROOT_PASSWORD=' "$env_file" | cut -d= -f2-)"
  dbn="$(grep -m1 '^DB_NAME=' "$env_file" | cut -d= -f2-)"
  if [ -z "$dbpw" ] || [ -z "$dbn" ]; then
    log "  ⚠️  No se guarda en la BD: faltan MYSQL_ROOT_PASSWORD o DB_NAME."
    return 0
  fi

  # ¿avisar por vulnerabilidades en la intranet? Para no molestar cada 2 días
  # con los HIGH que no tienen parche disponible (p. ej. mysql:8.4), solo se
  # avisa si hay algún CRITICAL, o si el nº de HIGH ha AUMENTADO respecto al
  # último informe (vulnerabilidades nuevas). El primer informe también avisa.
  local prev_high hv=0
  prev_high="$(docker exec -i apr_mysql mysql -uroot -p"$dbpw" "$dbn" -N -s \
    -e 'SELECT total_high FROM informes_seguridad ORDER BY id DESC LIMIT 1;' 2>>"$LOG")"
  if [ "$total_critical" -gt 0 ]; then
    hv=1
  elif [ -z "$prev_high" ]; then
    [ "$total_high" -gt 0 ] && hv=1          # primer informe
  elif [ "$total_high" -gt "$prev_high" ]; then
    hv=1                                      # han aparecido HIGH nuevos
  fi

  # Resumen compacto en una línea para la BD; las comillas simples se duplican
  # para no romper el INSERT (los valores son cifras y texto controlado).
  local resumen_bd resumen_sql
  resumen_bd="Actualizaciones de imagen: $([ "$hay_actualizaciones" -eq 1 ] && echo 'SÍ' || echo 'no'). "
  [ -n "$parches_aplicados" ] && resumen_bd+="Parches aplicados: ${parches_aplicados% }. "
  resumen_bd+="$(printf '%b' "$resumen_vulns" | sed 's/^ *//; /^$/d' | paste -sd '|' -)"
  resumen_sql="${resumen_bd//\'/\'\'}"

  if docker exec -i apr_mysql mysql -uroot -p"$dbpw" "$dbn" 2>>"$LOG" <<SQL
INSERT INTO informes_seguridad
  (fecha, hay_actualizaciones, hay_vulnerabilidades, total_high, total_critical, resumen)
VALUES
  ('$FECHA_BD', $hay_actualizaciones, $hv, $total_high, $total_critical, '$resumen_sql');
SQL
  then
    log "  ✅ Resumen guardado en la BD (tabla informes_seguridad)."
  else
    log "  ⚠️  No se pudo guardar el resumen en la BD (revisa el log)."
  fi
}
guardar_en_bd

# Aviso por correo al administrador (sustituye al banner que antes se mostraba
# en la web). El script del backend decide si enviar: solo cuando hay algo
# pendiente y ha cambiado respecto al informe anterior. Best-effort.
avisar_por_email() {
  if ! docker ps --format '{{.Names}}' 2>/dev/null | grep -qx 'apr_backend'; then
    log "  ℹ️  No se envía aviso por correo: el contenedor apr_backend no está en marcha."
    return
  fi
  if salida="$(docker exec apr_backend node src/scripts/avisar-seguridad.js 2>&1)"; then
    log "  📧 Aviso de seguridad: ${salida}"
  else
    log "  ⚠️  Aviso de seguridad por correo falló: ${salida}"
  fi
}
avisar_por_email

# Conservar solo los informes de los últimos 30 días.
find "$DIR" -maxdepth 1 -name 'informe_*.log' -type f -mtime +30 -delete 2>/dev/null

exit 0
