# Generar Torneo — diseño

Fecha: 29/10/2026 · Estado: aprobado para construir en local

## Para qué

El club organiza torneos de Fútbol 7 (p. ej. Torneo de Navidad) en sus instalaciones. Hoy el cuadro de partidos y horarios se hace a mano. La sección **Generar Torneo** permite definir el torneo, que la web reparta sola los partidos por campos y horas, guardarlo para poder retocarlo (sobre todo cuando un equipo avisa de que no viene) y sacar un **PDF** con toda la información para repartir el día del torneo.

## Decidido con el usuario

- Sección nueva **«Generar Torneo»** dentro del apartado **Club** del menú.
- Un torneo tiene **nombre** y una o varias **categorías**, solo de **Fútbol 7**.
- **Cada categoría es un torneo independiente**: sus equipos, sus grupos, sus eliminatorias y su propia hora de comienzo y de final. Si hay dos categorías, en la práctica una juega por la mañana y otra por la tarde (no compiten por los campos; no hace falta cruzar horarios entre categorías).
- Por categoría se indica:
  - **Equipos** que juegan, elegidos de la tabla `equipos`.
  - **Campos disponibles**: Anexo campo 1, Anexo campo 2, Estadio campo 1, Estadio campo 2 (uno o varios).
  - **Hora de comienzo** y **hora de final**: son **informativas** (salen en la descripción y en el PDF). Siempre hay retrasos, así que la hora de final **no limita** el reparto.
  - **Duración de cada partido** (minutos).
  - **Formato**: **todos contra todos** o **por grupos**.
- **Por grupos**: como máximo **2 grupos (A y B)**. Los equipos se asignan **a mano** a cada grupo; el número de equipos por grupo es el que resulte. Más de 2 grupos queda para el futuro.
  - **Semifinales** (opcional): SF1 = 1º A – 2º B; SF2 = 1º B – 2º A.
  - **Final de Oro** (opcional): ganadores de las semifinales; si no hay semifinales, 1º A – 1º B.
  - **Final de Plata** (opcional): perdedores de las semifinales; si no hay semifinales, 2º A – 2º B.
- **Todos contra todos**: sin semifinales. **Final de Oro** 1º – 2º y **Final de Plata** 3º – 4º (cada una opcional).
- El torneo **se guarda** y se puede **editar** (quitar/añadir equipos, cambiar opciones) y volver a generar.
- Resultado: **PDF** con toda la información del torneo y el **escudo del club**.
- **Puede haber varios equipos del PALMA (o de un mismo club) en una categoría** (p. ej. «PALMA A» y «PALMA B»): cada inscripción lleva un **nombre a mostrar**, que por defecto es el nombre del equipo y se puede cambiar.
- **Todos los equipos tienen que estar en la tabla Equipos** (si falta alguno, se da de alta antes en la sección Equipos). No hay equipos escritos a mano.
- **Retocar = cambiar los datos y volver a generar.** No se mueven partidos sueltos a mano; por eso los partidos no se guardan.

## Decisiones mías (revisables)

- **Fecha del torneo**: campo del torneo (una fecha para todo el torneo).
- **Descanso entre partidos** (minutos, por categoría, por defecto 0). Cada turno dura `duración + descanso`.
- **Campos**: lista fija en código (`Anexo 1`, `Anexo 2`, `Estadio 1`, `Estadio 2`), no se sacan de `lugares`.
- **Los partidos no se guardan** (confirmado: retocar es cambiar datos y regenerar): se calculan siempre a partir de lo guardado (algoritmo determinista). No se apuntan resultados.
- **Eliminatorias sin nombres**: «SF1: 1º A – 2º B», «ORO: Ganador SF1 – Ganador SF2»…
- **Aviso suave**: si el último partido termina después de la hora de final, la pantalla lo indica (no bloquea).
- **Validaciones** (bloquean guardar):
  - Todos contra todos: al menos 2 equipos; Final de Oro exige ≥ 2 y Final de Plata ≥ 4.
  - Por grupos: los dos grupos con al menos 2 equipos; todos los equipos elegidos tienen grupo. Semifinales exigen ≥ 2 equipos por grupo (ya garantizado); Final de Plata sin semifinales igual.
  - Al menos un campo, duración > 0, hora de comienzo obligatoria.
  - Dos inscripciones de la misma categoría no pueden tener el mismo nombre a mostrar (el mismo equipo sí puede repetirse con nombres distintos).
- **Permisos**: sección con clave `generar_torneo`, grupo `club`. La migración la da a quien ya tiene la sección `torneo` (mismos `puede_ver`/`puede_editar`); el resto se asigna desde Administración. No se liga a plantillas, así que no lleva regla de `restringirACategoria`.

## Reparto de partidos (algoritmo)

Por categoría, independiente de las demás:

1. **Fase de grupos / liga**: emparejamientos de todos contra todos con el método del círculo (con «descansa» si el número de equipos es impar), jornada a jornada. En grupos, se intercalan las jornadas del Grupo A y del B para que ambos avancen a la vez.
2. **Colocación**: los partidos se van metiendo en turnos sucesivos desde la hora de comienzo; cada turno tiene tantos huecos como campos elegidos. Regla de reparto: en cada turno se prefieren partidos cuyos dos equipos **no jugaron en el turno anterior**; si no hay, se pone el siguiente en orden. Un equipo nunca juega dos partidos en el mismo turno.
3. **Semifinales**: en el turno siguiente al último de la fase de grupos (SF1 y SF2 a la vez si hay ≥ 2 campos; si hay 1, en turnos seguidos).
4. **Finales**: en el turno siguiente a las semifinales (o a la fase de grupos si no hay). Oro y Plata a la vez si hay ≥ 2 campos (Oro en el primer campo elegido); con 1 campo, primero Plata y luego Oro.
5. Hora de cada turno = comienzo + n × (duración + descanso).

El algoritmo vive en una función pura (frontend, `utils/generarTorneo.js`) con tests: mismos datos → mismo resultado.

## Datos (migración nueva)

- `torneos_generados`: `id`, `nombre` (150), `fecha` (DATE), `observaciones` (TEXT, opcional), timestamps.
- `torneo_generado_categorias`: `id`, `id_torneo_generado` (FK, CASCADE), `id_categoria` (FK `categorias`), `hora_inicio` (TIME), `hora_fin` (TIME, opcional), `duracion_min`, `descanso_min` (def. 0), `campos` (JSON con las claves de campo), `formato` (`liga` | `grupos`), `semifinales`, `final_oro`, `final_plata` (booleanos). Única por (`id_torneo_generado`, `id_categoria`).
- `torneo_generado_equipos` (inscripciones): `id`, `id_torneo_generado_categoria` (FK, CASCADE), `id_equipo` (FK `equipos`), `nombre` (150, nombre a mostrar; por defecto el del equipo), `grupo` (`A` | `B` | NULL), `orden`. Única por (categoría del torneo, `nombre`). El algoritmo y el PDF identifican a cada participante por la inscripción, no por `id_equipo`.
- Sección `generar_torneo` en `secciones` (grupo `club`) y su copia de permisos.

## API

`/api/torneos-generados` con `authenticate` + `authorize('generar_torneo')` y `requireEditar` en escritura: listar, detalle (con categorías, equipos y nombre/escudo-URL de cada equipo), crear, editar (reemplaza categorías y equipos en una transacción) y borrar. Validaciones del apartado anterior también en backend (400 con mensaje en español). Tests en `backend/tests/torneoGenerado.controller.test.js`. La auditoría la hace el middleware.

## Pantalla

- **Lista** de torneos generados (nombre, fecha, categorías) con crear / editar / borrar / PDF, siguiendo el estilo de las tablas del resto (`estiloTabla`).
- **Formulario** (diálogo o página): nombre, fecha, observaciones; selector de categorías Fútbol 7; por cada categoría, una tarjeta/pestaña con horario, duración, descanso, campos, formato, opciones de semifinales/Oro/Plata y equipos (en grupos, dos listas A y B para asignarlos a mano).
- **Vista previa** del calendario generado por categoría (tabla hora × campo) y el aviso de hora de final.
- Debe verse bien en móvil (tablas con scroll horizontal).

## PDF

`utils/pdfGenerarTorneo.js` con jsPDF (como el resto de PDFs). Una página (o más si no cabe) por categoría:

1. Cabecera: escudo del club, nombre del torneo, «Atlético Palma del Río · Categoría X (Fútbol 7)».
2. Datos: fecha, horario (comienzo – final informativos), lugar/campos, duración + descanso, formato.
3. Grupos con sus equipos (o la lista de equipos en todos contra todos).
4. Horario de partidos: tabla hora × campo, separada en Fase de grupos / Semifinales / Finales; Oro y Plata destacadas.
5. Clasificación vacía por grupo (PJ, Pts) para rellenar a mano.

Colores del nuevo tema verde. Boceto aprobado en la sesión (un solo lugar → solo las columnas de esos campos).

## Fuera de alcance

- Apuntar resultados y calcular clasificaciones reales.
- Más de 2 grupos, cuartos de final, cruces distintos a los descritos.
- Coordinar horarios entre categorías.
- Relación con la sección «Torneo» existente (torneos/amistosos del calendario).

## Entrega

Primero solo en **local** (rebuild `backend` y `frontend`), sin commit ni despliegue hasta que el usuario lo pruebe y lo apruebe.
