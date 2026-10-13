-- Sección Personal: personal del club (fisio, utillero, prensa…) con foto,
-- datos de contacto y su sección/área, y su asignación a plantillas
-- (plantilla_personal; en el formulario solo se ofrece en Senior A).
-- Quien tenía la sección Delegados recibe Personal con los mismos permisos.
-- Idempotente: segura de ejecutar aunque ya se haya aplicado.

CREATE TABLE IF NOT EXISTS `personal` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `foto` LONGTEXT NULL,
  `nombre` VARCHAR(100) NOT NULL,
  `apellidos` VARCHAR(150) NOT NULL,
  `email` VARCHAR(150) NULL,
  `telefono` VARCHAR(20) NULL,
  `seccion` VARCHAR(100) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_personal_apellidos` (`apellidos`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `plantilla_personal` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `id_plantilla` INT NOT NULL,
  `id_personal` INT NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_plantilla_personal` (`id_plantilla`, `id_personal`),
  KEY `idx_plantilla_personal_personal` (`id_personal`),
  CONSTRAINT `fk_plantilla_personal_plantilla` FOREIGN KEY (`id_plantilla`) REFERENCES `plantillas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_plantilla_personal_personal` FOREIGN KEY (`id_personal`) REFERENCES `personal` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `secciones` (`clave`, `nombre`, `icono`, `orden`, `grupo`) VALUES
  ('personal', 'Personal', 'pi pi-briefcase', 56, 'club');

INSERT IGNORE INTO `usuario_secciones` (`id_usuario`, `id_seccion`, `puede_ver`, `puede_editar`)
  SELECT us.`id_usuario`, nueva.`id`, us.`puede_ver`, us.`puede_editar`
  FROM `usuario_secciones` us
  JOIN `secciones` del ON del.`id` = us.`id_seccion` AND del.`clave` = 'delegados'
  JOIN `secciones` nueva ON nueva.`clave` = 'personal';
