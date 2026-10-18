/**
 * Definición de las columnas de cada tabla de Estadísticas (una entrada por
 * métrica: campo, título y tooltips). Cada métrica sale en Total, Local y
 * Visitante (salvo las de `soloLados`); ver TablaEstadistica.
 *
 * Se comparten entre la vista de Senior A (views/estadisticas/Estadisticas.vue)
 * y la de estadísticas por categoría (views/estadisticas/EstadisticasCategoria.vue)
 * para que las columnas no se dupliquen ni se desincronicen.
 */
export const METRICAS_EQUIPO = [
  { campo: 'partidos', titulo: 'PAR', descripcion: 'Partidos jugados' },
  { campo: 'victorias', titulo: 'G', descripcion: 'Ganados' },
  { campo: 'empates', titulo: 'E', descripcion: 'Empatados' },
  { campo: 'derrotas', titulo: 'P', descripcion: 'Perdidos' },
  { campo: 'goles_favor', titulo: 'GF', descripcion: 'Goles a favor', subgrupo: 'Goles' },
  { campo: 'goles_contra', titulo: 'GC', descripcion: 'Goles en contra', subgrupo: 'Goles' },
  { campo: 'goles_penalti_favor', titulo: 'GP', descripcion: 'Goles de penalti', subgrupo: 'Goles' },
  { campo: 'goles_penalti_contra', titulo: 'GEP', descripcion: 'Goles en contra de penalti', subgrupo: 'Goles' },
  { campo: 'media_goles_favor', titulo: 'Media GF\npor partido', descripcion: 'Media de goles a favor por partido', decimal: true, subgrupo: 'Goles', calculo: 'GF / PAR' },
  { campo: 'media_goles_contra', titulo: 'Media GC\npor partido', descripcion: 'Media de goles en contra por partido', decimal: true, subgrupo: 'Goles', calculo: 'GC / PAR' },
  { campo: 'media_goles_titulares', titulo: 'Media Goles\nTitulares', descripcion: 'Media de goles por partido marcados por titulares', decimal: true, subgrupo: 'Goles', calculo: 'Goles titulares\n/ PAR' },
  { campo: 'media_goles_suplentes', titulo: 'Media Goles\nSuplentes', descripcion: 'Media de goles por partido marcados por suplentes que entraron', decimal: true, subgrupo: 'Goles', calculo: 'Goles suplentes\n/ PAR' },
  { campo: 'tarjetas_amarillas', titulo: 'TA', descripcion: 'Tarjetas amarillas', subgrupo: 'Sanciones' },
  { campo: 'tarjetas_rojas', titulo: 'TR', descripcion: 'Tarjetas rojas', subgrupo: 'Sanciones' },
  { campo: 'media_amarillas', titulo: 'Media TA\npor partido', descripcion: 'Media de tarjetas amarillas por partido', decimal: true, subgrupo: 'Sanciones', calculo: 'TA / PAR' },
  { campo: 'media_rojas', titulo: 'Media TR\npor partido', descripcion: 'Media de tarjetas rojas por partido', decimal: true, subgrupo: 'Sanciones', calculo: 'TR / PAR' },
  { campo: 'media_amarillas_titulares', titulo: 'Media TA\nTitulares', descripcion: 'Media de tarjetas amarillas por partido de los titulares', decimal: true, subgrupo: 'Sanciones', calculo: 'TA titulares\n/ PAR' },
  { campo: 'media_amarillas_suplentes', titulo: 'Media TA\nSuplentes', descripcion: 'Media de tarjetas amarillas por partido de los suplentes', decimal: true, subgrupo: 'Sanciones', calculo: 'TA suplentes\n/ PAR' },
  { campo: 'media_rojas_titulares', titulo: 'Media TR\nTitulares', descripcion: 'Media de tarjetas rojas por partido de los titulares', decimal: true, subgrupo: 'Sanciones', calculo: 'TR titulares\n/ PAR' },
  { campo: 'media_rojas_suplentes', titulo: 'Media TR\nSuplentes', descripcion: 'Media de tarjetas rojas por partido de los suplentes', decimal: true, subgrupo: 'Sanciones', calculo: 'TR suplentes\n/ PAR' }
];
export const METRICAS_CONVOCATORIAS = [
  { campo: 'convocatorias', titulo: 'Conv.', descripcion: 'Convocatorias' },
  { campo: 'titular', titulo: 'Tit.', descripcion: 'Titular' },
  { campo: 'suplente', titulo: 'Supl.', descripcion: 'Suplente' },
  { campo: 'banquillo_no_jugados', titulo: 'Sin jugar' },
  { campo: 'sustituciones', titulo: 'Sust.', descripcion: 'Sustitución' },
  { campo: 'sustituciones_primera', titulo: 'Sust. 1 Parte', descripcion: 'Sustituido en la 1ª parte (hasta el minuto 45)' },
  { campo: 'sustituciones_segunda', titulo: 'Sust. 2 Parte', descripcion: 'Sustituido en la 2ª parte' }
];
export const METRICAS_TIEMPO = [
  { campo: 'partidos', titulo: 'Partidos' },
  { campo: 'minutos', titulo: 'Min.', descripcion: 'Minutos' },
  { campo: 'porcentaje_minutos', titulo: '% Min.\njugados', descripcion: '% Minutos jugados', porcentaje: true, calculo: 'Min. / (Partidos\njugados × 90) × 100' },
  { campo: 'porcentaje_minutos_equipo', titulo: '% Min. Jugados\nTotal Partidos', descripcion: '% Minutos jugados sobre el total de partidos del equipo', porcentaje: true, calculo: 'Min. / (Partidos\ndel equipo × 90) × 100' },
  { campo: 'minutos_titular', titulo: 'Min.\nTit.', descripcion: 'Minutos Titular' },
  { campo: 'minutos_banquillo', titulo: 'Min.\nSupl.', descripcion: 'Minutos Suplente' }
];
export const METRICAS_GOLES = [
  { campo: 'partidos', titulo: 'Partidos' },
  { campo: 'goles', titulo: 'Goles' },
  { campo: 'porcentaje_goles', titulo: '% de sus\ngoles', porcentaje: true, soloLados: true, calculo: 'Goles / Goles\nde Total × 100' },
  // Títulos por defecto para 90' (Fútbol 11 / Senior A); la vista por categoría
  // los recalcula según la duración del tipo de fútbol (Fútbol 7 no juega 90').
  { campo: 'goles_1t1', titulo: '0-15', subgrupo: '1ª Parte', descripcionSubgrupo: 'Goles por tramo en la 1ª parte', descripcion: 'Goles en el 1er tramo de la 1ª parte' },
  { campo: 'goles_1t2', titulo: '16-30', subgrupo: '1ª Parte', descripcionSubgrupo: 'Goles por tramo en la 1ª parte', descripcion: 'Goles en el 2º tramo de la 1ª parte' },
  { campo: 'goles_1t3', titulo: '31-45', subgrupo: '1ª Parte', descripcionSubgrupo: 'Goles por tramo en la 1ª parte', descripcion: 'Goles en el 3er tramo de la 1ª parte (incluye el añadido)' },
  { campo: 'goles_2t1', titulo: '46-60', subgrupo: '2ª Parte', descripcionSubgrupo: 'Goles por tramo en la 2ª parte', descripcion: 'Goles en el 1er tramo de la 2ª parte' },
  { campo: 'goles_2t2', titulo: '61-75', subgrupo: '2ª Parte', descripcionSubgrupo: 'Goles por tramo en la 2ª parte', descripcion: 'Goles en el 2º tramo de la 2ª parte' },
  { campo: 'goles_2t3', titulo: '76-90', subgrupo: '2ª Parte', descripcionSubgrupo: 'Goles por tramo en la 2ª parte', descripcion: 'Goles en el 3er tramo de la 2ª parte (incluye el añadido)' },
  { campo: 'goles_titular', titulo: 'Goles', subgrupo: 'Tit.', descripcionSubgrupo: 'Titular' },
  { campo: 'porcentaje_goles_titular', titulo: '% Goles', porcentaje: true, subgrupo: 'Tit.', descripcionSubgrupo: 'Titular', calculo: 'Goles Tit. /\nGoles × 100' },
  { campo: 'goles_banquillo', titulo: 'Goles', subgrupo: 'Supl.', descripcionSubgrupo: 'Suplente' },
  { campo: 'porcentaje_goles_banquillo', titulo: '% Goles', porcentaje: true, subgrupo: 'Supl.', descripcionSubgrupo: 'Suplente', calculo: 'Goles Supl. /\nGoles × 100' },
  { campo: 'porcentaje_goles_partido', titulo: '% por\npartido', descripcion: '% de partidos jugados en los que marca', porcentaje: true, calculo: 'Partidos con gol /\nPartidos × 100' }
];
// Solo la parte de goles de Estadísticas Equipo (partidos + goles, sin
// tarjetas): se muestra también como tabla del equipo en Estadísticas Goles.
export const METRICAS_EQUIPO_GOLES = METRICAS_EQUIPO.filter((m) => m.campo === 'partidos' || m.subgrupo === 'Goles');
// Solo la parte de tarjetas de Estadísticas Equipo (partidos + sanciones): se
// muestra también como tabla del equipo en Estadísticas Sanciones.
export const METRICAS_EQUIPO_TARJETAS = METRICAS_EQUIPO.filter((m) => m.campo === 'partidos' || m.subgrupo === 'Sanciones');
// Goles del equipo contrario por periodo (tabla aparte en Estadísticas Goles).
// Mismos tramos que METRICAS_GOLES; los títulos por defecto son para 90'.
export const METRICAS_GOLES_CONTRA = [
  { campo: 'goles_contra', titulo: 'Goles', descripcion: 'Goles en contra (del resultado del partido)' },
  { campo: 'contra_1t1', titulo: '0-15', subgrupo: '1ª Parte', descripcionSubgrupo: 'Goles en contra por tramo en la 1ª parte', descripcion: 'Goles en contra en el 1er tramo de la 1ª parte' },
  { campo: 'contra_1t2', titulo: '16-30', subgrupo: '1ª Parte', descripcionSubgrupo: 'Goles en contra por tramo en la 1ª parte', descripcion: 'Goles en contra en el 2º tramo de la 1ª parte' },
  { campo: 'contra_1t3', titulo: '31-45', subgrupo: '1ª Parte', descripcionSubgrupo: 'Goles en contra por tramo en la 1ª parte', descripcion: 'Goles en contra en el 3er tramo de la 1ª parte (incluye el añadido)' },
  { campo: 'contra_2t1', titulo: '46-60', subgrupo: '2ª Parte', descripcionSubgrupo: 'Goles en contra por tramo en la 2ª parte', descripcion: 'Goles en contra en el 1er tramo de la 2ª parte' },
  { campo: 'contra_2t2', titulo: '61-75', subgrupo: '2ª Parte', descripcionSubgrupo: 'Goles en contra por tramo en la 2ª parte', descripcion: 'Goles en contra en el 2º tramo de la 2ª parte' },
  { campo: 'contra_2t3', titulo: '76-90', subgrupo: '2ª Parte', descripcionSubgrupo: 'Goles en contra por tramo en la 2ª parte', descripcion: 'Goles en contra en el 3er tramo de la 2ª parte (incluye el añadido)' }
];
export const METRICAS_SANCIONES = [
  { campo: 'partidos', titulo: 'Partidos' },
  { campo: 'tarjetas_amarillas', titulo: 'Total', subgrupo: 'Amarillas' },
  { campo: 'amarillas_primera', titulo: '1ª Parte', subgrupo: 'Amarillas' },
  { campo: 'amarillas_segunda', titulo: '2ª Parte', subgrupo: 'Amarillas' },
  { campo: 'amarillas_ganando', titulo: 'Ganando', subgrupo: 'Amarillas' },
  { campo: 'amarillas_perdiendo', titulo: 'Perdiendo', subgrupo: 'Amarillas' },
  { campo: 'dobles_amarillas', titulo: 'Dobles', subgrupo: 'Amarillas', descripcion: 'Partidos en los que vio 2 o más amarillas (doble amarilla)' },
  { campo: 'tarjetas_rojas', titulo: 'Total', subgrupo: 'Rojas' },
  { campo: 'rojas_primera', titulo: '1ª Parte', subgrupo: 'Rojas' },
  { campo: 'rojas_segunda', titulo: '2ª Parte', subgrupo: 'Rojas' },
  { campo: 'rojas_ganando', titulo: 'Ganando', subgrupo: 'Rojas' },
  { campo: 'rojas_perdiendo', titulo: 'Perdiendo', subgrupo: 'Rojas' }
];
