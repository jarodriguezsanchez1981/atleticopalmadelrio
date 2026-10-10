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

## Seguridad

- Sesión: JWT en la cookie HttpOnly `apr_sesion` (también se acepta `Authorization: Bearer`). Peticiones no-GET con cookie exigen `X-Requested-With: XMLHttpRequest` (CSRF).
- `/util/imagen` tiene protección SSRF (`lookupSeguro` + BlockList): no quitarla al tocar descargas.
- Nunca devolver datos personales (DNI, teléfonos) en endpoints que no los necesitan.

## Tests

- `npx vitest run` (o `npx vitest run tests/<fichero>.test.js`).
- Los modelos se mockean con `tests/helpers/models.js` (`createModelMock`) y `req`/`res` con `tests/helpers/http.js`.
- Todo cambio de controlador lleva su test en `tests/<entidad>.controller.test.js`.
