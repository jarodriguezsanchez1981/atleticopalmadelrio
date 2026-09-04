-- MySQL dump 10.13  Distrib 8.0.46, for Linux (x86_64)
-- Host: localhost    Database: atletico_palma_intranet_dev
-- ------------------------------------------------------
-- Server version	8.0.46
-- Table structure for table `cambios`
DROP TABLE IF EXISTS `cambios`;
CREATE TABLE `cambios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `entidad` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `id_registro` int DEFAULT NULL,
  `accion` enum('crear','editar','eliminar') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `datos_previos` json DEFAULT NULL,
  `datos_nuevos` json DEFAULT NULL,
  `id_usuario` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cambios_entidad` (`entidad`),
  KEY `idx_cambios_usuario` (`id_usuario`),
  KEY `idx_cambios_created` (`created_at`),
  CONSTRAINT `fk_cambios_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB  DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Table structure for table `categorias`
DROP TABLE IF EXISTS `categorias`;
CREATE TABLE `categorias` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `id_entrenador` int DEFAULT NULL,
  `tiempopartido` int DEFAULT NULL,
  `tiempoentrenamiento` int DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `alias` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `id_tipofutbol` int NOT NULL,
  `orden` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_categorias_nombre` (`nombre`),
  UNIQUE KEY `nombre` (`nombre`),
  KEY `idx_categorias_entrenador` (`id_entrenador`),
  KEY `id_tipofutbol` (`id_tipofutbol`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Table structure for table `delegados`
DROP TABLE IF EXISTS `delegados`;
CREATE TABLE `delegados` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `apellidos` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `dni` varchar(15) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_nacimiento` date DEFAULT NULL,
  `foto` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `telefono` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tipo` enum('campo','equipo') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'campo',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `dni` (`dni`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Table structure for table `division`
DROP TABLE IF EXISTS `division`;
CREATE TABLE `division` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Table structure for table `entrenador_titulos`
DROP TABLE IF EXISTS `entrenador_titulos`;
CREATE TABLE `entrenador_titulos` (
  `id_entrenador` int NOT NULL,
  `id_titulo` int NOT NULL,
  PRIMARY KEY (`id_entrenador`,`id_titulo`),
  KEY `fk_et_titulo` (`id_titulo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Table structure for table `entrenadores`
DROP TABLE IF EXISTS `entrenadores`;
CREATE TABLE `entrenadores` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `apellidos` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `dni` varchar(15) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `foto` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `telefono` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `dni` (`dni`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Table structure for table `entrenamientos`
DROP TABLE IF EXISTS `entrenamientos`;
CREATE TABLE `entrenamientos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_plantilla` int NOT NULL,
  `fecha` datetime NOT NULL,
  `hasta` datetime DEFAULT NULL,
  `id_lugar` int NOT NULL,
  `id_usuario` int DEFAULT NULL,
  `recurrente` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_entrenamientos_fecha` (`fecha`),
  KEY `idx_entrenamientos_lugar` (`id_lugar`),
  KEY `idx_entrenamientos_usuario` (`id_usuario`),
  KEY `fk_entrenamientos_plantilla` (`id_plantilla`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Table structure for table `equipos`
DROP TABLE IF EXISTS `equipos`;
CREATE TABLE `equipos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `escudo` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `direccion` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `codigopostal` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `localidad` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `provincia` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `camiseta` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `calzonas` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `medias` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_equipos_nombre` (`nombre`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Table structure for table `equipos_jugadores`
DROP TABLE IF EXISTS `equipos_jugadores`;
CREATE TABLE `equipos_jugadores` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_equipo` int NOT NULL,
  `id_categoria` int NOT NULL,
  `nombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `apellidos` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_equipos_jugadores_equipo` (`id_equipo`),
  KEY `idx_equipos_jugadores_categoria` (`id_categoria`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Table structure for table `jornada_jugadores`
DROP TABLE IF EXISTS `jornada_jugadores`;
CREATE TABLE `jornada_jugadores` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_jornada` int NOT NULL,
  `id_jugador` int DEFAULT NULL,
  `id_equipo_jugador` int DEFAULT NULL,
  `es_local` tinyint(1) NOT NULL DEFAULT '1',
  `tarjeta_amarilla` int NOT NULL DEFAULT '0',
  `tarjeta_roja` int NOT NULL DEFAULT '0',
  `goles` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_jj` (`id_jornada`,`id_jugador`,`es_local`),
  KEY `fk_jj_jugador` (`id_jugador`),
  KEY `fk_jj_equipo_jugador` (`id_equipo_jugador`),
  CONSTRAINT `fk_jj_equipo_jugador` FOREIGN KEY (`id_equipo_jugador`) REFERENCES `equipos_jugadores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_jj_jornada` FOREIGN KEY (`id_jornada`) REFERENCES `jornadas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_jj_jugador` FOREIGN KEY (`id_jugador`) REFERENCES `jugadores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB  DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Table structure for table `jornadas`
DROP TABLE IF EXISTS `jornadas`;
CREATE TABLE `jornadas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_plantilla` int NOT NULL,
  `id_equipo_local` int NOT NULL,
  `id_equipo_visitante` int NOT NULL,
  `jornada` int NOT NULL,
  `fecha` date NOT NULL,
  `hora` time DEFAULT NULL,
  `incidencias` text COLLATE utf8mb4_unicode_ci,
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_cc_equipo_local` (`id_equipo_local`),
  KEY `fk_cc_equipo_visitante` (`id_equipo_visitante`),
  KEY `idx_cc_fecha` (`fecha`),
  KEY `idx_cc_jornada` (`jornada`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Table structure for table `jugadores`
DROP TABLE IF EXISTS `jugadores`;
CREATE TABLE `jugadores` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `apellidos` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `dni` varchar(15) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_nacimiento` date DEFAULT NULL,
  `foto` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `telefono` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `dni` (`dni`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Table structure for table `lugar_tipofutbol`
DROP TABLE IF EXISTS `lugar_tipofutbol`;
CREATE TABLE `lugar_tipofutbol` (
  `id_lugar` int NOT NULL,
  `id_tipofutbol` int NOT NULL,
  PRIMARY KEY (`id_lugar`,`id_tipofutbol`),
  KEY `fk_lt_tipo` (`id_tipofutbol`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Table structure for table `lugares`
DROP TABLE IF EXISTS `lugares`;
CREATE TABLE `lugares` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Table structure for table `partidos`
DROP TABLE IF EXISTS `partidos`;
CREATE TABLE `partidos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_plantilla` int NOT NULL,
  `fecha` datetime NOT NULL,
  `id_lugar` int DEFAULT NULL,
  `id_equipo_local` int NOT NULL,
  `id_equipo_visitante` int NOT NULL,
  `id_usuario` int DEFAULT NULL,
  `incidencias` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_partidos_fecha` (`fecha`),
  KEY `idx_partidos_lugar` (`id_lugar`),
  KEY `idx_partidos_usuario` (`id_usuario`),
  KEY `fk_partidos_plantilla` (`id_plantilla`),
  KEY `idx_partidos_equipo_local` (`id_equipo_local`),
  KEY `idx_partidos_equipo_visitante` (`id_equipo_visitante`),
  CONSTRAINT `fk_partidos_equipo_local` FOREIGN KEY (`id_equipo_local`) REFERENCES `equipos` (`id`),
  CONSTRAINT `fk_partidos_equipo_visitante` FOREIGN KEY (`id_equipo_visitante`) REFERENCES `equipos` (`id`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Table structure for table `plantilla_delegados`
DROP TABLE IF EXISTS `plantilla_delegados`;
CREATE TABLE `plantilla_delegados` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_plantilla` int NOT NULL,
  `id_delegado` int NOT NULL,
  `rol` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'delegado',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_plantilla_delegado` (`id_plantilla`,`id_delegado`),
  KEY `fk_pd_plantilla` (`id_plantilla`),
  KEY `fk_pd_delegado` (`id_delegado`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Table structure for table `plantilla_entrenadores`
DROP TABLE IF EXISTS `plantilla_entrenadores`;
CREATE TABLE `plantilla_entrenadores` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_plantilla` int NOT NULL,
  `id_entrenador` int NOT NULL,
  `rol` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'principal',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_plantilla_entrenador` (`id_plantilla`,`id_entrenador`),
  KEY `fk_pe_plantilla` (`id_plantilla`),
  KEY `fk_pe_entrenador` (`id_entrenador`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Table structure for table `plantilla_jugador_posiciones`
DROP TABLE IF EXISTS `plantilla_jugador_posiciones`;
CREATE TABLE `plantilla_jugador_posiciones` (
  `id_plantilla_jugador` int NOT NULL,
  `id_posicion` int NOT NULL,
  PRIMARY KEY (`id_plantilla_jugador`,`id_posicion`),
  KEY `fk_pjp_posicion` (`id_posicion`),
  CONSTRAINT `fk_pjp_miembro` FOREIGN KEY (`id_plantilla_jugador`) REFERENCES `plantilla_jugadores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_pjp_posicion` FOREIGN KEY (`id_posicion`) REFERENCES `posicion` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Table structure for table `plantilla_jugadores`
DROP TABLE IF EXISTS `plantilla_jugadores`;
CREATE TABLE `plantilla_jugadores` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_plantilla` int NOT NULL,
  `id_jugador` int NOT NULL,
  `dorsal` int DEFAULT NULL,
  `titular` tinyint(1) NOT NULL DEFAULT '0',
  `promocion` tinyint(1) NOT NULL DEFAULT '0',
  `talla` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_plantilla_jugador` (`id_plantilla`,`id_jugador`),
  KEY `fk_pj_plantilla` (`id_plantilla`),
  KEY `fk_pj_jugador` (`id_jugador`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Table structure for table `plantillas`
DROP TABLE IF EXISTS `plantillas`;
CREATE TABLE `plantillas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_categoria` int NOT NULL,
  `id_jugador` int DEFAULT NULL,
  `id_entrenador` int DEFAULT NULL,
  `id_delegado` int DEFAULT NULL,
  `id_division` int DEFAULT NULL,
  `id_temporada` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_plantillas_categoria` (`id_categoria`),
  KEY `idx_plantillas_temporada` (`id_temporada`),
  KEY `idx_plantillas_jugador` (`id_jugador`),
  KEY `idx_plantillas_entrenador` (`id_entrenador`),
  KEY `idx_plantillas_delegado` (`id_delegado`),
  KEY `idx_plantillas_division` (`id_division`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Table structure for table `posicion`
DROP TABLE IF EXISTS `posicion`;
CREATE TABLE `posicion` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `alias` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Table structure for table `promociones`
DROP TABLE IF EXISTS `promociones`;
CREATE TABLE `promociones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_plantilla` int NOT NULL,
  `id_categoria` int NOT NULL,
  `id_jugador` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_promocion_plantilla_jugador` (`id_plantilla`,`id_jugador`),
  KEY `fk_promocion_plantilla` (`id_plantilla`),
  KEY `fk_promocion_categoria` (`id_categoria`),
  KEY `fk_promocion_jugador` (`id_jugador`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Table structure for table `resultados`
DROP TABLE IF EXISTS `resultados`;
CREATE TABLE `resultados` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_partido` int NOT NULL,
  `resultado` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `incidencias` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id_partido` (`id_partido`),
  KEY `idx_resultados_partido` (`id_partido`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Table structure for table `sanciones`
DROP TABLE IF EXISTS `sanciones`;
CREATE TABLE `sanciones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_partido` int NOT NULL,
  `id_jugador` int NOT NULL,
  `amarilla` int NOT NULL DEFAULT '0',
  `roja` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sanciones_partido` (`id_partido`),
  KEY `idx_sanciones_jugador` (`id_jugador`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Table structure for table `schema_migrations`
DROP TABLE IF EXISTS `schema_migrations`;
CREATE TABLE `schema_migrations` (
  `version` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `applied_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`version`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Table structure for table `secciones`
DROP TABLE IF EXISTS `secciones`;
CREATE TABLE `secciones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `clave` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `icono` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `orden` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `clave` (`clave`),
  UNIQUE KEY `uq_secciones_nombre` (`nombre`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Table structure for table `temporadas`
DROP TABLE IF EXISTS `temporadas`;
CREATE TABLE `temporadas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Table structure for table `tipofutbol`
DROP TABLE IF EXISTS `tipofutbol`;
CREATE TABLE `tipofutbol` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Table structure for table `titulo`
DROP TABLE IF EXISTS `titulo`;
CREATE TABLE `titulo` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Table structure for table `torneo`
DROP TABLE IF EXISTS `torneo`;
CREATE TABLE `torneo` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_plantilla` int NOT NULL,
  `id_equipo` int NOT NULL,
  `nombre` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha` date NOT NULL,
  `hora` time DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_torneo_plantilla` (`id_plantilla`),
  KEY `idx_torneo_equipo` (`id_equipo`),
  CONSTRAINT `fk_torneo_equipo` FOREIGN KEY (`id_equipo`) REFERENCES `equipos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_torneo_plantilla` FOREIGN KEY (`id_plantilla`) REFERENCES `plantillas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB  DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Table structure for table `usuario_secciones`
DROP TABLE IF EXISTS `usuario_secciones`;
CREATE TABLE `usuario_secciones` (
  `id_usuario` int NOT NULL,
  `id_seccion` int NOT NULL,
  `puede_ver` tinyint(1) NOT NULL DEFAULT '1',
  `puede_editar` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_usuario`,`id_seccion`),
  KEY `fk_us_seccion` (`id_seccion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Table structure for table `usuarios`
DROP TABLE IF EXISTS `usuarios`;
CREATE TABLE `usuarios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `usuario` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `apellidos` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `rol` enum('coordinador','entrenador') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'coordinador',
  `id_categoria` int DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `usuario` (`usuario`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Dump completed on 2026-09-04 13:26:56
