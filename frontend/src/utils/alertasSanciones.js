/** Avisos de sanción por plantilla (Sanciones → pestañas), con las mismas reglas
 * que el Informe de Sanciones: solo partidos de liga (con jornada), ciclo de 5
 * amarillas y el último partido de liga ya jugado de cada plantilla. */
export const CICLO_AMARILLAS = 5;

const esLiga = (p) => Number(p?.jornada) > 0;

/** Último partido de liga de la plantilla con fecha anterior o igual a `ahora`. */
export function ultimoPartido(partidos, idPlantilla, ahora = new Date()) {
  let ultimo = null;
  for (const p of partidos) {
    if (p.id_plantilla !== idPlantilla || !esLiga(p) || !p.fecha) continue;
    const fecha = new Date(p.fecha);
    if (Number.isNaN(fecha.getTime()) || fecha > ahora) continue;
    if (!ultimo || fecha > new Date(ultimo.fecha)) ultimo = p;
  }
  return ultimo;
}

/**
 * @param sanciones filas de Sanciones (con `partido` incluido o `id_partido`)
 * @param partidos todos los partidos
 * @param plantillas plantillas a revisar (ya filtradas y ordenadas)
 * @returns {{ avisoAmarillas, sancionAmarillas, tarjetaRoja }} cada una lista de
 *   { id, categoria, jugador, amarillas, rojas, ultimo } (ultimo = partido)
 */
export function alertasSanciones(sanciones, partidos, plantillas, ahora = new Date()) {
  const porId = new Map(partidos.map((p) => [p.id, p]));
  const resultado = { avisoAmarillas: [], sancionAmarillas: [], tarjetaRoja: [] };
  for (const plantilla of plantillas) {
    const ultimo = ultimoPartido(partidos, plantilla.id, ahora);
    const porJugador = new Map();
    for (const s of sanciones) {
      const partido = s.partido || porId.get(s.id_partido);
      if (partido?.id_plantilla !== plantilla.id || !esLiga(partido)) continue;
      const amarillas = Number(s.amarilla) || 0;
      const rojas = Number(s.roja) || 0;
      if (!amarillas && !rojas) continue;
      const fila = porJugador.get(s.id_jugador) || {
        id: `${plantilla.id}-${s.id_jugador}`,
        categoria: plantilla.categoria?.nombre || '',
        jugador: s.jugador ? `${s.jugador.nombre} ${s.jugador.apellidos}` : '—',
        amarillas: 0, rojas: 0, amarillasUltimo: 0, rojasUltimo: 0, doblesUltimo: 0, ultimo
      };
      fila.amarillas += amarillas;
      fila.rojas += rojas;
      if (ultimo && (partido.id ?? s.id_partido) === ultimo.id) {
        fila.amarillasUltimo += amarillas;
        fila.rojasUltimo += rojas;
        // Doble amarilla (2 o más en el partido): expulsión, como una roja.
        if (amarillas >= 2) fila.doblesUltimo += 1;
      }
      porJugador.set(s.id_jugador, fila);
    }
    const filas = [...porJugador.values()].sort((a, b) => a.jugador.localeCompare(b.jugador, 'es'));
    for (const f of filas) {
      if (f.amarillas % CICLO_AMARILLAS === CICLO_AMARILLAS - 1) resultado.avisoAmarillas.push(f);
      // Completa un ciclo de 5 con las amarillas del último partido.
      if (Math.floor(f.amarillas / CICLO_AMARILLAS) > Math.floor((f.amarillas - f.amarillasUltimo) / CICLO_AMARILLAS)) {
        resultado.sancionAmarillas.push(f);
      }
      if (f.rojasUltimo > 0 || f.doblesUltimo > 0) resultado.tarjetaRoja.push(f);
    }
  }
  return resultado;
}
