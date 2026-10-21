-- Segundo factor (2FA) obligatorio por TOTP (apps tipo Google Authenticator).
--   - usuarios.totp_secret: secreto TOTP CIFRADO con AES_SECRET_KEY (reposo).
--   - usuarios.totp_activado: si el usuario ya completó el enrolamiento.
--   - usuario_codigos_recuperacion: códigos de un solo uso (hash bcrypt) para
--     recuperar el acceso si se pierde el autenticador.
-- El 2FA es obligatorio para todos: quien no lo tenga activado es forzado a
-- configurarlo en el login. Un administrador puede resetearlo (lo desactiva y
-- borra sus códigos; el usuario lo reconfigura en el siguiente acceso).
-- Idempotente: segura de ejecutar aunque ya se haya aplicado.

SET @totp_secret_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'totp_secret'
);
SET @sql = IF(@totp_secret_exists = 0,
  'ALTER TABLE `usuarios` ADD COLUMN `totp_secret` VARCHAR(255) NULL AFTER `password`',
  'SELECT 1 AS ok');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @totp_activado_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'totp_activado'
);
SET @sql = IF(@totp_activado_exists = 0,
  'ALTER TABLE `usuarios` ADD COLUMN `totp_activado` TINYINT(1) NOT NULL DEFAULT 0 AFTER `totp_secret`',
  'SELECT 1 AS ok');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS `usuario_codigos_recuperacion` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `id_usuario` INT NOT NULL,
  `codigo_hash` VARCHAR(255) NOT NULL,
  `usado` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_codigos_recuperacion_usuario` (`id_usuario`),
  CONSTRAINT `fk_codigos_recuperacion_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
