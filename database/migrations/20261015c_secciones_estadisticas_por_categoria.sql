-- Nuevo apartado "Estadísticas" (grupo estadisticas_cat), aparte del de Senior
-- A, con dos secciones: Convocatorias y Goles. Muestran los datos de la
-- categoría de cada usuario (no solo Senior A). Quien ya veía las Convocatorias
-- / Goles de Senior A recibe las nuevas con los mismos permisos (coordinadores
-- las ven con un selector de plantilla; al entrenador de Senior A el frontend se
-- las oculta porque ya tiene su propio apartado). Al resto de entrenadores se
-- les asigna el permiso desde Administración.
-- Idempotente: segura de ejecutar aunque ya se haya aplicado.

INSERT IGNORE INTO `secciones` (`clave`, `nombre`, `icono`, `orden`, `grupo`) VALUES
  ('estadisticas_cat_convocatorias', 'Estadísticas Convocatorias', 'pi pi-list-check', 96, 'estadisticas_cat'),
  ('estadisticas_cat_goles', 'Estadísticas Goles', 'pi pi-bullseye', 98, 'estadisticas_cat');

-- Hereda los permisos de la sección equivalente de Senior A (Convocatorias y Goles).
INSERT IGNORE INTO `usuario_secciones` (`id_usuario`, `id_seccion`, `puede_ver`, `puede_editar`)
  SELECT us.`id_usuario`, nueva.`id`, us.`puede_ver`, us.`puede_editar`
  FROM `usuario_secciones` us
  JOIN `secciones` base ON base.`id` = us.`id_seccion`
  JOIN `secciones` nueva ON nueva.`clave` = CONCAT('estadisticas_cat_', SUBSTRING(base.`clave`, LENGTH('estadisticas_') + 1))
  WHERE base.`clave` IN ('estadisticas_convocatorias', 'estadisticas_goles');
