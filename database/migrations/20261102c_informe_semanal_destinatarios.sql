-- Informes → Semanal: los destinatarios del email se eligen en la pantalla
-- entre los usuarios con email (antes eran dos direcciones fijas). Una fila
-- por usuario elegido; si se borra el usuario, sale de la lista.
-- Idempotente: segura de ejecutar aunque ya se haya aplicado.

CREATE TABLE IF NOT EXISTS `informe_semanal_destinatarios` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `id_usuario` INT NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_informe_semanal_destinatarios_usuario` (`id_usuario`),
  CONSTRAINT `fk_informe_semanal_destinatarios_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
