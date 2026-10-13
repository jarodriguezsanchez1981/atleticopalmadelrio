# Backend (Express + Sequelize, CommonJS)

## Estructura

- `src/routes/<entidad>.routes.js` → `src/controllers/<entidad>.controller.js` → `src/models/<Modelo>.js`.
- Nuevo modelo: crearlo en `src/models/`, registrarlo (y sus asociaciones) en `src/models/index.js`, y añadir su mock en `tests/helpers/models.js`.
- Nueva ruta: registrarla en `src/routes/index.js`; protegerla con `authenticate`, `authorize('<seccion>')` y, en escritura, `requireEditar('<seccion>')`.
- Controladores: `async function x(req, res, next) { try { … } catch (err) { next(err); } }`; errores de validación con `res.status(400).json({ message: '…' })` en español.
- `src/utils/`: cifrado AES del DNI (`aesCrypto`, `dniCrypto.mixin`), sesión (`sesionCookie`, `jwt.utils`), `partidoJugadores` (campos del acta), `migrate.js`.
- `src/scripts/rfaf_acta.py`: parser del acta de RFAF (lo invoca `utils/rfafActa.js`).

## Base de datos

- Los cambios de esquema van **siempre** en `../database/migrations/AAAAMMDD[letra]_descripcion.sql`, idempotentes (comprobar en `INFORMATION_SCHEMA` y `PREPARE`/`EXECUTE`), y el modelo Sequelize se actualiza a la vez. Ver skill `/nueva-migracion`.
- Se aplican solas al arrancar el backend (tabla `schema_migrations`); nunca editar una migración ya desplegada, crear otra.
- Migraciones de datos que necesitan código (p. ej. cifrar): `.js` que exporta `async ({ conn, logger, aes })`.

## Rendimiento de los listados

- Fotos y escudos se guardan en base64 en la BD, pero las respuestas JSON llevan su URL `/api/imagenes/<tipo>/<id>?v=<hash>` (middleware `imagenesUrl`, `utils/imagenes.js`), cacheada por el navegador. Al guardar, si llega esa URL se deja la imagen como estaba (`esUrlImagen`). Excepción: `/calendario/escudos` sigue dando base64 (PDF).
- Los listados no llevan relaciones 1-N pesadas (p. ej. `partidos` y `jornadas` sin `partidoJugadores`; el detalle sí). Los grandes con solo relaciones 1-1 usan `raw: true, nest: true` + `filasPlanas`.
- `?basico=1` en jugadores, equipos y plantillas para desplegables/etiquetas; `?limite=N` en partidos y entrenamientos.

## Seguridad

- Sesión: JWT en la cookie HttpOnly `apr_sesion` (también se acepta `Authorization: Bearer`). Peticiones no-GET con cookie exigen `X-Requested-With: XMLHttpRequest` (CSRF).
- `/util/imagen` tiene protección SSRF (`lookupSeguro` + BlockList): no quitarla al tocar descargas.
- Nunca devolver datos personales (DNI, teléfonos) en endpoints que no los necesitan.

## Tests

- `npx vitest run` (o `npx vitest run tests/<fichero>.test.js`).
- Los modelos se mockean con `tests/helpers/models.js` (`createModelMock`) y `req`/`res` con `tests/helpers/http.js`.
- Todo cambio de controlador lleva su test en `tests/<entidad>.controller.test.js`.
