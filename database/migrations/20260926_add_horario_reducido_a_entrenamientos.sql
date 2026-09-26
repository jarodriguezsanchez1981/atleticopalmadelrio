-- Añade entrenamientos.horario_reducido: si está activo, no se comprueba el
-- tiempo_entrenamiento de la categoría para filtrar los lugares ocupados.
-- Idempotente: segura de ejecutar aunque ya se haya aplicado.

SET @horario_reducido_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'entrenamientos' AND COLUMN_NAME = 'horario_reducido'
);
SET @add_col_sql = IF(@horario_reducido_exists = 0,
  'ALTER TABLE `entrenamientos` ADD COLUMN `horario_reducido` TINYINT(1) NOT NULL DEFAULT 0 AFTER `recurrente`',
  'SELECT 1 AS ok');
PREPARE add_col_stmt FROM @add_col_sql;
EXECUTE add_col_stmt;
DEALLOCATE PREPARE add_col_stmt;
