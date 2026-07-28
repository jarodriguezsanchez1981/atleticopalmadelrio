# Intranet de Gestion — Club de Futbol

Scaffold completo (backend + frontend + BD) para la intranet del club:
calendario, plantillas por categoria, entrenamientos, convocatorias de
partidos y estadisticas basicas, con 3 roles (admin, coordinador, entrenador).

## Arquitectura

```
intranet-futbol/
├── backend/                 Node.js + Express (API REST)
│   ├── database/
│   │   ├── schema.sql       Esquema completo (SQLite)
│   │   ├── intranet_futbol.db   Fichero de base de datos (se crea al ejecutar db:init, no se versiona)
│   │   └── init.js          Crea las tablas + usuario admin inicial
│   └── src/
│       ├── config/db.js     Conexion SQLite (better-sqlite3, sincrona)
│       ├── middleware/      auth.middleware.js (JWT) y role.middleware.js (roles + scope por categoria)
│       ├── models/          Acceso a datos (SQL) por entidad
│       ├── controllers/     Logica de cada endpoint
│       ├── routes/          Definicion de rutas Express
│       └── server.js        Punto de entrada de la API
│
└── frontend/                 Vue 3 + Vite + Pinia + Tailwind + PrimeVue
    └── src/
        ├── stores/auth.store.js   Sesion, usuario y rol (Pinia)
        ├── services/              Wrappers axios por modulo (api.js central)
        ├── router/index.js        Rutas + guards de autenticacion y rol
        ├── layouts/MainLayout.vue Sidebar con menu condicionado por rol
        └── views/                 Una vista por modulo funcional
```

### Modelo de datos (resumen)
`roles` → `users` (login) → `user_categories` (N:M, asigna entrenadores a
categorias) → `categories` (por temporada) → `players` (plantilla) →
`trainings` / `matches` (eventos) → `training_attendance` /
`match_attendance` (asistencia + estadisticas basicas: titularidad,
minutos, goles, tarjetas).

### Como se aplican los 3 roles

| Accion | Admin | Coordinador | Entrenador |
|---|---|---|---|
| Gestionar usuarios/roles | Si | No | No |
| Crear/editar categorias | Si | Si | No |
| Gestionar plantilla (altas, licencias) | Si | Si | No |
| Crear entrenamientos/partidos | Si | Si | No |
| Ver calendario | Si (todo) | Si (todo) | Si (solo sus categorias) |
| Confirmar asistencia | Si | Si | Si |
| Ver estadisticas | Todas | Todas | Solo su categoria |

La autorizacion se aplica en **dos capas**, nunca solo en el frontend:
1. **Frontend**: el router (`router/index.js`) oculta rutas/menus segun
   `auth.role` (guard `to.meta.roles`), y las vistas esconden botones de
   gestion con `v-if="auth.canManage"`.
2. **Backend** (la capa que de verdad protege los datos):
   `authenticate` valida el JWT; `authorize(['admin','coordinador'])`
   bloquea endpoints de escritura; `scopeToOwnCategory` impide que un
   entrenador consulte una categoria que no tiene asignada, comparando
   contra `categoryIds` incrustado en el propio token.

## Puesta en marcha

### 1. Base de datos y backend
No hace falta instalar ni arrancar ningun servidor de base de datos: se usa
**SQLite** (via `better-sqlite3`), un unico fichero (`backend/database/intranet_futbol.db`)
que se crea automaticamente.

```bash
cd backend
cp .env.example .env      # valores por defecto ya funcionan, no necesitas tocarlos
npm install
npm run db:init           # crea el fichero .db, las tablas, y el usuario admin@club.com / Admin123!
npm run dev                # http://localhost:4000
```

Si quieres partir de cero (borrar todos los datos), simplemente borra el
fichero `backend/database/intranet_futbol.db` y vuelve a ejecutar `npm run db:init`.

### 2. Frontend
```bash
cd frontend
npm install
npm run dev                 # http://localhost:5173 (con proxy /api -> :4000)
```

Inicia sesion con `admin@club.com` / `Admin123!` y cambia la contrasena
cuanto antes (no hay endpoint de cambio de password en este scaffold;
es el primer punto a anadir).

## Notas e ideas para continuar

- **Sobre SQLite**: `better-sqlite3` compila un binario nativo en la
  instalacion. En la inmensa mayoria de sistemas usa un binario
  precompilado y no da problemas; si `npm install` fallara pidiendo
  herramientas de compilacion (Python, `build-essential`/Xcode
  Command Line Tools), instala esas herramientas del sistema operativo
  y repite `npm install`.
- **Migrar a PostgreSQL/MySQL en el futuro**: la capa de acceso a datos
  esta aislada en `src/models/*.js`, así que para cambiar de motor solo
  hay que tocar `config/db.js` y esos 5 ficheros (las rutas y
  controladores no cambian). El esquema (`database/schema.sql`) habria
  que adaptarlo de vuelta a tipos `SERIAL`/`ENUM`/`BOOLEAN` nativos del
  motor elegido.

- **PrimeVue 4**: el `main.js` usa el theme `Aura` (PrimeVue 4.x, basado
  en "unstyled + tokens"). Si prefieres PrimeVue 3.x clasico (mas simple
  de combinar con Tailwind), cambia `app.use(PrimeVue, {...})` por
  `app.use(PrimeVue)` e importa el CSS de un tema clasico
  (`primevue/resources/themes/lara-light-indigo/theme.css`).
- **Gestion de usuarios (admin)**: falta la vista/endpoints CRUD de
  `users` y asignacion de categorias a entrenadores vía
  `user_categories` — el modelo (`user.model.js`) ya tiene los metodos
  necesarios (`create`, `assignCategories`), solo falta el controlador,
  las rutas y la vista de administracion.
- **Calendario visual**: `CalendarView.vue` usa una tabla ordenable; si
  se quiere una vista tipo agenda/mes, se puede sustituir por FullCalendar
  (`@fullcalendar/vue3`) reutilizando el mismo `training.service.js` /
  `match.service.js`.
- **Subida de fotos de jugador**: `players.photo_url` esta pensado para
  guardar la URL tras subir el fichero a un storage (S3, disco local con
  `multer`, etc.); no se ha implementado el endpoint de subida.
- **Validacion de inputs**: los controladores no validan aun el body con
  `express-validator` (ya esta en las dependencias); anadir validaciones
  antes de produccion.
- **Multi-temporada**: el esquema ya soporta varias `seasons`; falta un
  selector de temporada en el frontend (por ahora se asume la activa).
