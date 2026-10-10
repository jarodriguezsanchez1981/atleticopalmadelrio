# Intranet Atlético Palma del Río

Intranet de gestión del club (plantillas, partidos, calendario, estadísticas…).
Documentación funcional completa: @README.md

- **Idioma**: todo en español — código (nombres de funciones/variables), comentarios, mensajes de commit, textos de la interfaz y respuestas al usuario.
- **Stack**: Vue 3 + Vite + Pinia + Tailwind + PrimeVue 4 · Node/Express + Sequelize · MySQL 8 · Nginx · Docker Compose.
- Instrucciones específicas: `backend/CLAUDE.md` y `frontend/CLAUDE.md`.

## Estructura

```
backend/            API REST (Express + Sequelize), tests en backend/tests (Vitest)
frontend/           SPA Vue 3, tests en frontend/src/__tests__ (Vitest + jsdom)
database/
  init.sql          Solo esquema (sin datos), para docker-entrypoint-initdb.d
  migrations/       Migraciones idempotentes (.sql / .js), se aplican al arrancar el backend
scripts/            Backups (db-backup.sh, dump-init.sh) y scripts Python de RFAF
reverse-proxy/      nginx HTTPS + Let's Encrypt del servidor
.claude/            Configuración compartida de Claude Code (settings.json, skills, agents)
```

## Comandos

```bash
cd backend && npx vitest run          # tests backend
cd frontend && npx vitest run         # tests frontend
cd frontend && npx vite build         # comprobar que el frontend compila
docker compose --env-file .env.development up -d --build backend frontend   # rebuild local
docker logs --tail 50 apr_backend     # logs (contenedores: apr_backend, apr_frontend, apr_mysql)
```

## Flujo de trabajo (obligatorio)

1. Cambio de código → tests de la parte tocada (`npx vitest run`) en verde.
2. `git add` solo de los ficheros del cambio, commit en español y `git push origin develop` (rama de trabajo: `develop`).
3. Reconstruir los contenedores locales afectados (`backend` y/o `frontend`).
4. Desplegar en el EC2 de producción: skill `/desplegar`.
5. Los cambios solo de datos (SQL directo en la BD) no llevan commit: skill `/corregir-datos`.

## Reglas que no se pueden saltar

- **Secretos**: nunca leer, mostrar ni commitear `.env*`, claves `.pem`/`.age` ni volcados de `backups/`. `database/init.sql` solo con esquema, nunca datos reales (PII de menores).
- **EC2**: allí solo se usa `.env.development`, que debe tener siempre `NODE_ENV=production`. Nunca `--env-file .env.production` en el EC2. Nunca tocar la línea `AES_SECRET_KEY` (si cambia, los DNI cifrados son irrecuperables).
- **Datos de producción**: antes de cualquier UPDATE/DELETE, volcar las filas afectadas a `~/borrados/` en el EC2 (`umask 077`).
- **rfaf.es**: el mínimo de peticiones (su robots.txt es `Disallow: /`), sin reintentos ni scraping extra, y nunca intentar saltar el bloqueo de IP de AWS (sin proxies ni servicios intermedios). La sesión se pasa con `RFAF_COOKIE` (skill `/rfaf-cookie`).
- **Nada destructivo** sin confirmación: `docker compose down -v`, `git push --force`, `DROP`, borrados masivos.

## Dominio (conceptos clave)

- **Temporada actual**: solo una tiene `actual = true`; las plantillas y los selectores se filtran por ella.
- **Plantilla** = categoría + temporada. Un jugador pertenece a una plantilla de la temporada (`plantilla_jugadores`, con dorsal y `promocion`).
- **Orden de categorías** (`categorias.orden`): Prebenjamín C 2 / B 3 / A 4 · Benjamín C 5 / B 6 / A 7 · Infantil C 12 / B 13 / A 14 · Juvenil B 18 / A 19 · … Senior A.
- **Promoción**: un jugador que juega con una plantilla de categoría **igual o superior** (orden ≥) a la suya. Fila `promociones` = (id_plantilla de origen, id_categoria de destino, id_jugador). Jugar con una categoría inferior no es promoción.
- **Partido**: `es_local` indica si el PALMA (PALMA DEL RIO ATLETICO C.F.) jugaba en casa. Las estadísticas se reparten en Total / Local / Visitante.
- **Finalizar Acta** (Partidos): lee el acta de RFAF con `backend/src/scripts/rfaf_acta.py` y rellena `partido_jugadores` (titular, minutos, dorsal, goles, tarjetas), `partido_goles`, `partido_tarjetas`, dorsales vacíos de la plantilla y promociones. Si un jugador del acta no existe, lo crea en la plantilla del partido.
- **Estadísticas**: solo de la plantilla Senior A de la temporada actual (`CATEGORIA_CON_MINUTOS`), partidos de 90'.
- **Permisos**: por sección (`usuario_secciones`); backend `authorize('<seccion>')` + `requireEditar('<seccion>')`; frontend `<SectionGuard seccion="...">`.
- **Auditoría**: todo POST/PUT/DELETE de `/api` se registra solo en `cambios` (middleware), no hay que hacerlo en los controladores.
