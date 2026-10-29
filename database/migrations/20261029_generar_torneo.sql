-- Sección "Generar Torneo" (apartado Club): torneos de Fútbol 7 que organiza
-- el club. Cada torneo tiene una o varias categorías, cada una un torneo
-- independiente (sus equipos, grupos A/B o todos contra todos, semifinales y
-- finales de Oro y Plata). Los partidos NO se guardan: el frontend los calcula
-- a partir de estos datos (utils/generarTorneo.js) para la vista previa y el PDF.
-- Quien ya tiene la sección "Torneo" recibe la nueva con los mismos permisos.
-- Idempotente: segura de ejecutar aunque ya se haya aplicado.

CREATE TABLE IF NOT EXISTS `torneos_generados` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(150) NOT NULL,
  `fecha` DATE NOT NULL,
  `observaciones` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Una fila por categoría del torneo. `campos`: claves de los campos elegidos
-- (anexo1, anexo2, estadio1, estadio2). hora_fin es solo informativa.
CREATE TABLE IF NOT EXISTS `torneo_generado_categorias` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `id_torneo_generado` INT NOT NULL,
  `id_categoria` INT NOT NULL,
  `hora_inicio` TIME NOT NULL,
  `hora_fin` TIME NULL,
  `duracion_min` INT NOT NULL,
  `descanso_min` INT NOT NULL DEFAULT 0,
  `campos` JSON NOT NULL,
  `formato` ENUM('liga','grupos') NOT NULL,
  `semifinales` TINYINT(1) NOT NULL DEFAULT 0,
  `final_oro` TINYINT(1) NOT NULL DEFAULT 0,
  `final_plata` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_tgc_torneo_categoria` (`id_torneo_generado`, `id_categoria`),
  KEY `idx_tgc_categoria` (`id_categoria`),
  CONSTRAINT `fk_tgc_torneo` FOREIGN KEY (`id_torneo_generado`) REFERENCES `torneos_generados` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_tgc_categoria` FOREIGN KEY (`id_categoria`) REFERENCES `categorias` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inscripciones: un mismo equipo puede entrar varias veces con nombres
-- distintos (p. ej. "PALMA A" y "PALMA B"). grupo NULL en todos contra todos.
CREATE TABLE IF NOT EXISTS `torneo_generado_equipos` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `id_torneo_generado_categoria` INT NOT NULL,
  `id_equipo` INT NOT NULL,
  `nombre` VARCHAR(150) NOT NULL,
  `grupo` ENUM('A','B') NULL,
  `orden` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_tge_categoria_nombre` (`id_torneo_generado_categoria`, `nombre`),
  KEY `idx_tge_equipo` (`id_equipo`),
  CONSTRAINT `fk_tge_categoria` FOREIGN KEY (`id_torneo_generado_categoria`) REFERENCES `torneo_generado_categorias` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_tge_equipo` FOREIGN KEY (`id_equipo`) REFERENCES `equipos` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `secciones` (`clave`, `nombre`, `icono`, `orden`, `grupo`) VALUES
  ('generar_torneo', 'Generar Torneo', 'pi pi-sitemap', 58, 'club');

INSERT IGNORE INTO `usuario_secciones` (`id_usuario`, `id_seccion`, `puede_ver`, `puede_editar`)
  SELECT us.`id_usuario`, nueva.`id`, us.`puede_ver`, us.`puede_editar`
  FROM `usuario_secciones` us
  JOIN `secciones` base ON base.`id` = us.`id_seccion` AND base.`clave` = 'torneo'
  JOIN `secciones` nueva ON nueva.`clave` = 'generar_torneo';
