-- Añade la FK opcional `id_tipofutbol` a `coordinadores` (Fútbol 7 / Fútbol 11).
-- Idempotente: segura de ejecutar aunque ya se haya aplicado.
SET @id_tipofutbol_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'coordinadores' AND COLUMN_NAME = 'id_tipofutbol'
);
SET @id_tipofutbol_sql = IF(@id_tipofutbol_exists = 0,
  'ALTER TABLE `coordinadores` ADD COLUMN `id_tipofutbol` INT NULL AFTER `apellidos`',
  'SELECT 1 AS ok');
PREPARE id_tipofutbol_stmt FROM @id_tipofutbol_sql;
EXECUTE id_tipofutbol_stmt;
DEALLOCATE PREPARE id_tipofutbol_stmt;
