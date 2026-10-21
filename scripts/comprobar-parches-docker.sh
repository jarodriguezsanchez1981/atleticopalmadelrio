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

DIR="${SEGURIDAD_DOCKER_DIR:-$HOME/seguridad-docker}"
TRIVY_CACHE="${TRIVY_CACHE_DIR:-$DIR/trivy-cache}"
mkdir -p "$DIR" "$TRIVY_CACHE"

TS="$(date +%Y%m%d_%H%M%S)"
LOG="$DIR/informe_${TS}.log"

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
done
log ""

# ---- Resumen ----
log "== Resumen =="
log "Imágenes con versión nueva disponible: $([ "$hay_actualizaciones" -eq 1 ] && echo 'SÍ — conviene reconstruir/redeplegar' || echo 'no')"
log "Vulnerabilidades HIGH/CRITICAL por imagen:"
printf "%b" "$resumen_vulns" | tee -a "$LOG"
log "Informe completo: $LOG"

# Conservar solo los informes de los últimos 30 días.
find "$DIR" -maxdepth 1 -name 'informe_*.log' -type f -mtime +30 -delete 2>/dev/null

exit 0
