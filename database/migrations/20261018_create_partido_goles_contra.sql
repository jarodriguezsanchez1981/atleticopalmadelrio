-- Goles del equipo contrario en cada partido, con el minuto y el tipo
-- (normal / penalti). Incluye los goles en propia puerta del PALMA (suman al
-- rival). Las rellena "Finalizar Acta" y las usa Estadísticas Goles para saber
-- en qué periodo nos marcan. No llevan id_jugador: el rival no está en la BD.
CREATE TABLE IF NOT EXISTS `partido_goles_contra` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `id_partido` INT NOT NULL,
  `minuto` INT NULL,
  `tipo` ENUM('normal','penalti') NOT NULL DEFAULT 'normal',
  PRIMARY KEY (`id`),
  KEY `idx_partido_goles_contra_partido` (`id_partido`),
  CONSTRAINT `fk_partido_goles_contra_partido` FOREIGN KEY (`id_partido`) REFERENCES `partidos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
