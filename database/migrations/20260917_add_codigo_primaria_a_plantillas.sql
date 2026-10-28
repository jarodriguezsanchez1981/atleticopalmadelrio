-- Añade plantillas.codigo_primaria, con valor por defecto/backfill '1000120'
-- para las plantillas existentes.
-- Idempotente: segura de ejecutar aunque ya se haya aplicado.

SET @codigo_primaria_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'plantillas' AND COLUMN_NAME = 'codigo_primaria'
);
SET @add_col_sql = IF(@codigo_primaria_exists = 0,
  'ALTER TABLE `plantillas` ADD COLUMN `codigo_primaria` VARCHAR(50) NULL DEFAULT ''1000120'' AFTER `codigo_equipo`',
  'SELECT 1 AS ok');
PREPARE add_col_stmt FROM @add_col_sql;
EXECUTE add_col_stmt;
DEALLOCATE PREPARE add_col_stmt;

UPDATE `plantillas` SET `codigo_primaria` = '1000120' WHERE `codigo_primaria` IS NULL;
