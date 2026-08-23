# Intranet — Atlético Palma del Río

Intranet de gestión del club con Docker Compose.

**Stack:** Vue 3 + Vite + Pinia + Tailwind + PrimeVue · Node/Express · MySQL 8 · Nginx · n8n

## Arranque rápido (Docker)

```bash
cp .env.example .env   # o usar el .existente
docker compose up -d --build
```

| Servicio  | URL | Descripción |
|-----------|-----|-------------|
| Intranet  | https://localhost | Acceso principal (HTTPS auto-firmado) |
| API       | https://localhost/api | REST API (proxied por Nginx) |
| MySQL     | 127.0.0.1:3306 | Base de datos (solo localhost) |
| n8n       | http://localhost:5678 | Automatización de workflows |

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
├── nginx/
│   ├── proxy.conf              # Reverse proxy HTTPS + security headers
│   └── certs/                  # Certificados TLS auto-firmados
├── database/
│   ├── init.sql                # DDL + datos iniciales (Docker)
│   └── schema.sql              # Instalación manual MySQL
├── backend/                    # Express + Sequelize + JWT + bcrypt
│   ├── Dockerfile              # Multi-stage, non-root user
│   └── src/
│       ├── models/             # 28 tablas: usuarios, equipos, categorías, partidos, sanciones...
│       ├── controllers/        # Lógica CRUD con validación
│       ├── routes/             # REST API con auth + autorización
│       ├── middlewares/        # JWT, roles, rate limiting, error handling
│       └── utils/              # bcrypt, AES-256-GCM, JWT, validación SSRF
├── frontend/                   # Vue 3 + Pinia + PrimeVue + FullCalendar
│   ├── Dockerfile              # Build estático + nginx interno
│   ├── tailwind.config.js      # Sistema de diseño escandinavo
│   └── src/
│       ├── components/
│       │   ├── CrudDataTable.vue    # Tabla CRUD genérica
│       │   ├── EventosCalendario.vue
│       │   ├── FooterSponsors.vue   # Footer compartido
│       │   └── ...
│       ├── views/
│       │   ├── auth/Login.vue
│       │   ├── admin/Usuarios.vue
│       │   ├── calendario/
│       │   ├── sanciones/
│       │   └── ...
│       └── utils/
│           ├── pdfPartidos.js       # Generación PDF agrupado
│           └── pdfEntrenamientos.js
└── .agents/skills/             # Skills de opencode
    └── scandinavian-design/    # Sistema de diseño nórdico
```

## Secciones y permisos

| Sección        | CRUD | Nivel | Descripción |
|----------------|------|-------|-------------|
| Administración | Sí   | write | Gestión de usuarios y permisos |
| Calendario     | No   | read  | Vista calendario (mes/semana/año) |
| Entrenamientos | Sí   | write | Gestión de entrenamientos |
| Partidos       | Sí   | write | Partidos con filtros temporada/categoría |
| Convocatorias  | Sí   | write | Asignación de jugadores a partidos |
| Resultados     | Sí   | write | Resultados de partidos |
| Categorías     | Sí   | write | Categorías del club |
| Equipos        | Sí   | write | Equipos del club |
| Jugadores      | Sí   | write | Jugadores del club |
| Jornadas       | Sí   | write | Jornadas deportivas |
| Sanciones      | Sí   | write | Sanciones a jugadores |
| Incidencias    | Sí   | write | Incidencias de partidos |
| Roles          | Sí   | write | Roles de usuario |
| Patrocinadores | Sí   | write | Patrocinadores del club |

**Permisos:** el acceso se gestiona por secciones asignadas a cada usuario. Niveles de rol: `read` (solo lectura) y `write` (CRUD completo).

## Seguridad

### Protección de la aplicación
- **SSRF protection**: proxy de imágenes bloquea IPs privadas, loopback y DNS rebinding
- **Rate limiting**: 100 req/15min globales + 10 req/15min en login
- **Body limit**: 2MB máximo por petición
- **JWT**: tokens de 8h con secrets generados por entorno
- **bcrypt**: hashing de contraseñas con 12 rondas
- **Política de contraseñas**: mín. 8 caracteres + mayúscula + minúscula + número + símbolo
- **Autorización**: `requireNivel()` en rutas de escritura, `authorize()` por sección
- **Error handling**: mensajes genéricos en producción, sin leak de detalles

### Protección de la infraestructura
- **Nginx**: security headers (CSP, X-Frame-Options DENY, nosniff, Referrer-Policy)
- **TLS**: cifrados ECDHE fuertes, TLS 1.2/1.3
- **Docker**: containers non-root, `cap_drop: ALL`, límites de recursos
- **MySQL**: puerto solo expuesto a `127.0.0.1`
- **Secrets**: backend se niega a arrancar con valores por defecto en producción

## Diseño visual

Sistema de diseño escandinavo aplicado:
- **Paleta neutra**: tinta alpha-black sobre fondo blanco
- **Color de marca**: verde institucional `#0B3D2E` como único accent
- **Tipografía**: Inter (Google Fonts)
- **Componentes**: PrimeVue con theme neutro
- **Footer**: tabla compartida (FooterSponsors.vue) en todo el proyecto

## Tablas MySQL (28 tablas)

### Principales
- `usuarios` — Usuarios del sistema con roles
- `categorias` — Categorías del club (Benjamin, Infantil, Juvenil, Senior...)
- `equipos` — 104 equipos con escudo y datos geográficos
- `jugadores` — Jugadores del club
- `partidos` — 133 partidos con jornadas
- `jornadas` — 124 jornadas deportivas
- `sanciones` — Sanciones a jugadores
- `patrocinadores` — 17 patrocinadores con logos

### Relaciones
- `entrenador_categorias` / `jugador_categorias` — Muchos a muchos
- `usuario_secciones` — Permisos por sección
- `partidos_jugadores` — Convocatorias
- `entrenamientos_semanales` / `entrenamientos_jugadores`

## n8n (Automatización)

Workflow automation incluido para automatizar tareas del club:

- **URL**: http://localhost:5678
- **Usuario**: `admin` / **Contraseña**: `n8n_admin_2026`
- **Conexión**: MySQL existente (`atletico_palma_intranet`)
- **Datos**: persistidos en volumen `apr_n8n_data`

### Configuración
```yaml
# docker-compose.yml
n8n:
  image: n8nio/n8n:latest
  ports: ["5678:5678"]
  environment:
    DB_TYPE: mysqldb
    N8N_BASIC_AUTH_ACTIVE: "true"
```

## Desarrollo local

```bash
# Solo MySQL
docker compose up -d db

# Backend
cd backend && npm install && npm run dev

# Frontend
cd frontend && npm install && npm run dev   # http://localhost:5173
```

## Tests

```bash
cd backend
npm test              # ejecución única
npm run test:watch    # modo watch
npm run test:coverage # cobertura
```

Tests unitarios de controladores (270 tests, 22 archivos). Mocks en `backend/tests/helpers/`.

## Entornos

| Variable | Dev | Production |
|----------|-----|------------|
| `NODE_ENV` | development | production |
| `DB_NAME` | atletico_palma_intranet_dev | atletico_palma_intranet |
| `CORS_ORIGIN` | http://localhost:5173 | https://intranet.atleticopalmadelrio.com |
| `JWT_SECRET` | (desarrollo) | (generado por entorno) |

## Comandos útiles

```bash
# Ver logs de un servicio
docker compose logs -f backend

# Reconstruir un servicio específico
docker compose up -d --build backend

# Acceder a MySQL
docker exec -it apr_mysql mysql -uroot -prootpass atletico_palma_intranet

# Ejecutar tests en Docker
docker compose run --rm test

# Verificar health de la API
curl -k https://localhost/api/health
```
