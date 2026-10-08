-- Tarjetas de los jugadores del PALMA en cada partido, con el minuto y el
-- marcador justo antes (goles a favor / en contra del PALMA). Las rellena
-- "Finalizar Acta" y las usa Estadísticas (1ª/2ª parte, ganando/perdiendo).
CREATE TABLE IF NOT EXISTS `partido_tarjetas` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `id_partido` INT NOT NULL,
  `id_jugador` INT NOT NULL,
  `tipo` ENUM('amarilla','roja') NOT NULL,
  `minuto` INT NULL,
  `goles_favor` INT NOT NULL DEFAULT 0,
  `goles_contra` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_partido_tarjetas_partido` (`id_partido`),
  KEY `idx_partido_tarjetas_jugador` (`id_jugador`),
  CONSTRAINT `fk_partido_tarjetas_partido` FOREIGN KEY (`id_partido`) REFERENCES `partidos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_partido_tarjetas_jugador` FOREIGN KEY (`id_jugador`) REFERENCES `jugadores` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
