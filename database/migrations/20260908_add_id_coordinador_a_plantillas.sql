-- Añade la FK opcional `id_coordinador` a `plantillas` (coordinador responsable
-- de la plantilla). Idempotente: segura de ejecutar aunque ya se haya aplicado.
SET @id_coordinador_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'plantillas' AND COLUMN_NAME = 'id_coordinador'
);
SET @id_coordinador_sql = IF(@id_coordinador_exists = 0,
  'ALTER TABLE `plantillas` ADD COLUMN `id_coordinador` INT NULL AFTER `id_division`',
  'SELECT 1 AS ok');
PREPARE id_coordinador_stmt FROM @id_coordinador_sql;
EXECUTE id_coordinador_stmt;
DEALLOCATE PREPARE id_coordinador_stmt;
