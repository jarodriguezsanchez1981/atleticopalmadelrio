-- "Estadísticas Equipo" desaparece como sección propia: sus datos (goles y
-- tarjetas del equipo) ya se muestran dentro de Estadísticas Goles y
-- Estadísticas Sanciones. Se borran sus permisos y la sección.
-- Idempotente: si ya no existe, no borra nada.
DELETE us FROM usuario_secciones us
  JOIN secciones s ON s.id = us.id_seccion
  WHERE s.clave = 'estadisticas_equipo';
DELETE FROM secciones WHERE clave = 'estadisticas_equipo';
