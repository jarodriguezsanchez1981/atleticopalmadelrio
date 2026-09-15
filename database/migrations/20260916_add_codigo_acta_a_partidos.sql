-- Añade partidos.codigo_acta (código de acta RFEF del partido).
-- Idempotente: segura de ejecutar aunque ya se haya aplicado.

SET @codigo_acta_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'partidos' AND COLUMN_NAME = 'codigo_acta'
);
SET @add_col_sql = IF(@codigo_acta_exists = 0,
  'ALTER TABLE `partidos` ADD COLUMN `codigo_acta` VARCHAR(50) NULL AFTER `resultado`',
  'SELECT 1 AS ok');
PREPARE add_col_stmt FROM @add_col_sql;
EXECUTE add_col_stmt;
DEALLOCATE PREPARE add_col_stmt;
