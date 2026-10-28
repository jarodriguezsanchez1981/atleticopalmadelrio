-- Añade la columna `codigo_equipo_rfaf` a `plantillas` (código del equipo en la RFAF).
-- Idempotente: segura de ejecutar aunque ya se haya aplicado.
SET @codigo_equipo_rfaf_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'plantillas' AND COLUMN_NAME = 'codigo_equipo_rfaf'
);
SET @codigo_equipo_rfaf_sql = IF(@codigo_equipo_rfaf_exists = 0,
  'ALTER TABLE `plantillas` ADD COLUMN `codigo_equipo_rfaf` VARCHAR(50) NULL AFTER `id_coordinador`',
  'SELECT 1 AS ok');
PREPARE codigo_equipo_rfaf_stmt FROM @codigo_equipo_rfaf_sql;
EXECUTE codigo_equipo_rfaf_stmt;
DEALLOCATE PREPARE codigo_equipo_rfaf_stmt;
