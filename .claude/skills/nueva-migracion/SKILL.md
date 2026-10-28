---
name: nueva-migracion
description: Crear una migración de esquema idempotente en database/migrations y actualizar el modelo Sequelize y los mocks de tests. Usar al añadir tablas o columnas.
---

# Nueva migración

1. Nombre: `database/migrations/AAAAMMDD[letra]_descripcion.sql` con la fecha de hoy; si ya hay una ese día, añadir letra (`b`, `c`…) para que el orden alfabético sea el de aplicación.
2. Cabecera con comentario en español: qué hace y por qué; "Idempotente: segura de ejecutar aunque ya se haya aplicado."
3. Columnas nuevas, con comprobación en `INFORMATION_SCHEMA`:

```sql
SET @existe = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '<tabla>' AND COLUMN_NAME = '<columna>'
);
SET @sql = IF(@existe = 0,
  'ALTER TABLE `<tabla>` ADD COLUMN `<columna>` INT NULL AFTER `<otra>`',
  'SELECT 1 AS ok');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
```

   Tablas nuevas: `CREATE TABLE IF NOT EXISTS … ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`, con FKs e índices.
4. Actualizar el modelo en `backend/src/models/` (y `index.js` si es nuevo, con asociaciones) y, si es modelo nuevo, `backend/tests/helpers/models.js`.
5. Añadir el campo a los `attributes` de los controladores que lo deban devolver.
6. Nunca modificar una migración ya desplegada: crear otra.
7. Desplegar con `/desplegar`; la migración se aplica sola al arrancar el backend.
