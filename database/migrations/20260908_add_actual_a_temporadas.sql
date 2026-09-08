-- Añade la columna `actual` (BOOLEAN) a `temporadas` para marcar la temporada en curso.
-- Idempotente: segura de ejecutar aunque ya se haya aplicado.
SET @actual_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'temporadas' AND COLUMN_NAME = 'actual'
);
SET @actual_sql = IF(@actual_exists = 0,
  'ALTER TABLE `temporadas` ADD COLUMN `actual` TINYINT(1) NOT NULL DEFAULT 0 AFTER `nombre`',
  'SELECT 1 AS ok');
PREPARE actual_stmt FROM @actual_sql;
EXECUTE actual_stmt;
DEALLOCATE PREPARE actual_stmt;
