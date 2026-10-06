-- Minutos jugados por cada jugador en el partido (los rellena "Finalizar Acta"
-- con las sustituciones del acta de RFAF): titular (1 = titular, 0 = suplente,
-- NULL = sin datos del acta), minuto en que entra / sale y minutos jugados.
-- Idempotente: segura de ejecutar aunque ya se haya aplicado.

SET @minutos_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'partido_jugadores' AND COLUMN_NAME = 'minutos'
);
SET @add_cols_sql = IF(@minutos_exists = 0,
  'ALTER TABLE `partido_jugadores` ADD COLUMN `titular` TINYINT(1) NULL, ADD COLUMN `minuto_entrada` INT NULL, ADD COLUMN `minuto_salida` INT NULL, ADD COLUMN `minutos` INT NULL',
  'SELECT 1 AS ok');
PREPARE add_cols_stmt FROM @add_cols_sql;
EXECUTE add_cols_stmt;
DEALLOCATE PREPARE add_cols_stmt;
