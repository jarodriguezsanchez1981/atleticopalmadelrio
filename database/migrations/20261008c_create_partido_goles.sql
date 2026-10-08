-- Goles de los jugadores del PALMA en cada partido, con el minuto y el tipo
-- (normal / penalti; los de propia puerta no cuentan para el jugador). Las
-- rellena "Finalizar Acta" y las usa Estadísticas (goles por parte).
CREATE TABLE IF NOT EXISTS `partido_goles` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `id_partido` INT NOT NULL,
  `id_jugador` INT NOT NULL,
  `minuto` INT NULL,
  `tipo` ENUM('normal','penalti') NOT NULL DEFAULT 'normal',
  PRIMARY KEY (`id`),
  KEY `idx_partido_goles_partido` (`id_partido`),
  KEY `idx_partido_goles_jugador` (`id_jugador`),
  CONSTRAINT `fk_partido_goles_partido` FOREIGN KEY (`id_partido`) REFERENCES `partidos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_partido_goles_jugador` FOREIGN KEY (`id_jugador`) REFERENCES `jugadores` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
