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
  `rol` enum('coordinador','entrenador') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'coordinador',
  `id_categoria` int DEFAULT NULL,
  `visibilidad` enum('leer','editar') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'leer',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `usuario` (`usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuarios`
--

LOCK TABLES `usuarios` WRITE;
/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
INSERT INTO `usuarios` VALUES (1,'admin','$2b$12$DiEIyOETosbTBtDYN3ebgeU0.sCI/7r9h6D4OKbN8.G4831j2hoWu','Administrador','Sistema',1,'coordinador',NULL,'editar','2026-08-07 22:38:04','2026-08-27 14:49:04'),(10,'palacios','$2b$12$zKvSYMDwKrsNfF5zNVIF7ureKWVu8Y6kpnZtzoQ9UK1hzsO3lRwcu','Rafael','Garcia Palacios',1,'coordinador',NULL,'editar','2026-08-28 08:16:11','2026-08-28 10:25:57'),(16,'entrenador','$2b$12$HnC/UYHhNnq76x1JyNqo0.GFdp5utSn5LXqP46US.TGlfDG1B.jv2','pruebas','pruebas',1,'entrenador',20,'leer','2026-08-28 16:01:09','2026-08-28 16:01:09');
/*!40000 ALTER TABLE `usuarios` ENABLE KEYS */;
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
  KEY `fk_us_seccion` (`id_seccion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuario_secciones`
--

LOCK TABLES `usuario_secciones` WRITE;
/*!40000 ALTER TABLE `usuario_secciones` DISABLE KEYS */;
INSERT INTO `usuario_secciones` VALUES (1,1),(10,1),(12,1),(13,1),(14,1),(16,1),(1,2),(10,2),(16,2),(1,3),(10,3),(16,3),(1,4),(10,4),(1,5),(10,5),(1,6),(10,6),(1,7),(10,7),(1,8),(10,8),(1,9),(10,9),(1,10),(10,10),(1,11),(10,11),(1,12),(10,12),(15,12),(1,13),(10,13),(1,14),(10,14),(11,14),(1,15),(10,15),(1,17),(10,17),(1,19),(10,19),(1,20),(10,20),(16,20),(1,21),(10,21),(16,21),(1,22),(10,22),(1,23),(10,23),(1,24),(10,24),(1,25),(10,25),(1,26),(10,26),(1,27);
/*!40000 ALTER TABLE `usuario_secciones` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-08-30  2:00:14
