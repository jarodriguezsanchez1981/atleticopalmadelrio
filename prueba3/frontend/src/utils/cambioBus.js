const suscriptores = new Set();

/**
 * Emite un evento global de "datos modificados". Lo lanzan las tablas,
 * formularios de calendario y borrados para que las secciones que
 * muestran datos relacionados (desplegables, calendarios) se refresquen.
 */
export function emitirCambio() {
  suscriptores.forEach((fn) => {
    try { fn(); } catch { /* noop */ }
  });
}

export function suscribirseCambio(fn) {
  suscriptores.add(fn);
  return () => suscriptores.delete(fn);
}