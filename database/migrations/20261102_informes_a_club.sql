-- La sección Informes pasa del apartado "Competición" al apartado "Club" del
-- menú lateral. Solo se cambia el grupo; el orden dentro del grupo se mantiene
-- (98: al final de Club, editable en /secciones).
-- Idempotente.

UPDATE `secciones` SET `grupo` = 'club' WHERE `clave` = 'informes';
