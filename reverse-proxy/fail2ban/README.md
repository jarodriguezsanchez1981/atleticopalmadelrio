# fail2ban del reverse-proxy

Baneo de IPs a nivel de cortafuegos (iptables) tras intentos de login/2FA
abusivos, leyendo el log de acceso del reverse-proxy. Complementa al límite por
IP y al bloqueo por cuenta de la app (no los sustituye). El jail `sshd` (SSH) ya
viene activo por defecto en el EC2.

Estos ficheros **no se aplican solos**: viven en el repo para dejar constancia y
poder reinstalarlos si se recrea la instancia. El log (`reverse-proxy/logs/`) lo
genera el contenedor (ver `docker-compose.yml`) y está en `.gitignore`.

## Instalación en el EC2 (una vez)

```bash
cd /home/ubuntu/atleticopalmadelrio
mkdir -p reverse-proxy/logs
# IMPORTANTE: el reverse-proxy corre con cap_drop: ALL, así que su root NO tiene
# DAC_OVERRIDE y solo puede escribir el log si es dueño del directorio. El dir
# debe ser root:root (si no, nginx no arranca: "open() ... 13: Permission denied").
sudo chown root:root reverse-proxy/logs
docker compose --env-file .env.development up -d reverse-proxy   # genera el access.log

sudo cp reverse-proxy/fail2ban/filter.d/apr-login.conf /etc/fail2ban/filter.d/
sudo cp reverse-proxy/fail2ban/jail.d/apr-login.local   /etc/fail2ban/jail.d/
sudo cp reverse-proxy/fail2ban/logrotate/apr-nginx       /etc/logrotate.d/

# Comprobar que el filtro casa con el log antes de activarlo
sudo fail2ban-regex reverse-proxy/logs/access.log reverse-proxy/fail2ban/filter.d/apr-login.conf

sudo systemctl reload fail2ban
sudo fail2ban-client status apr-login
```

## Parámetros (jail.d/apr-login.local)

- `maxretry=10`, `findtime=600` (10 min), `bantime=1800` (30 min). Umbral alto a
  propósito: un humano que se equivala de contraseña salta antes el bloqueo por
  cuenta; esto solo corta el abuso sostenido.
- `ignoreip`: localhost. Si hace falta, añadir aquí la IP fija del club para no
  arriesgar un auto-baneo.
