-- =========================================================
-- Atlético Palma del Río · Intranet de gestión
-- Esquema de base de datos MySQL
-- =========================================================
CREATE DATABASE IF NOT EXISTS atletico_palma_intranet
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE atletico_palma_intranet;

-- ---------------------------------------------------------
-- Tabla roles
-- ---------------------------------------------------------
CREATE TABLE roles (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  nombre        VARCHAR(50) NOT NULL UNIQUE  -- administrador | coordinador | entrenador
) ENGINE=InnoDB;

INSERT INTO roles (nombre) VALUES
  ('administrador'),
  ('coordinador'),
  ('entrenador');

-- ---------------------------------------------------------
-- Tabla usuarios
-- password: hash bcrypt (60 chars) -> se guarda SIEMPRE hasheado.
-- ---------------------------------------------------------
CREATE TABLE usuarios (
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
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- Tabla categorias (ej: Alevín A, Cadete B...) por temporada
-- ---------------------------------------------------------
CREATE TABLE categorias (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  nombre        VARCHAR(100) NOT NULL,
  temporada     VARCHAR(20)  NOT NULL,        -- ej: 2025/2026
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_categoria_temporada (nombre, temporada)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- Tabla jugadores
-- ---------------------------------------------------------
CREATE TABLE jugadores (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  nombre        VARCHAR(100) NOT NULL,
  apellidos     VARCHAR(150) NOT NULL,
  dni           VARCHAR(15)  NOT NULL UNIQUE,
  id_categoria  INT NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_jugadores_categoria FOREIGN KEY (id_categoria) REFERENCES categorias(id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- Tabla entrenamientos
-- ---------------------------------------------------------
CREATE TABLE entrenamientos (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  id_categoria  INT NOT NULL,
  fecha         DATETIME NOT NULL,
  lugar         VARCHAR(150) NOT NULL,
  incidencias   TEXT,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_entrenamientos_categoria FOREIGN KEY (id_categoria) REFERENCES categorias(id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- Tabla partidos
-- NOTA DE ARQUITECTURA: el enunciado pedía (id, id_categoria, fecha,
-- lugar, incidencias). Se han añadido "equipo_rival" y "resultado"
-- porque el propio requisito nº5 pide poder filtrar los partidos por
-- "Equipo Rival" y es el estándar para un CRUD de partidos útil.
-- Si se prefiere el esquema mínimo literal, basta con eliminar esas
-- dos columnas y el filtro correspondiente en el frontend.
-- ---------------------------------------------------------
CREATE TABLE partidos (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  id_categoria  INT NOT NULL,
  fecha         DATETIME NOT NULL,
  lugar         VARCHAR(150) NOT NULL,
  equipo_rival  VARCHAR(150) NOT NULL,
  resultado     VARCHAR(20)  NULL,          -- ej: '2-1', NULL si no se ha jugado
  incidencias   TEXT,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_partidos_categoria FOREIGN KEY (id_categoria) REFERENCES categorias(id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- Índices de apoyo para el calendario / filtros
-- ---------------------------------------------------------
CREATE INDEX idx_entrenamientos_fecha ON entrenamientos(fecha);
CREATE INDEX idx_partidos_fecha       ON partidos(fecha);
CREATE INDEX idx_jugadores_categoria  ON jugadores(id_categoria);

-- ---------------------------------------------------------
-- Usuario administrador inicial
-- usuario: admin  /  password: Admin#2026  (CAMBIAR tras el primer login)
-- El hash se genera con bcrypt (10 rounds). Ver backend/src/utils/seedAdmin.js
-- para generarlo automáticamente en lugar de pegarlo a mano aquí.
-- ---------------------------------------------------------
-- INSERT INTO usuarios (usuario, password, nombre, apellidos, id_rol)
-- VALUES ('admin', '$2b$10$REEMPLAZAR_CON_HASH_REAL', 'Administrador', 'Sistema', 1);
