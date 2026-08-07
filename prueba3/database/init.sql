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
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`,`nombre`),
  UNIQUE KEY `uq_categoria_temporada` (`nombre`,`id_temporada`),
  UNIQUE KEY `uq_categorias_nombre` (`nombre`),
  KEY `idx_categorias_entrenador` (`id_entrenador`),
  KEY `idx_categorias_temporada` (`id_temporada`),
  KEY `idx_categorias_delegado` (`id_delegado`),
  CONSTRAINT `fk_categorias_delegado` FOREIGN KEY (`id_delegado`) REFERENCES `delegados` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_categorias_entrenador` FOREIGN KEY (`id_entrenador`) REFERENCES `entrenadores` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_categorias_temporada` FOREIGN KEY (`id_temporada`) REFERENCES `temporadas` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categorias`
--

LOCK TABLES `categorias` WRITE;
/*!40000 ALTER TABLE `categorias` DISABLE KEYS */;
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
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`,`nombre`,`apellidos`,`dni`),
  UNIQUE KEY `dni` (`dni`),
  KEY `idx_delegados_categoria` (`id_categoria`),
  KEY `idx_delegados_temporada` (`id_temporada`),
  CONSTRAINT `fk_delegados_categoria` FOREIGN KEY (`id_categoria`) REFERENCES `categorias` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_delegados_temporada` FOREIGN KEY (`id_temporada`) REFERENCES `temporadas` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`,`nombre`,`apellidos`,`dni`),
  UNIQUE KEY `dni` (`dni`),
  KEY `idx_entrenadores_temporada` (`id_temporada`),
  CONSTRAINT `fk_entrenadores_temporada` FOREIGN KEY (`id_temporada`) REFERENCES `temporadas` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
  `id_lugar` int NOT NULL,
  `id_usuario` int DEFAULT NULL,
  `recurrente` tinyint(1) NOT NULL DEFAULT '0',
  `incidencias` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_entrenamientos_categoria` (`id_categoria`),
  KEY `idx_entrenamientos_fecha` (`fecha`),
  KEY `idx_entrenamientos_lugar` (`id_lugar`),
  KEY `idx_entrenamientos_usuario` (`id_usuario`),
  CONSTRAINT `fk_entrenamientos_categoria` FOREIGN KEY (`id_categoria`) REFERENCES `categorias` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_entrenamientos_lugar` FOREIGN KEY (`id_lugar`) REFERENCES `lugares` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_entrenamientos_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_etj_entrenamiento` (`id_entrenamiento`),
  KEY `idx_etj_jugador` (`id_jugador`),
  CONSTRAINT `fk_etj_entrenamiento` FOREIGN KEY (`id_entrenamiento`) REFERENCES `entrenamientos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_etj_jugador` FOREIGN KEY (`id_jugador`) REFERENCES `jugadores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `entrenamientos_jugadores`
--

LOCK TABLES `entrenamientos_jugadores` WRITE;
/*!40000 ALTER TABLE `entrenamientos_jugadores` DISABLE KEYS */;
/*!40000 ALTER TABLE `entrenamientos_jugadores` ENABLE KEYS */;
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
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`,`nombre`),
  UNIQUE KEY `uq_equipos_nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=73 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `equipos`
--

LOCK TABLES `equipos` WRITE;
/*!40000 ALTER TABLE `equipos` DISABLE KEYS */;
INSERT INTO `equipos` VALUES (1,'LUCECOR F.S.','2026-08-07 22:38:04','2026-08-07 22:38:04'),(2,'SPORTING DE BENAMEJI C.D.','2026-08-07 22:38:04','2026-08-07 22:38:04'),(3,'CASTRO DEL RIO C.D.','2026-08-07 22:38:04','2026-08-07 22:38:04'),(4,'C.D. PRIEGO C.F.','2026-08-07 22:38:04','2026-08-07 22:38:04'),(5,'C.D. RUTE CALIDAD C.F.','2026-08-07 22:38:04','2026-08-07 22:38:04'),(6,'BAENENSE ATLETICO C.F.','2026-08-07 22:38:04','2026-08-07 22:38:04'),(7,'C.D. EGABRENSE FUTBOL BASE','2026-08-07 22:38:04','2026-08-07 22:38:04'),(8,'C.D. APEDEM','2026-08-07 22:38:04','2026-08-07 22:38:04'),(9,'FUNDACION LUCENA F.C.','2026-08-07 22:38:04','2026-08-07 22:38:04'),(10,'ALMEDINILLA ATL.','2026-08-07 22:38:04','2026-08-07 22:38:04'),(11,'AGUILARENSE ATLETICO C.F.','2026-08-07 22:38:04','2026-08-07 22:38:04'),(12,'MORILES C.F.','2026-08-07 22:38:04','2026-08-07 22:38:04'),(13,'VILLA DE ESPEJO C.D.','2026-08-07 22:38:04','2026-08-07 22:38:04'),(14,'LA RAMBLA A.D. DE FUTBOL BASE','2026-08-07 22:38:04','2026-08-07 22:38:04'),(15,'C.D. ATLÉTICO MONTOREÑO','2026-08-07 22:38:04','2026-08-07 22:38:04'),(16,'C.D. FUENTES FÚTBOL BASE','2026-08-07 22:38:04','2026-08-07 22:38:04'),(17,'C.D. VILLARRUBIA','2026-08-07 22:38:04','2026-08-07 22:38:04'),(18,'C.D. GRANADAL FIGUEROA','2026-08-07 22:38:04','2026-08-07 22:38:04'),(19,'SENECA C.F.','2026-08-07 22:38:04','2026-08-07 22:38:04'),(20,'A.D. DE FUTBOL BASE LA RAMBLA','2026-08-07 22:38:04','2026-08-07 22:38:04'),(21,'C.D. MONTALBEÑO','2026-08-07 22:38:04','2026-08-07 22:38:04'),(22,'C.D. MONTEMAYOR ATLETICO','2026-08-07 22:38:04','2026-08-07 22:38:04'),(23,'C.D. SANTAELLA 2010','2026-08-07 22:38:04','2026-08-07 22:38:04'),(24,'LA GUIJARROSA A.D.','2026-08-07 22:38:04','2026-08-07 22:38:04'),(25,'FERNAN NUÑEZ C.F.','2026-08-07 22:38:04','2026-08-07 22:38:04'),(26,'C.D. LOS CALIFAS BALOMPIE','2026-08-07 22:38:04','2026-08-07 22:38:04'),(27,'APADEMAR','2026-08-07 22:38:04','2026-08-07 22:38:04'),(28,'CORDOBA C.F.','2026-08-07 22:38:04','2026-08-07 22:38:04'),(29,'PACO PRADAS C.D.','2026-08-07 22:38:04','2026-08-07 22:38:04'),(30,'C.D. COLONIA DE FUENTE PALMERA','2026-08-07 22:38:04','2026-08-07 22:38:04'),(31,'ALMODOVAR DEL RIO C.F.','2026-08-07 22:38:04','2026-08-07 22:38:04'),(32,'R.U.D. LA CARLOTA','2026-08-07 22:38:04','2026-08-07 22:38:04'),(33,'S.D. SPORT CORDOBA LA SALLE','2026-08-07 22:38:04','2026-08-07 22:38:04'),(34,'C.D. VESPERTINA PERRO VERDE - HORNACHUELOS C.F.','2026-08-07 22:38:04','2026-08-07 22:38:04'),(35,'C.D. EL VILLAR','2026-08-07 22:38:04','2026-08-07 22:38:04'),(36,'C.D. EL HIGUERON','2026-08-07 22:38:04','2026-08-07 22:38:04'),(37,'U.D. SUR','2026-08-07 22:38:04','2026-08-07 22:38:04'),(38,'C.D. SEMILLA BLANQUIVERDE','2026-08-07 22:38:04','2026-08-07 22:38:04'),(39,'BUJALANCE FUTBOL BASE A.D.','2026-08-07 22:38:04','2026-08-07 22:38:04'),(40,'C.D. EL CARPIO C.F.','2026-08-07 22:38:04','2026-08-07 22:38:04'),(41,'C.D. FRAY ALBINO RACING CORDOBA','2026-08-07 22:38:04','2026-08-07 22:38:04'),(42,'ATLETICO CORDOBES C.F.','2026-08-07 22:38:04','2026-08-07 22:38:04'),(43,'CAÑETE C.D. BASE','2026-08-07 22:38:04','2026-08-07 22:38:04'),(44,'C.D. AVEJOE','2026-08-07 22:38:04','2026-08-07 22:38:04'),(45,'C.D. DE FUTBOL JUANIN Y DIEGO','2026-08-07 22:38:04','2026-08-07 22:38:04'),(46,'VILLAFRANCA C.F.','2026-08-07 22:38:04','2026-08-07 22:38:04'),(47,'VILLA DEL RIO SERVICIO DEPORTE','2026-08-07 22:38:04','2026-08-07 22:38:04'),(48,'C. D. ATLÉTICO PERABEÑO C. F.','2026-08-07 22:38:04','2026-08-07 22:38:04'),(49,'A.D. LA GUIJARROSA','2026-08-07 22:38:04','2026-08-07 22:38:04'),(50,'A.D.C. FUTBOL BASE POZOBLANCO','2026-08-07 22:38:04','2026-08-07 22:38:04'),(51,'ALCAZAR C.D.','2026-08-07 22:38:04','2026-08-07 22:38:04'),(52,'ATLETICO SENECA','2026-08-07 22:38:04','2026-08-07 22:38:04'),(53,'C. D. DIEGO DELGADO NUEVO ZOCO','2026-08-07 22:38:04','2026-08-07 22:38:04'),(54,'C.D. ALZAHAR DEL GUADALQUIVIR','2026-08-07 22:38:04','2026-08-07 22:38:04'),(55,'C.D. ASOC. DE FUTBOLISTAS ESPAÑOLES CORDOBA','2026-08-07 22:38:04','2026-08-07 22:38:04'),(56,'C.D. ATLETICO DE BENAMEJI','2026-08-07 22:38:04','2026-08-07 22:38:04'),(57,'C.D. ATLETICO FERNAN NUÑEZ','2026-08-07 22:38:04','2026-08-07 22:38:04'),(58,'C.D. ATLÉTICO LUCECOR','2026-08-07 22:38:04','2026-08-07 22:38:04'),(59,'C.D. CIUDAD DE BAENA','2026-08-07 22:38:04','2026-08-07 22:38:04'),(60,'C.D. DE FÚTBOL JAVI FLORES','2026-08-07 22:38:04','2026-08-07 22:38:04'),(61,'C.D. POSADAS CLUB DE FUTBOL','2026-08-07 22:38:04','2026-08-07 22:38:04'),(62,'C.D. STADIUM','2026-08-07 22:38:04','2026-08-07 22:38:04'),(63,'CALVARIO-PRIEGO C.F.','2026-08-07 22:38:04','2026-08-07 22:38:04'),(64,'CD PRIMER TOQUE JAVIER DE LA TORRE','2026-08-07 22:38:04','2026-08-07 22:38:04'),(65,'DON BOSCO C.F.','2026-08-07 22:38:04','2026-08-07 22:38:04'),(66,'LA VICTORIA C.F.','2026-08-07 22:38:04','2026-08-07 22:38:04'),(67,'MONTEMAYOR ATLETICO C.D.','2026-08-07 22:38:04','2026-08-07 22:38:04'),(68,'MONTURK DE MONTURQUE C.D.','2026-08-07 22:38:04','2026-08-07 22:38:04'),(69,'RUTE CALIDAD C.F. C.D.','2026-08-07 22:38:04','2026-08-07 22:38:04'),(70,'SALERM COSMETICS PUENTE GENIL F.C.','2026-08-07 22:38:04','2026-08-07 22:38:04'),(71,'SALVADOR ALLENDE U.D.','2026-08-07 22:38:04','2026-08-07 22:38:04'),(72,'SAN LORENZO ATLETICO','2026-08-07 22:38:04','2026-08-07 22:38:04');
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
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_incidencias_jugador` (`id_jugador`),
  KEY `idx_incidencias_entrenador` (`id_entrenador`),
  KEY `idx_incidencias_delegado` (`id_delegado`),
  KEY `idx_incidencias_categoria` (`id_categoria`),
  KEY `idx_incidencias_fecha` (`fecha`),
  KEY `idx_incidencias_usuario` (`id_usuario`),
  CONSTRAINT `fk_incidencias_categoria` FOREIGN KEY (`id_categoria`) REFERENCES `categorias` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_incidencias_delegado` FOREIGN KEY (`id_delegado`) REFERENCES `delegados` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_incidencias_entrenador` FOREIGN KEY (`id_entrenador`) REFERENCES `entrenadores` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_incidencias_jugador` FOREIGN KEY (`id_jugador`) REFERENCES `jugadores` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_incidencias_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
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
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`,`nombre`,`apellidos`,`dni`),
  UNIQUE KEY `dni` (`dni`),
  KEY `idx_jugadores_temporada` (`id_temporada`),
  CONSTRAINT `fk_jugadores_temporada` FOREIGN KEY (`id_temporada`) REFERENCES `temporadas` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`,`nombre`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lugares`
--

LOCK TABLES `lugares` WRITE;
/*!40000 ALTER TABLE `lugares` DISABLE KEYS */;
INSERT INTO `lugares` VALUES (1,'Anexo I','2026-08-07 22:38:04','2026-08-07 22:38:04'),(2,'Anexo II','2026-08-07 22:38:04','2026-08-07 22:38:04'),(3,'Estadio A','2026-08-07 22:38:04','2026-08-07 22:38:04'),(4,'Estadio B','2026-08-07 22:38:04','2026-08-07 22:38:04');
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
  `id_lugar` int NOT NULL,
  `id_equipo` int NOT NULL,
  `id_usuario` int DEFAULT NULL,
  `incidencias` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_partidos_categoria` (`id_categoria`),
  KEY `idx_partidos_fecha` (`fecha`),
  KEY `idx_partidos_lugar` (`id_lugar`),
  KEY `idx_partidos_equipo` (`id_equipo`),
  KEY `idx_partidos_usuario` (`id_usuario`),
  CONSTRAINT `fk_partidos_categoria` FOREIGN KEY (`id_categoria`) REFERENCES `categorias` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_partidos_equipo` FOREIGN KEY (`id_equipo`) REFERENCES `equipos` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_partidos_lugar` FOREIGN KEY (`id_lugar`) REFERENCES `lugares` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_partidos_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pj_partido` (`id_partido`),
  KEY `idx_pj_jugador` (`id_jugador`),
  CONSTRAINT `fk_pj_jugador` FOREIGN KEY (`id_jugador`) REFERENCES `jugadores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_pj_partido` FOREIGN KEY (`id_partido`) REFERENCES `partidos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_resultados_partido` (`id_partido`),
  CONSTRAINT `fk_resultados_partido` FOREIGN KEY (`id_partido`) REFERENCES `partidos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
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
  PRIMARY KEY (`id`,`nombre`),
  UNIQUE KEY `clave` (`clave`),
  UNIQUE KEY `uq_secciones_nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `secciones`
--

LOCK TABLES `secciones` WRITE;
/*!40000 ALTER TABLE `secciones` DISABLE KEYS */;
INSERT INTO `secciones` VALUES (1,'calendario','Calendario','pi pi-calendar',10),(2,'entrenamientos','Entrenamientos','pi pi-stopwatch',20),(3,'partidos','Partidos','pi pi-flag',30),(4,'resultados','Resultados','pi pi-chart-bar',35),(5,'temporadas','Temporadas','pi pi-clock',40),(6,'titulos','Títulos','pi pi-graduation-cap',45),(7,'lugares','Lugares','pi pi-map-marker',50),(8,'delegados','Delegados','pi pi-user-plus',55),(9,'categorias','Categorías','pi pi-sitemap',60),(10,'equipos','Equipos','pi pi-trophy',65),(11,'incidencias','Incidencias','pi pi-exclamation-triangle',68),(12,'jugadores','Jugadores','pi pi-users',70),(13,'entrenadores','Entrenadores','pi pi-id-card',80),(14,'administracion','Administración','pi pi-shield',100);
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
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`,`nombre`),
  UNIQUE KEY `nombre` (`nombre`)
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
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`,`nombre`),
  UNIQUE KEY `nombre` (`nombre`)
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
INSERT INTO `usuario_secciones` VALUES (1,1),(1,2),(1,3),(1,4),(1,5),(1,6),(1,7),(1,8),(1,9),(1,10),(1,11),(1,12),(1,13),(1,14);
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
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `usuario` (`usuario`)
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

-- Dump completed on 2026-08-08  0:52:53
