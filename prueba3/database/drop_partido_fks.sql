-- Eliminar FKs y columnas obsoletas de la tabla partidos
-- Ejecutar después de actualizar los modelos

-- Eliminar FK hacia jornadas
ALTER TABLE `partidos` DROP FOREIGN KEY `fk_partidos_jornada`;

-- Eliminar FK hacia categorias
ALTER TABLE `partidos` DROP FOREIGN KEY `fk_partidos_categoria`;

-- Eliminar columnas
ALTER TABLE `partidos` DROP COLUMN `id_categoria`, DROP COLUMN `id_jornada`;

-- Eliminar índices asociados
ALTER TABLE `partidos` DROP INDEX `idx_partidos_categoria`, DROP INDEX `idx_partidos_jornada`;