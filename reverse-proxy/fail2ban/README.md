# fail2ban (en docker-compose)

Baneo de IPs a nivel del cortafuegos del host (iptables) tras intentos de
login/2FA o SSH abusivos. Complementa al límite por IP y al bloqueo por cuenta
de la app (no los sustituye).

Desde octubre de 2026 fail2ban corre como **servicio del `docker-compose`**
(imagen `crazymax/fail2ban`), no como paquete del sistema. Así queda versionado
y arranca con el stack. Por necesitar la red del host y `NET_ADMIN` (toca el
cortafuegos del host), solo tiene sentido en el EC2 (Linux) y va en el profile
`seguridad`, de modo que **no** arranca en el `docker compose up` de desarrollo.

## Qué banea y en qué cadena

- **`apr-login`**: intentos de login/2FA fallidos o limitados (401/429) en el
  `access.log` del reverse-proxy. Como el reverse-proxy es un contenedor, el
  tráfico a 80/443 va DNATeado por `FORWARD`, así que el baneo se inserta en la
  cadena **`DOCKER-USER`** (en `INPUT` no cortaría nada). `maxretry=10`,
  `findtime=600`, `bantime=1800`.
- **`sshd`**: SSH del host, que golpea `INPUT` directamente (cadena por
  defecto). Lee `/var/log/auth.log` (montado en solo lectura). `maxretry=5`,
  `bantime=3600`.

## Ficheros

- `../../docker-compose.yml` → servicio `fail2ban` (profile `seguridad`).
- `data/jail.d/apr.local` → los dos jails y sus umbrales (versionado).
- `data/filter.d/apr-login.conf` → filtro del login/2FA (versionado).
- `data/fail2ban.sqlite3` y config autogenerada → en caliente, en `.gitignore`.
- `logrotate/apr-nginx` → rotación del `access.log` (sigue siendo del host, ver
  abajo).

## Puesta en marcha / actualización en el EC2

```bash
cd /home/ubuntu/atleticopalmadelrio
git pull --ff-only origin develop

# El dir de logs lo escribe el reverse-proxy (root:root, ver su README).
# Arrancar / recrear el contenedor de fail2ban:
docker compose --env-file .env.development --profile seguridad up -d fail2ban

# Comprobar que carga los dos jails y que inserta en DOCKER-USER:
docker logs --tail 30 apr_fail2ban
docker exec apr_fail2ban fail2ban-client status
docker exec apr_fail2ban fail2ban-client status apr-login
sudo iptables -S DOCKER-USER | grep f2b      # jump a la cadena f2b-apr-login
sudo iptables -S INPUT       | grep f2b-sshd # jump del jail sshd
```

El fail2ban del sistema (paquete apt) queda **desactivado** a favor de este
contenedor:

```bash
sudo systemctl disable --now fail2ban
```

## logrotate (sigue en el host)

La rotación del `access.log` la hace el logrotate del sistema con
`copytruncate` (el contenedor del reverse-proxy sigue escribiendo el mismo
inodo). Instalar una vez:

```bash
sudo cp reverse-proxy/fail2ban/logrotate/apr-nginx /etc/logrotate.d/
```

## Notas

- `ignoreip` incluye localhost. Si hace falta, añadir la IP fija del club en
  `data/jail.d/apr.local` para no arriesgar un auto-baneo.
- Comprobar que el filtro casa con el log:
  `docker exec apr_fail2ban fail2ban-regex /var/log/apr/access.log /data/filter.d/apr-login.conf`
