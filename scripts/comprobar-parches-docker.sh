#!/usr/bin/env bash
#
# Comprueba parches de seguridad de las imágenes base del docker-compose:
#   1) si hay una versión más reciente (parcheada) de cada tag fijado, y
#   2) vulnerabilidades HIGH/CRITICAL con Trivy.
#
# Escribe un informe con fecha en ~/seguridad-docker/ (umask 077) y conserva
# los de los últimos 30 días. NO recrea ni reinicia contenedores: solo hace
# `docker pull` de los tags (descarga capas nuevas si las hay) y escanea.
#
# Pensado para una tarea programada cada 2 días (cron). Idempotente.
# Uso manual:  scripts/comprobar-parches-docker.sh
#
# Las imágenes son las bases del stack (docker-compose.yml y los Dockerfile):
#   - mysql:8.0        → db, backup, binlog-backup
#   - node:20-alpine   → backend, frontend (build), test
#   - nginx:alpine     → frontend (runtime) y reverse-proxy
#   - certbot/certbot  → certbot
# Si en el compose/Dockerfile se cambia un tag, actualizar esta lista.

set -uo pipefail
umask 077

IMAGENES=(
  "mysql:8.0"
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

# ---- Resumen ----
log "== Resumen =="
log "Imágenes con versión nueva disponible: $([ "$hay_actualizaciones" -eq 1 ] && echo 'SÍ — conviene reconstruir/redeplegar' || echo 'no')"
log "Vulnerabilidades HIGH/CRITICAL por imagen:"
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

  local hv=0
  [ $((total_high + total_critical)) -gt 0 ] && hv=1

  # Resumen compacto en una línea para la BD; las comillas simples se duplican
  # para no romper el INSERT (los valores son cifras y texto controlado).
  local resumen_bd resumen_sql
  resumen_bd="Actualizaciones de imagen: $([ "$hay_actualizaciones" -eq 1 ] && echo 'SÍ' || echo 'no'). "
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

# Conservar solo los informes de los últimos 30 días.
find "$DIR" -maxdepth 1 -name 'informe_*.log' -type f -mtime +30 -delete 2>/dev/null

exit 0
