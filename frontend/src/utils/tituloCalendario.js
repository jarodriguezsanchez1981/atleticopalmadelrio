const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

const DIAS_SEMANA = [
  'domingo', 'lunes', 'martes', 'miércoles',
  'jueves', 'viernes', 'sábado'
];

function diasDeDiferencia(start, end) {
  if (!start || !end) return 0;
  return Math.round((end - start) / 86400000);
}

function textoDia(marker) {
  const d = new Date(marker);
  const dia = d.getUTCDate();
  const mes = MESES[d.getUTCMonth()];
  const año = d.getUTCFullYear();
  const diaSemana = DIAS_SEMANA[d.getUTCDay()];
  return `${diaSemana} ${dia} ${mes} ${año}`;
}

function textoMes(marker) {
  const d = new Date(marker);
  return `${MESES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/**
 * Formatea el título del calendario sin "de" (ej.: "agosto 2026").
 * Compatible con FullCalendar v6 (recibe un VerboseFormattingArg con
 * `start`/`end` como ExpandedZonedMarker).
 */
export function tituloCalendario(arg) {
  const inicio = arg?.start?.marker;
  const fin = arg?.end?.marker;
  const dias = diasDeDiferencia(inicio, fin);
  if (!inicio) return '';
  if (dias >= 360) return String(new Date(inicio).getUTCFullYear());
  if (dias >= 28) return textoMes(inicio);
  if (dias >= 6) return `${textoDia(inicio)} – ${textoDia(fin)}`;
  return textoDia(inicio);
}
