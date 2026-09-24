-- Nueva sección "Convocatorias": lista de jugadores de la plantilla convocados
-- para un partido concreto. Al guardarse se sincroniza también con
-- partido_jugadores (convocatoria = jugadores del PALMA para ese partido).
-- CREATE TABLE IF NOT EXISTS ya es idempotente de forma nativa en MySQL.

CREATE TABLE IF NOT EXISTS `convocatorias` (
  `id`           INT AUTO_INCREMENT PRIMARY KEY,
  `id_temporada` INT NOT NULL,
  `id_plantilla` INT NOT NULL,
  `id_partido`   INT NOT NULL,
  `created_at`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_convocatorias_partido` (`id_partido`),
  KEY `idx_convocatorias_temporada` (`id_temporada`),
  KEY `idx_convocatorias_plantilla` (`id_plantilla`),
  CONSTRAINT `fk_convocatorias_temporada` FOREIGN KEY (`id_temporada`) REFERENCES `temporadas` (`id`),
  CONSTRAINT `fk_convocatorias_plantilla` FOREIGN KEY (`id_plantilla`) REFERENCES `plantillas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_convocatorias_partido` FOREIGN KEY (`id_partido`) REFERENCES `partidos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `convocatorias_jugadores` (
  `id`               INT AUTO_INCREMENT PRIMARY KEY,
  `id_convocatoria`  INT NOT NULL,
  `id_jugador`       INT NOT NULL,
  `created_at`       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_convocatorias_jugadores` (`id_convocatoria`, `id_jugador`),
  KEY `idx_cj_jugador` (`id_jugador`),
  CONSTRAINT `fk_cj_convocatoria` FOREIGN KEY (`id_convocatoria`) REFERENCES `convocatorias` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_cj_jugador` FOREIGN KEY (`id_jugador`) REFERENCES `jugadores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
