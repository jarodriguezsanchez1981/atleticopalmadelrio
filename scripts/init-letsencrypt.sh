#!/usr/bin/env bash
set -euo pipefail

EMAIL="${1:?Uso: scripts/init-letsencrypt.sh <email>}"
DOMAIN="intranet.atleticopalmadelrio.com"
ENV_FILE=".env.production"

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$BASE_DIR"

CONF_DIR="$BASE_DIR/certbot/conf"
WWW_DIR="$BASE_DIR/certbot/www"
LIVE_DIR="$CONF_DIR/live/$DOMAIN"

mkdir -p "$WWW_DIR"

# 1. Certificado autofirmado temporal para que nginx pueda arrancar
if [[ ! -f "$LIVE_DIR/fullchain.pem" ]]; then
  echo "Generando certificado autofirmado temporal para $DOMAIN ..."
  mkdir -p "$LIVE_DIR"
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout "$LIVE_DIR/privkey.pem" -out "$LIVE_DIR/fullchain.pem" \
    -subj "/CN=$DOMAIN"
fi

# 2. Levantar nginx para servir el reto webroot
echo "Arrancando nginx..."
docker compose --env-file "$ENV_FILE" up -d nginx

# 3. Obtener el certificado real con Let's Encrypt
echo "Solicitando certificado a Let's Encrypt..."
docker compose --env-file "$ENV_FILE" run --rm --entrypoint certbot certbot certonly \
  --webroot -w /var/www/certbot \
  -d "$DOMAIN" \
  --email "$EMAIL" --agree-tos --no-eff-email

# 4. Recargar nginx con el certificado real
echo "Recargando nginx..."
docker compose --env-file "$ENV_FILE" exec nginx nginx -s reload

echo "Certificado emitido y nginx recargado. Recuerda: ./scripts/init-letsencrypt.sh <email> para renovar/emitir."
