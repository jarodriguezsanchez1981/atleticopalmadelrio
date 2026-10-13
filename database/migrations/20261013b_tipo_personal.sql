-- Tipo Personal: catálogo (id, nombre) con su sección, y en Personal la FK
-- id_tipo_personal en lugar del texto libre "seccion" (los valores que ya
-- hubiera pasan a ser tipos y se enlazan antes de borrar la columna).
-- Quien tenía la sección Personal recibe Tipo Personal con los mismos permisos.
-- Idempotente: segura de ejecutar aunque ya se haya aplicado.

CREATE TABLE IF NOT EXISTS `tipo_personal` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(100) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_tipo_personal_nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- personal.id_tipo_personal
SET @existe = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'personal' AND COLUMN_NAME = 'id_tipo_personal'
);
SET @sql = IF(@existe = 0,
  'ALTER TABLE `personal` ADD COLUMN `id_tipo_personal` INT NULL AFTER `telefono`, ADD KEY `idx_personal_tipo` (`id_tipo_personal`), ADD CONSTRAINT `fk_personal_tipo_personal` FOREIGN KEY (`id_tipo_personal`) REFERENCES `tipo_personal` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE',
  'SELECT 1 AS ok');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- De "seccion" (texto) a tipos, y fuera la columna.
SET @hay_seccion = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'personal' AND COLUMN_NAME = 'seccion'
);
SET @sql = IF(@hay_seccion = 1,
  'INSERT IGNORE INTO `tipo_personal` (`nombre`) SELECT DISTINCT TRIM(`seccion`) FROM `personal` WHERE TRIM(COALESCE(`seccion`, '''')) <> ''''',
  'SELECT 1 AS ok');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(@hay_seccion = 1,
  'UPDATE `personal` p JOIN `tipo_personal` t ON t.`nombre` = TRIM(p.`seccion`) SET p.`id_tipo_personal` = t.`id` WHERE p.`id_tipo_personal` IS NULL',
  'SELECT 1 AS ok');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(@hay_seccion = 1, 'ALTER TABLE `personal` DROP COLUMN `seccion`', 'SELECT 1 AS ok');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

INSERT IGNORE INTO `secciones` (`clave`, `nombre`, `icono`, `orden`, `grupo`) VALUES
  ('tipo_personal', 'Tipo Personal', 'pi pi-tag', 57, 'club');

INSERT IGNORE INTO `usuario_secciones` (`id_usuario`, `id_seccion`, `puede_ver`, `puede_editar`)
  SELECT us.`id_usuario`, nueva.`id`, us.`puede_ver`, us.`puede_editar`
  FROM `usuario_secciones` us
  JOIN `secciones` per ON per.`id` = us.`id_seccion` AND per.`clave` = 'personal'
  JOIN `secciones` nueva ON nueva.`clave` = 'tipo_personal';
