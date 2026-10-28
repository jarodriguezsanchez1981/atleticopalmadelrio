-- Añade `partidos.id_jornada` para vincular directamente un partido con su jornada de
-- liga (si la tiene). Sustituye el emparejamiento implícito por id_plantilla+fecha que
-- usaban partido.controller.js y jornada.controller.js para mantenerse en sincronía
-- (frágil: un desfase de fecha rompía el vínculo). Un partido sin jornada (amistoso)
-- deja id_jornada en NULL.
-- Idempotente: segura de ejecutar aunque ya se haya aplicado.

-- 1. Añadir la columna si no existe
SET @id_jornada_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'partidos' AND COLUMN_NAME = 'id_jornada'
);
SET @id_jornada_sql = IF(@id_jornada_exists = 0,
  'ALTER TABLE `partidos` ADD COLUMN `id_jornada` INT NULL AFTER `id_plantilla`',
  'SELECT 1 AS ok');
PREPARE id_jornada_stmt FROM @id_jornada_sql;
EXECUTE id_jornada_stmt;
DEALLOCATE PREPARE id_jornada_stmt;

-- 2. Índice único (a lo sumo un partido por jornada; NULL permitido varias veces)
SET @idx_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'partidos' AND INDEX_NAME = 'uk_partidos_id_jornada'
);
SET @idx_sql = IF(@idx_exists = 0,
  'ALTER TABLE `partidos` ADD UNIQUE KEY `uk_partidos_id_jornada` (`id_jornada`)',
  'SELECT 1 AS ok');
PREPARE idx_stmt FROM @idx_sql;
EXECUTE idx_stmt;
DEALLOCATE PREPARE idx_stmt;

-- 3. Backfill: vincular cada jornada con su partido correspondiente (misma plantilla,
-- misma fecha), tal y como los emparejaba hasta ahora la lógica de aplicación.
UPDATE partidos p
JOIN jornadas j ON j.id_plantilla = p.id_plantilla AND DATE(p.fecha) = j.fecha
SET p.id_jornada = j.id
WHERE p.id_jornada IS NULL;
