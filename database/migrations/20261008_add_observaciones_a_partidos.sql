-- Añade partidos.observaciones (texto libre, se ve y edita en el partido).
-- Idempotente: segura de ejecutar aunque ya se haya aplicado.

SET @observaciones_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'partidos' AND COLUMN_NAME = 'observaciones'
);
SET @add_col_sql = IF(@observaciones_exists = 0,
  'ALTER TABLE `partidos` ADD COLUMN `observaciones` TEXT NULL AFTER `incidencias`',
  'SELECT 1 AS ok');
PREPARE add_col_stmt FROM @add_col_sql;
EXECUTE add_col_stmt;
DEALLOCATE PREPARE add_col_stmt;
