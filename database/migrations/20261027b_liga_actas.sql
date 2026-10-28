-- Actas de todos los partidos de la liga de una plantilla (hoy, Senior A), no
-- solo los del PALMA: para las Estadísticas Rivales (goles, minutos, jugadores
-- y tarjetas de cada equipo contrario jornada a jornada).
-- Las rellena sola la copia diaria de RFAF (controllers/liga.controller.js): una
-- petición por jornada (NFG_CmpJornada, para saber los partidos y su acta) y una
-- por acta, una sola vez cada una. El partido del PALMA lo rellena "Finalizar
-- Acta" (sin petición extra). Los jugadores se guardan con su nombre del acta
-- (sin foto).
-- Idempotente: segura de ejecutar aunque ya se haya aplicado.

CREATE TABLE IF NOT EXISTS `liga_partidos` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `id_plantilla` INT NOT NULL,
  `jornada` INT NOT NULL,
  `codigo_acta` VARCHAR(20) NOT NULL,
  `fecha` DATE NULL,
  `hora` VARCHAR(5) NULL,
  `equipo_local` VARCHAR(150) NOT NULL,
  `codigo_equipo_local` VARCHAR(20) NULL,
  `equipo_visitante` VARCHAR(150) NOT NULL,
  `codigo_equipo_visitante` VARCHAR(20) NULL,
  `goles_local` INT NULL,
  `goles_visitante` INT NULL,
  -- Cuándo se guardó el acta; NULL = pendiente de descargar.
  `acta_at` DATETIME NULL,
  -- Días que se ha pedido el acta sin que tuviera datos (partido aplazado…).
  `intentos` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_liga_partidos_acta` (`id_plantilla`, `codigo_acta`),
  KEY `idx_liga_partidos_jornada` (`id_plantilla`, `jornada`),
  CONSTRAINT `fk_liga_partidos_plantilla` FOREIGN KEY (`id_plantilla`) REFERENCES `plantillas` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Jugadores del acta de cada equipo (titulares y suplentes) con sus minutos,
-- goles (sin propia puerta) y tarjetas.
CREATE TABLE IF NOT EXISTS `liga_jugadores` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `id_liga_partido` INT NOT NULL,
  `lado` ENUM('local','visitante') NOT NULL,
  `dorsal` INT NULL,
  `nombre` VARCHAR(150) NOT NULL,
  `titular` TINYINT(1) NOT NULL DEFAULT 0,
  `minuto_entrada` INT NULL,
  `minuto_salida` INT NULL,
  `minutos` INT NOT NULL DEFAULT 0,
  `goles` INT NOT NULL DEFAULT 0,
  `amarillas` INT NOT NULL DEFAULT 0,
  `rojas` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_liga_jugadores_partido` (`id_liga_partido`),
  CONSTRAINT `fk_liga_jugadores_partido` FOREIGN KEY (`id_liga_partido`) REFERENCES `liga_partidos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Goles con su minuto. `lado`: equipo al que suma (una propia puerta suma al
-- rival de quien la marca); `titular`: si quien marca era titular (NULL en
-- propia puerta).
CREATE TABLE IF NOT EXISTS `liga_goles` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `id_liga_partido` INT NOT NULL,
  `lado` ENUM('local','visitante') NOT NULL,
  `nombre` VARCHAR(150) NULL,
  `minuto` INT NULL,
  `tipo` ENUM('normal','penalti','propia') NOT NULL DEFAULT 'normal',
  `titular` TINYINT(1) NULL,
  PRIMARY KEY (`id`),
  KEY `idx_liga_goles_partido` (`id_liga_partido`),
  CONSTRAINT `fk_liga_goles_partido` FOREIGN KEY (`id_liga_partido`) REFERENCES `liga_partidos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tarjetas con su minuto, si el jugador era titular y el marcador justo antes
-- visto desde su equipo (`lado`).
CREATE TABLE IF NOT EXISTS `liga_tarjetas` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `id_liga_partido` INT NOT NULL,
  `lado` ENUM('local','visitante') NOT NULL,
  `nombre` VARCHAR(150) NOT NULL,
  `tipo` ENUM('amarilla','roja') NOT NULL,
  `minuto` INT NULL,
  `titular` TINYINT(1) NULL,
  `goles_favor` INT NOT NULL DEFAULT 0,
  `goles_contra` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_liga_tarjetas_partido` (`id_liga_partido`),
  CONSTRAINT `fk_liga_tarjetas_partido` FOREIGN KEY (`id_liga_partido`) REFERENCES `liga_partidos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
