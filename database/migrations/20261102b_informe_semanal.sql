-- Informes → Semanal: email automático de los lunes con los partidos del fin
-- de semana de cada categoría (resultado, puesto del PALMA y sanciones).
-- `informes_semanales` guarda cada envío (automático o manual) para el
-- historial y para no enviar dos veces el mismo fin de semana (`lunes`).
-- En el menú, "Informes" pasa a ser un submenú de Club con la sección
-- "Semanal" (grupo 'informes'); la página antigua de Informes (en
-- construcción) sale del menú (grupo NULL). Quien ya tiene la sección
-- "Informes" recibe la nueva con los mismos permisos.
-- Idempotente: segura de ejecutar aunque ya se haya aplicado.

CREATE TABLE IF NOT EXISTS `informes_semanales` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `lunes` DATE NOT NULL,
  `automatico` TINYINT(1) NOT NULL DEFAULT 0,
  `correcto` TINYINT(1) NOT NULL DEFAULT 0,
  `error` TEXT NULL,
  `destinatarios` VARCHAR(500) NOT NULL,
  `id_usuario` INT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_informes_semanales_lunes` (`lunes`),
  CONSTRAINT `fk_informes_semanales_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `secciones` (`clave`, `nombre`, `icono`, `orden`, `grupo`) VALUES
  ('informe_semanal', 'Semanal', 'pi pi-calendar', 10, 'informes');

INSERT IGNORE INTO `usuario_secciones` (`id_usuario`, `id_seccion`, `puede_ver`, `puede_editar`)
  SELECT us.`id_usuario`, nueva.`id`, us.`puede_ver`, us.`puede_editar`
  FROM `usuario_secciones` us
  JOIN `secciones` base ON base.`id` = us.`id_seccion` AND base.`clave` = 'informes'
  JOIN `secciones` nueva ON nueva.`clave` = 'informe_semanal';

UPDATE `secciones` SET `grupo` = NULL WHERE `clave` = 'informes';
