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
  ('partidos_jugadores', 'Convocatorias', 'pi pi-list-check', 32),
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
  ('entrenadores', 'Entrenadores', 'pi pi-id-card', 80),
  ('administracion', 'Administración', 'pi pi-shield', 100);

CREATE TABLE IF NOT EXISTS usuarios (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  usuario       VARCHAR(50)  NOT NULL UNIQUE,
  password      VARCHAR(255) NOT NULL,
  nombre        VARCHAR(100) NOT NULL,
  apellidos     VARCHAR(150) NOT NULL,
  activo        TINYINT(1) NOT NULL DEFAULT 1,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS usuario_secciones (
  id_usuario INT NOT NULL,
  id_seccion INT NOT NULL,
  PRIMARY KEY (id_usuario, id_seccion),
  CONSTRAINT fk_us_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT fk_us_seccion FOREIGN KEY (id_seccion) REFERENCES secciones(id) ON DELETE CASCADE
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

CREATE TABLE IF NOT EXISTS delegados (
  id            INT AUTO_INCREMENT,
  nombre        VARCHAR(100) NOT NULL,
  apellidos     VARCHAR(150) NOT NULL,
  dni           VARCHAR(15)  NOT NULL UNIQUE,
  foto          LONGTEXT NULL,
  tipo          ENUM('campo', 'equipo') NOT NULL DEFAULT 'campo',
  id_categoria  INT NULL,
  id_temporada  INT NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS categorias (
  id            INT AUTO_INCREMENT,
  nombre        VARCHAR(100) NOT NULL,
  alias         VARCHAR(100) NULL,
  id_temporada  INT NOT NULL,
  id_division   INT NULL,
  id_entrenador INT NULL,
  id_delegado   INT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categoria_temporada (nombre, id_temporada),
  CONSTRAINT fk_categorias_temporada FOREIGN KEY (id_temporada) REFERENCES temporadas(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_categorias_division FOREIGN KEY (id_division) REFERENCES division(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_categorias_delegado FOREIGN KEY (id_delegado) REFERENCES delegados(id) ON DELETE SET NULL ON UPDATE CASCADE,
  UNIQUE KEY uq_categorias_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS equipos (
  id            INT AUTO_INCREMENT,
  nombre        VARCHAR(100) NOT NULL,
  escudo        LONGTEXT NULL,
  direccion     VARCHAR(255) NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_equipos_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS jugadores (
  id            INT AUTO_INCREMENT,
  nombre        VARCHAR(100) NOT NULL,
  apellidos     VARCHAR(150) NOT NULL,
  dni           VARCHAR(15)  NOT NULL UNIQUE,
  foto          LONGTEXT NULL,
  id_temporada  INT NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_jugadores_temporada FOREIGN KEY (id_temporada) REFERENCES temporadas(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS jugador_categorias (
  id_jugador   INT NOT NULL,
  id_categoria INT NOT NULL,
  PRIMARY KEY (id_jugador, id_categoria),
  CONSTRAINT fk_jc_jugador  FOREIGN KEY (id_jugador) REFERENCES jugadores(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_jc_categoria FOREIGN KEY (id_categoria) REFERENCES categorias(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS entrenadores (
  id            INT AUTO_INCREMENT,
  nombre        VARCHAR(100) NOT NULL,
  apellidos     VARCHAR(150) NOT NULL,
  dni           VARCHAR(15)  NOT NULL UNIQUE,
  foto          LONGTEXT NULL,
  id_temporada  INT NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_entrenadores_temporada FOREIGN KEY (id_temporada) REFERENCES temporadas(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS entrenador_titulos (
  id_entrenador INT NOT NULL,
  id_titulo     INT NOT NULL,
  PRIMARY KEY (id_entrenador, id_titulo),
  CONSTRAINT fk_et_entrenador FOREIGN KEY (id_entrenador) REFERENCES entrenadores(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_et_titulo     FOREIGN KEY (id_titulo) REFERENCES titulo(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS entrenador_categorias (
  id_entrenador INT NOT NULL,
  id_categoria  INT NOT NULL,
  PRIMARY KEY (id_entrenador, id_categoria),
  CONSTRAINT fk_ec_entrenador FOREIGN KEY (id_entrenador) REFERENCES entrenadores(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_ec_categoria  FOREIGN KEY (id_categoria) REFERENCES categorias(id) ON DELETE CASCADE ON UPDATE CASCADE
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
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_entrenamientos_categoria FOREIGN KEY (id_categoria) REFERENCES categorias(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_entrenamientos_lugar FOREIGN KEY (id_lugar) REFERENCES lugares(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_entrenamientos_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS entrenamientos_semanales (
  id                    INT AUTO_INCREMENT PRIMARY KEY,
  id_entrenamiento      INT NOT NULL,
  fecha_entrenamiento   DATETIME NOT NULL,
  incidencias           TEXT NULL,
  created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_es_entrenamiento FOREIGN KEY (id_entrenamiento) REFERENCES entrenamientos(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS partidos (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  id_categoria  INT NOT NULL,
  fecha         DATETIME NOT NULL,
  id_lugar      INT NULL,
  id_equipo     INT NOT NULL,
  es_local      TINYINT(1) NOT NULL DEFAULT 1,
  id_usuario    INT NULL,
  incidencias   TEXT,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_partidos_categoria FOREIGN KEY (id_categoria) REFERENCES categorias(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_partidos_lugar FOREIGN KEY (id_lugar) REFERENCES lugares(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_partidos_equipo FOREIGN KEY (id_equipo) REFERENCES equipos(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_partidos_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS partidos_jugadores (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  id_partido      INT NOT NULL,
  id_jugador      INT NOT NULL,
  minutos         INT NOT NULL DEFAULT 0,
  goles           INT NOT NULL DEFAULT 0,
  tarjeta_amarilla INT NOT NULL DEFAULT 0,
  tarjeta_roja    INT NOT NULL DEFAULT 0,
  incidencias     TEXT NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_pj_partido FOREIGN KEY (id_partido) REFERENCES partidos(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_pj_jugador FOREIGN KEY (id_jugador) REFERENCES jugadores(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS entrenamientos_jugadores (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  id_entrenamiento INT NOT NULL,
  id_jugador      INT NOT NULL,
  incidencias     TEXT,
  asistencia      TINYINT(1) NOT NULL DEFAULT 1,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_etj_entrenamiento FOREIGN KEY (id_entrenamiento) REFERENCES entrenamientos(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_etj_jugador FOREIGN KEY (id_jugador) REFERENCES jugadores(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS resultados (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  id_partido  INT NOT NULL,
  resultado   VARCHAR(50) NOT NULL,
  incidencias TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_resultados_partido FOREIGN KEY (id_partido) REFERENCES partidos(id) ON DELETE CASCADE ON UPDATE CASCADE
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
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_incidencias_categoria FOREIGN KEY (id_categoria) REFERENCES categorias(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_incidencias_jugador FOREIGN KEY (id_jugador) REFERENCES jugadores(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_incidencias_entrenador FOREIGN KEY (id_entrenador) REFERENCES entrenadores(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_incidencias_delegado FOREIGN KEY (id_delegado) REFERENCES delegados(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_incidencias_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE categorias
  ADD CONSTRAINT fk_categorias_entrenador
  FOREIGN KEY (id_entrenador) REFERENCES entrenadores(id)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE delegados
  ADD CONSTRAINT fk_delegados_categoria
  FOREIGN KEY (id_categoria) REFERENCES categorias(id) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT fk_delegados_temporada
  FOREIGN KEY (id_temporada) REFERENCES temporadas(id) ON DELETE RESTRICT ON UPDATE CASCADE;

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
CREATE INDEX idx_jugadores_temporada  ON jugadores(id_temporada);
CREATE INDEX idx_entrenadores_temporada ON entrenadores(id_temporada);
CREATE INDEX idx_delegados_categoria ON delegados(id_categoria);
CREATE INDEX idx_delegados_temporada ON delegados(id_temporada);
CREATE INDEX idx_categorias_entrenador ON categorias(id_entrenador);
CREATE INDEX idx_categorias_temporada  ON categorias(id_temporada);
CREATE INDEX idx_categorias_delegado   ON categorias(id_delegado);
CREATE INDEX idx_pj_partido  ON partidos_jugadores(id_partido);
CREATE INDEX idx_pj_jugador  ON partidos_jugadores(id_jugador);
CREATE INDEX idx_etj_entrenamiento ON entrenamientos_jugadores(id_entrenamiento);
CREATE INDEX idx_etj_jugador ON entrenamientos_jugadores(id_jugador);
CREATE INDEX idx_resultados_partido ON resultados(id_partido);
