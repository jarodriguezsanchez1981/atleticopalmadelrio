-- Añade partido_jugadores.dorsal: el dorsal con el que jugó cada jugador en
-- ese partido (lo pone Finalizar Acta y se puede editar en el partido).
-- Idempotente: segura de ejecutar aunque ya se haya aplicado.

SET @dorsal_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'partido_jugadores' AND COLUMN_NAME = 'dorsal'
);
SET @add_col_sql = IF(@dorsal_exists = 0,
  'ALTER TABLE `partido_jugadores` ADD COLUMN `dorsal` INT NULL AFTER `es_local`',
  'SELECT 1 AS ok');
PREPARE add_col_stmt FROM @add_col_sql;
EXECUTE add_col_stmt;
DEALLOCATE PREPARE add_col_stmt;
