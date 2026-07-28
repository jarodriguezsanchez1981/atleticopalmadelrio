-- =====================================================================
-- INTRANET GESTION EQUIPO DE FUTBOL - ESQUEMA DE BASE DE DATOS (SQLite)
-- =====================================================================
PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------
-- ROLES
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL UNIQUE  -- admin | coordinador | entrenador
);

INSERT OR IGNORE INTO roles (id, name) VALUES (1, 'admin'), (2, 'coordinador'), (3, 'entrenador');

-- ---------------------------------------------------------------------
-- TEMPORADAS (permite historico multi-temporada)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS seasons (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,        -- ej: 2025/2026
  start_date    TEXT NOT NULL,
  end_date      TEXT NOT NULL,
  is_active     INTEGER NOT NULL DEFAULT 0  -- 0/1
);

INSERT OR IGNORE INTO seasons (id, name, start_date, end_date, is_active)
VALUES (1, '2025/2026', '2025-08-01', '2026-06-30', 1);

-- ---------------------------------------------------------------------
-- CATEGORIAS (Benjamin, Alevin, Cadete, Senior, etc.)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  season_id     INTEGER NOT NULL,
  name          TEXT NOT NULL,        -- ej: Cadete A
  description   TEXT,
  created_at    TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- USUARIOS (login de la intranet: admin, coordinadores, entrenadores)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  surname       TEXT,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role_id       INTEGER NOT NULL,
  phone         TEXT,
  active        INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at    TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- Asignacion de entrenadores/coordinadores a categorias (N:M).
CREATE TABLE IF NOT EXISTS user_categories (
  user_id       INTEGER NOT NULL,
  category_id   INTEGER NOT NULL,
  PRIMARY KEY (user_id, category_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- JUGADORES (plantilla por categoria y temporada)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS players (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id       INTEGER NOT NULL,
  dorsal            INTEGER,
  name              TEXT NOT NULL,
  surname           TEXT NOT NULL,
  birth_date        TEXT,
  federative_license TEXT,
  license_status    TEXT DEFAULT 'tramitando' CHECK (license_status IN ('tramitando','activa','caducada')),
  physical_status   TEXT DEFAULT 'disponible' CHECK (physical_status IN ('disponible','lesionado','recuperacion','sancionado')),
  physical_notes    TEXT,
  phone             TEXT,
  email             TEXT,
  contact_name      TEXT,
  contact_phone     TEXT,
  photo_url         TEXT,
  active            INTEGER NOT NULL DEFAULT 1,
  created_at        TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at        TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
  UNIQUE (category_id, dorsal)
);

-- ---------------------------------------------------------------------
-- ENTRENAMIENTOS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trainings (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id   INTEGER NOT NULL,
  event_date    TEXT NOT NULL,
  start_time    TEXT NOT NULL,
  end_time      TEXT,
  location      TEXT NOT NULL,
  notes         TEXT,
  created_by    INTEGER,
  created_at    TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Control de asistencia a entrenamientos (por jugador)
CREATE TABLE IF NOT EXISTS training_attendance (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  training_id   INTEGER NOT NULL,
  player_id     INTEGER NOT NULL,
  status        TEXT DEFAULT 'convocado' CHECK (status IN ('convocado','presente','ausente','justificado')),
  notes         TEXT,
  confirmed_by  INTEGER,
  confirmed_at  TEXT,
  FOREIGN KEY (training_id) REFERENCES trainings(id) ON DELETE CASCADE,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
  FOREIGN KEY (confirmed_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE (training_id, player_id)
);

-- ---------------------------------------------------------------------
-- PARTIDOS (convocatorias de liga)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS matches (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id   INTEGER NOT NULL,
  event_date    TEXT NOT NULL,
  start_time    TEXT NOT NULL,
  location      TEXT NOT NULL,
  rival         TEXT NOT NULL,
  home_away     TEXT NOT NULL DEFAULT 'local' CHECK (home_away IN ('local','visitante')),
  competition   TEXT,
  jornada       TEXT,
  result_own    INTEGER,
  result_rival  INTEGER,
  notes         TEXT,
  created_by    INTEGER,
  created_at    TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Convocatoria + estadisticas basicas por jugador y partido
CREATE TABLE IF NOT EXISTS match_attendance (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id        INTEGER NOT NULL,
  player_id       INTEGER NOT NULL,
  convocado       INTEGER NOT NULL DEFAULT 1,
  status          TEXT DEFAULT 'convocado' CHECK (status IN ('convocado','confirmado','rechazado','no_disponible')),
  titular         INTEGER DEFAULT 0,
  minutes_played  INTEGER DEFAULT 0,
  goals           INTEGER DEFAULT 0,
  yellow_cards    INTEGER DEFAULT 0,
  red_card        INTEGER DEFAULT 0,
  notes           TEXT,
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
  UNIQUE (match_id, player_id)
);

-- ---------------------------------------------------------------------
-- INDICES DE APOYO PARA CONSULTAS DE CALENDARIO / ESTADISTICAS
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_trainings_date ON trainings (event_date);
CREATE INDEX IF NOT EXISTS idx_matches_date ON matches (event_date);
CREATE INDEX IF NOT EXISTS idx_players_category ON players (category_id);
