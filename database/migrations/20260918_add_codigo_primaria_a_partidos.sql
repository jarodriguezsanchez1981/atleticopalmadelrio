-- Añade partidos.codigo_primaria (código de primaria RFAF, el cod_primaria de la
-- URL del acta), con backfill desde plantillas.codigo_primaria.
-- Idempotente: segura de ejecutar aunque ya se haya aplicado.

SET @codigo_primaria_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'partidos' AND COLUMN_NAME = 'codigo_primaria'
);
SET @add_col_sql = IF(@codigo_primaria_exists = 0,
  'ALTER TABLE `partidos` ADD COLUMN `codigo_primaria` VARCHAR(50) NULL AFTER `codigo_acta`',
  'SELECT 1 AS ok');
PREPARE add_col_stmt FROM @add_col_sql;
EXECUTE add_col_stmt;
DEALLOCATE PREPARE add_col_stmt;

UPDATE `partidos` p
  JOIN `plantillas` pl ON pl.id = p.id_plantilla
  SET p.codigo_primaria = pl.codigo_primaria
  WHERE p.codigo_primaria IS NULL AND pl.codigo_primaria IS NOT NULL;
