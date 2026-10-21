-- Datos de correo electrónico por usuario: dirección y configuración de la
-- cuenta (IMAP, POP3, SMTP con sus puertos, usuario y contraseña del buzón).
-- La contraseña del buzón se guarda CIFRADA con AES (aesCrypto), igual que el
-- secreto TOTP; nunca en texto plano y nunca sale en los listados.
-- Idempotente: segura de ejecutar aunque ya se haya aplicado.

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'email'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `usuarios` ADD COLUMN `email` VARCHAR(150) NULL AFTER `id_categoria`',
  'SELECT 1 AS ok');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'email_imap'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `usuarios` ADD COLUMN `email_imap` VARCHAR(255) NULL AFTER `email`',
  'SELECT 1 AS ok');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'email_imap_puerto'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `usuarios` ADD COLUMN `email_imap_puerto` INT NULL AFTER `email_imap`',
  'SELECT 1 AS ok');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'email_pop3'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `usuarios` ADD COLUMN `email_pop3` VARCHAR(255) NULL AFTER `email_imap_puerto`',
  'SELECT 1 AS ok');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'email_pop3_puerto'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `usuarios` ADD COLUMN `email_pop3_puerto` INT NULL AFTER `email_pop3`',
  'SELECT 1 AS ok');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'email_smtp'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `usuarios` ADD COLUMN `email_smtp` VARCHAR(255) NULL AFTER `email_pop3_puerto`',
  'SELECT 1 AS ok');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'email_smtp_puerto'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `usuarios` ADD COLUMN `email_smtp_puerto` INT NULL AFTER `email_smtp`',
  'SELECT 1 AS ok');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'email_usuario'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `usuarios` ADD COLUMN `email_usuario` VARCHAR(255) NULL AFTER `email_smtp_puerto`',
  'SELECT 1 AS ok');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'email_password'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `usuarios` ADD COLUMN `email_password` TEXT NULL AFTER `email_usuario`',
  'SELECT 1 AS ok');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
