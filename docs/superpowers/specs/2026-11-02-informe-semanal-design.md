# Informes → Semanal (diseño)

Estado: pendiente de aprobación del usuario.

## Para qué

Que la coordinación del club (Rafael García Palacios y José Manuel Fernández Rivas) reciba cada lunes, sin que nadie tenga que acordarse, un resumen de cómo le ha ido el fin de semana a cada categoría del PALMA: partido, resultado, puesto en la clasificación y sanciones, separado en Fútbol 7 y Fútbol 11.

## Lo que decidió el usuario

- Nueva sección **Semanal** dentro de **Informes** (Informes ya está en el apartado Club).
- **Envío automático**: tarea programada **cada lunes a las 10:00** (hora española), **solo si ese fin de semana hubo jornada**.
- **Remitente**: `notificaciones@atleticopalmadelrio.com` (ya existe y está activa en Correos).
- **Destinatarios** (cambiado por el usuario el 02/11/2026): se eligen en la pantalla entre los usuarios activos con email y se guardan; el envío automático va a los guardados. Sin destinatarios no se envía (queda en el historial).
- **Contenido**: partidos del fin de semana **por categoría**, con **resultado**, **clasificación** y **sanciones**, agrupado en **Fútbol 7** y **Fútbol 11**.
- **Clasificación**: **solo el puesto actual del PALMA** (no la tabla entera).
- **Copia de la clasificación de RFAF**: pasa de **todos los días a las 10:00** a **solo los lunes a las 09:00**, para que a las 10:00 el email ya la lleve. La copia de las actas de la liga de Senior A (que arranca justo después) pasa también a los lunes; si quedan actas o jornadas atrasadas, sigue reintentando cada 30 minutos como ahora.
- **Pantalla Informes → Semanal**:
  - vista previa del email (último fin de semana, con selector para ver anteriores);
  - remitente a la vista y selector de destinatarios (usuarios con email) con «Guardar destinatarios»;
  - botón **«Enviar ahora»** (reenviar o enviar si falló);
  - **historial** de envíos: fecha, fin de semana, automático/manual, correcto/error.
  - Nada más.

## Decisiones mías (revisables)

- **Fin de semana** = viernes, sábado y domingo anteriores al lunes del envío (algunas categorías juegan el viernes por la tarde). Se identifica por la fecha de ese lunes.
- **«Hubo jornada»** = al menos un partido de liga (con número de jornada) de una plantilla de la temporada actual con fecha en ese fin de semana.
- **Categorías**: las de las plantillas de la temporada actual, en el orden de `categorias.orden`, dentro de su tipo de fútbol. Una categoría sin partido ese fin de semana sale con «Sin partido». Si una categoría tiene más de un partido de liga ese fin de semana, salen todos.
- **Por cada partido**: local – visitante, día y hora, resultado («Sin resultado» si no está; «Suspendido» si lo está).
- **Puesto**: el del PALMA en la clasificación más reciente copiada de esa plantilla («3º con 18 puntos, jornada 7»). Sin clasificación copiada: «Sin clasificación».
- **Sanciones**: las filas de la sección Sanciones de esos partidos (jugador del PALMA con sus amarillas y rojas). Sin tarjetas: no sale el apartado en esa categoría.
- **Formato del email**: HTML sencillo (tablas, compatibles con clientes de correo), asunto «Informe semanal · fin de semana del DD/MM/AAAA», con la firma de la cuenta `notificaciones@` (como ya hace el envío desde una cuenta de Correos).
- **No repetir**: el envío automático no sale si ese fin de semana ya se envió bien (por ejemplo, a mano antes de las 10:00). «Enviar ahora» sí envía siempre.
- **Solo en producción**: la tarea automática solo corre con `NODE_ENV=production` (como la copia de la clasificación). En local, «Enviar ahora» está desactivado (la BD local puede ser copia de producción con las cuentas de correo reales: no debe salir ningún email a Rafael o José Manuel desde local); la vista previa sí funciona.
- **Historial** en una tabla nueva (`informes_semanales`: lunes del fin de semana, fecha de envío, automático/manual, correcto, mensaje de error, destinatarios, usuario que lo envió a mano). Migración idempotente.
- **Permisos**: sección nueva `informe_semanal` en el grupo de Informes, con los mismos permisos que la sección `informes`. Ver requiere permiso de la sección; «Enviar ahora» requiere poder editarla.
- **Fallo al enviar**: se guarda en el historial con el error; no se reintenta solo (se puede reenviar a mano).
- **«Dentro de Informes»**: en el apartado Club, «Informes» pasa a ser un submenú plegable (como Notificaciones) con la entrada «Semanal». La página antigua de Informes («en construcción») sale del menú; su sección se conserva para los permisos.
- **Normas del proyecto**: se actualiza la regla de rfaf.es en `CLAUDE.md` («una al día» → «los lunes a las 09:00»).

## Fuera de alcance

- Cambiar destinatarios o remitente desde la pantalla.
- Tabla de clasificación completa.
- Informes de otros periodos (mensual…), PDF adjunto, estadísticas de jugadores.
- Pedir más datos a rfaf.es: se usa solo lo que ya se copia.

## Lo que sería un fracaso

- Que salga un email desde local o un email duplicado el mismo lunes.
- Que el email salga sin la clasificación de la jornada recién jugada cuando la copia de las 09:00 funcionó.
- Que salga un lunes sin jornada.
