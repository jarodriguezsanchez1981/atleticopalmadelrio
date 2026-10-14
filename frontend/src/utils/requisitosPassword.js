/**
 * Requisitos de la contraseña (los mismos que PASSWORD_REGEX del backend,
 * backend/src/utils/password.utils.js), uno a uno para ir marcando en la
 * pantalla Cambiar Contraseña los que ya se cumplen.
 */
export const REQUISITOS_PASSWORD = [
  { clave: 'longitud', texto: 'Mínimo 8 caracteres', cumple: (p) => p.length >= 8 },
  { clave: 'minuscula', texto: 'Una letra minúscula', cumple: (p) => /[a-z]/.test(p) },
  { clave: 'mayuscula', texto: 'Una letra mayúscula', cumple: (p) => /[A-Z]/.test(p) },
  { clave: 'numero', texto: 'Un número', cumple: (p) => /\d/.test(p) },
  { clave: 'simbolo', texto: 'Un símbolo', cumple: (p) => /[^A-Za-z0-9]/.test(p) },
  // El backend no admite espacios ni otros caracteres en blanco.
  { clave: 'espacios', texto: 'Sin espacios', cumple: (p) => p.length > 0 && !/\s/.test(p) }
];

/** [{ clave, texto, ok }] de la contraseña escrita. */
export function estadoRequisitos(password) {
  const p = String(password || '');
  return REQUISITOS_PASSWORD.map((r) => ({ clave: r.clave, texto: r.texto, ok: r.cumple(p) }));
}

export function passwordValida(password) {
  return estadoRequisitos(password).every((r) => r.ok);
}
