-- Nueva sección "Coordinadores": ficha simple de coordinadores del club.
-- CREATE TABLE IF NOT EXISTS ya es idempotente de forma nativa en MySQL.
CREATE TABLE IF NOT EXISTS `coordinadores` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nombre` VARCHAR(100) NOT NULL,
  `apellidos` VARCHAR(150) NOT NULL,
  `email` VARCHAR(150) DEFAULT NULL,
  `telefono` VARCHAR(20) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
