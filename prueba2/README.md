# Intranet — Atlético Palma del Río

Intranet de gestión del club: administración de usuarios, calendario de
entrenamientos/partidos, y CRUD de entrenamientos, partidos, categorías y
jugadores.

## Arquitectura

```
atletico-palma-intranet/
├── database/
│   └── schema.sql              # DDL MySQL: roles, usuarios, categorias, jugadores, entrenamientos, partidos
├── backend/                    # API REST (Node + Express + Sequelize + MySQL)
│   └── src/
│       ├── config/db.js        # Conexión Sequelize
│       ├── models/             # Rol, Usuario, Categoria, Jugador, Entrenamiento, Partido
│       ├── controllers/        # Lógica de negocio de cada recurso
│       ├── routes/             # Endpoints REST + protección por rol
│       ├── middlewares/        # auth (JWT), role (autorización), error handler
│       ├── utils/               # password.utils (bcrypt + política), jwt.utils, aesCrypto (AES-256), seedAdmin
│       ├── app.js / server.js
└── frontend/                   # Vue 3 + Vite + Pinia + PrimeVue + Tailwind
    └── src/
        ├── stores/auth.store.js       # Sesión (Pinia)
        ├── services/                  # Axios + servicios REST por recurso
        ├── router/index.js            # Rutas + guards por autenticación/rol
        ├── layouts/MainLayout.vue     # Sidebar + navbar
        ├── components/CrudDataTable.vue  # Tabla+formulario CRUD genérico (PrimeVue)
        └── views/
            ├── auth/Login.vue
            ├── calendario/Calendario.vue   # FullCalendar, SOLO LECTURA
            ├── entrenamientos/Entrenamientos.vue
            ├── partidos/Partidos.vue       # + filtros Temporada/Categoría/Rival
            ├── categorias/Categorias.vue
            ├── jugadores/Jugadores.vue
            └── admin/Usuarios.vue          # Solo rol "administrador"
```

### Por qué este stack
- **Vue 3 + Vite**: arranque rápido, Composition API, HMR instantáneo.
- **Pinia**: estado de sesión (token, usuario, rol) reactivo y persistido en `localStorage`.
- **PrimeVue**: `DataTable`, `Dialog`, `Select`, `DatePicker` listos para CRUDs de gestión deportiva.
- **FullCalendar** (`@fullcalendar/vue3`): PrimeVue solo aporta un selector de fecha, no una vista de agenda; FullCalendar sí da la experiencia "estilo Google Calendar" con vistas mes/semana/año que pide el requisito 3.
- **Tailwind CSS**: utilidades para maquetar rápido sobre la identidad visual del club.
- **Express + Sequelize + MySQL**: API REST clásica, ORM para evitar SQL repetitivo y mantener las validaciones/asociaciones (claves foráneas) declaradas junto al modelo.

## Seguridad de contraseñas (requisito 1)

- **Política**: mínimo 8 caracteres + mayúscula + minúscula + número + carácter especial (`password.utils.js`, `PASSWORD_REGEX`), validada en el backend antes de crear/actualizar usuarios.
- **Almacenamiento**: hash **bcrypt** (12 rondas), nunca texto plano ni cifrado reversible.
- **Nota sobre AES-256**: el enunciado pide contraseñas "encriptadas en AES-256" y a la vez "hashing bcrypt". Ambas cosas a la vez no tiene sentido para contraseñas: AES es cifrado *reversible* (quien tenga la clave recupera el texto original), mientras que bcrypt es un hash de un solo sentido con salt — el estándar de la industria para credenciales. Por eso las contraseñas se protegen únicamente con bcrypt. El módulo AES-256-GCM (`utils/aesCrypto.js`) se deja implementado y disponible para cifrar en reposo otros datos sensibles del club que si necesiten poder recuperarse en claro (por ejemplo, si en el futuro se quisiera cifrar el DNI de los jugadores).
- Los tokens de sesión son JWT firmados (`JWT_SECRET`), con expiración configurable y limitador de intentos de login (`express-rate-limit`).

## Puesta en marcha

### 1. Base de datos
```bash
mysql -u root -p < database/schema.sql
```

### 2. Backend
```bash
cd backend
cp .env.example .env     # y edita DB_USER, DB_PASSWORD, JWT_SECRET, AES_SECRET_KEY...
npm install
npm run seed:admin       # crea el usuario admin inicial (admin / Admin#2026)
npm run dev               # http://localhost:4000
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev                # http://localhost:5173 (proxy /api -> :4000)
```

Inicia sesión con el usuario administrador generado por `npm run seed:admin`
y cambia la contraseña desde "Administración" en cuanto entres.

## Reglas de negocio implementadas

| Sección          | CRUD | Roles con acceso                     |
|-------------------|------|----------------------------------------|
| Administración    | Sí   | Solo `administrador`                   |
| Calendario        | No (solo lectura) | Todos                     |
| Entrenamientos    | Sí   | Todos                                   |
| Partidos          | Sí (+ filtros Temporada/Categoría/Rival) | Todos     |
| Categorías        | Sí   | Todos                                   |
| Jugadores         | Sí   | Todos                                   |

## Nota sobre el escudo y los colores
`frontend/public/escudo.svg` y la paleta en `tailwind.config.js` (`club.green`,
`club.garnet`, `club.gold`, `club.cream`) son un **placeholder**. Sustituye el
SVG por el escudo oficial (`escudo.png` o `.svg`) y ajusta los tonos exactos
del club cuando estén disponibles; ambos están centralizados para que el
cambio no requiera tocar cada pantalla.

## Nota sobre el esquema de `partidos`
El enunciado especifica las columnas `(id, id_categoria, fecha, lugar,
incidencias)`. Se han añadido `equipo_rival` y `resultado` porque el propio
requisito 5 pide poder **filtrar los partidos por "Equipo Rival"**, lo cual
no es posible sin guardar ese dato. Ver el comentario en
`database/schema.sql` si se prefiere revertir al esquema mínimo literal.
