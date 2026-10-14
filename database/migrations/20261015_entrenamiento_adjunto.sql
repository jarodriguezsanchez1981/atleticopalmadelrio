-- Adjunto de un entrenamiento (la planificación de la sesión): un fichero PDF
-- o imagen guardado como data URL en base64, con su nombre original. Es de la
-- sesión concreta (no se propaga a la serie recurrente). MEDIUMTEXT admite
-- hasta 16 MB, de sobra para el límite real (5 MB por fichero).
-- Idempotente: segura de ejecutar aunque ya se haya aplicado.

SET @adjunto_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'entrenamientos' AND COLUMN_NAME = 'adjunto'
);
SET @add_adjunto_sql = IF(@adjunto_exists = 0,
  'ALTER TABLE `entrenamientos` ADD COLUMN `adjunto` MEDIUMTEXT NULL AFTER `horario_reducido`',
  'SELECT 1 AS ok');
PREPARE add_adjunto_stmt FROM @add_adjunto_sql;
EXECUTE add_adjunto_stmt;
DEALLOCATE PREPARE add_adjunto_stmt;

SET @nombre_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'entrenamientos' AND COLUMN_NAME = 'adjunto_nombre'
);
SET @add_nombre_sql = IF(@nombre_exists = 0,
  'ALTER TABLE `entrenamientos` ADD COLUMN `adjunto_nombre` VARCHAR(255) NULL AFTER `adjunto`',
  'SELECT 1 AS ok');
PREPARE add_nombre_stmt FROM @add_nombre_sql;
EXECUTE add_nombre_stmt;
DEALLOCATE PREPARE add_nombre_stmt;
