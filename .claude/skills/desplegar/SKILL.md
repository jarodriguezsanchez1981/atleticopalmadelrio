---
name: desplegar
description: Commit, push y despliegue de un cambio de código en local y en el EC2 de producción (git pull + rebuild de backend/frontend). Usar al terminar cualquier cambio de código.
---

# Desplegar un cambio

Datos de acceso al EC2 (host, clave SSH, carpeta): en la memoria del proyecto (`reference_ec2_acceso`). No escribirlos en el repo.

1. **Tests** de lo tocado en verde: `cd backend && npx vitest run` y/o `cd frontend && npx vitest run && npx vite build`.
2. **Commit**: `git add` solo de los ficheros del cambio (nunca `.env*`, `backups/`, `.claude/settings.local.json`), mensaje en español con el formato `Sección: qué cambia`, y el trailer Co-Authored-By de la sesión. `git push origin develop`.
3. **Local**: `docker compose --env-file .env.development up -d --build <backend|frontend>` (solo los servicios tocados) y comprobar con `docker ps`.
4. **EC2** (por SSH, en la carpeta del proyecto):
   - `git pull --ff-only origin develop`
   - `docker compose --env-file .env.development up -d --build <backend|frontend>`; **nunca** `.env.production`.
   - Si aparece `apr_backend_test`, quitarlo con `docker rm -f apr_backend_test`.
   - Comprobar: `docker ps` y `docker logs --tail 20 apr_backend` (migraciones aplicadas, sin errores).
5. Si hubo migración, confirmar en el log que se aplicó (`schema_migrations`).
6. Contar al usuario qué se ha desplegado y dónde.
