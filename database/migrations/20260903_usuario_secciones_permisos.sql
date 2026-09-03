-- Añadir permisos por sección a usuario_secciones
ALTER TABLE `usuario_secciones`
  ADD COLUMN `puede_ver` TINYINT(1) NOT NULL DEFAULT 1 AFTER `id_seccion`,
  ADD COLUMN `puede_editar` TINYINT(1) NOT NULL DEFAULT 0 AFTER `puede_ver`;

-- Migrar datos existentes: todas las secciones del usuario heredan la visibilidad global
UPDATE `usuario_secciones` us
JOIN `usuarios` u ON u.id = us.id_usuario
SET us.puede_editar = (u.visibilidad = 'editar');

-- Quitar columna visibilidad de usuarios (ya no se usa)
ALTER TABLE `usuarios` DROP COLUMN `visibilidad`;
