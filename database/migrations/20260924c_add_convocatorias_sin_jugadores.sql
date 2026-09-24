-- Jugadores de la plantilla NO convocados para un partido, con el motivo
-- (observaciones). Un jugador convocado y uno no convocado son mutuamente
-- excluyentes: al guardar, si aparece en ambas listas se prioriza el de
-- convocatorias_jugadores.
-- CREATE TABLE IF NOT EXISTS ya es idempotente de forma nativa en MySQL.

CREATE TABLE IF NOT EXISTS `convocatorias_sin_jugadores` (
  `id`              INT AUTO_INCREMENT PRIMARY KEY,
  `id_convocatoria` INT NOT NULL,
  `id_plantilla`    INT NOT NULL,
  `id_jugador`      INT NOT NULL,
  `observaciones`   TEXT NULL,
  `created_at`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_convocatorias_sin_jugadores` (`id_convocatoria`, `id_jugador`),
  KEY `idx_csj_plantilla` (`id_plantilla`),
  KEY `idx_csj_jugador` (`id_jugador`),
  CONSTRAINT `fk_csj_convocatoria` FOREIGN KEY (`id_convocatoria`) REFERENCES `convocatorias` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_csj_plantilla` FOREIGN KEY (`id_plantilla`) REFERENCES `plantillas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_csj_jugador` FOREIGN KEY (`id_jugador`) REFERENCES `jugadores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
