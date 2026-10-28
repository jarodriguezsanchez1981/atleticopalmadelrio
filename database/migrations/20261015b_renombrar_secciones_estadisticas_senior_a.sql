-- Las Estadísticas son solo de la plantilla Senior A, así que el apartado y
-- cada sección pasan a llamarse "Estadísticas Senior A ...". En el menú lateral
-- el prefijo se recorta (sale "Equipo", "Tiempo"...); en Administración se ve el
-- nombre completo. Solo renombra (no toca permisos ni claves).
-- Idempotente: segura de ejecutar aunque ya se haya aplicado.

UPDATE `secciones` SET `nombre` = 'Estadísticas Senior A Equipo'        WHERE `clave` = 'estadisticas_equipo'        AND `nombre` <> 'Estadísticas Senior A Equipo';
UPDATE `secciones` SET `nombre` = 'Estadísticas Senior A Convocatorias' WHERE `clave` = 'estadisticas_convocatorias' AND `nombre` <> 'Estadísticas Senior A Convocatorias';
UPDATE `secciones` SET `nombre` = 'Estadísticas Senior A Tiempo'        WHERE `clave` = 'estadisticas_tiempo'        AND `nombre` <> 'Estadísticas Senior A Tiempo';
UPDATE `secciones` SET `nombre` = 'Estadísticas Senior A Goles'         WHERE `clave` = 'estadisticas_goles'         AND `nombre` <> 'Estadísticas Senior A Goles';
UPDATE `secciones` SET `nombre` = 'Estadísticas Senior A Sanciones'     WHERE `clave` = 'estadisticas_sanciones'     AND `nombre` <> 'Estadísticas Senior A Sanciones';
UPDATE `secciones` SET `nombre` = 'Estadísticas Senior A Clasificación' WHERE `clave` = 'estadisticas_clasificacion' AND `nombre` <> 'Estadísticas Senior A Clasificación';
