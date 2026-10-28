/**
 * Permisos del usuario en el token de sesión, en forma compacta: el token va
 * en una cookie, y con todas las secciones como { clave: { ver, editar } }
 * (más la lista de claves) pasaba de ~3,5 KB: nginx rechazaba la respuesta del
 * login ("upstream sent too big header") y el navegador no admite cookies de
 * más de 4 KB.
 *
 * En el token: s = claves de sus secciones; e = las que puede editar ('*' =
 * todas); n = las que tiene sin "ver" (casi nunca; se omite si no hay).
 * El middleware de autenticación lo vuelve a expandir a req.user.secciones /
 * req.user.permisos, así que el resto del backend no cambia.
 */
function comprimirPermisos(permisos = {}) {
  const s = Object.keys(permisos);
  const editables = s.filter((c) => permisos[c]?.editar);
  const sinVer = s.filter((c) => !permisos[c]?.ver);
  const compacto = { s, e: s.length && editables.length === s.length ? '*' : editables };
  if (sinVer.length) compacto.n = sinVer;
  return compacto;
}

/** Del token (compacto, o del formato antiguo con permisos) a { secciones, permisos }. */
function expandirPermisos(token = {}) {
  if (token.permisos) return { secciones: token.secciones || Object.keys(token.permisos), permisos: token.permisos };
  const secciones = Array.isArray(token.s) ? token.s : [];
  const editables = token.e === '*' ? new Set(secciones) : new Set(Array.isArray(token.e) ? token.e : []);
  const sinVer = new Set(Array.isArray(token.n) ? token.n : []);
  const permisos = {};
  for (const c of secciones) permisos[c] = { ver: !sinVer.has(c), editar: editables.has(c) };
  return { secciones, permisos };
}

module.exports = { comprimirPermisos, expandirPermisos };
