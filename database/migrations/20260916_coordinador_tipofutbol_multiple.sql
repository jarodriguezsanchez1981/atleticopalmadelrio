-- Un coordinador puede tener más de un tipo de fútbol: sustituye
-- coordinadores.id_tipofutbol (único) por una tabla intermedia
-- coordinador_tipofutbol, igual que ya existe lugar_tipofutbol.
-- Idempotente: segura de ejecutar aunque ya se haya aplicado.

-- 1. Crear la tabla intermedia si no existe
SET @tabla_existe = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'coordinador_tipofutbol'
);
SET @crear_tabla_sql = IF(@tabla_existe = 0,
  'CREATE TABLE `coordinador_tipofutbol` (
     `id_coordinador` INT NOT NULL,
     `id_tipofutbol` INT NOT NULL,
     PRIMARY KEY (`id_coordinador`, `id_tipofutbol`),
     KEY `fk_ct_tipo` (`id_tipofutbol`)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
  'SELECT 1 AS ok');
PREPARE crear_tabla_stmt FROM @crear_tabla_sql;
EXECUTE crear_tabla_stmt;
DEALLOCATE PREPARE crear_tabla_stmt;

-- 2. Migrar los datos existentes (por si ya se ejecutó, se ignoran duplicados)
SET @columna_existe = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'coordinadores' AND COLUMN_NAME = 'id_tipofutbol'
);
SET @backfill_sql = IF(@columna_existe = 1,
  'INSERT IGNORE INTO coordinador_tipofutbol (id_coordinador, id_tipofutbol)
     SELECT id, id_tipofutbol FROM coordinadores WHERE id_tipofutbol IS NOT NULL',
  'SELECT 1 AS ok');
PREPARE backfill_stmt FROM @backfill_sql;
EXECUTE backfill_stmt;
DEALLOCATE PREPARE backfill_stmt;

-- 3. Quitar la columna única, ya sustituida por la tabla intermedia
SET @drop_col_sql = IF(@columna_existe = 1,
  'ALTER TABLE `coordinadores` DROP COLUMN `id_tipofutbol`',
  'SELECT 1 AS ok');
PREPARE drop_col_stmt FROM @drop_col_sql;
EXECUTE drop_col_stmt;
DEALLOCATE PREPARE drop_col_stmt;
