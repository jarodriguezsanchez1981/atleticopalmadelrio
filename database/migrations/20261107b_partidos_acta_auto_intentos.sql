-- Finalizar Acta automático con segundo intento (pedido por el usuario el
-- 07/11/2026): si en el primero el acta aún no estaba publicada en RFAF, se
-- vuelve a intentar 3 horas después de terminar el partido.
-- `acta_auto_intentos`: 0 = aún no; 1 = primer intento sin acta publicada
-- (queda el segundo); 2 = no se intenta más. `acta_auto_at` pasa a ser la
-- hora del último intento. Los ya intentados con la versión anterior (un solo
-- intento) quedan en 2.
-- Idempotente: segura de ejecutar aunque ya se haya aplicado.

SET @existe := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'partidos' AND COLUMN_NAME = 'acta_auto_intentos');
SET @sql := IF(@existe = 0,
  'ALTER TABLE `partidos` ADD COLUMN `acta_auto_intentos` TINYINT NOT NULL DEFAULT 0 AFTER `acta_auto_at`',
  'SELECT 1');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

SET @sql := IF(@existe = 0,
  'UPDATE `partidos` SET `acta_auto_intentos` = 2 WHERE `acta_auto_at` IS NOT NULL',
  'SELECT 1');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;
