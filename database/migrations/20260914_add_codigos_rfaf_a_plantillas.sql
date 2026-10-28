-- Añade `codigo_competicion`, `codigo_grupo` y `codigo_temporada` a `plantillas`
-- (códigos de la RFAF para identificar la competición/grupo/temporada de la plantilla).
-- Idempotente: segura de ejecutar aunque ya se haya aplicado.

SET @codigo_competicion_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'plantillas' AND COLUMN_NAME = 'codigo_competicion'
);
SET @codigo_competicion_sql = IF(@codigo_competicion_exists = 0,
  'ALTER TABLE `plantillas` ADD COLUMN `codigo_competicion` VARCHAR(50) NULL AFTER `id_coordinador`',
  'SELECT 1 AS ok');
PREPARE codigo_competicion_stmt FROM @codigo_competicion_sql;
EXECUTE codigo_competicion_stmt;
DEALLOCATE PREPARE codigo_competicion_stmt;

SET @codigo_grupo_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'plantillas' AND COLUMN_NAME = 'codigo_grupo'
);
SET @codigo_grupo_sql = IF(@codigo_grupo_exists = 0,
  'ALTER TABLE `plantillas` ADD COLUMN `codigo_grupo` VARCHAR(50) NULL AFTER `codigo_competicion`',
  'SELECT 1 AS ok');
PREPARE codigo_grupo_stmt FROM @codigo_grupo_sql;
EXECUTE codigo_grupo_stmt;
DEALLOCATE PREPARE codigo_grupo_stmt;

SET @codigo_temporada_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'plantillas' AND COLUMN_NAME = 'codigo_temporada'
);
SET @codigo_temporada_sql = IF(@codigo_temporada_exists = 0,
  'ALTER TABLE `plantillas` ADD COLUMN `codigo_temporada` VARCHAR(50) NULL AFTER `codigo_grupo`',
  'SELECT 1 AS ok');
PREPARE codigo_temporada_stmt FROM @codigo_temporada_sql;
EXECUTE codigo_temporada_stmt;
DEALLOCATE PREPARE codigo_temporada_stmt;
