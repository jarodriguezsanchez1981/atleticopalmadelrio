-- Renombra `jornada_jugadores` a `partido_jugadores` y cambia su FK de id_jornada
-- (jornadas.id) a id_partido (partidos.id): los convocados/tarjetas/goles pasan a
-- vincularse directamente al partido de calendario en vez de a la jornada de liga,
-- en línea con partidos.id_jornada como el único enlace entre ambas tablas.
-- Idempotente: segura de ejecutar aunque ya se haya aplicado.

-- 1. Renombrar la tabla si todavía no se ha renombrado
SET @tabla_vieja_existe = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'jornada_jugadores'
);
SET @tabla_nueva_existe = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'partido_jugadores'
);
SET @rename_sql = IF(@tabla_vieja_existe = 1 AND @tabla_nueva_existe = 0,
  'RENAME TABLE `jornada_jugadores` TO `partido_jugadores`',
  'SELECT 1 AS ok');
PREPARE rename_stmt FROM @rename_sql;
EXECUTE rename_stmt;
DEALLOCATE PREPARE rename_stmt;

-- 2. Añadir id_partido si no existe
SET @id_partido_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'partido_jugadores' AND COLUMN_NAME = 'id_partido'
);
SET @add_col_sql = IF(@id_partido_exists = 0,
  'ALTER TABLE `partido_jugadores` ADD COLUMN `id_partido` INT NULL AFTER `id`',
  'SELECT 1 AS ok');
PREPARE add_col_stmt FROM @add_col_sql;
EXECUTE add_col_stmt;
DEALLOCATE PREPARE add_col_stmt;

-- 3. Backfill: id_partido = id del partido vinculado a la jornada de cada fila
SET @id_jornada_still_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'partido_jugadores' AND COLUMN_NAME = 'id_jornada'
);
SET @backfill_sql = IF(@id_jornada_still_exists = 1,
  'UPDATE partido_jugadores pj JOIN partidos p ON p.id_jornada = pj.id_jornada SET pj.id_partido = p.id WHERE pj.id_partido IS NULL',
  'SELECT 1 AS ok');
PREPARE backfill_stmt FROM @backfill_sql;
EXECUTE backfill_stmt;
DEALLOCATE PREPARE backfill_stmt;

-- 4. Asegurar un índice dedicado en id_jugador antes de tocar uq_jj/FKs antiguos:
-- uq_jj cubre hoy la FK de id_jugador, y no se puede quitar sin que haya otro
-- índice que la respalde.
SET @idx_jugador_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'partido_jugadores' AND INDEX_NAME = 'idx_pj_jugador'
);
SET @add_idx_jugador_sql = IF(@idx_jugador_exists = 0,
  'ALTER TABLE `partido_jugadores` ADD INDEX `idx_pj_jugador` (`id_jugador`)',
  'SELECT 1 AS ok');
PREPARE add_idx_jugador_stmt FROM @add_idx_jugador_sql;
EXECUTE add_idx_jugador_stmt;
DEALLOCATE PREPARE add_idx_jugador_stmt;

-- 5. Quitar la FK y el índice único antiguos sobre id_jornada, y la propia columna
SET @fk_jornada_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'partido_jugadores' AND CONSTRAINT_NAME = 'fk_jj_jornada'
);
SET @drop_fk_sql = IF(@fk_jornada_exists = 1,
  'ALTER TABLE `partido_jugadores` DROP FOREIGN KEY `fk_jj_jornada`',
  'SELECT 1 AS ok');
PREPARE drop_fk_stmt FROM @drop_fk_sql;
EXECUTE drop_fk_stmt;
DEALLOCATE PREPARE drop_fk_stmt;

-- Nota: INFORMATION_SCHEMA.STATISTICS tiene una fila POR COLUMNA del índice
-- (uq_jj es compuesto), así que la comprobación de existencia es > 0, no = 1.
SET @uq_jj_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'partido_jugadores' AND INDEX_NAME = 'uq_jj'
);
SET @drop_uq_sql = IF(@uq_jj_exists > 0,
  'ALTER TABLE `partido_jugadores` DROP INDEX `uq_jj`',
  'SELECT 1 AS ok');
PREPARE drop_uq_stmt FROM @drop_uq_sql;
EXECUTE drop_uq_stmt;
DEALLOCATE PREPARE drop_uq_stmt;

SET @id_jornada_exists2 = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'partido_jugadores' AND COLUMN_NAME = 'id_jornada'
);
SET @drop_col_sql = IF(@id_jornada_exists2 = 1,
  'ALTER TABLE `partido_jugadores` DROP COLUMN `id_jornada`',
  'SELECT 1 AS ok');
PREPARE drop_col_stmt FROM @drop_col_sql;
EXECUTE drop_col_stmt;
DEALLOCATE PREPARE drop_col_stmt;

-- 6. id_partido pasa a NOT NULL y se añaden FK + índice único nuevos
SET @id_partido_nullable = (
  SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'partido_jugadores' AND COLUMN_NAME = 'id_partido'
);
SET @notnull_sql = IF(@id_partido_nullable = 'YES',
  'ALTER TABLE `partido_jugadores` MODIFY COLUMN `id_partido` INT NOT NULL',
  'SELECT 1 AS ok');
PREPARE notnull_stmt FROM @notnull_sql;
EXECUTE notnull_stmt;
DEALLOCATE PREPARE notnull_stmt;

SET @uq_pj_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'partido_jugadores' AND INDEX_NAME = 'uq_pj'
);
SET @add_uq_sql = IF(@uq_pj_exists > 0,
  'SELECT 1 AS ok',
  'ALTER TABLE `partido_jugadores` ADD UNIQUE KEY `uq_pj` (`id_partido`,`id_jugador`,`es_local`)');
PREPARE add_uq_stmt FROM @add_uq_sql;
EXECUTE add_uq_stmt;
DEALLOCATE PREPARE add_uq_stmt;

SET @fk_partido_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'partido_jugadores' AND CONSTRAINT_NAME = 'fk_pj_partido'
);
SET @add_fk_sql = IF(@fk_partido_exists = 0,
  'ALTER TABLE `partido_jugadores` ADD CONSTRAINT `fk_pj_partido` FOREIGN KEY (`id_partido`) REFERENCES `partidos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT 1 AS ok');
PREPARE add_fk_stmt FROM @add_fk_sql;
EXECUTE add_fk_stmt;
DEALLOCATE PREPARE add_fk_stmt;

-- 7. Renombrar las FK sobre jugador/equipo_jugador para reflejar la nueva tabla
SET @fk_jugador_old = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'partido_jugadores' AND CONSTRAINT_NAME = 'fk_jj_jugador'
);
SET @rename_fk_jugador_sql = IF(@fk_jugador_old = 1,
  'ALTER TABLE `partido_jugadores` DROP FOREIGN KEY `fk_jj_jugador`, ADD CONSTRAINT `fk_pj_jugador` FOREIGN KEY (`id_jugador`) REFERENCES `jugadores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT 1 AS ok');
PREPARE rfj_stmt FROM @rename_fk_jugador_sql;
EXECUTE rfj_stmt;
DEALLOCATE PREPARE rfj_stmt;

SET @fk_equipo_jugador_old = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'partido_jugadores' AND CONSTRAINT_NAME = 'fk_jj_equipo_jugador'
);
SET @rename_fk_ej_sql = IF(@fk_equipo_jugador_old = 1,
  'ALTER TABLE `partido_jugadores` DROP FOREIGN KEY `fk_jj_equipo_jugador`, ADD CONSTRAINT `fk_pj_equipo_jugador` FOREIGN KEY (`id_equipo_jugador`) REFERENCES `equipos_jugadores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT 1 AS ok');
PREPARE rej_stmt FROM @rename_fk_ej_sql;
EXECUTE rej_stmt;
DEALLOCATE PREPARE rej_stmt;

-- 8. Limpieza: DROP FOREIGN KEY no quita el índice que compartía su nombre, así que
-- quedan sueltos `fk_jj_jugador`/`fk_jj_equipo_jugador` (ya sin la FK que los
-- justificaba). El de jugador es redundante con idx_pj_jugador (se puede quitar sin
-- más); el de equipo_jugador se sustituye por uno con el nombre nuevo.
SET @old_idx_jugador_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'partido_jugadores' AND INDEX_NAME = 'fk_jj_jugador'
);
SET @drop_old_idx_jugador_sql = IF(@old_idx_jugador_exists > 0,
  'ALTER TABLE `partido_jugadores` DROP INDEX `fk_jj_jugador`',
  'SELECT 1 AS ok');
PREPARE drop_old_idx_jugador_stmt FROM @drop_old_idx_jugador_sql;
EXECUTE drop_old_idx_jugador_stmt;
DEALLOCATE PREPARE drop_old_idx_jugador_stmt;

SET @old_idx_equipo_jugador_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'partido_jugadores' AND INDEX_NAME = 'fk_jj_equipo_jugador'
);
SET @idx_equipo_jugador_new_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'partido_jugadores' AND INDEX_NAME = 'idx_pj_equipo_jugador'
);
SET @rename_idx_ej_sql = IF(@old_idx_equipo_jugador_exists > 0 AND @idx_equipo_jugador_new_exists = 0,
  'ALTER TABLE `partido_jugadores` ADD INDEX `idx_pj_equipo_jugador` (`id_equipo_jugador`), DROP INDEX `fk_jj_equipo_jugador`',
  'SELECT 1 AS ok');
PREPARE rename_idx_ej_stmt FROM @rename_idx_ej_sql;
EXECUTE rename_idx_ej_stmt;
DEALLOCATE PREPARE rename_idx_ej_stmt;
