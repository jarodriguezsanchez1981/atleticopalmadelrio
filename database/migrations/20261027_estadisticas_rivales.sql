-- Estadísticas Senior A → Rivales: goles y tarjetas de cada equipo contrario.
-- Las rellena "Finalizar Acta" a partir del acta de RFAF (que ya trae las dos
-- plantillas); los partidos finalizados antes de esta migración no tienen los
-- datos del rival hasta que se vuelva a pulsar "Finalizar Acta".
-- Idempotente: segura de ejecutar aunque ya se haya aplicado.

-- Goles del rival: si quien marca era titular o suplente (NULL si no se sabe)
-- y si es un gol en propia puerta del PALMA (suma al rival pero no es suyo).
SET @existe := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'partido_goles_contra' AND COLUMN_NAME = 'titular');
SET @sql := IF(@existe = 0,
  'ALTER TABLE `partido_goles_contra` ADD COLUMN `titular` TINYINT(1) NULL AFTER `tipo`',
  'SELECT 1');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

SET @existe := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'partido_goles_contra' AND COLUMN_NAME = 'propia');
SET @sql := IF(@existe = 0,
  'ALTER TABLE `partido_goles_contra` ADD COLUMN `propia` TINYINT(1) NOT NULL DEFAULT 0 AFTER `titular`',
  'SELECT 1');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

-- Tarjetas de los jugadores del rival, con el minuto, si era titular o
-- suplente y el marcador justo antes visto desde el rival (goles_favor: los
-- suyos). Sin datos personales: `num_jugador` es la posición del jugador en el
-- acta, solo para saber si un mismo jugador vio dos amarillas.
CREATE TABLE IF NOT EXISTS `partido_tarjetas_contra` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `id_partido` INT NOT NULL,
  `num_jugador` INT NULL,
  `tipo` ENUM('amarilla','roja') NOT NULL,
  `minuto` INT NULL,
  `titular` TINYINT(1) NULL,
  `goles_favor` INT NOT NULL DEFAULT 0,
  `goles_contra` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_partido_tarjetas_contra_partido` (`id_partido`),
  CONSTRAINT `fk_partido_tarjetas_contra_partido` FOREIGN KEY (`id_partido`) REFERENCES `partidos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Partido cuya acta ya se finalizó guardando los datos del rival.
SET @existe := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'partidos' AND COLUMN_NAME = 'acta_rival');
SET @sql := IF(@existe = 0,
  'ALTER TABLE `partidos` ADD COLUMN `acta_rival` TINYINT(1) NOT NULL DEFAULT 0 AFTER `acta_finalizada_at`',
  'SELECT 1');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

-- Sección nueva en el apartado Estadísticas Senior A. Quien ya veía las Goles
-- de Senior A la recibe con los mismos permisos; al resto, desde Administración.
INSERT IGNORE INTO `secciones` (`clave`, `nombre`, `icono`, `orden`, `grupo`) VALUES
  ('estadisticas_rivales', 'Estadísticas Senior A Rivales', 'pi pi-shield', 101, 'estadisticas');

INSERT IGNORE INTO `usuario_secciones` (`id_usuario`, `id_seccion`, `puede_ver`, `puede_editar`)
  SELECT us.`id_usuario`, nueva.`id`, us.`puede_ver`, us.`puede_editar`
  FROM `usuario_secciones` us
  JOIN `secciones` base ON base.`id` = us.`id_seccion` AND base.`clave` = 'estadisticas_goles'
  JOIN `secciones` nueva ON nueva.`clave` = 'estadisticas_rivales';
