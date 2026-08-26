# Intranet — Atlético Palma del Río

Intranet de gestión del club con Docker Compose.

**Stack:** Vue 3 + Vite + Pinia + Tailwind + PrimeVue · Node/Express · MySQL 8 · Nginx

## Arranque rápido (Docker)

```bash
cp .env.example .env   # o usar el .existente
docker compose up -d --build
```

| Servicio  | URL | Descripción |
|-----------|-----|-------------|
| Intranet  | https://intranetatleticopalmadelrio.com | Acceso principal (HTTPS auto-firmado) |
| Intranet  | https://localhost | Acceso local alternativo |
| API       | https://localhost/api | REST API (proxied por Nginx) |
| MySQL     | 127.0.0.1:3306 | Base de datos (solo localhost) |

> **Nota:** añade `127.0.0.1 intranetatleticopalmadelrio.com` a `/etc/hosts` para resolver el dominio en local.

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
│       ├── models/             # Modelos Sequelize + asociaciones
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
│       │   ├── plantillas/
│       │   └── ...
│       └── utils/
│           ├── pdfPartidos.js       # Generación PDF agrupado
│           └── pdfEntrenamientos.js
└── .agents/skills/             # Skills de opencode
```

## Secciones y permisos

| Sección        | CRUD | Nivel | Descripción |
|----------------|------|-------|-------------|
| Calendario     | No   | read  | Vista calendario (mes/semana/año) |
| Entrenamientos | Sí   | write | Gestión de entrenamientos |
| Entren. Jugadores | Sí | write | Asignación de jugadores a entrenamientos |
| Partidos       | Sí   | write | Partidos con filtros temporada/categoría |
| Temporadas     | Sí   | write | Temporadas del club |
| Títulos        | Sí   | write | Títulos de entrenadores |
| División       | Sí   | write | Divisiones deportivas |
| Lugares        | Sí   | write | Lugares de entrenamiento/partido |
| Delegados      | Sí   | write | Delegados del club |
| Categorías     | Sí   | write | Categorías del club |
| Equipos        | Sí   | write | Equipos del club |
| Incidencias    | Sí   | write | Incidencias de partidos |
| Jugadores      | Sí   | write | Jugadores del club |
| Plantillas     | Sí   | write | Plantillas por categoría y temporada |
| Entrenadores   | Sí   | write | Entrenadores del club |
| Jornadas       | Sí   | write | Jornadas deportivas (calendario por categoría) |
| Sanciones      | Sí   | write | Sanciones a jugadores |
| Roles          | Sí   | write | Roles de usuario |
| Patrocinadores | Sí   | write | Patrocinadores del club |
| Administración | Sí   | write | Gestión de usuarios y permisos |

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

## Tablas MySQL

### Principales
- `usuarios` — Usuarios del sistema con roles
- `categorias` — Categorías del club (Benjamin, Infantil, Juvenil, Senior...)
- `equipos` — Equipos con escudo y datos geográficos
- `jugadores` — Jugadores del club
- `partidos` — Partidos con fecha, lugar y equipo
- `jornadas` — Jornadas deportivas con equipos local/visitante
- `sanciones` — Sanciones a jugadores
- `patrocinadores` — Patrocinadores con logos
- `plantillas` — Plantillas por categoría y temporada

### Relaciones
- `plantilla_jugadores` / `plantilla_entrenadores` / `plantilla_delegados` — Muchos a muchos
- `usuario_secciones` — Permisos por sección
- `entrenador_titulos` — Muchos a muchos
- `lugar_tipofutbol` — Muchos a muchos
- `entrenamientos_jugadores` — Asignación de jugadores a entrenamientos

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
# Backend
cd backend
npm test              # ejecución única
npm run test:watch    # modo watch
npm run test:coverage # cobertura

# Frontend
cd frontend
npm test              # ejecución única
```

Tests unitarios de controladores (292 tests, 30 archivos) y utilidades frontend (21 tests, 4 archivos). Mocks en `backend/tests/helpers/`.

## Entornos

| Variable | Dev | Production |
|----------|-----|------------|
| `NODE_ENV` | development | production |
| `DB_NAME` | atletico_palma_intranet_dev | atletico_palma_intranet |
| `CORS_ORIGIN` | http://localhost:5173 | https://intranetatleticopalmadelrio.com |
| `JWT_SECRET` | (desarrollo) | (generado por entorno) |

## Comandos útiles

```bash
# Ver logs de un servicio
docker compose logs -f backend

# Reconstruir un servicio específico
docker compose up -d --build backend

# Reconstruir todas las imágenes
docker compose build && docker compose up -d

# Recargar config de Nginx sin reiniciar
docker exec apr_nginx nginx -s reload

# Acceder a MySQL
docker exec -it apr_mysql mysql -uroot -prootpass atletico_palma_intranet

# Ejecutar tests en Docker
docker compose run --rm test

# Verificar health de la API
curl -k https://localhost/api/health
```
