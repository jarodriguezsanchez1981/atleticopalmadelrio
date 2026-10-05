-- Añade categorias.grupo (ver 20261005b: pasa a ser numérico). Lo usa
-- Promociones para distinguir la promoción RFAF (partido de una categoría del
-- mismo grupo) de la promoción de categoría (grupo distinto).
-- Idempotente: segura de ejecutar aunque ya se haya aplicado.

SET @grupo_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'categorias' AND COLUMN_NAME = 'grupo'
);
SET @add_col_sql = IF(@grupo_exists = 0,
  'ALTER TABLE `categorias` ADD COLUMN `grupo` VARCHAR(50) NULL AFTER `alias`',
  'SELECT 1 AS ok');
PREPARE add_col_stmt FROM @add_col_sql;
EXECUTE add_col_stmt;
DEALLOCATE PREPARE add_col_stmt;
