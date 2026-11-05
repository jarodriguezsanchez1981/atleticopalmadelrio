-- Entrenamientos → Videos: biblioteca de vídeos de ejercicios (p. ej. la
-- animación de una tarea exportada de alonbalon). El fichero va al disco del
-- backend (volumen "videos_data", carpeta VIDEOS_DIR), no a la BD: aquí solo
-- sus datos y el nombre con el que se guardó. Mismos permisos que la sección
-- Entrenamientos.
-- Idempotente: segura de ejecutar aunque ya se haya aplicado.

CREATE TABLE IF NOT EXISTS `videos` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `titulo` VARCHAR(150) NOT NULL,
  `descripcion` TEXT NULL,
  `origen_url` VARCHAR(500) NULL,
  `fichero` VARCHAR(100) NULL,
  `fichero_nombre` VARCHAR(255) NULL,
  `fichero_tipo` VARCHAR(50) NULL,
  `fichero_tamano` BIGINT NULL,
  `id_usuario` INT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
