-- Mueve `codigo_equipo_rfaf` de `plantillas` a `categorias` (el código de equipo RFAF
-- es propio de la categoría, no de la plantilla de una temporada concreta).
-- Idempotente: segura de ejecutar aunque ya se haya aplicado.

-- 1. Añadir la columna en categorias si no existe
SET @cat_col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'categorias' AND COLUMN_NAME = 'codigo_equipo_rfaf'
);
SET @cat_col_sql = IF(@cat_col_exists = 0,
  'ALTER TABLE `categorias` ADD COLUMN `codigo_equipo_rfaf` VARCHAR(50) NULL AFTER `alias`',
  'SELECT 1 AS ok');
PREPARE cat_col_stmt FROM @cat_col_sql;
EXECUTE cat_col_stmt;
DEALLOCATE PREPARE cat_col_stmt;

-- 2. Migrar los valores existentes de plantillas.codigo_equipo_rfaf a categorias (solo si
--    la columna todavía existe en plantillas, es decir, la primera vez que se ejecuta)
SET @plant_col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'plantillas' AND COLUMN_NAME = 'codigo_equipo_rfaf'
);
SET @migrar_sql = IF(@plant_col_exists = 1,
  'UPDATE categorias c JOIN plantillas p ON p.id_categoria = c.id
     SET c.codigo_equipo_rfaf = p.codigo_equipo_rfaf
     WHERE p.codigo_equipo_rfaf IS NOT NULL AND c.codigo_equipo_rfaf IS NULL',
  'SELECT 1 AS ok');
PREPARE migrar_stmt FROM @migrar_sql;
EXECUTE migrar_stmt;
DEALLOCATE PREPARE migrar_stmt;

-- 3. Eliminar la columna de plantillas
SET @drop_sql = IF(@plant_col_exists = 1,
  'ALTER TABLE `plantillas` DROP COLUMN `codigo_equipo_rfaf`',
  'SELECT 1 AS ok');
PREPARE drop_stmt FROM @drop_sql;
EXECUTE drop_stmt;
DEALLOCATE PREPARE drop_stmt;
