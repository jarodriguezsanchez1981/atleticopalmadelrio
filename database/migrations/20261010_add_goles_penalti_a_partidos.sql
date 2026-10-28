-- Añade a partidos los goles de penalti a favor y en contra del PALMA (los
-- pone Finalizar Acta a partir de los goles del acta). Los usa Estadísticas
-- Equipo. NULL = partido sin acta finalizada desde que existen.
-- Idempotente: segura de ejecutar aunque ya se haya aplicado.

SET @favor_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'partidos' AND COLUMN_NAME = 'goles_penalti_favor'
);
SET @add_favor_sql = IF(@favor_exists = 0,
  'ALTER TABLE `partidos` ADD COLUMN `goles_penalti_favor` INT NULL AFTER `resultado`',
  'SELECT 1 AS ok');
PREPARE add_favor_stmt FROM @add_favor_sql;
EXECUTE add_favor_stmt;
DEALLOCATE PREPARE add_favor_stmt;

SET @contra_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'partidos' AND COLUMN_NAME = 'goles_penalti_contra'
);
SET @add_contra_sql = IF(@contra_exists = 0,
  'ALTER TABLE `partidos` ADD COLUMN `goles_penalti_contra` INT NULL AFTER `goles_penalti_favor`',
  'SELECT 1 AS ok');
PREPARE add_contra_stmt FROM @add_contra_sql;
EXECUTE add_contra_stmt;
DEALLOCATE PREPARE add_contra_stmt;
