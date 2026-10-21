-- Informes de seguridad de Docker: el script `scripts/comprobar-parches-docker.sh`
-- (cron cada 2 días en el EC2) guarda aquí un resumen de cada comprobación, para
-- que la intranet pueda avisar a los administradores cuando haya parches
-- pendientes o vulnerabilidades HIGH/CRITICAL, sin tener que entrar al servidor.
-- El escaneo completo sigue quedando en ~/seguridad-docker/informe_*.log del EC2.
-- Idempotente: segura de ejecutar aunque ya se haya aplicado.

CREATE TABLE IF NOT EXISTS `informes_seguridad` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `fecha` DATETIME NOT NULL,
  `hay_actualizaciones` TINYINT(1) NOT NULL DEFAULT 0,
  `hay_vulnerabilidades` TINYINT(1) NOT NULL DEFAULT 0,
  `total_high` INT NOT NULL DEFAULT 0,
  `total_critical` INT NOT NULL DEFAULT 0,
  `resumen` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_informes_seguridad_fecha` (`fecha`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
