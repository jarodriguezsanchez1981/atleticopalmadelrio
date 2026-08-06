-- =========================================================
-- Atlético Palma del Río · Intranet de gestión
-- Init MySQL (Docker: se ejecuta al crear el volumen)
-- =========================================================

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

CREATE TABLE IF NOT EXISTS secciones (
  id     INT AUTO_INCREMENT,
  clave  VARCHAR(50)  NOT NULL UNIQUE,
  nombre VARCHAR(100) NOT NULL,
  icono  VARCHAR(50)  NULL,
  orden  INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id, nombre),
  UNIQUE KEY uq_secciones_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO secciones (clave, nombre, icono, orden) VALUES
  ('calendario', 'Calendario', 'pi pi-calendar', 10),
  ('entrenamientos', 'Entrenamientos', 'pi pi-stopwatch', 20),
  ('partidos', 'Partidos', 'pi pi-flag', 30),
  ('temporadas', 'Temporadas', 'pi pi-clock', 40),
  ('titulos', 'Títulos', 'pi pi-graduation-cap', 45),
  ('lugares', 'Lugares', 'pi pi-map-marker', 50),
  ('delegados', 'Delegados', 'pi pi-user-plus', 55),
  ('categorias', 'Categorías', 'pi pi-sitemap', 60),
  ('equipos', 'Equipos', 'pi pi-trophy', 65),
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
  PRIMARY KEY (id, nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO temporadas (id, nombre) VALUES
  (1, '2025/2026'),
  (2, '2026/2027');

CREATE TABLE IF NOT EXISTS lugares (
  id            INT AUTO_INCREMENT,
  nombre        VARCHAR(150) NOT NULL UNIQUE,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id, nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO lugares (id, nombre) VALUES
  (1, 'Anexo I'),
  (2, 'Anexo II'),
  (3, 'Estadio A'),
  (4, 'Estadio B');

CREATE TABLE IF NOT EXISTS titulo (
  id            INT AUTO_INCREMENT,
  nombre        VARCHAR(100) NOT NULL UNIQUE,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id, nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO titulo (id, nombre) VALUES
  (1, 'UEFA A'),
  (2, 'UEFA B'),
  (3, 'UEFA C');

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
  PRIMARY KEY (id, nombre, apellidos, dni)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS categorias (
  id            INT AUTO_INCREMENT,
  nombre        VARCHAR(100) NOT NULL,
  id_temporada  INT NOT NULL,
  id_entrenador INT NULL,
  id_delegado   INT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id, nombre),
  UNIQUE KEY uq_categoria_temporada (nombre, id_temporada),
  CONSTRAINT fk_categorias_temporada FOREIGN KEY (id_temporada) REFERENCES temporadas(id),
  CONSTRAINT fk_categorias_delegado FOREIGN KEY (id_delegado) REFERENCES delegados(id) ON DELETE SET NULL,
  UNIQUE KEY uq_categorias_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS equipos (
  id            INT AUTO_INCREMENT,
  nombre        VARCHAR(100) NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id, nombre),
  UNIQUE KEY uq_equipos_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO equipos (nombre) VALUES
  ('LUCECOR F.S.'),
  ('SPORTING DE BENAMEJI C.D.'),
  ('CASTRO DEL RIO C.D.'),
  ('C.D. PRIEGO C.F.'),
  ('C.D. RUTE CALIDAD C.F.'),
  ('BAENENSE ATLETICO C.F.'),
  ('C.D. EGABRENSE FUTBOL BASE'),
  ('C.D. APEDEM'),
  ('FUNDACION LUCENA F.C.'),
  ('ALMEDINILLA ATL.'),
  ('AGUILARENSE ATLETICO C.F.'),
  ('MORILES C.F.'),
  ('VILLA DE ESPEJO C.D.'),
  ('LA RAMBLA A.D. DE FUTBOL BASE'),
  ('C.D. ATLÉTICO MONTOREÑO'),
  ('C.D. FUENTES FÚTBOL BASE'),
  ('C.D. VILLARRUBIA'),
  ('C.D. GRANADAL FIGUEROA'),
  ('SENECA C.F.'),
  ('A.D. DE FUTBOL BASE LA RAMBLA'),
  ('C.D. MONTALBEÑO'),
  ('C.D. MONTEMAYOR ATLETICO'),
  ('C.D. SANTAELLA 2010'),
  ('LA GUIJARROSA A.D.'),
  ('FERNAN NUÑEZ C.F.'),
  ('C.D. LOS CALIFAS BALOMPIE'),
  ('APADEMAR'),
  ('CORDOBA C.F.'),
  ('PACO PRADAS C.D.'),
  ('C.D. COLONIA DE FUENTE PALMERA'),
  ('ALMODOVAR DEL RIO C.F.'),
  ('R.U.D. LA CARLOTA'),
  ('S.D. SPORT CORDOBA LA SALLE'),
  ('C.D. VESPERTINA PERRO VERDE - HORNACHUELOS C.F.'),
  ('C.D. EL VILLAR'),
  ('C.D. EL HIGUERON'),
  ('U.D. SUR'),
  ('C.D. SEMILLA BLANQUIVERDE'),
  ('BUJALANCE FUTBOL BASE A.D.'),
  ('C.D. EL CARPIO C.F.'),
  ('C.D. FRAY ALBINO RACING CORDOBA'),
  ('ATLETICO CORDOBES C.F.'),
  ('CAÑETE C.D. BASE'),
  ('C.D. AVEJOE'),
  ('C.D. DE FUTBOL JUANIN Y DIEGO'),
  ('VILLAFRANCA C.F.'),
  ('VILLA DEL RIO SERVICIO DEPORTE'),
  ('C. D. ATLÉTICO PERABEÑO C. F.'),
  ('A.D. LA GUIJARROSA'),
  ('A.D.C. FUTBOL BASE POZOBLANCO'),
  ('ALCAZAR C.D.'),
  ('ATLETICO SENECA'),
  ('C. D. DIEGO DELGADO NUEVO ZOCO'),
  ('C.D. ALZAHAR DEL GUADALQUIVIR'),
  ('C.D. ASOC. DE FUTBOLISTAS ESPAÑOLES CORDOBA'),
  ('C.D. ATLETICO DE BENAMEJI'),
  ('C.D. ATLETICO FERNAN NUÑEZ'),
  ('C.D. ATLÉTICO LUCECOR'),
  ('C.D. CIUDAD DE BAENA'),
  ('C.D. DE FÚTBOL JAVI FLORES'),
  ('C.D. POSADAS CLUB DE FUTBOL'),
  ('C.D. STADIUM'),
  ('CALVARIO-PRIEGO C.F.'),
  ('CD PRIMER TOQUE JAVIER DE LA TORRE'),
  ('DON BOSCO C.F.'),
  ('LA VICTORIA C.F.'),
  ('MONTEMAYOR ATLETICO C.D.'),
  ('MONTURK DE MONTURQUE C.D.'),
  ('RUTE CALIDAD C.F. C.D.'),
  ('SALERM COSMETICS PUENTE GENIL F.C.'),
  ('SALVADOR ALLENDE U.D.'),
  ('SAN LORENZO ATLETICO');

CREATE TABLE IF NOT EXISTS jugadores (
  id            INT AUTO_INCREMENT,
  nombre        VARCHAR(100) NOT NULL,
  apellidos     VARCHAR(150) NOT NULL,
  dni           VARCHAR(15)  NOT NULL UNIQUE,
  foto          LONGTEXT NULL,
  id_temporada  INT NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id, nombre, apellidos, dni),
  CONSTRAINT fk_jugadores_temporada FOREIGN KEY (id_temporada) REFERENCES temporadas(id)
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
  PRIMARY KEY (id, nombre, apellidos, dni),
  CONSTRAINT fk_entrenadores_temporada FOREIGN KEY (id_temporada) REFERENCES temporadas(id)
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

ALTER TABLE delegados
  ADD CONSTRAINT fk_delegados_categoria
  FOREIGN KEY (id_categoria) REFERENCES categorias(id),
  ADD CONSTRAINT fk_delegados_temporada
  FOREIGN KEY (id_temporada) REFERENCES temporadas(id);

CREATE INDEX idx_entrenamientos_fecha ON entrenamientos(fecha);
CREATE INDEX idx_entrenamientos_lugar ON entrenamientos(id_lugar);
CREATE INDEX idx_partidos_fecha       ON partidos(fecha);
CREATE INDEX idx_partidos_lugar       ON partidos(id_lugar);
CREATE INDEX idx_jugadores_temporada  ON jugadores(id_temporada);
CREATE INDEX idx_entrenadores_temporada ON entrenadores(id_temporada);
CREATE INDEX idx_delegados_categoria ON delegados(id_categoria);
CREATE INDEX idx_delegados_temporada ON delegados(id_temporada);
CREATE INDEX idx_categorias_entrenador ON categorias(id_entrenador);
CREATE INDEX idx_categorias_temporada  ON categorias(id_temporada);
CREATE INDEX idx_categorias_delegado   ON categorias(id_delegado);

INSERT INTO categorias (nombre, id_temporada) VALUES
  ('Alevín A', 1),
  ('Cadete A', 1),
  ('Juvenil A', 1)
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);
