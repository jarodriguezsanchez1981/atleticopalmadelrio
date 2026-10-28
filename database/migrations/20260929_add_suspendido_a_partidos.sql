-- Añade partidos.suspendido: marca un partido como suspendido para mostrar
-- un aviso en rojo en los calendarios.
-- Idempotente: segura de ejecutar aunque ya se haya aplicado.

SET @suspendido_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'partidos' AND COLUMN_NAME = 'suspendido'
);
SET @add_col_sql = IF(@suspendido_exists = 0,
  'ALTER TABLE `partidos` ADD COLUMN `suspendido` TINYINT(1) NOT NULL DEFAULT 0 AFTER `resultado`',
  'SELECT 1 AS ok');
PREPARE add_col_stmt FROM @add_col_sql;
EXECUTE add_col_stmt;
DEALLOCATE PREPARE add_col_stmt;
