-- Estadísticas Senior A → Próximo Rival: el siguiente partido de liga del
-- Senior A y las estadísticas de ese rival (goles, minutos y tarjetas de su
-- equipo y sus jugadores) con las actas de la liga ya copiadas. Quien ya veía
-- Estadísticas Senior A Rivales la recibe con los mismos permisos; al resto,
-- desde Administración.
-- Idempotente: segura de ejecutar aunque ya se haya aplicado.

INSERT IGNORE INTO `secciones` (`clave`, `nombre`, `icono`, `orden`, `grupo`) VALUES
  ('estadisticas_proximo_rival', 'Estadísticas Senior A Próximo Rival', 'pi pi-forward', 102, 'estadisticas');

INSERT IGNORE INTO `usuario_secciones` (`id_usuario`, `id_seccion`, `puede_ver`, `puede_editar`)
  SELECT us.`id_usuario`, nueva.`id`, us.`puede_ver`, us.`puede_editar`
  FROM `usuario_secciones` us
  JOIN `secciones` base ON base.`id` = us.`id_seccion` AND base.`clave` = 'estadisticas_rivales'
  JOIN `secciones` nueva ON nueva.`clave` = 'estadisticas_proximo_rival';
