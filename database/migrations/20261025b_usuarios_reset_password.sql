-- Restablecer contraseña por email: token de un solo uso y su caducidad.
-- Se guarda el HASH del token (SHA-256), nunca el token en claro; el token en
-- claro solo viaja en el enlace del email. Idempotente.

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'reset_token'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `usuarios` ADD COLUMN `reset_token` VARCHAR(255) NULL AFTER `email`',
  'SELECT 1 AS ok');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'reset_expira'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `usuarios` ADD COLUMN `reset_expira` DATETIME NULL AFTER `reset_token`',
  'SELECT 1 AS ok');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
