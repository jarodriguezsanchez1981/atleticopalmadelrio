-- Convocatorias: jugadores sancionados. Como los lesionados, van en
-- convocatorias_sin_jugadores (no están convocados), con `sancion` = 1.
-- Estadísticas Convocatoria cuenta las veces que cada jugador ha estado sancionado.
-- Idempotente: segura de ejecutar aunque ya se haya aplicado.

SET @existe := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'convocatorias_sin_jugadores' AND COLUMN_NAME = 'sancion');
SET @sql := IF(@existe = 0,
  'ALTER TABLE `convocatorias_sin_jugadores` ADD COLUMN `sancion` TINYINT(1) NOT NULL DEFAULT 0 AFTER `lesion`',
  'SELECT 1');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;
