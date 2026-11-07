-- Panel de tareas automáticas (Panel Administración → Tareas automáticas):
-- cada ejecución de una tarea programada del backend (clasificación, actas de
-- la liga, horarios, Finalizar Acta automático, informes por email) deja aquí
-- cuándo fue, cómo terminó y sus mensajes (utils/tareasAutomaticas.js). Se
-- guardan 90 días. Los parches de Docker siguen en `informes_seguridad`.
-- La sección la tienen quienes ya tienen Administración, con sus permisos.
-- Idempotente: segura de ejecutar aunque ya se haya aplicado.

CREATE TABLE IF NOT EXISTS `tareas_ejecuciones` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `tarea` VARCHAR(30) NOT NULL,
  `inicio` DATETIME NOT NULL,
  `fin` DATETIME NOT NULL,
  `estado` VARCHAR(10) NOT NULL,
  `resumen` VARCHAR(255) NULL,
  `detalle` TEXT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_tareas_ejecuciones_tarea_inicio` (`tarea`, `inicio`),
  KEY `idx_tareas_ejecuciones_inicio` (`inicio`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `secciones` (`clave`, `nombre`, `icono`, `orden`, `grupo`) VALUES
  ('tareas', 'Tareas automáticas', 'pi pi-clock', 101, 'admin');

INSERT IGNORE INTO `usuario_secciones` (`id_usuario`, `id_seccion`, `puede_ver`, `puede_editar`)
  SELECT us.`id_usuario`, nueva.`id`, us.`puede_ver`, us.`puede_editar`
  FROM `usuario_secciones` us
  JOIN `secciones` base ON base.`id` = us.`id_seccion` AND base.`clave` = 'administracion'
  JOIN `secciones` nueva ON nueva.`clave` = 'tareas';
