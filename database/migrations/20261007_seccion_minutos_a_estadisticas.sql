-- La sección "Minutos" pasa a llamarse "Estadísticas" (clave estadisticas).
-- Se renombra la misma fila para conservar los permisos de los usuarios
-- (usuario_secciones apunta al id). Idempotente.
UPDATE `secciones` SET `clave` = 'estadisticas', `nombre` = 'Estadísticas', `icono` = 'pi pi-chart-bar'
WHERE `clave` = 'minutos' AND NOT EXISTS (SELECT 1 FROM (SELECT `clave` FROM `secciones`) s WHERE s.`clave` = 'estadisticas');
