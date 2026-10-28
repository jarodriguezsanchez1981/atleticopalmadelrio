-- Añade partidos.acta_finalizada_at (cuándo se finalizó el acta con RFAF desde
-- el botón "Finalizar Acta"; NULL = sin finalizar).
-- Idempotente: segura de ejecutar aunque ya se haya aplicado.

SET @acta_finalizada_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'partidos' AND COLUMN_NAME = 'acta_finalizada_at'
);
SET @add_col_sql = IF(@acta_finalizada_exists = 0,
  'ALTER TABLE `partidos` ADD COLUMN `acta_finalizada_at` DATETIME NULL',
  'SELECT 1 AS ok');
PREPARE add_col_stmt FROM @add_col_sql;
EXECUTE add_col_stmt;
DEALLOCATE PREPARE add_col_stmt;
