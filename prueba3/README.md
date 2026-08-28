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
| Intranet  | https://intranetatleticopalmadelrio.com | Acceso principal (HTTPS) |
| Intranet  | https://localhost | Acceso local alternativo |
| API       | https://localhost/api | REST API (proxied por Nginx) |
| MySQL     | 127.0.0.1:3306 | Base de datos (solo localhost) |

> **Nota:** añade `127.0.0.1 intranetatleticopalmadelrio.com` a `/etc/hosts` para resolver el dominio en local.

**Login inicial:** `admin` / cámbiala en Administración.

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
│   └── certs/                  # Certificados TLS
├── database/
│   ├── init.sql                # DDL + datos iniciales (26 tablas, 850+ líneas)
│   └── schema.sql              # Instalación manual MySQL
├── backend/                    # Express + Sequelize + JWT + bcrypt
│   ├── Dockerfile              # Multi-stage, non-root user
│   └── src/
│       ├── models/             # Modelos Sequelize + asociaciones (20 modelos)
│       ├── controllers/        # Lógica CRUD con validación
│       ├── routes/             # REST API con auth + autorización
│       ├── middlewares/        # JWT, roles, auditoría, rate limiting, errores
│       └── utils/              # bcrypt, AES-256-GCM, JWT, validación SSRF
├── frontend/                   # Vue 3 + Pinia + PrimeVue + FullCalendar
│   ├── Dockerfile              # Build estático + nginx interno
│   ├── tailwind.config.js      # Sistema de diseño escandinavo
│   └── src/
│       ├── components/
│       │   ├── CrudDataTable.vue       # Tabla CRUD genérica responsive
│       │   ├── EventosCalendario.vue   # Calendario con detalle partidos/entrenamientos
│       │   ├── EventoFormCalendario.vue
│       │   ├── CamisetaDorsal.vue      # Visualización jersey + dorsal
│       │   └── FooterSponsors.vue      # Footer compartido con sponsors
│       ├── views/
│       │   ├── auth/Login.vue
│       │   ├── admin/Usuarios.vue
│       │   ├── calendario/Calendario.vue
│       │   ├── plantillas/Plantillas.vue
│       │   ├── cambios/Cambios.vue     # Auditoría de cambios
│       │   └── ...
│       ├── layouts/MainLayout.vue      # Sidebar responsive + drawer móvil
│       ├── composables/useMediaQuery.js
│       ├── services/api.js             # Axios + JWT interceptor
│       └── utils/
│           ├── pdfPartidos.js          # PDF 5 columnas con semana
│           ├── pdfCalendario.js        # PDF combinado (partidos + entrenamientos)
│           └── pdfEntrenamientos.js    # PDF entrenamientos agrupados
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
| **Cambios**    | **No** | **read** | **Auditoría de todos los cambios realizados** |

**Permisos:** el acceso se gestiona por secciones asignadas a cada usuario. Niveles de rol: `read` (solo lectura) y `write` (CRUD completo).

## Auditoría de cambios

La sección **Cambios** (`/cambios`) registra automáticamente toda acción de creación, edición y eliminación en la API:

- **Tabla `cambios`**: `entidad`, `id_registro`, `accion` (crear/editar/eliminar), `datos_previos` (JSON), `datos_nuevos` (JSON), `id_usuario`, `created_at`
- **Middleware automático**: intercepta `POST`, `PUT` y `DELETE` en todas las rutas `/api` sin modificar controladores
- **Snapshot previo**: al editar/eliminar, captura el estado del registro antes del cambio
- **Sanitización**: contraseñas y tokens se eliminan del registro de auditoría
- **Quién hizo qué y cuándo**: usuario autenticado, timestamp, entidad y registro afectado

La vista en el frontend muestra una tabla de solo lectura con badges de acción (verde/azul/rojo), usuario, fecha, y detalle expandible con JSON formateado del antes/después.

## Funcionalidades principales

### Calendario y PDF
- **Vista calendario** con eventos de partidos y entrenamientos
- **PDF combinado** (partidos + entrenamientos agrupados por fecha)
- **PDF de partidos** con 5 columnas: Lugar, Hora, Categoría, Local, Visitante
- **Detalle de entrenamiento**: fecha, hora, lugar, recurrente

### Plantillas
- **CRUD de plantillas** con drag & drop de entrenadores, delegados y jugadores
- **Dorsal visual**: camiseta con número asignado, detección de duplicados
- **Ordenación** por nombre y dorsal en vista detalle
- **Vista detalle** con entrenadores, delegados y jugadores

### Equipo
- **Escudo download**: desde la API de equipos
- **Datos geográficos** y localidad

### Responsive móvil
- **Sidebar → Drawer** en dispositivos ≤767px
- **Tablas con scroll horizontal** en todas las vistas CRUD
- **Toolbar responsive**: botones se envuelven en segunda línea
- **Acciones congeladas** en la columna de acciones de la tabla
- **Plantillas**: tablas custom con `overflow-x-auto`

## Seguridad

### Protección de la aplicación
- **Auditoría**: middleware automático que registra todos los cambios en la tabla `cambios`
- **SSRF protection**: proxy de imágenes bloquea IPs privadas, loopback y DNS rebinding
- **Rate limiting**: 10 000 req/15min globales
- **Body limit**: 2MB máximo por petición
- **JWT**: tokens de 8h con secrets generados por entorno
- **bcrypt**: hashing de contraseñas con 12 rondas
- **Política de contraseñas**: mín. 8 caracteres + mayúscula + minúscula + número + símbolo
- **Autorización**: `requireNivel()` en rutas de escritura, `authorize()` por sección
- **Error handling**: mensajes específicos en creación de usuarios, genéricos en producción

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
- **Footer**: patrocinadores compartido (FooterSponsors.vue)

## Tablas MySQL

### Principales
- `usuarios` — Usuarios del sistema con roles y secciones visibles
- `categorias` — Categorías del club (Benjamin, Infantil, Juvenil, Senior...)
- `equipos` — Equipos con escudo y datos geográficos
- `jugadores` — Jugadores del club (DNI opcional)
- `partidos` — Partidos con `id_equipo_local` y `id_equipo_visitante` (FK equipos)
- `jornadas` — Jornadas deportivas con equipos local/visitante
- `sanciones` — Sanciones a jugadores
- `patrocinadores` — Patrocinadores con logos
- `plantillas` — Plantillas por categoría y temporada
- **`cambios`** — Auditoría de todas las acciones CRUD (entidad, acción, antes/después, usuario)

### Relaciones
- `plantilla_jugadores` / `plantilla_entrenadores` / `plantilla_delegados` — Muchos a muchos
- `usuario_secciones` — Permisos por sección (24 secciones)
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
# Backend (303 tests, 32 archivos)
cd backend
npx vitest run              # ejecución única
npx vitest run --watch      # modo watch

# Frontend (21 tests, 4 archivos)
cd frontend
npx vitest run              # ejecución única
```

Mocks en `backend/tests/helpers/` — `Module._load` interceptor para Sequelize models. Tests cubren controladores, middleware de auditoría y utilidades frontend.

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

# Reconstruir solo el backend
docker compose build backend && docker compose up -d backend

# Reconstruir todas las imágenes
docker compose build && docker compose up -d

# Desplegar frontend (build + copiar al contenedor)
cd frontend && npm run build
docker cp dist/. apr_frontend:/usr/share/nginx/html/
docker restart apr_nginx

# Recargar config de Nginx sin reiniciar
docker exec apr_nginx nginx -s reload

# Acceder a MySQL
docker exec -it apr_mysql mysql -uroot -p"$MYSQL_ROOT_PASSWORD" atletico_palma_intranet

# Verificar health de la API
curl -k https://localhost/api/health

# Backup de la base de datos
./scripts/backup-db.sh
```
