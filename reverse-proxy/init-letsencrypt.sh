#!/usr/bin/env bash
# Pide el primer certificado de Let's Encrypt para el dominio definido en
# DOMAIN (.env.development) y arranca el reverse proxy + la renovación
# automática (servicio "certbot" del docker-compose).
#
# Ejecutar UNA SOLA VEZ en el servidor, desde la raíz del proyecto:
#   ./reverse-proxy/init-letsencrypt.sh
#
# Requisitos previos (fuera de este script):
#   - DOMAIN=intranet.atleticopalmadelrio.com en .env.development
#   - El registro DNS (A) del dominio ya apunta a la IP pública de este servidor
#   - Puertos 80 y 443 abiertos en el grupo de seguridad
set -euo pipefail
cd "$(dirname "$0")/.."

ENV_FILE=".env.development"
COMPOSE="docker compose --env-file $ENV_FILE"

if [ ! -f "$ENV_FILE" ]; then
  echo "No encuentro $ENV_FILE en $(pwd)."
  exit 1
fi

DOMAIN=$(grep -E '^DOMAIN=' "$ENV_FILE" | cut -d '=' -f2- | tr -d '\r')
if [ -z "$DOMAIN" ]; then
  echo "Añade DOMAIN=intranet.atleticopalmadelrio.com a $ENV_FILE antes de ejecutar este script."
  exit 1
fi
EMAIL=$(grep -E '^CERTBOT_EMAIL=' "$ENV_FILE" | cut -d '=' -f2- | tr -d '\r' || true)

CERTBOT_LIVE_DIR="./reverse-proxy/certbot/conf/live/$DOMAIN"
mkdir -p "$CERTBOT_LIVE_DIR" ./reverse-proxy/certbot/www

echo "== Dominio: $DOMAIN =="

if [ ! -f "$CERTBOT_LIVE_DIR/fullchain.pem" ]; then
  echo "== 1/4: certificado autofirmado temporal (para que nginx pueda arrancar) =="
  docker run --rm -v "$(pwd)/reverse-proxy/certbot/conf:/etc/letsencrypt" alpine sh -c "
    apk add --no-cache openssl >/dev/null &&
    mkdir -p /etc/letsencrypt/live/$DOMAIN &&
    openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
      -keyout /etc/letsencrypt/live/$DOMAIN/privkey.pem \
      -out /etc/letsencrypt/live/$DOMAIN/fullchain.pem \
      -subj /CN=localhost
  "
else
  echo "== 1/4: ya existe un certificado, se omite el autofirmado =="
fi

echo "== 2/4: arrancando el reverse proxy con el certificado temporal =="
# --force-recreate: si quedó en bucle de reinicio de un intento anterior,
# así arranca ya en vez de esperar al backoff de Docker.
$COMPOSE up -d --force-recreate reverse-proxy

# Hay que esperar a que nginx esté escuchando ANTES de borrar el certificado
# temporal: si se borra mientras aún arranca, no encuentra fullchain.pem,
# entra en bucle de reinicio y Let's Encrypt recibe "Connection refused".
echo "   esperando a que nginx escuche en el puerto 80..."
for i in $(seq 1 30); do
  if $COMPOSE exec -T reverse-proxy nc -z 127.0.0.1 80 2>/dev/null; then
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "nginx no ha arrancado. Revisa: docker logs apr_reverse_proxy"
    exit 1
  fi
  sleep 2
done

echo "== 3/4: pidiendo el certificado real a Let's Encrypt =="
# Se borra desde un contenedor porque certbot crea estas carpetas como root.
docker run --rm -v "$(pwd)/reverse-proxy/certbot/conf:/etc/letsencrypt" alpine sh -c "
  rm -rf /etc/letsencrypt/live/$DOMAIN \
         /etc/letsencrypt/archive/$DOMAIN \
         /etc/letsencrypt/renewal/$DOMAIN.conf
"

EMAIL_ARG="--register-unsafely-without-email"
[ -n "$EMAIL" ] && EMAIL_ARG="--email $EMAIL --no-eff-email"

$COMPOSE run --rm --entrypoint "certbot certonly --webroot -w /var/www/certbot -d $DOMAIN $EMAIL_ARG --agree-tos --non-interactive" certbot

echo "== 4/4: recargando nginx con el certificado real y activando la renovación automática =="
$COMPOSE exec reverse-proxy nginx -s reload
$COMPOSE up -d certbot

echo "Listo: https://$DOMAIN"
