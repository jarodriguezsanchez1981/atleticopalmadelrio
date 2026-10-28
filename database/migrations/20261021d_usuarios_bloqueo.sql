-- Bloqueo temporal de cuenta por intentos de contraseña fallidos (freno a la
-- fuerza bruta dirigida a un usuario concreto, además del límite por IP).
--   - usuarios.intentos_fallidos: fallos de contraseña consecutivos.
--   - usuarios.bloqueado_hasta: si tiene fecha futura, la cuenta está bloqueada.
-- El login correcto reinicia ambos. El bloqueo se levanta solo al expirar.
-- Idempotente: segura de ejecutar aunque ya se haya aplicado.

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'intentos_fallidos'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `usuarios` ADD COLUMN `intentos_fallidos` INT NOT NULL DEFAULT 0 AFTER `totp_activado`',
  'SELECT 1 AS ok');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'bloqueado_hasta'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `usuarios` ADD COLUMN `bloqueado_hasta` DATETIME NULL AFTER `intentos_fallidos`',
  'SELECT 1 AS ok');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
