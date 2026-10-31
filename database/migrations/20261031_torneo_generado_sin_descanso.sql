-- Generar Torneo: opción "Sin descanso" por categoría. Con ella, un equipo
-- puede jugar dos partidos seguidos (sin ella, nunca: regla por defecto).
-- Idempotente: segura de ejecutar aunque ya se haya aplicado.

SET @existe = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'torneo_generado_categorias' AND COLUMN_NAME = 'sin_descanso'
);
SET @sql = IF(@existe = 0,
  'ALTER TABLE `torneo_generado_categorias` ADD COLUMN `sin_descanso` BOOLEAN NOT NULL DEFAULT FALSE AFTER `final_plata`',
  'SELECT 1 AS ok');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
