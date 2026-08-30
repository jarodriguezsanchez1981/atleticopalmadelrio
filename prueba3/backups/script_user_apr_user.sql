-- Script de creación del usuario de aplicación apr_user
-- Base de datos: atletico_palma_intranet
-- Generado: <fecha>

CREATE USER IF NOT EXISTS 'apr_user'@'%' IDENTIFIED BY '5350f0e2058808dc8ef4e6eac539a941';

GRANT ALL PRIVILEGES ON `atletico_palma_intranet`.* TO 'apr_user'@'%';

FLUSH PRIVILEGES;
