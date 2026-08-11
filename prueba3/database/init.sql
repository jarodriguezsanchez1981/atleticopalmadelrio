-- MySQL dump 10.13  Distrib 8.0.46, for Linux (x86_64)
--
-- Host: localhost    Database: atletico_palma_intranet
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Current Database: `atletico_palma_intranet`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `atletico_palma_intranet` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;

USE `atletico_palma_intranet`;

--
-- Table structure for table `categorias`
--

DROP TABLE IF EXISTS `categorias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categorias` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `id_temporada` int NOT NULL,
  `id_entrenador` int DEFAULT NULL,
  `id_delegado` int DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_categoria_temporada` (`nombre`,`id_temporada`),
  UNIQUE KEY `uq_categorias_nombre` (`nombre`),
  UNIQUE KEY `nombre` (`nombre`),
  UNIQUE KEY `nombre_2` (`nombre`),
  UNIQUE KEY `nombre_3` (`nombre`),
  UNIQUE KEY `nombre_4` (`nombre`),
  UNIQUE KEY `nombre_5` (`nombre`),
  UNIQUE KEY `nombre_6` (`nombre`),
  UNIQUE KEY `nombre_7` (`nombre`),
  UNIQUE KEY `nombre_8` (`nombre`),
  UNIQUE KEY `nombre_9` (`nombre`),
  UNIQUE KEY `nombre_10` (`nombre`),
  UNIQUE KEY `nombre_11` (`nombre`),
  UNIQUE KEY `nombre_12` (`nombre`),
  UNIQUE KEY `nombre_13` (`nombre`),
  UNIQUE KEY `nombre_14` (`nombre`),
  UNIQUE KEY `nombre_15` (`nombre`),
  UNIQUE KEY `nombre_16` (`nombre`),
  UNIQUE KEY `nombre_17` (`nombre`),
  KEY `idx_categorias_entrenador` (`id_entrenador`),
  KEY `idx_categorias_temporada` (`id_temporada`),
  KEY `idx_categorias_delegado` (`id_delegado`),
  CONSTRAINT `categorias_ibfk_49` FOREIGN KEY (`id_temporada`) REFERENCES `temporadas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `categorias_ibfk_50` FOREIGN KEY (`id_entrenador`) REFERENCES `entrenadores` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `categorias_ibfk_51` FOREIGN KEY (`id_delegado`) REFERENCES `delegados` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categorias`
--

LOCK TABLES `categorias` WRITE;
/*!40000 ALTER TABLE `categorias` DISABLE KEYS */;
INSERT INTO `categorias` VALUES (4,'Prebenjamin A',2,NULL,NULL,'2026-08-07 23:19:56','2026-08-07 23:25:15');
/*!40000 ALTER TABLE `categorias` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `delegados`
--

DROP TABLE IF EXISTS `delegados`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `delegados` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `apellidos` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dni` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `foto` longtext COLLATE utf8mb4_unicode_ci,
  `tipo` enum('campo','equipo') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'campo',
  `id_categoria` int DEFAULT NULL,
  `id_temporada` int NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `dni` (`dni`),
  UNIQUE KEY `dni_2` (`dni`),
  UNIQUE KEY `dni_3` (`dni`),
  UNIQUE KEY `dni_4` (`dni`),
  UNIQUE KEY `dni_5` (`dni`),
  UNIQUE KEY `dni_6` (`dni`),
  UNIQUE KEY `dni_7` (`dni`),
  UNIQUE KEY `dni_8` (`dni`),
  UNIQUE KEY `dni_9` (`dni`),
  UNIQUE KEY `dni_10` (`dni`),
  UNIQUE KEY `dni_11` (`dni`),
  UNIQUE KEY `dni_12` (`dni`),
  UNIQUE KEY `dni_13` (`dni`),
  UNIQUE KEY `dni_14` (`dni`),
  UNIQUE KEY `dni_15` (`dni`),
  UNIQUE KEY `dni_16` (`dni`),
  UNIQUE KEY `dni_17` (`dni`),
  UNIQUE KEY `dni_18` (`dni`),
  KEY `idx_delegados_categoria` (`id_categoria`),
  KEY `idx_delegados_temporada` (`id_temporada`),
  CONSTRAINT `delegados_ibfk_33` FOREIGN KEY (`id_categoria`) REFERENCES `categorias` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `delegados_ibfk_34` FOREIGN KEY (`id_temporada`) REFERENCES `temporadas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `delegados`
--

LOCK TABLES `delegados` WRITE;
/*!40000 ALTER TABLE `delegados` DISABLE KEYS */;
/*!40000 ALTER TABLE `delegados` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `entrenador_categorias`
--

DROP TABLE IF EXISTS `entrenador_categorias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `entrenador_categorias` (
  `id_entrenador` int NOT NULL,
  `id_categoria` int NOT NULL,
  PRIMARY KEY (`id_entrenador`,`id_categoria`),
  KEY `fk_ec_categoria` (`id_categoria`),
  CONSTRAINT `fk_ec_categoria` FOREIGN KEY (`id_categoria`) REFERENCES `categorias` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_ec_entrenador` FOREIGN KEY (`id_entrenador`) REFERENCES `entrenadores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `entrenador_categorias`
--

LOCK TABLES `entrenador_categorias` WRITE;
/*!40000 ALTER TABLE `entrenador_categorias` DISABLE KEYS */;
/*!40000 ALTER TABLE `entrenador_categorias` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `entrenador_titulos`
--

DROP TABLE IF EXISTS `entrenador_titulos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `entrenador_titulos` (
  `id_entrenador` int NOT NULL,
  `id_titulo` int NOT NULL,
  PRIMARY KEY (`id_entrenador`,`id_titulo`),
  KEY `fk_et_titulo` (`id_titulo`),
  CONSTRAINT `fk_et_entrenador` FOREIGN KEY (`id_entrenador`) REFERENCES `entrenadores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_et_titulo` FOREIGN KEY (`id_titulo`) REFERENCES `titulo` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `entrenador_titulos`
--

LOCK TABLES `entrenador_titulos` WRITE;
/*!40000 ALTER TABLE `entrenador_titulos` DISABLE KEYS */;
/*!40000 ALTER TABLE `entrenador_titulos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `entrenadores`
--

DROP TABLE IF EXISTS `entrenadores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `entrenadores` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `apellidos` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dni` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `foto` longtext COLLATE utf8mb4_unicode_ci,
  `id_temporada` int NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `dni` (`dni`),
  UNIQUE KEY `dni_2` (`dni`),
  UNIQUE KEY `dni_3` (`dni`),
  UNIQUE KEY `dni_4` (`dni`),
  UNIQUE KEY `dni_5` (`dni`),
  UNIQUE KEY `dni_6` (`dni`),
  UNIQUE KEY `dni_7` (`dni`),
  UNIQUE KEY `dni_8` (`dni`),
  UNIQUE KEY `dni_9` (`dni`),
  UNIQUE KEY `dni_10` (`dni`),
  UNIQUE KEY `dni_11` (`dni`),
  UNIQUE KEY `dni_12` (`dni`),
  UNIQUE KEY `dni_13` (`dni`),
  UNIQUE KEY `dni_14` (`dni`),
  UNIQUE KEY `dni_15` (`dni`),
  UNIQUE KEY `dni_16` (`dni`),
  UNIQUE KEY `dni_17` (`dni`),
  UNIQUE KEY `dni_18` (`dni`),
  KEY `idx_entrenadores_temporada` (`id_temporada`),
  CONSTRAINT `entrenadores_ibfk_1` FOREIGN KEY (`id_temporada`) REFERENCES `temporadas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `entrenadores`
--

LOCK TABLES `entrenadores` WRITE;
/*!40000 ALTER TABLE `entrenadores` DISABLE KEYS */;
/*!40000 ALTER TABLE `entrenadores` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `entrenamientos`
--

DROP TABLE IF EXISTS `entrenamientos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `entrenamientos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_categoria` int NOT NULL,
  `fecha` datetime NOT NULL,
  `hasta` datetime DEFAULT NULL,
  `id_lugar` int NOT NULL,
  `id_usuario` int DEFAULT NULL,
  `recurrente` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_entrenamientos_categoria` (`id_categoria`),
  KEY `idx_entrenamientos_fecha` (`fecha`),
  KEY `idx_entrenamientos_lugar` (`id_lugar`),
  KEY `idx_entrenamientos_usuario` (`id_usuario`),
  CONSTRAINT `entrenamientos_ibfk_49` FOREIGN KEY (`id_categoria`) REFERENCES `categorias` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `entrenamientos_ibfk_50` FOREIGN KEY (`id_lugar`) REFERENCES `lugares` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `entrenamientos_ibfk_51` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=64 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `entrenamientos`
--

LOCK TABLES `entrenamientos` WRITE;
/*!40000 ALTER TABLE `entrenamientos` DISABLE KEYS */;
/*!40000 ALTER TABLE `entrenamientos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `entrenamientos_jugadores`
--

DROP TABLE IF EXISTS `entrenamientos_jugadores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `entrenamientos_jugadores` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_entrenamiento` int NOT NULL,
  `id_jugador` int NOT NULL,
  `incidencias` text COLLATE utf8mb4_unicode_ci,
  `asistencia` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_etj_entrenamiento` (`id_entrenamiento`),
  KEY `idx_etj_jugador` (`id_jugador`),
  CONSTRAINT `entrenamientos_jugadores_ibfk_33` FOREIGN KEY (`id_entrenamiento`) REFERENCES `entrenamientos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `entrenamientos_jugadores_ibfk_34` FOREIGN KEY (`id_jugador`) REFERENCES `jugadores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `entrenamientos_jugadores`
--

LOCK TABLES `entrenamientos_jugadores` WRITE;
/*!40000 ALTER TABLE `entrenamientos_jugadores` DISABLE KEYS */;
/*!40000 ALTER TABLE `entrenamientos_jugadores` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `entrenamientos_semanales`
--

DROP TABLE IF EXISTS `entrenamientos_semanales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `entrenamientos_semanales` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_entrenamiento` int NOT NULL,
  `fecha_entrenamiento` datetime NOT NULL,
  `incidencias` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_es_entrenamiento` (`id_entrenamiento`),
  KEY `idx_es_fecha` (`fecha_entrenamiento`),
  CONSTRAINT `entrenamientos_semanales_ibfk_1` FOREIGN KEY (`id_entrenamiento`) REFERENCES `entrenamientos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `entrenamientos_semanales`
--

LOCK TABLES `entrenamientos_semanales` WRITE;
/*!40000 ALTER TABLE `entrenamientos_semanales` DISABLE KEYS */;
/*!40000 ALTER TABLE `entrenamientos_semanales` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `equipos`
--

DROP TABLE IF EXISTS `equipos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `equipos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `escudo` longtext COLLATE utf8mb4_unicode_ci,
  `direccion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_equipos_nombre` (`nombre`),
  UNIQUE KEY `nombre` (`nombre`),
  UNIQUE KEY `nombre_2` (`nombre`),
  UNIQUE KEY `nombre_3` (`nombre`),
  UNIQUE KEY `nombre_4` (`nombre`),
  UNIQUE KEY `nombre_5` (`nombre`),
  UNIQUE KEY `nombre_6` (`nombre`),
  UNIQUE KEY `nombre_7` (`nombre`),
  UNIQUE KEY `nombre_8` (`nombre`),
  UNIQUE KEY `nombre_9` (`nombre`),
  UNIQUE KEY `nombre_10` (`nombre`),
  UNIQUE KEY `nombre_11` (`nombre`),
  UNIQUE KEY `nombre_12` (`nombre`),
  UNIQUE KEY `nombre_13` (`nombre`),
  UNIQUE KEY `nombre_14` (`nombre`),
  UNIQUE KEY `nombre_15` (`nombre`),
  UNIQUE KEY `nombre_16` (`nombre`),
  UNIQUE KEY `nombre_17` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=73 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `equipos`
--

LOCK TABLES `equipos` WRITE;
/*!40000 ALTER TABLE `equipos` DISABLE KEYS */;
INSERT INTO `equipos` VALUES (1,'LUCECOR F.S.','2026-08-07 22:38:04','2026-08-07 22:38:04','https://escudosdefutbolyequipaciones.com/images_esc3/ESPA/ANDALUC%CDA/C%D3RDOBA/escudos_min/MIN_ESC_C.D.%20LUCECOR.png','Calle Fuentevieja 32, 14900 Lucena'),(2,'SPORTING DE BENAMEJI C.D.','2026-08-07 22:38:04','2026-08-07 22:38:04','https://escudosdefutbolyequipaciones.com/images_esc3/ESPA/ANDALUC%CDA/C%D3RDOBA/escudos_min/MIN_ESC_SPORTING%20BENAMEJ%CD.png','Campo Municipal, 14510 Benamejí'),(3,'CASTRO DEL RIO C.D.','2026-08-07 22:38:04','2026-08-07 22:38:04','https://escudosdefutbolyequipaciones.com/images_esc3/ESPA/ANDALUC%CDA/C%D3RDOBA/escudos_min/MIN_ESC_CASTRO%20DEL%20RIO%20C.D..png','Calle Galeras 15, 14840 Castro del Río'),(4,'C.D. PRIEGO C.F.','2026-08-07 22:38:04','2026-08-07 22:38:04','https://escudosdefutbolyequipaciones.com/images_esc3/ESPA/ANDALUC%CDA/C%D3RDOBA/escudos_min/MIN_ESC_PRIEGO%20C.F..png','Calle Solana 10, 14800 Priego de Córdoba'),(5,'C.D. RUTE CALIDAD C.F.','2026-08-07 22:38:04','2026-08-07 22:38:04','https://escudosdefutbolyequipaciones.com/images_esc3/ESPA/ANDALUC%CDA/C%D3RDOBA/escudos_min/MIN_ESC_C.D.%20RUTE%20CALIDAD%20C.F..png','Estadio Municipal Juan Félix Montes Onieva, 14960 Rute'),(6,'BAENENSE ATLETICO C.F.','2026-08-07 22:38:04','2026-08-07 22:38:04','https://escudosdefutbolyequipaciones.com/images_esc3/ESPA/ANDALUC%CDA/C%D3RDOBA/escudos_min/MIN_ESC_ATL%C9TICO%20BAENENSE%20C.F..png','Calle Salvador Muñoz 42, Ciudad Deportiva Municipal, 14850 Baena'),(7,'C.D. EGABRENSE FUTBOL BASE','2026-08-07 22:38:04','2026-08-07 22:38:04','https://escudosdefutbolyequipaciones.com/images_esc3/ESPA/ANDALUC%CDA/C%D3RDOBA/escudos_min/MIN_ESC_C.D.%20EGABRENSE.png','Avenida de Andalucía 77, 14940 Cabra'),(8,'C.D. APEDEM','2026-08-07 22:38:04','2026-08-07 22:38:04','https://escudosdefutbolyequipaciones.com/images_esc3/ESPA/ANDALUC%CDA/C%D3RDOBA/escudos_min/MIN_ESC_C.D.%20APEDEM.png','Estadio Municipal, 14550 Montilla'),(9,'FUNDACION LUCENA F.C.','2026-08-07 22:38:04','2026-08-07 22:38:04','https://escudosdefutbolyequipaciones.com/images_esc3/ESPA/ANDALUC%CDA/C%D3RDOBA/escudos_min/MIN_ESC_FUNDACI%D3N%20LUCENA%20C.F..png','Polígono Industrial Príncipe Felipe, Calle Toledo 5, 14900 Lucena'),(10,'ALMEDINILLA ATL.','2026-08-07 22:38:04','2026-08-07 22:38:04','https://escudosdefutbolyequipaciones.com/images_esc3/ESPA/ANDALUC%CDA/C%D3RDOBA/escudos_min/MIN_ESC_ALMEDINILLA%20ATL%C9TICO.png','Ronda de Andalucía 56, 14812 Almedinilla'),(11,'AGUILARENSE ATLETICO C.F.','2026-08-07 22:38:04','2026-08-07 22:38:04','https://escudosdefutbolyequipaciones.com/images_esc3/ESPA/ANDALUC%CDA/C%D3RDOBA/escudos_min/MIN_ESC_ATL%C9TICO%20AGUILARENSE%20C.F..png','Calle Nicolás Alberca 6, 14920 Aguilar de la Frontera'),(12,'MORILES C.F.','2026-08-07 22:38:04','2026-08-07 22:38:04','https://escudosdefutbolyequipaciones.com/images_esc3/ESPA/ANDALUC%CDA/C%D3RDOBA/escudos_min/MIN_ESC_MORILES%20C.F..png','Calle Alta 2, 14510 Moriles'),(13,'VILLA DE ESPEJO C.D.','2026-08-07 22:38:04','2026-08-07 22:38:04','https://escudosdefutbolyequipaciones.com/images_esc3/ESPA/ANDALUC%CDA/C%D3RDOBA/escudos_min/MIN_ESC_C.D.%20VILLA%20DE%20ESPEJO.png','Calle Maestro Clodoaldo Gracia s/n, 14830 Espejo'),(14,'LA RAMBLA A.D. DE FUTBOL BASE','2026-08-07 22:38:04','2026-08-07 22:38:04','https://escudosdefutbolyequipaciones.com/images_esc3/ESPA/ANDALUC%CDA/C%D3RDOBA/escudos_min/MIN_ESC_A.D.%20F.B.%20LA%20RAMBLA.png','Calle Calvario s/n, 14540 La Rambla'),(15,'C.D. ATLÉTICO MONTOREÑO','2026-08-07 22:38:04','2026-08-07 22:38:04','https://escudosdefutbolyequipaciones.com/images_esc3/ESPA/ANDALUC%CDA/C%D3RDOBA/escudos_min/MIN_ESC_C.%20ATL%C9TICO%20MONTORE%D1O.png','Avenida de Andalucía 10 (Casa de la Juventud), 14600 Montoro'),(16,'C.D. FUENTES FÚTBOL BASE','2026-08-07 22:38:04','2026-08-07 22:38:04','https://www.lapreferente.com/imagenes/escudos/escudo-14792.png','Plaza de la Magdalena, 12, Córdoba'),(17,'C.D. VILLARRUBIA','2026-08-07 22:38:04','2026-08-07 22:38:04','https://escudosdefutbolyequipaciones.com/images_esc3/ESPA/ANDALUC%CDA/C%D3RDOBA/escudos_min/MIN_ESC_C.D.%20VILLARRUBIA.png','Paseo de la Barquera 24, 14011 Córdoba (Villarrubia)'),(18,'C.D. GRANADAL FIGUEROA','2026-08-07 22:38:04','2026-08-07 22:38:04','https://cdgranadalfigueroa.com/wp-content/uploads/2017/08/club-figueroa-y-granadal-4.png','Calle Cantábrico 5M, 14011 Córdoba'),(19,'SENECA C.F.','2026-08-07 22:38:04','2026-08-07 22:38:04','https://www.lapreferente.com/imagenes/escudos/escudo-36.png','Instalaciones Deportivas Enrique Puga, Pasaje Platero Alcántara s/n, 14014 Córdoba'),(20,'A.D. DE FUTBOL BASE LA RAMBLA','2026-08-07 22:38:04','2026-08-07 22:38:04','https://www.lapreferente.com/imagenes/escudos/escudo-1353.png','C/ Calvario s/n, 14540 La Rambla (Córdoba)'),(21,'C.D. MONTALBEÑO','2026-08-07 22:38:04','2026-08-07 22:38:04','https://www.lapreferente.com/imagenes/escudos/escudo-273.png','C/ Jesús Rescatado, 4, 14548 Montalbán de Córdoba'),(22,'C.D. MONTEMAYOR ATLETICO','2026-08-07 22:38:04','2026-08-07 22:38:04','https://www.lapreferente.com/imagenes/escudos/escudo-2088.png','C/ Juan Pedro Carmona, 6, 14530 Montemayor'),(23,'C.D. SANTAELLA 2010','2026-08-07 22:38:04','2026-08-07 22:38:04','https://www.lapreferente.com/imagenes/escudos/escudo-2709.png','C/ Silos, 3, 14546 Santaella'),(24,'LA GUIJARROSA A.D.','2026-08-07 22:38:04','2026-08-07 22:38:04','https://www.lapreferente.com/imagenes/escudos/escudo-760.png','C/ La Redondela, 14, 14556 La Guijarrosa (Santaella)'),(25,'FERNAN NUÑEZ C.F.','2026-08-07 22:38:04','2026-08-07 22:38:04','https://www.lapreferente.com/imagenes/escudos/escudo-354.jpg','C/ Ramón y Cajal, 46, 14520 Fernán-Núñez'),(26,'C.D. LOS CALIFAS BALOMPIE','2026-08-07 22:38:04','2026-08-07 22:38:04','https://www.lapreferente.com/imagenes/escudos/escudo-8153.png','C/ José Dámaso Pepete s/n, Campo de Fútbol IMD Poniente, 14014 Córdoba'),(27,'APADEMAR','2026-08-07 22:38:04','2026-08-07 22:38:04','https://www.lapreferente.com/imagenes/escudos/escudo-937.png','IDM Fátima, Avda. Blas Infante s/n, 14012 Córdoba'),(28,'CORDOBA C.F.','2026-08-07 22:38:04','2026-08-07 22:38:04','https://statics-maker.llt-services.com/cor/images/2025/05/22/large/b7b8cfcb-24dc-42f6-9add-30735472b88d-406.png','Estadio Nuevo Arcángel, C/ José Ramón García Fernández, 14010 Córdoba'),(29,'PACO PRADAS C.D.','2026-08-07 22:38:04','2026-08-07 22:38:04','https://www.lapreferente.com/imagenes/escudos/escudo-4169.png','C/ Marroquíes, 7, 3º-2, Córdoba'),(30,'C.D. COLONIA DE FUENTE PALMERA','2026-08-07 22:38:04','2026-08-07 22:38:04','https://www.lapreferente.com/imagenes/escudos/escudo-39.png','C/ Barcelona, 32, 14120 Fuente Palmera'),(31,'ALMODOVAR DEL RIO C.F.','2026-08-07 22:38:04','2026-08-07 22:38:04','https://www.lapreferente.com/imagenes/escudos/escudo-810.png','Carretera del Pantano km 1, 14720 Almodóvar del Río'),(32,'R.U.D. LA CARLOTA','2026-08-07 22:38:04','2026-08-07 22:38:04','https://www.lapreferente.com/imagenes/escudos/escudo-261.png','Avda. del Deporte s/n, Piscina Cubierta, 14100 La Carlota'),(33,'S.D. SPORT CORDOBA LA SALLE','2026-08-07 22:38:04','2026-08-07 22:38:04','https://www.lapreferente.com/imagenes/escudos/escudo-8228.png','C/ San Juan Bautista de la Salle, 7, Córdoba'),(34,'C.D. VESPERTINA PERRO VERDE - HORNACHUELOS C.F.','2026-08-07 22:38:04','2026-08-07 22:38:04','https://www.lapreferente.com/imagenes/escudos/escudo-258.jpg','Avda. Reina de los Ángeles, 1, 14740 Hornachuelos'),(35,'C.D. EL VILLAR','2026-08-07 22:38:04','2026-08-07 22:38:04','https://www.lapreferente.com/imagenes/escudos/escudo-2658.png','Campo de Fútbol, Ctra. Écija s/n, El Villar, 14120 Fuente Palmera'),(36,'C.D. EL HIGUERON','2026-08-07 22:38:04','2026-08-07 22:38:04','https://www.lapreferente.com/imagenes/escudos/escudo-1123.png','C/ Cantero Juan Ochoa, 7, El Higuerón, 14014 Córdoba'),(37,'U.D. SUR','2026-08-07 22:38:04','2026-08-07 22:38:04','https://www.lapreferente.com/imagenes/escudos/escudo-487.png','C/ Marbella s/n, Córdoba'),(38,'C.D. SEMILLA BLANQUIVERDE','2026-08-07 22:38:04','2026-08-07 22:38:04','https://www.lapreferente.com/imagenes/escudos/escudo-13927.png','Avenida El Arcángel s/n (Estadio El Arcángel), Córdoba'),(39,'BUJALANCE FUTBOL BASE A.D.','2026-08-07 22:38:04','2026-08-07 22:38:04','https://www.lapreferente.com/imagenes/escudos/escudo-1145.png','Campo Municipal, Prolongación de la Ctra. de Córdoba, 14650 Bujalance'),(40,'C.D. EL CARPIO C.F.','2026-08-07 22:38:04','2026-08-07 22:38:04','https://www.lapreferente.com/imagenes/escudos/escudo-266.png','Estadio Municipal, C/ Mari Luque s/n, Los Tejares, 14620 El Carpio'),(41,'C.D. FRAY ALBINO RACING CORDOBA','2026-08-07 22:38:04','2026-08-07 22:38:04','https://www.lapreferente.com/imagenes/escudos/escudo-301.png','Estadio Municipal de San Eulogio, C/ Adalid 1, 14009 Córdoba'),(42,'ATLETICO CORDOBES C.F.','2026-08-07 22:38:04','2026-08-07 22:38:04','https://www.lapreferente.com/imagenes/escudos/escudo-25.png','C/ Pintora María Blanchard 1, portal 2-3D, Córdoba'),(43,'CAÑETE C.D. BASE','2026-08-07 22:38:04','2026-08-07 22:38:04','https://www.lapreferente.com/imagenes/escudos/escudo-3053.png','Campo Municipal, Ronda del Convento, 14660 Cañete de las Torres'),(44,'C.D. AVEJOE','2026-08-07 22:38:04','2026-08-07 22:38:04','https://www.lapreferente.com/imagenes/escudos/escudo-1272.png','Campo Municipal Los Álamos, Paseo Antonio Gala s/n, 14430 Adamuz'),(45,'C.D. DE FUTBOL JUANIN Y DIEGO','2026-08-07 22:38:04','2026-08-07 22:38:04','https://www.lapreferente.com/imagenes/escudos/escudo-1177.png','C/ Antonio Maura 17, 1º C, Córdoba'),(46,'VILLAFRANCA C.F.','2026-08-07 22:38:04','2026-08-07 22:38:04','https://www.lapreferente.com/imagenes/escudos/escudo-614.png','Campo Municipal Ntra. Sra. de los Remedios, C/ Baja 46, 14420 Villafranca de Córdoba'),(47,'VILLA DEL RIO SERVICIO DEPORTE','2026-08-07 22:38:04','2026-08-07 22:38:04','https://www.lapreferente.com/imagenes/escudos/escudo-24.png','Polideportivo Municipal, Avda. de la Ribera de San Isidro Labrador s/n, 14640 Villa del Río'),(48,'C. D. ATLÉTICO PERABEÑO C. F.','2026-08-07 22:38:04','2026-08-07 22:38:04','https://www.lapreferente.com/imagenes/escudos/escudo-11443.png','Estadio Municipal de Pedro Abad, C/ Santa Rafaela María s/n, 14630 Pedro Abad'),(49,'A.D. LA GUIJARROSA','2026-08-07 22:38:04','2026-08-07 22:38:04','https://www.lapreferente.com/imagenes/escudos/escudo-760.png','C/ La Redondela, 14 (La Guijarrosa), Santaella, Córdoba'),(50,'A.D.C. FUTBOL BASE POZOBLANCO','2026-08-07 22:38:04','2026-08-07 22:38:04','https://www.lapreferente.com/imagenes/escudos/escudo-3446.png','C/ Jacinto Benavente 1, 1º A, Pozoblanco (Córdoba)'),(51,'ALCAZAR C.D.','2026-08-07 22:38:04','2026-08-07 22:38:04','https://www.lapreferente.com/imagenes/escudos/escudo-352.png','Campo Municipal de Guadalquivir (CDM), C/ General Lázaro Cárdenas s/n, Córdoba'),(52,'ATLETICO SENECA','2026-08-07 22:38:04','2026-08-07 22:38:04','https://www.lapreferente.com/imagenes/escudos/escudo-936.png','Pasaje Platero Alcántara (sede IDM Enrique Puga), Córdoba'),(53,'C. D. DIEGO DELGADO NUEVO ZOCO','2026-08-07 22:38:04','2026-08-07 22:38:04','https://www.lapreferente.com/imagenes/escudos/thumbs/escudo-13986.png?f=1747352328','Calle Escritora Carmen Laforet 3, 14005 Córdoba'),(54,'C.D. ALZAHAR DEL GUADALQUIVIR','2026-08-07 22:38:04','2026-08-07 22:38:04','https://www.futbol-regional.es/img/escudos_140/30998.jpg','Calle General Lázaro Cárdenas 1, Córdoba'),(55,'C.D. ASOC. DE FUTBOLISTAS ESPAÑOLES CORDOBA','2026-08-07 22:38:04','2026-08-07 22:38:04','https://www.lapreferente.com/imagenes/escudos/escudo-8930.png','Campo de Fútbol IMD Naranjo, C/ Paula Montal s/n, Córdoba'),(56,'C.D. ATLETICO DE BENAMEJI','2026-08-07 22:38:04','2026-08-07 22:38:04','https://www.lapreferente.com/imagenes/escudos/escudo-14939.png','C/ Aguilar, 20, Benamejí (14910)'),(57,'C.D. ATLETICO FERNAN NUÑEZ','2026-08-07 22:38:04','2026-08-07 22:38:04','https://www.lapreferente.com/imagenes/escudos/escudo-11392.png','Polideportivo Municipal de Fernán-Núñez, Ctra. de la Rambla s/n, Fernán-Núñez (14520)'),(58,'C.D. ATLÉTICO LUCECOR','2026-08-07 22:38:04','2026-08-07 22:38:04','https://www.lapreferente.com/imagenes/escudos/escudo-9132.png','Ciudad Deportiva de Lucena, C/ Blas Infante s/n, Lucena (14900)'),(59,'C.D. CIUDAD DE BAENA','2026-08-07 22:38:04','2026-08-07 22:38:04','https://www.lapreferente.com/imagenes/escudos/escudo-13145.png','Ciudad Deportiva Juan Carlos I, C/ Salvador Muñoz s/n, Baena (14850)'),(60,'C.D. DE FÚTBOL JAVI FLORES','2026-08-07 22:38:04','2026-08-07 22:38:04','https://www.lapreferente.com/imagenes/escudos/thumbs/escudo-14802.png?f=1747265714','Poeta Emilio Prados s/n (Campo Las Margaritas Tablero Bajo I.M.D.), Córdoba'),(61,'C.D. POSADAS CLUB DE FUTBOL','2026-08-07 22:38:04','2026-08-07 22:38:04','https://www.lapreferente.com/imagenes/escudos/escudo-491.png','Campo Municipal Víctor Méndez, Polígono Industrial de Posadas, Posadas (14730)'),(62,'C.D. STADIUM','2026-08-07 22:38:04','2026-08-07 22:38:04','https://www.lapreferente.com/imagenes/escudos/escudo-1859.png','C/ Los Cordeleros, 16, Fernán-Núñez (14520)'),(63,'CALVARIO-PRIEGO C.F.','2026-08-07 22:38:04','2026-08-07 22:38:04','https://www.lapreferente.com/imagenes/escudos/escudo-7873.png','C/ Herrera 54, Priego de Córdoba (Córdoba)'),(64,'CD PRIMER TOQUE JAVIER DE LA TORRE','2026-08-07 22:38:04','2026-08-07 22:38:04','https://www.lapreferente.com/imagenes/escudos/escudo-10293.png','C/ Jarama 10, Villarrubia, Córdoba'),(65,'DON BOSCO C.F.','2026-08-07 22:38:04','2026-08-07 22:38:04','https://www.lapreferente.com/imagenes/escudos/thumbs/escudo-935.png?f=1768398434','Campo Municipal de Noreña, Córdoba'),(66,'LA VICTORIA C.F.','2026-08-07 22:38:04','2026-08-07 22:38:04','https://www.lapreferente.com/imagenes/escudos/escudo-412.png','C/ Plaza de España 7, La Victoria (Córdoba)'),(67,'MONTEMAYOR ATLETICO C.D.','2026-08-07 22:38:04','2026-08-07 22:38:04','https://www.lapreferente.com/imagenes/escudos/escudo-2088.png','C/ Juan Pedro Carmona 6, Montemayor (Córdoba)'),(68,'MONTURK DE MONTURQUE C.D.','2026-08-07 22:38:04','2026-08-07 22:38:04','https://www.lapreferente.com/imagenes/escudos/escudo-1141.png','Camino los Pozos s/n (Polideportivo), Monturque (Córdoba)'),(69,'RUTE CALIDAD C.F. C.D.','2026-08-07 22:38:04','2026-08-07 22:38:04','https://www.lapreferente.com/imagenes/escudos/escudo-26.gif','C/ 31 de Octubre 67, Rute (Córdoba)'),(70,'SALERM COSMETICS PUENTE GENIL F.C.','2026-08-07 22:38:04','2026-08-07 22:38:04','https://www.futbol-regional.es/img/escudos_140/13243.png','Estadio Municipal Manuel Polinario, 14500 Puente Genil'),(71,'SALVADOR ALLENDE U.D.','2026-08-07 22:38:04','2026-08-07 22:38:04','https://www.lapreferente.com/imagenes/escudos/escudo-938.png','C/ Nuestra Señora de la Merced 22, Córdoba'),(72,'SAN LORENZO ATLETICO','2026-08-07 22:38:04','2026-08-07 22:38:04','https://www.lapreferente.com/imagenes/escudos/escudo-1176.png','Plaza Félix Rodríguez de la Fuente 7, Córdoba');
/*!40000 ALTER TABLE `equipos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `incidencias`
--

DROP TABLE IF EXISTS `incidencias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `incidencias` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_categoria` int DEFAULT NULL,
  `id_jugador` int DEFAULT NULL,
  `id_entrenador` int DEFAULT NULL,
  `id_delegado` int DEFAULT NULL,
  `id_usuario` int DEFAULT NULL,
  `incidencias` text COLLATE utf8mb4_unicode_ci,
  `fecha` datetime NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_incidencias_jugador` (`id_jugador`),
  KEY `idx_incidencias_entrenador` (`id_entrenador`),
  KEY `idx_incidencias_delegado` (`id_delegado`),
  KEY `idx_incidencias_categoria` (`id_categoria`),
  KEY `idx_incidencias_fecha` (`fecha`),
  KEY `idx_incidencias_usuario` (`id_usuario`),
  CONSTRAINT `incidencias_ibfk_81` FOREIGN KEY (`id_categoria`) REFERENCES `categorias` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `incidencias_ibfk_82` FOREIGN KEY (`id_jugador`) REFERENCES `jugadores` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `incidencias_ibfk_83` FOREIGN KEY (`id_entrenador`) REFERENCES `entrenadores` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `incidencias_ibfk_84` FOREIGN KEY (`id_delegado`) REFERENCES `delegados` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `incidencias_ibfk_85` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `incidencias`
--

LOCK TABLES `incidencias` WRITE;
/*!40000 ALTER TABLE `incidencias` DISABLE KEYS */;
/*!40000 ALTER TABLE `incidencias` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `jugador_categorias`
--

DROP TABLE IF EXISTS `jugador_categorias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `jugador_categorias` (
  `id_jugador` int NOT NULL,
  `id_categoria` int NOT NULL,
  PRIMARY KEY (`id_jugador`,`id_categoria`),
  KEY `fk_jc_categoria` (`id_categoria`),
  CONSTRAINT `fk_jc_categoria` FOREIGN KEY (`id_categoria`) REFERENCES `categorias` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_jc_jugador` FOREIGN KEY (`id_jugador`) REFERENCES `jugadores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `jugador_categorias`
--

LOCK TABLES `jugador_categorias` WRITE;
/*!40000 ALTER TABLE `jugador_categorias` DISABLE KEYS */;
/*!40000 ALTER TABLE `jugador_categorias` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `jugadores`
--

DROP TABLE IF EXISTS `jugadores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `jugadores` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `apellidos` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dni` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `foto` longtext COLLATE utf8mb4_unicode_ci,
  `id_temporada` int NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `dni` (`dni`),
  UNIQUE KEY `dni_2` (`dni`),
  UNIQUE KEY `dni_3` (`dni`),
  UNIQUE KEY `dni_4` (`dni`),
  UNIQUE KEY `dni_5` (`dni`),
  UNIQUE KEY `dni_6` (`dni`),
  UNIQUE KEY `dni_7` (`dni`),
  UNIQUE KEY `dni_8` (`dni`),
  UNIQUE KEY `dni_9` (`dni`),
  UNIQUE KEY `dni_10` (`dni`),
  UNIQUE KEY `dni_11` (`dni`),
  UNIQUE KEY `dni_12` (`dni`),
  UNIQUE KEY `dni_13` (`dni`),
  UNIQUE KEY `dni_14` (`dni`),
  UNIQUE KEY `dni_15` (`dni`),
  UNIQUE KEY `dni_16` (`dni`),
  UNIQUE KEY `dni_17` (`dni`),
  UNIQUE KEY `dni_18` (`dni`),
  KEY `idx_jugadores_temporada` (`id_temporada`),
  CONSTRAINT `jugadores_ibfk_1` FOREIGN KEY (`id_temporada`) REFERENCES `temporadas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `jugadores`
--

LOCK TABLES `jugadores` WRITE;
/*!40000 ALTER TABLE `jugadores` DISABLE KEYS */;
/*!40000 ALTER TABLE `jugadores` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lugares`
--

DROP TABLE IF EXISTS `lugares`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lugares` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre` (`nombre`),
  UNIQUE KEY `nombre_2` (`nombre`),
  UNIQUE KEY `nombre_3` (`nombre`),
  UNIQUE KEY `nombre_4` (`nombre`),
  UNIQUE KEY `nombre_5` (`nombre`),
  UNIQUE KEY `nombre_6` (`nombre`),
  UNIQUE KEY `nombre_7` (`nombre`),
  UNIQUE KEY `nombre_8` (`nombre`),
  UNIQUE KEY `nombre_9` (`nombre`),
  UNIQUE KEY `nombre_10` (`nombre`),
  UNIQUE KEY `nombre_11` (`nombre`),
  UNIQUE KEY `nombre_12` (`nombre`),
  UNIQUE KEY `nombre_13` (`nombre`),
  UNIQUE KEY `nombre_14` (`nombre`),
  UNIQUE KEY `nombre_15` (`nombre`),
  UNIQUE KEY `nombre_16` (`nombre`),
  UNIQUE KEY `nombre_17` (`nombre`),
  UNIQUE KEY `nombre_18` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lugares`
--

LOCK TABLES `lugares` WRITE;
/*!40000 ALTER TABLE `lugares` DISABLE KEYS */;
INSERT INTO `lugares` VALUES (1,'Anexo I','2026-08-07 22:38:04','2026-08-07 22:38:04'),(2,'Anexo II','2026-08-07 22:38:04','2026-08-07 22:38:04'),(3,'Estadio A','2026-08-07 22:38:04','2026-08-07 22:38:04'),(4,'Estadio B','2026-08-07 22:38:04','2026-08-07 22:38:04'),(5,'Estadio','2026-08-08 12:26:47','2026-08-08 12:26:47'),(6,'Anexo X','2026-08-08 12:26:53','2026-08-08 13:29:48');
/*!40000 ALTER TABLE `lugares` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `partidos`
--

DROP TABLE IF EXISTS `partidos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `partidos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_categoria` int NOT NULL,
  `fecha` datetime NOT NULL,
  `id_lugar` int DEFAULT NULL,
  `id_equipo` int NOT NULL,
  `es_local` tinyint(1) NOT NULL DEFAULT '1',
  `id_usuario` int DEFAULT NULL,
  `incidencias` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_partidos_categoria` (`id_categoria`),
  KEY `idx_partidos_fecha` (`fecha`),
  KEY `idx_partidos_lugar` (`id_lugar`),
  KEY `idx_partidos_equipo` (`id_equipo`),
  KEY `idx_partidos_usuario` (`id_usuario`),
  CONSTRAINT `partidos_ibfk_65` FOREIGN KEY (`id_categoria`) REFERENCES `categorias` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `partidos_ibfk_66` FOREIGN KEY (`id_lugar`) REFERENCES `lugares` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `partidos_ibfk_67` FOREIGN KEY (`id_equipo`) REFERENCES `equipos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `partidos_ibfk_68` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `partidos`
--

LOCK TABLES `partidos` WRITE;
/*!40000 ALTER TABLE `partidos` DISABLE KEYS */;
/*!40000 ALTER TABLE `partidos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `partidos_jugadores`
--

DROP TABLE IF EXISTS `partidos_jugadores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `partidos_jugadores` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_partido` int NOT NULL,
  `id_jugador` int NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `minutos` int NOT NULL DEFAULT '0',
  `goles` int NOT NULL DEFAULT '0',
  `tarjeta_amarilla` int NOT NULL DEFAULT '0',
  `tarjeta_roja` int NOT NULL DEFAULT '0',
  `incidencias` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `idx_pj_partido` (`id_partido`),
  KEY `idx_pj_jugador` (`id_jugador`),
  CONSTRAINT `partidos_jugadores_ibfk_33` FOREIGN KEY (`id_partido`) REFERENCES `partidos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `partidos_jugadores_ibfk_34` FOREIGN KEY (`id_jugador`) REFERENCES `jugadores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `partidos_jugadores`
--

LOCK TABLES `partidos_jugadores` WRITE;
/*!40000 ALTER TABLE `partidos_jugadores` DISABLE KEYS */;
/*!40000 ALTER TABLE `partidos_jugadores` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `resultados`
--

DROP TABLE IF EXISTS `resultados`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `resultados` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_partido` int NOT NULL,
  `resultado` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `incidencias` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_resultados_partido` (`id_partido`),
  CONSTRAINT `resultados_ibfk_1` FOREIGN KEY (`id_partido`) REFERENCES `partidos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `resultados`
--

LOCK TABLES `resultados` WRITE;
/*!40000 ALTER TABLE `resultados` DISABLE KEYS */;
/*!40000 ALTER TABLE `resultados` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `secciones`
--

DROP TABLE IF EXISTS `secciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `secciones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `clave` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `icono` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `orden` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `clave` (`clave`),
  UNIQUE KEY `uq_secciones_nombre` (`nombre`),
  UNIQUE KEY `clave_2` (`clave`),
  UNIQUE KEY `nombre` (`nombre`),
  UNIQUE KEY `clave_3` (`clave`),
  UNIQUE KEY `nombre_2` (`nombre`),
  UNIQUE KEY `clave_4` (`clave`),
  UNIQUE KEY `nombre_3` (`nombre`),
  UNIQUE KEY `clave_5` (`clave`),
  UNIQUE KEY `nombre_4` (`nombre`),
  UNIQUE KEY `clave_6` (`clave`),
  UNIQUE KEY `nombre_5` (`nombre`),
  UNIQUE KEY `clave_7` (`clave`),
  UNIQUE KEY `nombre_6` (`nombre`),
  UNIQUE KEY `clave_8` (`clave`),
  UNIQUE KEY `nombre_7` (`nombre`),
  UNIQUE KEY `clave_9` (`clave`),
  UNIQUE KEY `nombre_8` (`nombre`),
  UNIQUE KEY `clave_10` (`clave`),
  UNIQUE KEY `nombre_9` (`nombre`),
  UNIQUE KEY `clave_11` (`clave`),
  UNIQUE KEY `nombre_10` (`nombre`),
  UNIQUE KEY `clave_12` (`clave`),
  UNIQUE KEY `nombre_11` (`nombre`),
  UNIQUE KEY `clave_13` (`clave`),
  UNIQUE KEY `nombre_12` (`nombre`),
  UNIQUE KEY `clave_14` (`clave`),
  UNIQUE KEY `nombre_13` (`nombre`),
  UNIQUE KEY `clave_15` (`clave`),
  UNIQUE KEY `nombre_14` (`nombre`),
  UNIQUE KEY `clave_16` (`clave`),
  UNIQUE KEY `nombre_15` (`nombre`),
  UNIQUE KEY `clave_17` (`clave`),
  UNIQUE KEY `nombre_16` (`nombre`),
  UNIQUE KEY `clave_18` (`clave`),
  UNIQUE KEY `nombre_17` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `secciones`
--

LOCK TABLES `secciones` WRITE;
/*!40000 ALTER TABLE `secciones` DISABLE KEYS */;
INSERT INTO `secciones` VALUES (1,'calendario','Calendario','pi pi-calendar',10),(2,'entrenamientos','Entrenamientos','pi pi-stopwatch',20),(3,'partidos','Partidos','pi pi-flag',30),(4,'resultados','Resultados','pi pi-chart-bar',35),(5,'temporadas','Temporadas','pi pi-clock',40),(6,'titulos','Títulos','pi pi-graduation-cap',45),(7,'lugares','Lugares','pi pi-map-marker',50),(8,'delegados','Delegados','pi pi-user-plus',55),(9,'categorias','Categorías','pi pi-sitemap',60),(10,'equipos','Equipos','pi pi-trophy',65),(11,'incidencias','Incidencias','pi pi-exclamation-triangle',68),(12,'jugadores','Jugadores','pi pi-users',70),(13,'entrenadores','Entrenadores','pi pi-id-card',80),(14,'administracion','Administración','pi pi-shield',100),(15,'entrenamientos_jugadores','Entrenamientos Jugadores','pi pi-check-square',22),(16,'partidos_jugadores','Convocatorias','pi pi-list-check',32);
/*!40000 ALTER TABLE `secciones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `temporadas`
--

DROP TABLE IF EXISTS `temporadas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `temporadas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre` (`nombre`),
  UNIQUE KEY `nombre_2` (`nombre`),
  UNIQUE KEY `nombre_3` (`nombre`),
  UNIQUE KEY `nombre_4` (`nombre`),
  UNIQUE KEY `nombre_5` (`nombre`),
  UNIQUE KEY `nombre_6` (`nombre`),
  UNIQUE KEY `nombre_7` (`nombre`),
  UNIQUE KEY `nombre_8` (`nombre`),
  UNIQUE KEY `nombre_9` (`nombre`),
  UNIQUE KEY `nombre_10` (`nombre`),
  UNIQUE KEY `nombre_11` (`nombre`),
  UNIQUE KEY `nombre_12` (`nombre`),
  UNIQUE KEY `nombre_13` (`nombre`),
  UNIQUE KEY `nombre_14` (`nombre`),
  UNIQUE KEY `nombre_15` (`nombre`),
  UNIQUE KEY `nombre_16` (`nombre`),
  UNIQUE KEY `nombre_17` (`nombre`),
  UNIQUE KEY `nombre_18` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `temporadas`
--

LOCK TABLES `temporadas` WRITE;
/*!40000 ALTER TABLE `temporadas` DISABLE KEYS */;
INSERT INTO `temporadas` VALUES (2,'2026/2027','2026-08-07 22:38:04','2026-08-07 22:38:04');
/*!40000 ALTER TABLE `temporadas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `titulo`
--

DROP TABLE IF EXISTS `titulo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `titulo` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre` (`nombre`),
  UNIQUE KEY `nombre_2` (`nombre`),
  UNIQUE KEY `nombre_3` (`nombre`),
  UNIQUE KEY `nombre_4` (`nombre`),
  UNIQUE KEY `nombre_5` (`nombre`),
  UNIQUE KEY `nombre_6` (`nombre`),
  UNIQUE KEY `nombre_7` (`nombre`),
  UNIQUE KEY `nombre_8` (`nombre`),
  UNIQUE KEY `nombre_9` (`nombre`),
  UNIQUE KEY `nombre_10` (`nombre`),
  UNIQUE KEY `nombre_11` (`nombre`),
  UNIQUE KEY `nombre_12` (`nombre`),
  UNIQUE KEY `nombre_13` (`nombre`),
  UNIQUE KEY `nombre_14` (`nombre`),
  UNIQUE KEY `nombre_15` (`nombre`),
  UNIQUE KEY `nombre_16` (`nombre`),
  UNIQUE KEY `nombre_17` (`nombre`),
  UNIQUE KEY `nombre_18` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `titulo`
--

LOCK TABLES `titulo` WRITE;
/*!40000 ALTER TABLE `titulo` DISABLE KEYS */;
INSERT INTO `titulo` VALUES (1,'UEFA A','2026-08-07 22:38:04','2026-08-07 22:38:04'),(2,'UEFA B','2026-08-07 22:38:04','2026-08-07 22:38:04'),(3,'UEFA C','2026-08-07 22:38:04','2026-08-07 22:38:04');
/*!40000 ALTER TABLE `titulo` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usuario_secciones`
--

DROP TABLE IF EXISTS `usuario_secciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuario_secciones` (
  `id_usuario` int NOT NULL,
  `id_seccion` int NOT NULL,
  PRIMARY KEY (`id_usuario`,`id_seccion`),
  KEY `fk_us_seccion` (`id_seccion`),
  CONSTRAINT `fk_us_seccion` FOREIGN KEY (`id_seccion`) REFERENCES `secciones` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_us_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuario_secciones`
--

LOCK TABLES `usuario_secciones` WRITE;
/*!40000 ALTER TABLE `usuario_secciones` DISABLE KEYS */;
INSERT INTO `usuario_secciones` VALUES (1,1),(1,2),(1,3),(1,4),(1,5),(1,6),(1,7),(1,8),(1,9),(1,10),(1,11),(1,12),(1,13),(1,14),(1,15),(1,16);
/*!40000 ALTER TABLE `usuario_secciones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `usuario` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `apellidos` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `usuario` (`usuario`),
  UNIQUE KEY `usuario_2` (`usuario`),
  UNIQUE KEY `usuario_3` (`usuario`),
  UNIQUE KEY `usuario_4` (`usuario`),
  UNIQUE KEY `usuario_5` (`usuario`),
  UNIQUE KEY `usuario_6` (`usuario`),
  UNIQUE KEY `usuario_7` (`usuario`),
  UNIQUE KEY `usuario_8` (`usuario`),
  UNIQUE KEY `usuario_9` (`usuario`),
  UNIQUE KEY `usuario_10` (`usuario`),
  UNIQUE KEY `usuario_11` (`usuario`),
  UNIQUE KEY `usuario_12` (`usuario`),
  UNIQUE KEY `usuario_13` (`usuario`),
  UNIQUE KEY `usuario_14` (`usuario`),
  UNIQUE KEY `usuario_15` (`usuario`),
  UNIQUE KEY `usuario_16` (`usuario`),
  UNIQUE KEY `usuario_17` (`usuario`),
  UNIQUE KEY `usuario_18` (`usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuarios`
--

LOCK TABLES `usuarios` WRITE;
/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
INSERT INTO `usuarios` VALUES (1,'admin','$2b$12$qNyal7hjaLPYDaLdpju0iuQAGFga5.TezJ2gXMIctWFlzNXeaDuw.','Administrador','Sistema',1,'2026-08-07 22:38:04','2026-08-07 22:38:04');
/*!40000 ALTER TABLE `usuarios` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-08-11  0:40:27
