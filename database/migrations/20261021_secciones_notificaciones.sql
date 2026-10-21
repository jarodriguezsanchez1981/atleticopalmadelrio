-- Notificaciones: submenú dentro del apartado "Club" con tres secciones que
-- generan documentos PDF del club (Invitación Torneo, Nota Prensa, Nota
-- Informativa). No tienen API propia; solo controlan la visibilidad en el menú.
-- Quien ya tiene la sección "Administración" recibe las tres con sus mismos
-- permisos; al resto se le asignan desde Administración.
-- Idempotente: segura de ejecutar aunque ya se haya aplicado.

INSERT IGNORE INTO `secciones` (`clave`, `nombre`, `icono`, `orden`, `grupo`) VALUES
  ('invitacion_torneo', 'Invitación Torneo', 'pi pi-envelope', 10, 'notificaciones'),
  ('nota_prensa', 'Nota Prensa', 'pi pi-megaphone', 20, 'notificaciones'),
  ('nota_informativa', 'Nota Informativa', 'pi pi-info-circle', 30, 'notificaciones');

INSERT IGNORE INTO `usuario_secciones` (`id_usuario`, `id_seccion`, `puede_ver`, `puede_editar`)
  SELECT us.`id_usuario`, nueva.`id`, us.`puede_ver`, us.`puede_editar`
  FROM `usuario_secciones` us
  JOIN `secciones` base ON base.`id` = us.`id_seccion` AND base.`clave` = 'administracion'
  JOIN `secciones` nueva ON nueva.`grupo` = 'notificaciones';
