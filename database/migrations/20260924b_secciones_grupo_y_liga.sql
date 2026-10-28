-- Menú lateral dinámico: cada sección lleva ahora su "grupo" (a qué apartado
-- del menú pertenece: club/liga/competicion/admin), y el orden dentro de ese
-- grupo lo sigue dando secciones.orden (ya editable desde /secciones).
-- Se crea el grupo "Liga" (Jornadas, Partidos, Convocatorias, Sanciones), y se
-- desactiva por completo "Jugadores de Equipos" (equipos_jugadores): se borra
-- su fila de secciones (y los permisos de usuario que la referenciaban), así
-- que nadie puede verla ni editarla aunque conserve la URL. La tabla de datos
-- equipos_jugadores (jugadores de equipos rivales) NO se toca.
-- Idempotente: segura de ejecutar aunque ya se haya aplicado.

SET @grupo_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'secciones' AND COLUMN_NAME = 'grupo'
);
SET @add_col_sql = IF(@grupo_exists = 0,
  'ALTER TABLE `secciones` ADD COLUMN `grupo` VARCHAR(30) NULL AFTER `orden`',
  'SELECT 1 AS ok');
PREPARE add_col_stmt FROM @add_col_sql;
EXECUTE add_col_stmt;
DEALLOCATE PREPARE add_col_stmt;

UPDATE `secciones` SET `grupo` = 'club' WHERE `clave` IN (
  'plantillas', 'promociones', 'jugadores', 'entrenadores', 'delegados', 'coordinadores',
  'categorias', 'division', 'posicion', 'titulos', 'temporadas',
  'lugares', 'material', 'entrenamientos'
);

UPDATE `secciones` SET `grupo` = 'liga' WHERE `clave` IN (
  'categoria_calendario', 'partidos', 'convocatorias', 'sanciones'
);

UPDATE `secciones` SET `grupo` = 'competicion' WHERE `clave` IN (
  'torneo', 'equipos', 'informes'
);

UPDATE `secciones` SET `grupo` = 'admin' WHERE `clave` IN (
  'administracion', 'cambios'
);

-- Desactivar del todo "Jugadores de Equipos": fuera de secciones y de los
-- permisos de usuario que la referenciaban.
DELETE us FROM `usuario_secciones` us
  JOIN `secciones` s ON s.id = us.id_seccion
  WHERE s.clave = 'equipos_jugadores';
DELETE FROM `secciones` WHERE `clave` = 'equipos_jugadores';
