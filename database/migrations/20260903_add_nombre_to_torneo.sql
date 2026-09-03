-- Añade columna nombre a la tabla torneo
-- Seguro: no falla si la columna ya existe
SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'torneo' AND COLUMN_NAME = 'nombre'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE torneo ADD COLUMN nombre VARCHAR(150) NULL AFTER id_equipo',
  'SELECT 1 AS ok'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
