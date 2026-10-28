-- Añade la sección "Sanciones" al apartado de Estadísticas por categoría
-- (grupo estadisticas_cat), igual que la de Senior A pero de las plantillas de
-- Fútbol 11 de la temporada actual menos Senior A (que tiene su propio
-- apartado). Quien ya veía las Sanciones de Senior A recibe la nueva con los
-- mismos permisos (al entrenador de Senior A el frontend se la oculta). Al resto
-- se le asigna desde Administración.
-- Idempotente: segura de ejecutar aunque ya se haya aplicado.

INSERT IGNORE INTO `secciones` (`clave`, `nombre`, `icono`, `orden`, `grupo`) VALUES
  ('estadisticas_cat_sanciones', 'Estadísticas Sanciones', 'pi pi-ban', 99, 'estadisticas_cat');

INSERT IGNORE INTO `usuario_secciones` (`id_usuario`, `id_seccion`, `puede_ver`, `puede_editar`)
  SELECT us.`id_usuario`, nueva.`id`, us.`puede_ver`, us.`puede_editar`
  FROM `usuario_secciones` us
  JOIN `secciones` base ON base.`id` = us.`id_seccion` AND base.`clave` = 'estadisticas_sanciones'
  JOIN `secciones` nueva ON nueva.`clave` = 'estadisticas_cat_sanciones';
