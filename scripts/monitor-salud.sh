#!/usr/bin/env bash
# Chequeo de salud del servidor + aviso externo vía Healthchecks.io.
# Pensado para una tarea programada (cron), p. ej. cada 15 min. Comprueba:
#   1) uso del disco raíz
#   2) días hasta la caducidad del certificado TLS
#   3) que el sitio responde 200 en /health (HTTPS extremo a extremo)
#   4) que los contenedores esperados están en marcha (y MySQL "healthy")
#   5) que el último backup cifrado es reciente
#
# Si todo va bien hace ping a $HEALTHCHECKS_URL; si algo falla, a
# $HEALTHCHECKS_URL/fail con el detalle en el cuerpo (Healthchecks lo muestra y
# avisa). Si el servidor se cae del todo, el ping deja de llegar y Healthchecks
# avisa igualmente (dead-man switch) — por eso el aviso es EXTERNO.
#
# La URL de ping NO se versiona (es semi-secreta): se lee de .env.development
#   HEALTHCHECKS_URL=https://hc-ping.com/<uuid>
# Sin esa variable, el script solo imprime el diagnóstico (modo prueba, sin ping).
#
# Uso:  scripts/monitor-salud.sh
set -uo pipefail
umask 077

DOMINIO="${DOMAIN_MONITOR:-intranet.atleticopalmadelrio.com}"
UMBRAL_DISCO="${UMBRAL_DISCO:-85}"          # % de uso de / que dispara alarma
DIAS_CERT_MIN="${DIAS_CERT_MIN:-14}"        # días mínimos antes de caducar
HORAS_BACKUP_MAX="${HORAS_BACKUP_MAX:-30}"  # antigüedad máxima del último backup (diario)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROYECTO_DIR="$(dirname "$SCRIPT_DIR")"
HC_URL="${HEALTHCHECKS_URL:-}"
if [ -z "$HC_URL" ] && [ -f "$PROYECTO_DIR/.env.development" ]; then
  HC_URL="$(grep -m1 '^HEALTHCHECKS_URL=' "$PROYECTO_DIR/.env.development" | cut -d= -f2-)"
fi

problemas=()

# 1) Disco raíz
uso=$(df --output=pcent / 2>/dev/null | tail -1 | tr -dc '0-9')
if [ -n "$uso" ] && [ "$uso" -ge "$UMBRAL_DISCO" ]; then
  problemas+=("Disco al ${uso}% (umbral ${UMBRAL_DISCO}%)")
fi

# 2) Caducidad del certificado TLS
fin=$(echo | openssl s_client -servername "$DOMINIO" -connect 127.0.0.1:443 2>/dev/null \
  | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
dias=""
if [ -n "$fin" ]; then
  fin_ts=$(date -d "$fin" +%s 2>/dev/null || echo 0)
  if [ "$fin_ts" -gt 0 ]; then
    dias=$(( (fin_ts - $(date +%s)) / 86400 ))
    [ "$dias" -lt "$DIAS_CERT_MIN" ] && problemas+=("El certificado caduca en ${dias} días")
  fi
else
  problemas+=("No se pudo leer el certificado TLS")
fi

# 3) Salud HTTPS del sitio (extremo a extremo: TLS + reverse-proxy + backend)
code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "https://$DOMINIO/health" 2>/dev/null)
[ "$code" = "200" ] || problemas+=("El sitio no responde 200 en /health (código: ${code:-sin respuesta})")

# 4) Contenedores esperados en marcha
for c in apr_mysql apr_backend apr_frontend apr_reverse_proxy; do
  estado=$(docker inspect -f '{{.State.Status}}' "$c" 2>/dev/null || echo "ausente")
  [ "$estado" = "running" ] || problemas+=("Contenedor $c no está en marcha (estado: $estado)")
done
salud=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{end}}' apr_mysql 2>/dev/null)
[ -n "$salud" ] && [ "$salud" != "healthy" ] && problemas+=("apr_mysql no está healthy (estado: $salud)")

# 5) Frescura del último backup cifrado (el dir lo escribe el contenedor)
ult=$(docker exec apr_mysql_backup sh -c 'ls -1t /backups/db_backup_*.sql.gz.age 2>/dev/null | head -1' 2>/dev/null)
if [ -n "$ult" ]; then
  mt=$(docker exec apr_mysql_backup stat -c %Y "$ult" 2>/dev/null || echo 0)
  if [ "$mt" -gt 0 ]; then
    horas=$(( ( $(date +%s) - mt ) / 3600 ))
    [ "$horas" -gt "$HORAS_BACKUP_MAX" ] && problemas+=("El último backup es de hace ${horas}h (máx ${HORAS_BACKUP_MAX}h)")
  fi
else
  problemas+=("No se encuentra ningún backup cifrado")
fi

# --- Resultado ---
if [ "${#problemas[@]}" -eq 0 ]; then
  msg="OK ($(date -u +%FT%TZ)): disco ${uso:-?}%, certificado ${dias:-?}d, /health ${code}, contenedores y backup correctos."
  estado_final=ok
else
  msg="FALLOS ($(date -u +%FT%TZ)):"$'\n'"$(printf ' - %s\n' "${problemas[@]}")"
  estado_final=fail
fi
echo "$msg"

if [ -n "$HC_URL" ]; then
  destino="$HC_URL"
  [ "$estado_final" = fail ] && destino="${HC_URL%/}/fail"
  curl -fsS -m 10 --retry 3 --data-raw "$msg" "$destino" >/dev/null 2>&1 \
    && echo "(ping enviado a Healthchecks: ${estado_final})" \
    || echo "(aviso: no se pudo contactar con Healthchecks)"
else
  echo "(sin HEALTHCHECKS_URL en el entorno: modo prueba, no se envía ping)"
fi

[ "$estado_final" = ok ]
