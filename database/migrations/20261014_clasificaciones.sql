-- Clasificación de la liga jornada a jornada (Estadísticas → Clasificación):
-- una fila por equipo y jornada, copiada de RFAF (NFG_VisClasificacion) con el
-- botón de la sección para no pedirla a rfaf.es cada vez. La tabla no tiene
-- sección propia de edición.
-- Quien tenía Estadísticas Equipo recibe la sección con los mismos permisos.
-- Idempotente: segura de ejecutar aunque ya se haya aplicado.

CREATE TABLE IF NOT EXISTS `clasificaciones` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `id_plantilla` INT NOT NULL,
  `jornada` INT NOT NULL,
  `fecha` DATE NULL,
  `posicion` INT NOT NULL,
  `equipo` VARCHAR(150) NOT NULL,
  `codigo_equipo` VARCHAR(20) NULL,
  `es_palma` TINYINT(1) NOT NULL DEFAULT 0,
  `puntos` INT NOT NULL DEFAULT 0,
  `jugados` INT NOT NULL DEFAULT 0,
  `ganados` INT NOT NULL DEFAULT 0,
  `empatados` INT NOT NULL DEFAULT 0,
  `perdidos` INT NOT NULL DEFAULT 0,
  `jugados_casa` INT NOT NULL DEFAULT 0,
  `ganados_casa` INT NOT NULL DEFAULT 0,
  `empatados_casa` INT NOT NULL DEFAULT 0,
  `perdidos_casa` INT NOT NULL DEFAULT 0,
  `jugados_fuera` INT NOT NULL DEFAULT 0,
  `ganados_fuera` INT NOT NULL DEFAULT 0,
  `empatados_fuera` INT NOT NULL DEFAULT 0,
  `perdidos_fuera` INT NOT NULL DEFAULT 0,
  `goles_favor` INT NOT NULL DEFAULT 0,
  `goles_contra` INT NOT NULL DEFAULT 0,
  `puntos_sancion` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_clasificaciones_jornada_equipo` (`id_plantilla`, `jornada`, `equipo`),
  CONSTRAINT `fk_clasificaciones_plantilla` FOREIGN KEY (`id_plantilla`) REFERENCES `plantillas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `secciones` (`clave`, `nombre`, `icono`, `orden`, `grupo`) VALUES
  ('estadisticas_clasificacion', 'Estadísticas Clasificación', 'pi pi-sort-numeric-down', 100, 'estadisticas');

INSERT IGNORE INTO `usuario_secciones` (`id_usuario`, `id_seccion`, `puede_ver`, `puede_editar`)
  SELECT us.`id_usuario`, nueva.`id`, us.`puede_ver`, us.`puede_editar`
  FROM `usuario_secciones` us
  JOIN `secciones` origen ON origen.`id` = us.`id_seccion` AND origen.`clave` = 'estadisticas_equipo'
  JOIN `secciones` nueva ON nueva.`clave` = 'estadisticas_clasificacion';
