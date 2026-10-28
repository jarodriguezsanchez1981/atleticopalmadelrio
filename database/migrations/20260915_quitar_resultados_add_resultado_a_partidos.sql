-- Quita la tabla `resultados` (1:1 con partidos, nunca llegó a usarse: su sección
-- de frontend no existía y el campo resultado se creaba siempre vacío) y añade
-- `resultado` directamente a `partidos`, junto a su `incidencias` ya existente.
-- Idempotente: segura de ejecutar aunque ya se haya aplicado.

-- 1. Añadir partidos.resultado si no existe
SET @resultado_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'partidos' AND COLUMN_NAME = 'resultado'
);
SET @add_col_sql = IF(@resultado_exists = 0,
  'ALTER TABLE `partidos` ADD COLUMN `resultado` VARCHAR(255) NULL AFTER `incidencias`',
  'SELECT 1 AS ok');
PREPARE add_col_stmt FROM @add_col_sql;
EXECUTE add_col_stmt;
DEALLOCATE PREPARE add_col_stmt;

-- 2. Backfill (por si alguna vez se llegó a rellenar algo): resultado y, si el
-- partido no tenía incidencias propias, también las incidencias del resultado.
SET @tabla_resultados_existe = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'resultados'
);
SET @backfill_resultado_sql = IF(@tabla_resultados_existe = 1,
  'UPDATE partidos p JOIN resultados r ON r.id_partido = p.id
     SET p.resultado = r.resultado
     WHERE r.resultado IS NOT NULL AND r.resultado <> "" AND (p.resultado IS NULL OR p.resultado = "")',
  'SELECT 1 AS ok');
PREPARE backfill_resultado_stmt FROM @backfill_resultado_sql;
EXECUTE backfill_resultado_stmt;
DEALLOCATE PREPARE backfill_resultado_stmt;

SET @backfill_incidencias_sql = IF(@tabla_resultados_existe = 1,
  'UPDATE partidos p JOIN resultados r ON r.id_partido = p.id
     SET p.incidencias = r.incidencias
     WHERE r.incidencias IS NOT NULL AND r.incidencias <> "" AND (p.incidencias IS NULL OR p.incidencias = "")',
  'SELECT 1 AS ok');
PREPARE backfill_incidencias_stmt FROM @backfill_incidencias_sql;
EXECUTE backfill_incidencias_stmt;
DEALLOCATE PREPARE backfill_incidencias_stmt;

-- 3. Eliminar la tabla resultados
SET @drop_sql = IF(@tabla_resultados_existe = 1,
  'DROP TABLE `resultados`',
  'SELECT 1 AS ok');
PREPARE drop_stmt FROM @drop_sql;
EXECUTE drop_stmt;
DEALLOCATE PREPARE drop_stmt;

-- 4. Quitar la sección "resultados" del menú (su vista ya no existe) y los
-- permisos de usuario asociados a ella
SET @id_seccion_resultados = (SELECT id FROM secciones WHERE clave = 'resultados' LIMIT 1);
SET @del_permisos_sql = IF(@id_seccion_resultados IS NOT NULL,
  CONCAT('DELETE FROM usuario_secciones WHERE id_seccion = ', @id_seccion_resultados),
  'SELECT 1 AS ok');
PREPARE del_permisos_stmt FROM @del_permisos_sql;
EXECUTE del_permisos_stmt;
DEALLOCATE PREPARE del_permisos_stmt;

DELETE FROM secciones WHERE clave = 'resultados';
