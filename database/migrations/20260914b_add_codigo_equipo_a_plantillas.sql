-- Añade `codigo_equipo` a `plantillas` (código de equipo de la RFAF para esa plantilla).
-- Idempotente: segura de ejecutar aunque ya se haya aplicado.

SET @codigo_equipo_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'plantillas' AND COLUMN_NAME = 'codigo_equipo'
);
SET @codigo_equipo_sql = IF(@codigo_equipo_exists = 0,
  'ALTER TABLE `plantillas` ADD COLUMN `codigo_equipo` VARCHAR(50) NULL AFTER `codigo_temporada`',
  'SELECT 1 AS ok');
PREPARE codigo_equipo_stmt FROM @codigo_equipo_sql;
EXECUTE codigo_equipo_stmt;
DEALLOCATE PREPARE codigo_equipo_stmt;
