-- Migración: cambiar id_categoria por id_plantilla en entrenamientos y partidos
-- Ejecutar después de actualizar los modelos Sequelize

-- Para entrenamientos: crear columna id_plantilla y migrar datos
-- Nota: esto requiere mapear cada categoría a una plantilla existente
-- Por simplicidad, usamos la primera plantilla de cada categoría/temporada

-- Añadir columna id_plantilla a entrenamientos
ALTER TABLE `entrenamientos` 
ADD COLUMN `id_plantilla` int DEFAULT NULL AFTER `id`,
ADD KEY `fk_entrenamientos_plantilla` (`id_plantilla`);

-- Añadir columna id_plantilla a partidos  
ALTER TABLE `partidos`
ADD COLUMN `id_plantilla` int DEFAULT NULL AFTER `id`,
ADD KEY `fk_partidos_plantilla` (`id_plantilla`);

-- Actualizar entrenamientos: asignar primera plantilla de cada categoría
UPDATE `entrenamientos` e
JOIN `plantillas` p ON p.id_categoria = e.id_categoria
SET e.id_plantilla = p.id
WHERE e.id_plantilla IS NULL;

-- Actualizar partidos: asignar primera plantilla de cada categoría
UPDATE `partidos` pa
JOIN `plantillas` p ON p.id_categoria = pa.id_categoria
SET pa.id_plantilla = p.id
WHERE pa.id_plantilla IS NULL;

-- Hacer id_plantilla NOT NULL después de la migración
ALTER TABLE `entrenamientos` MODIFY `id_plantilla` int NOT NULL;
ALTER TABLE `partidos` MODIFY `id_plantilla` int NOT NULL;

-- Eliminar columna id_categoria (opcional - descomentar cuando se verifique que todo funciona)
-- ALTER TABLE `entrenamientos` DROP COLUMN `id_categoria`, DROP KEY `fk_entrenamientos_categoria`;
-- ALTER TABLE `partidos` DROP COLUMN `id_categoria`, DROP KEY `fk_partidos_categoria`;
