-- categorias.grupo pasa a ser numérico (1 = el grupo de las categorías más
-- pequeñas, de menor a mayor). Los valores de texto que no sean números se
-- vacían. Idempotente: segura de ejecutar aunque ya se haya aplicado.

SET @grupo_es_texto = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'categorias' AND COLUMN_NAME = 'grupo'
    AND DATA_TYPE <> 'int'
);
SET @vaciar_sql = IF(@grupo_es_texto = 1,
  'UPDATE `categorias` SET `grupo` = NULL WHERE `grupo` IS NOT NULL AND `grupo` NOT REGEXP ''^[0-9]+$''',
  'SELECT 1 AS ok');
PREPARE vaciar_stmt FROM @vaciar_sql;
EXECUTE vaciar_stmt;
DEALLOCATE PREPARE vaciar_stmt;
SET @modify_sql = IF(@grupo_es_texto = 1,
  'ALTER TABLE `categorias` MODIFY COLUMN `grupo` INT NULL',
  'SELECT 1 AS ok');
PREPARE modify_stmt FROM @modify_sql;
EXECUTE modify_stmt;
DEALLOCATE PREPARE modify_stmt;
