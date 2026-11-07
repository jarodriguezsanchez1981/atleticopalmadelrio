-- Finalizar Acta automático (utils/actaAutomatica.js): una hora después de
-- terminar cada partido de liga se lee su acta de RFAF una sola vez.
-- `acta_auto_at`: cuándo se intentó (salga bien o no); NULL = aún no. Así no se
-- repite aunque se reinicie el backend.
-- Idempotente: segura de ejecutar aunque ya se haya aplicado.

SET @existe := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'partidos' AND COLUMN_NAME = 'acta_auto_at');
SET @sql := IF(@existe = 0,
  'ALTER TABLE `partidos` ADD COLUMN `acta_auto_at` DATETIME NULL AFTER `acta_finalizada_at`',
  'SELECT 1');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;
