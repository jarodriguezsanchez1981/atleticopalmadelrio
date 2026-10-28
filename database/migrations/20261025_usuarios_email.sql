-- Dirección de correo electrónico por usuario (campo opcional).
-- Idempotente: segura de ejecutar aunque ya se haya aplicado.

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'email'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `usuarios` ADD COLUMN `email` VARCHAR(150) NULL AFTER `id_categoria`',
  'SELECT 1 AS ok');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
