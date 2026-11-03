-- Estadísticas (por categoría) → Próximo Rival: lo mismo que en Estadísticas
-- Senior A pero de la categoría del entrenador (o la que elija el coordinador),
-- con las actas de la liga de todas las categorías (copia ampliada a todas el
-- 03/11/2026). Quien ya veía Estadísticas Clasificación por categoría la
-- recibe con los mismos permisos; al resto, desde Administración.
-- Idempotente: segura de ejecutar aunque ya se haya aplicado.

INSERT IGNORE INTO `secciones` (`clave`, `nombre`, `icono`, `orden`, `grupo`) VALUES
  ('estadisticas_cat_proximo_rival', 'Estadísticas Próximo Rival', 'pi pi-forward', 101, 'estadisticas_cat');

INSERT IGNORE INTO `usuario_secciones` (`id_usuario`, `id_seccion`, `puede_ver`, `puede_editar`)
  SELECT us.`id_usuario`, nueva.`id`, us.`puede_ver`, us.`puede_editar`
  FROM `usuario_secciones` us
  JOIN `secciones` base ON base.`id` = us.`id_seccion` AND base.`clave` = 'estadisticas_cat_clasificacion'
  JOIN `secciones` nueva ON nueva.`clave` = 'estadisticas_cat_proximo_rival';
