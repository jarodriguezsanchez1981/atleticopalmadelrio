-- Informes → Sanciones: segundo informe por email, como el Semanal pero solo de
-- Fútbol 11 (tarjetas del partido del fin de semana y tabla de sanciones de la
-- temporada de cada plantilla), enviado desde sanciones@. Comparte las tablas
-- del Semanal con una columna `tipo` ('semanal' | 'sanciones'): cada informe
-- tiene su historial y sus destinatarios. Quien tiene la sección "Semanal"
-- recibe la nueva con los mismos permisos. Se llama "Informe Sanciones" (el
-- nombre de sección es único y "Sanciones" ya es la de Liga); en el submenú
-- Informes sale como "Sanciones".
-- Idempotente: segura de ejecutar aunque ya se haya aplicado.

SET @existe = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'informes_semanales' AND COLUMN_NAME = 'tipo'
);
SET @sql = IF(@existe = 0,
  'ALTER TABLE `informes_semanales` ADD COLUMN `tipo` ENUM(''semanal'',''sanciones'') NOT NULL DEFAULT ''semanal'' AFTER `id`',
  'SELECT 1 AS ok');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @existe = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'informe_semanal_destinatarios' AND COLUMN_NAME = 'tipo'
);
SET @sql = IF(@existe = 0,
  'ALTER TABLE `informe_semanal_destinatarios` ADD COLUMN `tipo` ENUM(''semanal'',''sanciones'') NOT NULL DEFAULT ''semanal'' AFTER `id`',
  'SELECT 1 AS ok');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Un usuario puede estar en los destinatarios de los dos informes: la clave
-- única pasa a (id_usuario, tipo). Primero la nueva (la FK de id_usuario la
-- necesita) y después se quita la antigua.
SET @existe = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'informe_semanal_destinatarios' AND INDEX_NAME = 'uq_informe_semanal_destinatarios_usuario_tipo'
);
SET @sql = IF(@existe = 0,
  'ALTER TABLE `informe_semanal_destinatarios` ADD UNIQUE KEY `uq_informe_semanal_destinatarios_usuario_tipo` (`id_usuario`, `tipo`)',
  'SELECT 1 AS ok');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @existe = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'informe_semanal_destinatarios' AND INDEX_NAME = 'uq_informe_semanal_destinatarios_usuario'
);
SET @sql = IF(@existe > 0,
  'ALTER TABLE `informe_semanal_destinatarios` DROP INDEX `uq_informe_semanal_destinatarios_usuario`',
  'SELECT 1 AS ok');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

INSERT IGNORE INTO `secciones` (`clave`, `nombre`, `icono`, `orden`, `grupo`) VALUES
  ('informe_sanciones', 'Informe Sanciones', 'pi pi-ban', 20, 'informes');

INSERT IGNORE INTO `usuario_secciones` (`id_usuario`, `id_seccion`, `puede_ver`, `puede_editar`)
  SELECT us.`id_usuario`, nueva.`id`, us.`puede_ver`, us.`puede_editar`
  FROM `usuario_secciones` us
  JOIN `secciones` base ON base.`id` = us.`id_seccion` AND base.`clave` = 'informe_semanal'
  JOIN `secciones` nueva ON nueva.`clave` = 'informe_sanciones';
