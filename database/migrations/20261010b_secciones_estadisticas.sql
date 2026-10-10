-- Estadísticas pasa a ser un apartado del menú (grupo "estadisticas") con una
-- sección por tabla: Equipo, Convocatorias, Tiempo, Goles y Sanciones. Quien
-- tenía la sección "Estadísticas" recibe las cinco con los mismos permisos, y
-- después se borra la sección antigua (y sus permisos).
-- Idempotente: segura de ejecutar aunque ya se haya aplicado.

INSERT IGNORE INTO `secciones` (`clave`, `nombre`, `icono`, `orden`, `grupo`) VALUES
  ('estadisticas_equipo', 'Estadísticas Equipo', 'pi pi-shield', 95, 'estadisticas'),
  ('estadisticas_convocatorias', 'Estadísticas Convocatorias', 'pi pi-list-check', 96, 'estadisticas'),
  ('estadisticas_tiempo', 'Estadísticas Tiempo', 'pi pi-stopwatch', 97, 'estadisticas'),
  ('estadisticas_goles', 'Estadísticas Goles', 'pi pi-bullseye', 98, 'estadisticas'),
  ('estadisticas_sanciones', 'Estadísticas Sanciones', 'pi pi-ban', 99, 'estadisticas');

INSERT IGNORE INTO `usuario_secciones` (`id_usuario`, `id_seccion`, `puede_ver`, `puede_editar`)
  SELECT us.`id_usuario`, nueva.`id`, us.`puede_ver`, us.`puede_editar`
  FROM `usuario_secciones` us
  JOIN `secciones` antigua ON antigua.`id` = us.`id_seccion` AND antigua.`clave` = 'estadisticas'
  JOIN `secciones` nueva ON nueva.`grupo` = 'estadisticas' AND nueva.`clave` LIKE 'estadisticas\_%';

DELETE us FROM `usuario_secciones` us
  JOIN `secciones` s ON s.`id` = us.`id_seccion`
  WHERE s.`clave` = 'estadisticas';
DELETE FROM `secciones` WHERE `clave` = 'estadisticas';
