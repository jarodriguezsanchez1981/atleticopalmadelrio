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
│   ├── init.sql                 # DDL + roles + categorías demo (Docker)
│   └── schema.sql               # Instalación manual MySQL
├── backend/                     # Express + Sequelize + JWT + bcrypt
│   ├── Dockerfile
│   └── src/
│       ├── models/              # usuarios, roles, categorias, jugadores...
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

**Roles:** `administrador`, `coordinador`, `entrenador`

## Seguridad de contraseñas

- Política: mín. 8 caracteres + mayúscula + minúscula + número + especial
- Almacenamiento: **bcrypt** (12 rondas)
- AES-256-GCM disponible para datos sensibles recuperables (p.ej. DNI), no para passwords
- Sesión: JWT + rate-limit en login

## Tablas MySQL

- `roles` (id, nombre)
- `usuarios` (id, usuario, password, nombre, apellidos, id_rol)
- `categorias` (id, nombre, temporada)
- `jugadores` (id, nombre, apellidos, dni, id_categoria)
- `entrenamientos` (id, id_categoria, fecha, lugar, incidencias)
- `partidos` (id, id_categoria, fecha, lugar, equipo_rival, resultado, incidencias)

> `equipo_rival` y `resultado` se añaden a partidos para poder filtrar por rival.

## Desarrollo local (sin Docker del frontend/backend)

```bash
# Solo MySQL
docker compose up -d db

# Backend
cd backend && cp .env.example .env && npm install && npm run seed:admin && npm run dev

# Frontend
cd frontend && npm install && npm run dev   # http://localhost:5173
```
