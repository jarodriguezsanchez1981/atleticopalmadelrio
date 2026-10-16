-- Un delegado puede ser de campo y de equipo a la vez: se añade 'ambos' al tipo.
-- Idempotente: MODIFY deja la columna con el ENUM ampliado (seguro de repetir).

ALTER TABLE `delegados`
  MODIFY COLUMN `tipo` ENUM('campo', 'equipo', 'ambos') NOT NULL DEFAULT 'campo';
