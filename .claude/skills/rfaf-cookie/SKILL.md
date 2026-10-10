---
name: rfaf-cookie
description: Poner una nueva JSESSIONID de rfaf.es en RFAF_COOKIE del EC2 cuando "Finalizar Acta" falla por sesión caducada o acta vacía. Usar cuando el usuario pega "JSESSIONID=...".
---

# Actualizar RFAF_COOKIE en el EC2

Contexto: desde la IP de AWS rfaf.es no crea sesiones útiles; se reutiliza una JSESSIONID abierta por el usuario en su navegador (memoria `project_rfaf_finalizar_acta`).

1. Tomar solo el valor `JSESSIONID=<hex>` que pega el usuario (sin cookies `_ga`, que llevan `$` y rompen el env de compose).
2. En el EC2, sustituir solo esa línea del `.env.development`, sin tocar el resto (sobre todo `AES_SECRET_KEY` y `NODE_ENV=production`):
   `sed -i 's/^RFAF_COOKIE=.*/RFAF_COOKIE=JSESSIONID=<hex>/' .env.development` (añadirla si no existe).
3. Recrear solo el backend: `docker compose --env-file .env.development up -d backend` y comprobar `docker logs --tail 20 apr_backend`.
4. No hacer peticiones de prueba a rfaf.es: el usuario lo comprueba con "Finalizar Acta". Si él lo pide, como mucho una petición.
5. Nunca proponer ni construir formas de saltar el bloqueo de IP (proxies, servicios externos, headless).
