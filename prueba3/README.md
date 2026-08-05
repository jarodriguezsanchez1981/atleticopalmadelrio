# Intranet — Atlético Palma del Río

Intranet de gestión del club con Docker Compose.

**Stack:** Vue 3 + Vite + Pinia + Tailwind + PrimeVue · Node/Express · MySQL 8

## Arranque rápido (Docker)

```bash
cp .env.example .env   # opcional: ya hay un .env de desarrollo
docker compose up -d --build
```

| Servicio  | URL |
|-----------|-----|
| Frontend  | http://localhost:8080 |
| API       | http://localhost:4000 |
| MySQL     | localhost:3306 |

**Login inicial:** `admin` / `Admin#2026` (cámbiala en Administración)

```bash
docker compose logs -f          # logs
docker compose down             # parar
docker compose down -v          # parar y borrar datos MySQL
```

## Arquitectura

```
prueba3/
├── docker-compose.yml
├── .env / .env.example
├── database/
│   ├── init.sql                 # DDL + secciones + categorías demo (Docker)
│   └── schema.sql               # Instalación manual MySQL
├── backend/                     # Express + Sequelize + JWT + bcrypt
│   ├── Dockerfile
│   └── src/
│       ├── models/              # usuarios, secciones, categorias, jugadores...
│       ├── controllers/ routes/ middlewares/
│       └── utils/               # bcrypt, AES-256-GCM, JWT, seedAdmin
└── frontend/                    # Vue 3 + Pinia + PrimeVue + FullCalendar
    ├── Dockerfile + nginx.conf  # build estático + proxy /api → backend
    └── src/views/
        ├── auth/Login.vue
        ├── admin/Usuarios.vue   # solo administrador
        ├── calendario/          # solo lectura (mes/semana/año)
        ├── entrenamientos/ partidos/ categorias/ jugadores/
```

## Secciones y permisos

| Sección        | CRUD | Acceso                         |
|----------------|------|--------------------------------|
| Administración | Sí   | Solo `administrador`           |
| Calendario     | No   | Todos (solo lectura)           |
| Entrenamientos | Sí   | Todos                          |
| Partidos       | Sí   | Todos (+ filtros temporada/categoría/rival) |
| Categorías     | Sí   | Todos                          |
| Jugadores      | Sí   | Todos                          |

**Permisos:** el acceso se gestiona por secciones asignadas a cada usuario. Un usuario con la sección `administración` es administrador.

## Seguridad de contraseñas

- Política: mín. 8 caracteres + mayúscula + minúscula + número + especial
- Almacenamiento: **bcrypt** (12 rondas)
- AES-256-GCM disponible para datos sensibles recuperables (p.ej. DNI), no para passwords
- Sesión: JWT + rate-limit en login

## Tablas MySQL

- `usuarios` (id, usuario, password, nombre, apellidos)
- `titulo` (id, nombre)
- `delegados` (id, nombre, apellidos, dni, foto, tipo, id_categoria, id_temporada)
- `entrenadores` (id, nombre, apellidos, dni, foto, id_temporada) + `entrenador_categorias` + `entrenador_titulos`
- `categorias` (id, nombre, temporada, id_entrenador, id_delegado)
- `jugadores` (id, nombre, apellidos, dni, foto, id_temporada) + `jugador_categorias`
- `secciones` (id, clave, nombre, icono, orden) + `usuario_secciones`
- `entrenamientos` (id, id_categoria, fecha, lugar, incidencias)
- `partidos` (id, id_categoria, fecha, lugar, equipo_rival, incidencias)

> Tablas puente: `entrenador_categorias`/`jugador_categorias` (un entrenador/jugador en varias categorías), `entrenador_titulos` (un entrenador con varios títulos) y `usuario_secciones` (un usuario puede ver varias secciones).

> `equipo_rival` se añade a partidos para poder filtrar por rival.

## Desarrollo local (sin Docker del frontend/backend)

```bash
# Solo MySQL
docker compose up -d db

# Backend
cd backend && cp .env.example .env && npm install && npm run seed:admin && npm run dev

# Frontend
cd frontend && npm install && npm run dev   # http://localhost:5173
```

## Entornos dev / pro

Cada capa tiene ficheros de entorno por sufijo (`.development` / `.production`); el fichero real está en `.gitignore` y su plantilla versionable termina en `.example`.

### Docker Compose (raíz)

```bash
# Desarrollo
docker compose --env-file .env.development up -d --build

# Producción
docker compose --env-file .env.production up -d --build

# Validar la configuración de un entorno sin arrancar
docker compose --env-file .env.production config
```

`DB_NAME` separa las bases (`atletico_palma_intranet_dev` en dev, `atletico_palma_intranet` en pro), y `FRONTEND_PORT`/`BACKEND_PORT`/`CORS_ORIGIN`/`NODE_ENV` cambian según el entorno.

### Backend (local)

El backend carga automáticamente `.env.development` o `.env.production` según `NODE_ENV` (`backend/src/config/env.js`).

```bash
cd backend
NODE_ENV=development npm run dev
NODE_ENV=production  npm start
```

Plantillas: `backend/.env.development.example`, `backend/.env.production.example`.

### Frontend (Vite)

`api.js` usa `import.meta.env.VITE_API_BASE_URL` (por defecto `/api`). En desarrollo el proxy de Vite redirige `/api` al backend local (`VITE_PROXY_TARGET`); en producción nginx sirve `/api` en el mismo origen.

```bash
cd frontend
npm run dev     # usa .env.development
npm run build   # usa .env.production
```

Plantillas: `frontend/.env.development.example`, `frontend/.env.production.example`.

## Tests (Vitest)

Tests unitarios de los controladores de la API (sin base de datos: los modelos se mockean).

```bash
cd backend

npm test              # ejecución única
npm run test:watch    # modo watch (en cada cambio)
npm run test:coverage # informe de cobertura (v8) de src/controllers
```

- **Docker (CI/por demanda):** `docker compose run --rm test` ejecuta los tests en un contenedor con las dependencias de desarrollo; requiere la base de datos (`docker compose up -d db`).
- **Hook de pre-commit:** hay un hook local en `.git/hooks/pre-commit` que ejecuta `npm test` en el backend cuando hay cambios en `backend/` y bloquea el commit si fallan.
- Los tests viven en `backend/tests/` (`*.controller.test.js`). El interceptor de módulos está en `backend/tests/setup.js` y los mocks de los modelos en `backend/tests/helpers/`.
