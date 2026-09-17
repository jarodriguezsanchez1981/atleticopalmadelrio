-- Añade partidos.jornada y migra su valor desde jornadas, usando el FK exacto
-- partidos.id_jornada -> jornadas.id (1:1, sin ambigüedad). No se usa el
-- emparejamiento por equipos porque el mismo par local/visitante puede repetirse
-- en varias categorías con jornadas distintas.
-- Idempotente: segura de ejecutar aunque ya se haya aplicado.

SET @columna_existe = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'partidos' AND COLUMN_NAME = 'jornada'
);
SET @add_col_sql = IF(@columna_existe = 0,
  'ALTER TABLE `partidos` ADD COLUMN `jornada` INT NULL AFTER `id_jornada`',
  'SELECT 1 AS ok');
PREPARE add_col_stmt FROM @add_col_sql;
EXECUTE add_col_stmt;
DEALLOCATE PREPARE add_col_stmt;

UPDATE `partidos` p
JOIN `jornadas` j ON j.id = p.id_jornada
SET p.jornada = j.jornada
WHERE p.jornada IS NULL AND p.id_jornada IS NOT NULL;
