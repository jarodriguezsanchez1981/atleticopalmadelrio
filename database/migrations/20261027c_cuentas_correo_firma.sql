-- Correos: firma de cada cuenta (la misma plantilla que Firma Email). Se añade
-- al final del HTML de los correos que salen desde esa cuenta.
-- `firma_datos`: los datos del formulario (para volver a editarla);
-- `firma_html`: la firma generada. NULL = sin firma.
-- Idempotente: segura de ejecutar aunque ya se haya aplicado.

SET @existe := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cuentas_correo' AND COLUMN_NAME = 'firma_datos');
SET @sql := IF(@existe = 0,
  'ALTER TABLE `cuentas_correo` ADD COLUMN `firma_datos` JSON NULL AFTER `activa`',
  'SELECT 1');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

SET @existe := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cuentas_correo' AND COLUMN_NAME = 'firma_html');
SET @sql := IF(@existe = 0,
  'ALTER TABLE `cuentas_correo` ADD COLUMN `firma_html` MEDIUMTEXT NULL AFTER `firma_datos`',
  'SELECT 1');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;
