-- Convocatorias: jugadores lesionados. Van en convocatorias_sin_jugadores (no
-- están convocados) con `lesion` = 1; los no convocados normales, con 0.
-- Estadísticas Convocatoria cuenta las veces que cada jugador ha estado lesionado.
-- Idempotente: segura de ejecutar aunque ya se haya aplicado.

SET @existe := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'convocatorias_sin_jugadores' AND COLUMN_NAME = 'lesion');
SET @sql := IF(@existe = 0,
  'ALTER TABLE `convocatorias_sin_jugadores` ADD COLUMN `lesion` TINYINT(1) NOT NULL DEFAULT 0 AFTER `observaciones`',
  'SELECT 1');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;
