-- Cuentas de correo internas de la web (sección "Correos" de Administración,
-- solo visible para el usuario admin). Guardan la configuración SMTP de cada
-- cuenta (p. ej. no-reply). La cuenta marcada como `activa` es la que usa la
-- web para enviar (recuperación de contraseña, etc.).
-- La contraseña SMTP se guarda CIFRADA con AES-256-GCM (aesCrypto), nunca en
-- claro, y nunca sale en los listados.
-- Idempotente: segura de ejecutar aunque ya se haya aplicado.

CREATE TABLE IF NOT EXISTS `cuentas_correo` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `etiqueta` VARCHAR(100) NOT NULL,
  `email` VARCHAR(150) NOT NULL,
  `smtp_host` VARCHAR(255) NOT NULL,
  `smtp_port` INT NOT NULL DEFAULT 587,
  `smtp_secure` TINYINT(1) NOT NULL DEFAULT 0,
  `smtp_user` VARCHAR(255) NOT NULL,
  `smtp_password` VARCHAR(512) NULL,
  `activa` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
