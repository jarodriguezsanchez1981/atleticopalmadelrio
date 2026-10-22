#!/usr/bin/env bash
# Limpieza periódica de Docker (cron semanal): recupera espacio sin tocar nada
# en uso. Borra SOLO:
#   - imágenes colgantes (capas sin tag que dejan las reconstrucciones)
#   - caché de build no utilizada
# NO toca imágenes en uso (mysql:8.4, node, nginx, certbot, aquasec/trivy...),
# ni contenedores, ni volúmenes (el dato de MySQL vive en un volumen EN USO).
# Idempotente y seguro de ejecutar en cualquier momento.
set -uo pipefail
umask 077

log() { echo "$(date -u +%FT%TZ) $*"; }

log "== limpieza docker =="
log "disco antes:   $(df -h / | awk 'NR==2{print $5" usado, "$4" libre"}')"

img=$(docker image prune -f 2>&1 | grep -i "Total reclaimed space" || echo "nada")
bld=$(docker builder prune -f 2>&1 | grep -iE "^Total:" || echo "nada")

log "imágenes colgantes -> ${img}"
log "caché de build     -> ${bld}"
log "disco después: $(df -h / | awk 'NR==2{print $5" usado, "$4" libre"}')"
