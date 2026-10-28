-- La sección Promociones pasa del apartado "Club" al apartado "Liga" del menú
-- lateral (junto a Partidos y Convocatorias, desde donde se crean). Solo se
-- cambia el grupo; el orden dentro del grupo se mantiene (editable en /secciones).
-- Idempotente.

UPDATE `secciones` SET `grupo` = 'liga' WHERE `clave` = 'promociones';
