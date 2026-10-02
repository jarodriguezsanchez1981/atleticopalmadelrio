-- Jugadores de otra plantilla (de categoría igual o inferior) promocionados en
-- una convocatoria. La tabla promociones registra que el jugador está
-- promocionado (única por plantilla de origen + jugador), pero no en qué
-- convocatoria: esta tabla lo vincula para poder contarlos y mostrarlos.
-- CREATE TABLE IF NOT EXISTS ya es idempotente de forma nativa en MySQL.

CREATE TABLE IF NOT EXISTS `convocatorias_promociones` (
  `id`              INT AUTO_INCREMENT PRIMARY KEY,
  `id_convocatoria` INT NOT NULL,
  `id_plantilla`    INT NOT NULL,
  `id_jugador`      INT NOT NULL,
  `created_at`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_convocatorias_promociones` (`id_convocatoria`, `id_jugador`),
  KEY `idx_cp_plantilla` (`id_plantilla`),
  KEY `idx_cp_jugador` (`id_jugador`),
  CONSTRAINT `fk_cp_convocatoria` FOREIGN KEY (`id_convocatoria`) REFERENCES `convocatorias` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_cp_plantilla` FOREIGN KEY (`id_plantilla`) REFERENCES `plantillas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_cp_jugador` FOREIGN KEY (`id_jugador`) REFERENCES `jugadores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
