-- =========================================================
-- Atlético Palma del Río · Intranet de gestión
-- Esquema de base de datos MySQL (instalación manual)
-- =========================================================
CREATE DATABASE IF NOT EXISTS atletico_palma_intranet
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE atletico_palma_intranet;

CREATE TABLE IF NOT EXISTS secciones (
  id     INT AUTO_INCREMENT,
  clave  VARCHAR(50)  NOT NULL UNIQUE,
  nombre VARCHAR(100) NOT NULL,
  icono  VARCHAR(50)  NULL,
  orden  INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_secciones_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO secciones (clave, nombre, icono, orden) VALUES
  ('calendario', 'Calendario', 'pi pi-calendar', 10),
  ('entrenamientos', 'Entrenamientos', 'pi pi-stopwatch', 20),
  ('entrenamientos_jugadores', 'Entrenamientos Jugadores', 'pi pi-check-square', 22),
  ('partidos', 'Partidos', 'pi pi-flag', 30),
  ('resultados', 'Resultados', 'pi pi-chart-bar', 35),
  ('temporadas', 'Temporadas', 'pi pi-clock', 40),
  ('titulos', 'Títulos', 'pi pi-graduation-cap', 45),
  ('division', 'División', 'pi pi-tags', 47),
  ('lugares', 'Lugares', 'pi pi-map-marker', 50),
  ('delegados', 'Delegados', 'pi pi-user-plus', 55),
  ('categorias', 'Categorías', 'pi pi-sitemap', 60),
  ('equipos', 'Equipos', 'pi pi-trophy', 65),
  ('incidencias', 'Incidencias', 'pi pi-exclamation-triangle', 68),
  ('jugadores', 'Jugadores', 'pi pi-users', 70),
  ('plantillas', 'Plantillas', 'pi pi-table', 75),
  ('entrenadores', 'Entrenadores', 'pi pi-id-card', 80),
  ('patrocinadores', 'Patrocinadores', 'pi pi-briefcase', 97),
  ('categoria_calendario', 'Jornadas', 'pi pi-calendar-plus', 98),
  ('sanciones', 'Sanciones', 'pi pi-ban', 99),
  ('administracion', 'Administración', 'pi pi-user-cog', 100);

CREATE TABLE IF NOT EXISTS usuarios (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  usuario       VARCHAR(50)  NOT NULL UNIQUE,
  password      VARCHAR(255) NOT NULL,
  nombre        VARCHAR(100) NOT NULL,
  apellidos     VARCHAR(150) NOT NULL,
  activo        TINYINT(1) NOT NULL DEFAULT 1,
  rol           ENUM('coordinador', 'entrenador') NOT NULL DEFAULT 'coordinador',
  id_categoria  INT NULL,
  visibilidad   ENUM('leer', 'editar') NOT NULL DEFAULT 'leer',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS usuario_secciones (
  id_usuario INT NOT NULL,
  id_seccion INT NOT NULL,
  PRIMARY KEY (id_usuario, id_seccion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS temporadas (
  id            INT AUTO_INCREMENT,
  nombre        VARCHAR(20) NOT NULL UNIQUE,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS lugares (
  id            INT AUTO_INCREMENT,
  nombre        VARCHAR(150) NOT NULL UNIQUE,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS lugar_tipofutbol (
  id_lugar      INT NOT NULL,
  id_tipofutbol INT NOT NULL,
  PRIMARY KEY (id_lugar, id_tipofutbol)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS titulo (
  id            INT AUTO_INCREMENT,
  nombre        VARCHAR(100) NOT NULL UNIQUE,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS division (
  id            INT AUTO_INCREMENT,
  nombre        VARCHAR(100) NOT NULL UNIQUE,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tipofutbol (
  id     INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO tipofutbol (nombre) VALUES ('Futbol 7'), ('Futbol 11');

CREATE TABLE IF NOT EXISTS delegados (
  id            INT AUTO_INCREMENT,
  nombre        VARCHAR(100) NOT NULL,
  apellidos     VARCHAR(150) NOT NULL,
  dni           VARCHAR(15)  NOT NULL UNIQUE,
  foto          LONGTEXT NULL,
  tipo          ENUM('campo', 'equipo') NOT NULL DEFAULT 'campo',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS categorias (
  id            INT AUTO_INCREMENT,
  nombre        VARCHAR(100) NOT NULL,
  alias         VARCHAR(100) NULL,
  id_tipofutbol INT NOT NULL,
  id_entrenador INT NULL,
  tiempopartido         INT NULL,
  tiempoentrenamiento   INT NULL,
  orden                 INT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categorias_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS equipos (
  id            INT AUTO_INCREMENT,
  nombre        VARCHAR(100) NOT NULL,
  escudo        LONGTEXT NULL,
  direccion     VARCHAR(255) NULL,
  codigopostal  VARCHAR(10) NULL,
  localidad     VARCHAR(100) NULL,
  provincia     VARCHAR(100) NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_equipos_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS equipos_jugadores (
  id            INT AUTO_INCREMENT,
  id_equipo     INT NOT NULL,
  id_categoria  INT NOT NULL,
  nombre        VARCHAR(100) NOT NULL,
  apellidos     VARCHAR(150) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_equipos_jugadores_equipo (id_equipo),
  KEY idx_equipos_jugadores_categoria (id_categoria)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS jornadas (
  id                INT AUTO_INCREMENT,
  id_plantilla      INT NOT NULL,
  id_equipo_local   INT NOT NULL,
  id_equipo_visitante INT NOT NULL,
  jornada           INT NOT NULL,
  fecha             DATE NOT NULL,
  hora              TIME NULL,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS jugadores (
  id            INT AUTO_INCREMENT,
  nombre        VARCHAR(100) NOT NULL,
  apellidos     VARCHAR(150) NOT NULL,
  dni           VARCHAR(15)  NOT NULL UNIQUE,
  fecha_nacimiento DATE NULL,
  foto          LONGTEXT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS plantillas (
  id            INT AUTO_INCREMENT,
  id_categoria  INT NOT NULL,
  id_jugador    INT NULL,
  id_entrenador INT NULL,
  id_delegado   INT NULL,
  id_division   INT NULL,
  id_temporada  INT NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_plantillas_categoria (id_categoria),
  KEY idx_plantillas_temporada (id_temporada),
  KEY idx_plantillas_jugador (id_jugador),
  KEY idx_plantillas_entrenador (id_entrenador),
  KEY idx_plantillas_delegado (id_delegado),
  KEY idx_plantillas_division (id_division)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS promociones (
  id            INT AUTO_INCREMENT,
  id_plantilla  INT NOT NULL,
  id_categoria  INT NOT NULL,
  id_jugador    INT NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_promociones_plantilla_jugador (id_plantilla, id_jugador),
  KEY idx_promociones_plantilla (id_plantilla),
  KEY idx_promociones_categoria (id_categoria),
  KEY idx_promociones_jugador (id_jugador)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS entrenadores (
  id            INT AUTO_INCREMENT,
  nombre        VARCHAR(100) NOT NULL,
  apellidos     VARCHAR(150) NOT NULL,
  dni           VARCHAR(15)  NOT NULL UNIQUE,
  foto          LONGTEXT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS entrenador_titulos (
  id_entrenador INT NOT NULL,
  id_titulo     INT NOT NULL,
  PRIMARY KEY (id_entrenador, id_titulo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS entrenamientos (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  id_categoria  INT NOT NULL,
  fecha         DATETIME NOT NULL,
  hasta         DATETIME NULL,
  id_lugar      INT NOT NULL,
  id_usuario    INT NULL,
  recurrente    TINYINT(1) NOT NULL DEFAULT 0,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS entrenamientos_semanales (
  id                    INT AUTO_INCREMENT PRIMARY KEY,
  id_entrenamiento      INT NOT NULL,
  fecha_entrenamiento   DATETIME NOT NULL,
  incidencias           TEXT NULL,
  created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS partidos (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  id_categoria  INT NOT NULL,
  fecha         DATETIME NOT NULL,
  id_lugar      INT NULL,
  id_jornada    INT NULL,
  id_equipo     INT NOT NULL,
  es_local      TINYINT(1) NOT NULL DEFAULT 1,
  id_usuario    INT NULL,
  incidencias   TEXT,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS entrenamientos_jugadores (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  id_entrenamiento INT NOT NULL,
  id_jugador      INT NOT NULL,
  incidencias     TEXT,
  asistencia      TINYINT(1) NOT NULL DEFAULT 1,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS resultados (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  id_partido  INT NOT NULL,
  resultado   VARCHAR(50) NOT NULL,
  incidencias TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB

CREATE TABLE IF NOT EXISTS patrocinadores (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  nombre      VARCHAR(150) NOT NULL,
  tipo        VARCHAR(20) NOT NULL DEFAULT 'oficial',
  imagen      LONGTEXT,
  orden       INT NOT NULL UNIQUE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sanciones (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  id_partido      INT NOT NULL,
  id_jugador      INT NOT NULL,
  amarilla        INT NOT NULL DEFAULT 0,
  roja            INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS incidencias (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  id_categoria  INT NULL,
  id_jugador    INT NULL,
  id_entrenador INT NULL,
  id_delegado   INT NULL,
  id_usuario    INT NULL,
  incidencias   TEXT,
  fecha         DATETIME NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_entrenamientos_fecha ON entrenamientos(fecha);
CREATE INDEX idx_entrenamientos_lugar ON entrenamientos(id_lugar);
CREATE INDEX idx_es_entrenamiento ON entrenamientos_semanales(id_entrenamiento);
CREATE INDEX idx_es_fecha ON entrenamientos_semanales(fecha_entrenamiento);
CREATE INDEX idx_partidos_fecha       ON partidos(fecha);
CREATE INDEX idx_partidos_lugar       ON partidos(id_lugar);
CREATE INDEX idx_partidos_equipo      ON partidos(id_equipo);
CREATE INDEX idx_incidencias_jugador    ON incidencias(id_jugador);
CREATE INDEX idx_incidencias_entrenador ON incidencias(id_entrenador);
CREATE INDEX idx_incidencias_delegado   ON incidencias(id_delegado);
CREATE INDEX idx_incidencias_categoria  ON incidencias(id_categoria);
CREATE INDEX idx_incidencias_fecha      ON incidencias(fecha);
CREATE INDEX idx_incidencias_usuario    ON incidencias(id_usuario);
CREATE INDEX idx_entrenamientos_usuario  ON entrenamientos(id_usuario);
CREATE INDEX idx_partidos_usuario        ON partidos(id_usuario);
CREATE INDEX idx_categorias_entrenador ON categorias(id_entrenador);
CREATE INDEX idx_etj_entrenamiento ON entrenamientos_jugadores(id_entrenamiento);
CREATE INDEX idx_etj_jugador ON entrenamientos_jugadores(id_jugador);
CREATE INDEX idx_resultados_partido ON resultados(id_partido);
CREATE INDEX idx_jornadas_categoria ON jornadas(id_categoria);
CREATE INDEX idx_jornadas_fecha ON jornadas(fecha);
CREATE INDEX idx_jornadas_jornada ON jornadas(jornada);
CREATE INDEX idx_sanciones_partido ON sanciones(id_partido);
CREATE INDEX idx_sanciones_jugador ON sanciones(id_jugador);
