-- plantillas.codigo_primaria deja de tener DEFAULT '1000120': ese valor solo se
-- aplica por defecto a las plantillas de la temporada 2026/2027 (lo hace el
-- backend al crear). Se asegura el valor en las plantillas ya existentes de esa
-- temporada. Idempotente: segura de ejecutar aunque ya se haya aplicado.

ALTER TABLE `plantillas` MODIFY COLUMN `codigo_primaria` VARCHAR(50) NULL DEFAULT NULL;

UPDATE `plantillas` p
  JOIN `temporadas` t ON t.id = p.id_temporada
  SET p.codigo_primaria = '1000120'
  WHERE t.nombre = '2026/2027' AND p.codigo_primaria IS NULL;
