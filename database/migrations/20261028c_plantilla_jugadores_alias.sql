-- Plantillas: alias de cada jugador en la plantilla (otro nombre), el que sale
-- en las estadísticas de Senior A. Al crearlo se rellena, en las plantillas de
-- Senior A, con el nombre actual ("Nombre Apellidos").
-- Idempotente: segura de ejecutar aunque ya se haya aplicado (solo rellena los vacíos).

SET @existe := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'plantilla_jugadores' AND COLUMN_NAME = 'alias');
SET @sql := IF(@existe = 0,
  'ALTER TABLE `plantilla_jugadores` ADD COLUMN `alias` VARCHAR(100) NULL AFTER `talla`',
  'SELECT 1');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

UPDATE `plantilla_jugadores` pj
  JOIN `plantillas` p ON p.id = pj.id_plantilla
  JOIN `categorias` c ON c.id = p.id_categoria
  JOIN `jugadores` j ON j.id = pj.id_jugador
SET pj.alias = TRIM(CONCAT(j.nombre, ' ', j.apellidos))
WHERE c.nombre = 'Senior A' AND (pj.alias IS NULL OR pj.alias = '');
