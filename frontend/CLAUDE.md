# Frontend (Vue 3 + PrimeVue 4 + Tailwind)

## Estructura

- `src/views/<seccion>/<Vista>.vue`: una carpeta por sección, envuelta en `<SectionGuard seccion="...">`; rutas en `src/router/index.js`.
- `src/services/index.js`: un servicio por entidad sobre `services/api.js` (axios con `withCredentials` y `X-Requested-With`; no hay token en localStorage).
- `src/stores/auth.store.js`: usuario y permisos (`puedeVer`, `puedeEditar`).
- `src/components/`: `CrudDataTable.vue` (CRUD genérico), `TablaEstadistica.vue` (tablas agrupadas Total/Local/Visitante con columnas arrastrables), `EventoFormCalendario.vue` (formulario de partido), etc.
- `src/utils/`: `temporadaActual.js` (filtrar plantillas), `cambioBus.js` (`emitirCambio` / `suscribirseCambio` para refrescar otras vistas), PDFs, formatos.

## Convenciones

- `<script setup>` con Composition API; nombres y textos en español.
- Todas las tablas: `<DataTable v-bind="estiloTabla" …>` (`utils/estiloTabla.js`); con paginación, `class="ar-dt-compacta"`. Estilos comunes en `src/assets/main.css` (prefijo `ar-dt-`).
- Colores de marca vía Tailwind (`club-green`, `club-cream`, `ink-*`, `line-*`), no hex sueltos.
- PrimeVue: `headerClass`/`bodyClass` como string (no arrays). Con `ColumnGroup` no funciona `reorderableColumns`.
- Tras crear/editar/borrar, llamar a `emitirCambio()`.
- Debe verse bien en móvil (≤767px): tablas con scroll horizontal.

## Tests y build

- `npx vitest run` (tests en `src/__tests__/`, jsdom + `@vue/test-utils`).
- `npx vite build` antes de dar por bueno un cambio de componentes.
