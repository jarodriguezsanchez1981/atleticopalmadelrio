# Informe Semanal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Informes → Semanal: email automático de los lunes a las 10:00 con los partidos del fin de semana de cada categoría (resultado, puesto del PALMA, sanciones), con vista previa, «Enviar ahora» e historial; y la copia de la clasificación de RFAF pasa a los lunes a las 09:00.

**Architecture:** En el backend, `utils/informeSemanal.js` arma los datos del fin de semana desde la BD (partidos, clasificaciones, sanciones) y el HTML del email; `utils/informeSemanalAutomatico.js` lo programa cada lunes (solo producción) y el controlador `informeSemanal.controller.js` sirve la vista previa, el historial y el envío manual. Cada envío queda en la tabla `informes_semanales`. En el frontend, una vista nueva bajo un submenú «Informes» del apartado Club.

**Tech Stack:** Express + Sequelize (CommonJS), MySQL 8, nodemailer (`utils/mailer.js` → `enviarDesde`), Vue 3 + PrimeVue 4, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-02-informe-semanal-design.md`

## Global Constraints

- Todo en español: código, comentarios, textos, commits.
- Remitente `notificaciones@atleticopalmadelrio.com`; destinatarios `rafael.garcia.palacios@atleticopalmadelrio.com` y `jose.manuel.fernandez.rivas@atleticopalmadelrio.com` (fijos en código, no editables).
- Envío automático: lunes 10:00 hora española, solo con `NODE_ENV=production`, solo si hubo jornada, nunca dos envíos correctos del mismo fin de semana.
- Copia de clasificación de RFAF: lunes 09:00 hora española (antes: todos los días a las 10:00). Sin peticiones nuevas a rfaf.es.
- En local (`NODE_ENV !== 'production'`) no sale ningún email: «Enviar ahora» responde 403 y la pantalla lo muestra desactivado.
- Fin de semana = viernes, sábado y domingo anteriores al lunes; se identifica por la fecha del lunes (`YYYY-MM-DD`).
- Puesto: solo el del PALMA (`es_palma`) en la clasificación más reciente de la plantilla: «3º con 18 puntos (jornada 7)».
- Todo dato que venga de la BD se escapa en el HTML del email (nombres de equipos copiados de RFAF).
- Flujo: local primero, sin commit ni despliegue hasta que el usuario lo apruebe.

## Review Focus

- Fin de semana que cruza el cambio de hora (último domingo de octubre/marzo): los partidos del domingo deben entrar; `finDeSemana` trabaja con días, no con horas.
- Partido guardado a las 00:00 o 23:59 del viernes/domingo: entra (comparación por día español, `diaPartido`).
- Plantillas de temporadas no actuales: no salen aunque tengan partidos ese fin de semana.
- Categoría con plantilla pero sin clasificación copiada (Bebé): «Sin clasificación», sin romper.
- Doble ejecución del automático (reinicio del backend el lunes después de las 10:00): no debe enviar un segundo email; si arranca el lunes después de las 10:00 sin envío correcto, no envía hasta el lunes siguiente (solo a la hora programada).

---

### Task 1: Esquema, modelo, sección y permisos

**Files:**
- Create: `database/migrations/20261102b_informe_semanal.sql`
- Create: `backend/src/models/InformeSemanal.js`
- Modify: `backend/src/models/index.js`, `backend/tests/helpers/models.js`, `backend/src/utils/secciones.seed.js`

**Interfaces:**
- Produces: modelo `InformeSemanal` (tabla `informes_semanales`): `id`, `lunes` DATEONLY, `automatico` BOOLEAN, `correcto` BOOLEAN, `error` TEXT NULL, `destinatarios` VARCHAR(500), `id_usuario` INT NULL (FK usuarios ON DELETE SET NULL), `created_at`, `updated_at`; índice en `lunes`. Asociación `InformeSemanal.belongsTo(Usuario, { as: 'usuario', foreignKey: 'id_usuario' })`. Sección `informe_semanal` (nombre «Semanal», icono `pi pi-calendar`, orden 10, grupo `informes`) con los permisos de usuario copiados de `informes`; la sección `informes` (página en construcción) pasa a `grupo = NULL` (sale del menú).

- [ ] **Step 1:** Migración idempotente (`CREATE TABLE IF NOT EXISTS`, `INSERT IGNORE` como en `20261029_generar_torneo.sql`, `UPDATE secciones SET grupo = NULL WHERE clave = 'informes'`). Modelo, asociación, mock en `tests/helpers/models.js` (y export con nombre) y fila en `secciones.seed.js` (`informes` con `grupo: null`, `informe_semanal` nueva).
- [ ] **Step 2:** `docker restart apr_backend` y comprobar en el log `✓ 20261102b_informe_semanal.sql`; `SHOW COLUMNS FROM informes_semanales`.
- [ ] **Step 3:** `cd backend && npx vitest run` → todo en verde.

### Task 2: Datos y HTML del informe

**Files:**
- Create: `backend/src/utils/informeSemanal.js`
- Test: `backend/tests/informeSemanal.test.js`

**Interfaces:**
- Produces:
  - `REMITENTE` (string), `DESTINATARIOS` (string[]).
  - `finDeSemana(lunes: 'YYYY-MM-DD') → { desde: viernes, hasta: domingo }` ('YYYY-MM-DD').
  - `ultimoLunes(ahora = new Date()) → 'YYYY-MM-DD'`: el lunes de esta semana en hora española (hoy si es lunes).
  - `async construirInforme(lunes) → { lunes, desde, hasta, hayJornada, bloques: [{ tipo: 'Fútbol 7'|'Fútbol 11', categorias: [{ categoria, partidos: [{ local, visitante, fecha, resultado, suspendido }], puesto: { posicion, puntos, jornada } | null, sanciones: [{ jugador, amarillas, rojas }] }] }] }`.
  - `htmlInforme(datos) → { asunto, html }`.

- [ ] **Step 1: Tests (fallan)** en `backend/tests/informeSemanal.test.js`:
  - `finDeSemana('2026-11-02')` → `{ desde: '2026-10-30', hasta: '2026-11-01' }`; `finDeSemana('2026-03-30')` → `{ desde: '2026-03-27', hasta: '2026-03-29' }`.
  - `ultimoLunes(new Date('2026-11-04T10:00:00Z'))` → `'2026-11-02'`; `ultimoLunes(new Date('2026-11-02T08:00:00Z'))` → `'2026-11-02'`; `ultimoLunes(new Date('2026-11-01T22:30:00Z'))` → `'2026-11-02'` (ya es lunes en España).
  - `construirInforme` con mocks (`Temporada` actual, `Plantilla` con `categoria` {nombre, orden, id_tipofutbol}, `Partido` con equipos, `Clasificacion`, `Sancion` con `jugador`): solo plantillas de la temporada actual; partidos con `jornada > 0` cuyo día (`fecha` tal y como está guardada, hora española en la BD) está entre `desde` y `hasta`, incluidos los de las 00:00 del viernes y 23:59 del domingo; F7 (`id_tipofutbol` 1) en el primer bloque y F11 en el segundo, categorías por `orden`; categoría sin partido → `partidos: []`; `puesto` de la fila `es_palma` de la jornada más alta de la plantilla (`null` sin clasificación); sanciones de los partidos de ese fin de semana con `jugador` «Nombre Apellidos»; `hayJornada` false si ningún partido.
  - `htmlInforme`: asunto `'Informe semanal · fin de semana del 30/10/2026'`; contiene «Fútbol 7», «Sin partido», «3º con 18 puntos (jornada 7)», «Sin clasificación», «Suspendido», «Sin resultado»; un nombre de equipo `'<b>X</b>'` sale escapado (`&lt;b&gt;`).
- [ ] **Step 2:** `cd backend && npx vitest run tests/informeSemanal.test.js` → FAIL (módulo no existe).
- [ ] **Step 3:** Implementar. Fechas con `utils/horaEspana` (`partesEspana`, `diaEspana`); día de un partido como en `clasificacion.controller.js` (`new Date(fecha).toISOString().slice(0,10)`, la BD guarda hora española). HTML con tablas e estilos en línea, colores del club (`#0B3D2E`).
- [ ] **Step 4:** Test en verde y `npx vitest run` completo en verde.

### Task 3: Envío, controlador y rutas

**Files:**
- Modify: `backend/src/utils/informeSemanal.js`
- Create: `backend/src/controllers/informeSemanal.controller.js`, `backend/src/routes/informeSemanal.routes.js`
- Modify: `backend/src/routes/index.js`
- Test: `backend/tests/informeSemanal.controller.test.js`

**Interfaces:**
- Consumes: Task 2.
- Produces:
  - `async enviarInforme({ lunes, automatico, idUsuario = null }) → InformeSemanal` en `utils/informeSemanal.js`: construye, envía con `mailer.enviarDesde(REMITENTE, { to: DESTINATARIOS.join(', '), subject, html })` y guarda la fila (`correcto` true, o false con `error` = mensaje). No lanza si falla el SMTP (devuelve la fila con `correcto: false`).
  - `async enviarAutomatico(ahora = new Date())`: si `ultimoLunes(ahora)` no tiene jornada o ya tiene una fila `correcto: true`, no envía (devuelve `null`); si no, `enviarInforme({ lunes, automatico: true })`.
  - Rutas (`/api/informe-semanal`, `authenticate`, `authorize('informe_semanal')`):
    - `GET /?lunes=YYYY-MM-DD` (por defecto `ultimoLunes()`) → `{ lunes, remitente, destinatarios, asunto, html, hayJornada, puedeEnviar }` (`puedeEnviar` = `NODE_ENV === 'production'`); `lunes` mal formado o que no es lunes → 400.
    - `GET /historial` → últimos 50 envíos (más reciente primero) con `usuario: { nombre }`.
    - `POST /enviar` `{ lunes }` con `requireEditar('informe_semanal')`: fuera de producción → 403 «En local no se envían emails.»; sin jornada → 400 «Ese fin de semana no hubo jornada.»; si no → 200 con la fila (`correcto` false también es 200, la pantalla muestra el error).

- [ ] **Step 1: Tests (fallan)**: `enviarAutomatico` no envía sin jornada, no envía si ya hay fila correcta, envía con `automatico: true`; `enviarInforme` guarda `correcto: false` y el error si `enviarDesde` rechaza; controlador: `vista` 400 con `lunes=2026-11-03`, `puedeEnviar` según `NODE_ENV`; `enviar` 403 en development, 400 sin jornada, 200 en production con `idUsuario` = `req.user.id`.
- [ ] **Step 2:** Ejecutar → FAIL.
- [ ] **Step 3:** Implementar y registrar la ruta en `routes/index.js`.
- [ ] **Step 4:** `npx vitest run` → verde.

### Task 4: Programación de los lunes (informe y clasificación)

**Files:**
- Create: `backend/src/utils/informeSemanalAutomatico.js`
- Modify: `backend/src/utils/clasificacionAutomatica.js`, `backend/src/controllers/clasificacion.controller.js` (`HORA_ACTUALIZACION = 9`, nuevo `DIA_ACTUALIZACION = 1`), `backend/src/utils/ligaRecuperacion.js` (textos «copia diaria» → «copia del lunes»), `backend/src/server.js`, `CLAUDE.md`, `backend/CLAUDE.md`
- Test: `backend/tests/clasificacion.controller.test.js`, `backend/tests/informeSemanal.test.js`

**Interfaces:**
- Produces: `proximaEjecucion(hora, ahora = new Date(), diaSemana = null)` en `clasificacionAutomatica.js` (con `diaSemana` 1 = lunes, el próximo lunes a esa hora; sin él, como ahora: diario). `informeSemanalAutomatico.iniciar()` (solo producción, lunes 10:00, llama a `enviarAutomatico()`; no envía al arrancar).

- [ ] **Step 1: Tests (fallan)**: `proximaEjecucion(9, new Date('2026-11-02T07:00:00Z'), 1)` → `'2026-11-02T08:00:00.000Z'`; `proximaEjecucion(9, new Date('2026-11-02T08:00:01Z'), 1)` → `'2026-11-09T08:00:00.000Z'`; `proximaEjecucion(10, new Date('2026-10-22T12:00:00Z'), 1)` → `'2026-10-26T09:00:00.000Z'` (cruza el cambio de hora). Los tests diarios existentes siguen igual.
- [ ] **Step 2:** Ejecutar → FAIL.
- [ ] **Step 3:** Implementar; `programar()` de la clasificación usa `DIA_ACTUALIZACION`; la copia al arrancar se mantiene (Ruling en el ledger). `server.js` llama a `informeSemanalAutomatico.iniciar()` junto a `clasificacionAutomatica.iniciar()`. Actualizar la regla de rfaf.es en `CLAUDE.md` y la descripción en `backend/CLAUDE.md` («cada día a las 10:00» → «los lunes a las 09:00»).
- [ ] **Step 4:** `npx vitest run` → verde.

### Task 5: Pantalla Informes → Semanal

**Files:**
- Create: `frontend/src/views/informes/InformeSemanal.vue`, `frontend/src/utils/informeSemanal.js`
- Modify: `frontend/src/services/index.js` (`informeSemanalService`), `frontend/src/router/index.js` (ruta `informes/semanal`, name `informe_semanal`, meta `seccion: 'informe_semanal'`), `frontend/src/utils/seccionRoutes.js` (`informe_semanal: '/informes/semanal'`), `frontend/src/layouts/MainLayout.vue` (`SUBGRUPOS.club` añade `{ clave: 'informes', label: 'Informes', icon: 'pi pi-file' }`)
- Test: `frontend/src/__tests__/informeSemanal.test.js`

**Interfaces:**
- Consumes: rutas de Task 3.
- Produces: `informeSemanalService = { vista(lunes), historial(), enviar(lunes) }`; `opcionesFinDeSemana(ultimoLunes: 'YYYY-MM-DD', n = 12) → [{ value: lunes, label: 'Fin de semana del DD/MM/AAAA' }]` (viernes de cada fin de semana, del más reciente al más antiguo).

- [ ] **Step 1: Test (falla)**: `opcionesFinDeSemana('2026-11-02', 3)` → `[{ value: '2026-11-02', label: 'Fin de semana del 30/10/2026' }, { value: '2026-10-26', label: 'Fin de semana del 23/10/2026' }, { value: '2026-10-19', label: 'Fin de semana del 16/10/2026' }]`.
- [ ] **Step 2:** `cd frontend && npx vitest run src/__tests__/informeSemanal.test.js` → FAIL.
- [ ] **Step 3:** Vista con `<SectionGuard seccion="informe_semanal">`: selector de fin de semana (Select con `opcionesFinDeSemana` partiendo del `lunes` de la primera respuesta), remitente y destinatarios (solo texto), aviso si `!hayJornada`, vista previa (`v-html` del `html` del backend en un recuadro blanco), botón «Enviar ahora» (granate, como los demás; desactivado si `!puedeEnviar`, `!hayJornada` o sin permiso de editar, con `title` explicando por qué; confirmación con `ConfirmDialog` antes de enviar; toast con el resultado y `emitirCambio()`), historial en `DataTable v-bind="estiloTabla"` (Fecha, Fin de semana, Tipo Automático/Manual, Usuario, Estado Correcto/Error con el mensaje).
- [ ] **Step 4:** `npx vitest run` y `npx vite build` → verde.
- [ ] **Step 5:** Rebuild local `docker compose --env-file .env.development up -d --build backend frontend`, comprobar `/health` 200 y el log del backend.

### Final

- [ ] Revisión de todo el cambio; ningún commit ni despliegue hasta que el usuario lo apruebe.
