-- Consolida en un único script las migraciones:
--   20260903_add_nombre_to_torneo.sql
--   20260903_usuario_secciones_permisos.sql
-- Idempotente: segura de ejecutar tanto en una BD nueva como en una donde
-- esos cambios ya se aplicaron por separado (no falla, no duplica columnas).
-- Cada bloque usa sus propias variables/nombre de sentencia preparada para
-- evitar interferencias entre bloques al ejecutarse como sentencias sueltas.

-- 1) Columna `nombre` en `torneo`
SET @torneo_nombre_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'torneo' AND COLUMN_NAME = 'nombre'
);
SET @torneo_nombre_sql = IF(@torneo_nombre_exists = 0,
  'ALTER TABLE torneo ADD COLUMN nombre VARCHAR(150) NULL AFTER id_equipo',
  'SELECT 1 AS ok');
PREPARE torneo_nombre_stmt FROM @torneo_nombre_sql;
EXECUTE torneo_nombre_stmt;
DEALLOCATE PREPARE torneo_nombre_stmt;

-- 2) Columna `puede_ver` en `usuario_secciones`
SET @puede_ver_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuario_secciones' AND COLUMN_NAME = 'puede_ver'
);
SET @puede_ver_sql = IF(@puede_ver_exists = 0,
  'ALTER TABLE `usuario_secciones` ADD COLUMN `puede_ver` TINYINT(1) NOT NULL DEFAULT 1 AFTER `id_seccion`',
  'SELECT 1 AS ok');
PREPARE puede_ver_stmt FROM @puede_ver_sql;
EXECUTE puede_ver_stmt;
DEALLOCATE PREPARE puede_ver_stmt;

-- 3) Columna `puede_editar` en `usuario_secciones`
SET @puede_editar_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuario_secciones' AND COLUMN_NAME = 'puede_editar'
);
SET @puede_editar_sql = IF(@puede_editar_exists = 0,
  'ALTER TABLE `usuario_secciones` ADD COLUMN `puede_editar` TINYINT(1) NOT NULL DEFAULT 0 AFTER `puede_ver`',
  'SELECT 1 AS ok');
PREPARE puede_editar_stmt FROM @puede_editar_sql;
EXECUTE puede_editar_stmt;
DEALLOCATE PREPARE puede_editar_stmt;

-- 4) Migrar datos existentes: las secciones heredan la visibilidad global
--    (solo si `usuarios.visibilidad` todavía existe; si no, ya se migró)
SET @visibilidad_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'visibilidad'
);
SET @migrar_datos_sql = IF(@visibilidad_exists > 0,
  'UPDATE `usuario_secciones` us JOIN `usuarios` u ON u.id = us.id_usuario SET us.puede_editar = (u.visibilidad = ''editar'')',
  'SELECT 1 AS ok');
PREPARE migrar_datos_stmt FROM @migrar_datos_sql;
EXECUTE migrar_datos_stmt;
DEALLOCATE PREPARE migrar_datos_stmt;

-- 5) Quitar columna `visibilidad` de `usuarios` (ya no se usa)
SET @visibilidad_exists_2 = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'visibilidad'
);
SET @drop_visibilidad_sql = IF(@visibilidad_exists_2 > 0,
  'ALTER TABLE `usuarios` DROP COLUMN `visibilidad`',
  'SELECT 1 AS ok');
PREPARE drop_visibilidad_stmt FROM @drop_visibilidad_sql;
EXECUTE drop_visibilidad_stmt;
DEALLOCATE PREPARE drop_visibilidad_stmt;
