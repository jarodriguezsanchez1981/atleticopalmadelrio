# Generar Torneo — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sección «Generar Torneo» (apartado Club) para definir torneos de Fútbol 7 por categoría, guardarlos, generar el reparto de partidos por campos y horas y descargar un PDF.

**Architecture:** Tres tablas nuevas (torneo → categorías → inscripciones) con CRUD en `/api/torneos-generados`. Los partidos no se guardan: una función pura del frontend (`utils/generarTorneo.js`) los calcula a partir del torneo guardado; la vista previa y el PDF (`utils/pdfGenerarTorneo.js`, jsPDF) usan esa función.

**Tech Stack:** Express + Sequelize (CommonJS), MySQL 8 (migración SQL idempotente), Vue 3 `<script setup>` + PrimeVue 4 + Tailwind, jsPDF, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-29-generar-torneo-design.md`

## Global Constraints

- Todo en español: nombres, comentarios, mensajes y textos.
- Solo **local**: tests en verde y rebuild `backend` + `frontend`; **sin commit, push ni despliegue** hasta que el usuario lo apruebe.
- Campos fijos: `anexo1` «Anexo 1», `anexo2` «Anexo 2», `estadio1` «Estadio 1», `estadio2` «Estadio 2».
- Como máximo 2 grupos (`A`, `B`). Liga: sin semifinales; Oro 1º–2º, Plata 3º–4º.
- Grupos: SF1 = 1º A – 2º B, SF2 = 1º B – 2º A; Oro = ganadores SF (o 1º A – 1º B); Plata = perdedores SF (o 2º A – 2º B).
- Hora de final informativa: nunca bloquea; solo aviso.
- Solo categorías con `id_tipofutbol = 1` (Fútbol 7).
- Sección: clave `generar_torneo`, nombre «Generar Torneo», icono `pi pi-sitemap`, grupo `club`; ruta `/club/generar-torneo`.
- Colores de marca vía Tailwind (`club-green`, …) en vistas; en el PDF, hex del tema (`#0F3D22`, `#CFE2D6`, `#E3EEE7`).

## Review Focus

- Número impar de equipos en un grupo o liga → un equipo «descansa» cada jornada; nunca aparece un partido contra «descansa».
- Un solo campo elegido → semifinales y finales en turnos seguidos (Plata antes que Oro), sin dos partidos en el mismo turno.
- Mismo equipo inscrito dos veces con nombres distintos («PALMA A», «PALMA B») → se tratan como participantes distintos (por inscripción, no por `id_equipo`).
- Editar un torneo quitando una categoría o un equipo → desaparecen sus filas (reemplazo en transacción), no quedan huérfanas.
- Opciones incoherentes guardadas (p. ej. semifinales marcadas y luego formato cambiado a liga) → el generador ignora semifinales en liga.

---

### Task 1: Migración, modelos y permisos

**Files:**
- Create: `database/migrations/20261029_generar_torneo.sql`
- Create: `backend/src/models/TorneoGenerado.js`, `TorneoGeneradoCategoria.js`, `TorneoGeneradoEquipo.js`
- Modify: `backend/src/models/index.js` (registro + asociaciones), `backend/tests/helpers/models.js` (mocks)

**Interfaces:**
- Produces: modelos `TorneoGenerado` (`torneos_generados`: `nombre` STRING(150) NOT NULL, `fecha` DATEONLY NOT NULL, `observaciones` TEXT NULL), `TorneoGeneradoCategoria` (`torneo_generado_categorias`: `id_torneo_generado`, `id_categoria`, `hora_inicio` TIME NOT NULL, `hora_fin` TIME NULL, `duracion_min` INT NOT NULL, `descanso_min` INT NOT NULL DEFAULT 0, `campos` JSON NOT NULL, `formato` ENUM('liga','grupos') NOT NULL, `semifinales`/`final_oro`/`final_plata` BOOLEAN NOT NULL DEFAULT 0; UNIQUE(`id_torneo_generado`,`id_categoria`)), `TorneoGeneradoEquipo` (`torneo_generado_equipos`: `id_torneo_generado_categoria`, `id_equipo`, `nombre` STRING(150) NOT NULL, `grupo` ENUM('A','B') NULL, `orden` INT NOT NULL DEFAULT 0; UNIQUE(`id_torneo_generado_categoria`,`nombre`)). FKs a padres con ON DELETE CASCADE; a `categorias`/`equipos` con RESTRICT.
- Asociaciones: `TorneoGenerado.hasMany(TorneoGeneradoCategoria, as 'categorias')`, `TorneoGeneradoCategoria.belongsTo(Categoria, as 'categoria')`, `TorneoGeneradoCategoria.hasMany(TorneoGeneradoEquipo, as 'equipos')`, `TorneoGeneradoEquipo.belongsTo(Equipo, as 'equipo')`.

- [ ] **Step 1:** Escribir la migración: `CREATE TABLE IF NOT EXISTS` de las tres tablas (InnoDB, utf8mb4, `created_at`/`updated_at` como el resto), `INSERT IGNORE INTO secciones (clave,nombre,icono,orden,grupo) VALUES ('generar_torneo','Generar Torneo','pi pi-sitemap',58,'club')` y copia de permisos desde la sección `torneo` (mismo patrón que `20261026_seccion_estadisticas_cat_sanciones.sql`).
- [ ] **Step 2:** Modelos y asociaciones; añadir los tres al export de `models/index.js` y a `createModelsMock()`.
- [ ] **Step 3:** `cd backend && npx vitest run` → todo en verde.

### Task 2: API `/api/torneos-generados`

**Files:**
- Create: `backend/src/controllers/torneoGenerado.controller.js`, `backend/src/routes/torneoGenerado.routes.js`
- Modify: `backend/src/routes/index.js` (`router.use('/torneos-generados', …)`)
- Test: `backend/tests/torneoGenerado.controller.test.js`

**Interfaces:**
- Consumes: modelos de la Task 1.
- Produces: `GET /` → `[{ id, nombre, fecha, categorias: [{ id_categoria, categoria: { nombre } }] }]` ordenado por `fecha DESC`; `GET /:id` → torneo con `categorias[]` (todas sus columnas, `categoria {id,nombre,id_tipofutbol}`, `equipos[]` ordenados por `orden` con `equipo {id,nombre,escudo}`); `POST /` y `PUT /:id` con cuerpo `{ nombre, fecha, observaciones, categorias: [{ id_categoria, hora_inicio, hora_fin, duracion_min, descanso_min, campos: string[], formato, semifinales, final_oro, final_plata, equipos: [{ id_equipo, nombre, grupo }] }] }`; `DELETE /:id`. Rutas: `router.use(authenticate, authorize('generar_torneo'))`, escritura con `requireEditar('generar_torneo')`.
- Exporta además `validarTorneo(body): string | null` (mensaje de error o null) para testearla aparte.

- [ ] **Step 1: Tests que fallan** (`describe('Generar Torneo · torneoGenerado.controller')`):
  - `validarTorneo` devuelve mensaje si: falta `nombre`; falta `fecha`; `categorias` vacío; categoría repetida; `campos` vacío o con clave fuera de `['anexo1','anexo2','estadio1','estadio2']`; `duracion_min <= 0`; falta `hora_inicio`; `formato` liga con < 2 equipos; liga con `final_plata` y < 4 equipos; grupos con algún equipo sin grupo `A`/`B`; grupos con un grupo de < 2 equipos; dos inscripciones con el mismo `nombre` (tras `trim`, sin distinguir mayúsculas). Devuelve `null` con un torneo válido de 2 grupos de 4 y con «PALMA A»/«PALMA B» del mismo `id_equipo`.
  - `crear` con categoría que no es Fútbol 7 (`Categoria.findAll` devuelve `id_tipofutbol: 2`) → 400 «Solo se pueden elegir categorías de Fútbol 7.».
  - `crear` válido → 201 y crea torneo, categorías y equipos dentro de `sequelize.transaction`.
  - `actualizar` → 404 si no existe; si existe, borra categorías (`TorneoGeneradoCategoria.destroy({ where: { id_torneo_generado } })`) y las vuelve a crear en la misma transacción.
  - `eliminar` → 404 / 204.
- [ ] **Step 2:** `npx vitest run tests/torneoGenerado.controller.test.js` → FAIL.
- [ ] **Step 3:** Implementar controlador y rutas siguiendo el estilo de `patrocinador.controller.js` (try/catch → `next(err)`, 400 en español). En liga, guardar `grupo = null` y `semifinales = false`.
- [ ] **Step 4:** Tests → PASS; `npx vitest run` completo en verde.

### Task 3: Generador de partidos (función pura)

**Files:**
- Create: `frontend/src/utils/generarTorneo.js`
- Test: `frontend/src/__tests__/generarTorneo.test.js`

**Interfaces:**
- Produces:
  - `CAMPOS = [{ clave: 'anexo1', nombre: 'Anexo 1' }, …]` (orden fijo de la Global Constraints).
  - `generarCategoria(cat) → { turnos: Turno[], horaFinReal: 'HH:MM', excedeHoraFin: boolean }` donde `cat` tiene la forma de una categoría del `GET /:id` (`hora_inicio` 'HH:MM[:SS]', `duracion_min`, `descanso_min`, `campos`, `formato`, `semifinales`, `final_oro`, `final_plata`, `equipos[{ nombre, grupo }]`).
  - `Turno = { hora: 'HH:MM', fase: 'grupos' | 'semifinales' | 'finales', partidos: Partido[] }`; `Partido = { campo: clave, local: string, visitante: string, grupo?: 'A'|'B', etiqueta?: 'SF1'|'SF2'|'ORO'|'PLATA' }`. En eliminatorias, `local`/`visitante` son textos: `'1º A'`, `'2º B'`, `'Ganador SF1'`, `'Perdedor SF2'`, `'1º'`, `'3º'`…
  - Los campos se usan en el orden de `CAMPOS` filtrado por `cat.campos`.

- [ ] **Step 1: Tests que fallan:**
  - Liga de 4 equipos, 2 campos, 20' + 5', inicio 09:00, Oro y Plata: 3 turnos de grupos con 2 partidos cada uno (cada pareja una sola vez); turno 4 a las 10:15 `fase 'finales'` con ORO `1º – 2º` en `anexo1` y PLATA `3º – 4º` en `anexo2`; `horaFinReal = '10:35'`.
  - Liga de 5 equipos: 10 partidos en total, nunca aparece un equipo dos veces en un mismo turno, ningún partido con «descansa».
  - Grupos A y B de 4, 2 campos, semifinales + Oro + Plata: 12 partidos de grupos; turno de semifinales con `SF1 '1º A' – '2º B'` y `SF2 '1º B' – '2º A'`; turno de finales con `ORO 'Ganador SF1' – 'Ganador SF2'` y `PLATA 'Perdedor SF1' – 'Perdedor SF2'`.
  - Grupos sin semifinales, con Oro y Plata: finales `ORO '1º A' – '1º B'`, `PLATA '2º A' – '2º B'`.
  - Un solo campo: SF1 y SF2 en turnos distintos; PLATA antes que ORO.
  - Liga con `semifinales: true` guardado: no genera semifinales.
  - `excedeHoraFin` es `true` si `hora_fin` < `horaFinReal`, `false` si `hora_fin` es null.
  - Determinista: dos llamadas con los mismos datos dan el mismo resultado (`toEqual`).
  - «PALMA A» y «PALMA B» (mismo `id_equipo`) juegan entre sí como participantes distintos.
- [ ] **Step 2:** `cd frontend && npx vitest run src/__tests__/generarTorneo.test.js` → FAIL.
- [ ] **Step 3:** Implementar. Emparejamientos por el método del círculo (añadir `null` si impar y descartar esos partidos), jornadas en orden; en grupos, intercalar jornada i de A y de B. Colocación greedy por turnos: de la cola pendiente, elegir primero partidos cuyos equipos no jugaron en el turno anterior y no están ya en el turno; si no hay ninguno válido, el primero pendiente cuyos equipos no estén ya en el turno. Hora = inicio + n·(duración + descanso); `horaFinReal` = hora del último turno + duración.
- [ ] **Step 4:** Tests → PASS.

### Task 4: PDF

**Files:**
- Create: `frontend/src/utils/pdfGenerarTorneo.js`
- Test: `frontend/src/__tests__/pdfGenerarTorneo.test.js`

**Interfaces:**
- Consumes: `generarCategoria`, `CAMPOS` (Task 3).
- Produces: `construirHojasTorneo(torneo) → Hoja[]` (pura: `{ titulo, subtitulo, datos: [[etiqueta, valor]], grupos: { A?: string[], B?: string[], todos?: string[] }, columnas: string[], filas: (string[] | { fase: string })[] }`) y `descargarPdfTorneo(torneo): Promise<void>` (jsPDF A4 vertical, una hoja por categoría, guarda `Torneo_<nombre>.pdf`).

- [ ] **Step 1: Tests que fallan** de `construirHojasTorneo`: una hoja por categoría; `titulo` = nombre del torneo; `subtitulo` contiene la categoría y «(Fútbol 7)»; `datos` incluye Fecha `dd/mm/aaaa`, Horario `'09:00 – 13:30'` (o solo inicio si no hay `hora_fin`), Lugar con los nombres de los campos elegidos, Partidos `"20' + 5' descanso"`; `columnas = ['Hora', ...nombres de campos elegidos]`; filas con separadores `{ fase: 'Fase de grupos' }`, `{ fase: 'Semifinales' }`, `{ fase: 'Finales' }` solo si hay partidos de esa fase; en grupos, las celdas llevan `'(A)'`/`'(B)'`; ORO/PLATA con prefijo `'ORO: '`/`'PLATA: '`.
- [ ] **Step 2:** Test → FAIL.
- [ ] **Step 3:** Implementar. Dibujo con jsPDF como `pdfInvitacionTorneo.js` (cargar `/escudo.png` como imagen, cabecera con raya `#0F3D22`, cabeceras de tabla `#0F3D22` texto blanco, separadores de fase `#CFE2D6`, ORO en dorado `#A07800`, PLATA gris `#6B7280`); salto de página si no cabe; al final, clasificación vacía por grupo (columnas Equipo, PJ, Pts) con los equipos ya escritos.
- [ ] **Step 4:** Tests → PASS.

### Task 5: Pantalla, ruta y menú

**Files:**
- Create: `frontend/src/views/generarTorneo/GenerarTorneo.vue`
- Modify: `frontend/src/router/index.js` (ruta `club/generar-torneo`, name `generar_torneo`, `meta: { seccion: 'generar_torneo' }`), `frontend/src/utils/seccionRoutes.js` (`generar_torneo: '/club/generar-torneo'`), `frontend/src/services/index.js` (`torneosGeneradosService = crudService('torneos-generados')`)

**Interfaces:**
- Consumes: `torneosGeneradosService`, `categoriasService`, `equiposService` (listar con `?basico=1`), `generarCategoria`, `CAMPOS`, `descargarPdfTorneo`, `emitirCambio`.

- [ ] **Step 1:** Vista envuelta en `<SectionGuard seccion="generar_torneo">`: tabla (`v-bind="estiloTabla"`) con Nombre, Fecha, Categorías y acciones (Editar, PDF, Borrar con confirmación); botón «+ Nuevo» solo con `puedeEditar('generar_torneo')`.
- [ ] **Step 2:** Diálogo de alta/edición: nombre, fecha, observaciones; `MultiSelect` de categorías (solo `id_tipofutbol === 1`); por categoría elegida, un panel (pestañas `Tabs`) con hora de comienzo/final (`DatePicker timeOnly`), duración (por defecto `categoria.tiempopartido` si existe, si no 20) y descanso (0), campos (`MultiSelect` de `CAMPOS`), formato (`SelectButton` Todos contra todos / Por grupos), casillas Semifinales (solo en grupos), Final de Oro, Final de Plata; equipos: `MultiSelect` con filtro sobre Equipos que añade inscripciones con `nombre` editable (por defecto el del equipo, y botón para añadir otra inscripción del mismo equipo); en grupos, cada inscripción con selector A/B.
- [ ] **Step 3:** Vista previa por categoría: tabla hora × campo con `generarCategoria` y, si `excedeHoraFin`, aviso `Message severity="warn"` «Los partidos acaban a las HH:MM, después de la hora de final.». Errores del backend en `Toast`. Tras guardar/borrar, `emitirCambio()`.
- [ ] **Step 4:** `npx vitest run` y `npx vite build` en verde.

### Task 6: Verificación en local

- [ ] **Step 1:** `docker compose --env-file .env.development up -d --build --no-deps backend frontend`; `docker logs --tail 30 apr_backend` muestra la migración `20261029_generar_torneo` aplicada y sin errores.
- [ ] **Step 2:** En http://localhost:8080, con `admin`: «Generar Torneo» aparece en Club; crear un torneo con Benjamín A en 2 grupos de 4 + semifinales + Oro/Plata y otra categoría en liga de 5; ver la vista previa, guardar, editar quitando un equipo, descargar el PDF y comprobar escudo, grupos, horario y finales.
- [ ] **Step 3:** No hacer commit; informar al usuario.
