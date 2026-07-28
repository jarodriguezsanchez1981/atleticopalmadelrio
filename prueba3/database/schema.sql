-- =========================================================
-- Atlético Palma del Río · Intranet de gestión
-- Esquema de base de datos MySQL (instalación manual)
-- =========================================================
CREATE DATABASE IF NOT EXISTS atletico_palma_intranet
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE atletico_palma_intranet;

CREATE TABLE IF NOT EXISTS roles (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  nombre        VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO roles (id, nombre) VALUES
  (1, 'administrador'),
  (2, 'coordinador'),
  (3, 'entrenador');

CREATE TABLE IF NOT EXISTS secciones (
  id     INT AUTO_INCREMENT PRIMARY KEY,
  clave  VARCHAR(50)  NOT NULL UNIQUE,
  nombre VARCHAR(100) NOT NULL,
  icono  VARCHAR(50)  NULL,
  orden  INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO secciones (clave, nombre, icono, orden) VALUES
  ('calendario', 'Calendario', 'pi pi-calendar', 10),
  ('entrenamientos', 'Entrenamientos', 'pi pi-stopwatch', 20),
  ('partidos', 'Partidos', 'pi pi-flag', 30),
  ('temporadas', 'Temporadas', 'pi pi-clock', 40),
  ('lugares', 'Lugares', 'pi pi-map-marker', 50),
  ('categorias', 'Categorías', 'pi pi-sitemap', 60),
  ('jugadores', 'Jugadores', 'pi pi-users', 70),
  ('entrenadores', 'Entrenadores', 'pi pi-id-card', 80),
  ('roles', 'Roles', 'pi pi-key', 90),
  ('administracion', 'Administración', 'pi pi-shield', 100);

CREATE TABLE IF NOT EXISTS usuarios (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  usuario       VARCHAR(50)  NOT NULL UNIQUE,
  password      VARCHAR(255) NOT NULL,
  nombre        VARCHAR(100) NOT NULL,
  apellidos     VARCHAR(150) NOT NULL,
  id_rol        INT NOT NULL,
  activo        TINYINT(1) NOT NULL DEFAULT 1,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_usuarios_rol FOREIGN KEY (id_rol) REFERENCES roles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS usuario_secciones (
  id_usuario INT NOT NULL,
  id_seccion INT NOT NULL,
  PRIMARY KEY (id_usuario, id_seccion),
  CONSTRAINT fk_us_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT fk_us_seccion FOREIGN KEY (id_seccion) REFERENCES secciones(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS temporadas (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  nombre        VARCHAR(20) NOT NULL UNIQUE,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS lugares (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  nombre        VARCHAR(150) NOT NULL UNIQUE,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS categorias (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  nombre        VARCHAR(100) NOT NULL,
  id_temporada  INT NOT NULL,
  id_entrenador INT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_categoria_temporada (nombre, id_temporada),
  CONSTRAINT fk_categorias_temporada FOREIGN KEY (id_temporada) REFERENCES temporadas(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS jugadores (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  nombre        VARCHAR(100) NOT NULL,
  apellidos     VARCHAR(150) NOT NULL,
  dni           VARCHAR(15)  NOT NULL UNIQUE,
  id_categoria  INT NOT NULL,
  id_temporada  INT NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_jugadores_categoria FOREIGN KEY (id_categoria) REFERENCES categorias(id),
  CONSTRAINT fk_jugadores_temporada FOREIGN KEY (id_temporada) REFERENCES temporadas(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS entrenadores (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  nombre        VARCHAR(100) NOT NULL,
  apellidos     VARCHAR(150) NOT NULL,
  dni           VARCHAR(15)  NOT NULL UNIQUE,
  id_categoria  INT NOT NULL,
  id_temporada  INT NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_entrenadores_categoria FOREIGN KEY (id_categoria) REFERENCES categorias(id),
  CONSTRAINT fk_entrenadores_temporada FOREIGN KEY (id_temporada) REFERENCES temporadas(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS entrenamientos (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  id_categoria  INT NOT NULL,
  fecha         DATETIME NOT NULL,
  id_lugar      INT NOT NULL,
  incidencias   TEXT,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_entrenamientos_categoria FOREIGN KEY (id_categoria) REFERENCES categorias(id),
  CONSTRAINT fk_entrenamientos_lugar FOREIGN KEY (id_lugar) REFERENCES lugares(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS partidos (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  id_categoria  INT NOT NULL,
  fecha         DATETIME NOT NULL,
  id_lugar      INT NOT NULL,
  equipo_rival  VARCHAR(150) NOT NULL,
  resultado     VARCHAR(20)  NULL,
  incidencias   TEXT,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_partidos_categoria FOREIGN KEY (id_categoria) REFERENCES categorias(id),
  CONSTRAINT fk_partidos_lugar FOREIGN KEY (id_lugar) REFERENCES lugares(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE categorias
  ADD CONSTRAINT fk_categorias_entrenador
  FOREIGN KEY (id_entrenador) REFERENCES entrenadores(id)
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX idx_entrenamientos_fecha ON entrenamientos(fecha);
CREATE INDEX idx_entrenamientos_lugar ON entrenamientos(id_lugar);
CREATE INDEX idx_partidos_fecha       ON partidos(fecha);
CREATE INDEX idx_partidos_lugar       ON partidos(id_lugar);
CREATE INDEX idx_jugadores_categoria  ON jugadores(id_categoria);
CREATE INDEX idx_jugadores_temporada  ON jugadores(id_temporada);
CREATE INDEX idx_entrenadores_categoria ON entrenadores(id_categoria);
CREATE INDEX idx_entrenadores_temporada ON entrenadores(id_temporada);
CREATE INDEX idx_categorias_entrenador ON categorias(id_entrenador);
CREATE INDEX idx_categorias_temporada  ON categorias(id_temporada);
