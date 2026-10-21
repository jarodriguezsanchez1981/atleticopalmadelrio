/**
 * Segundo factor por TOTP (RFC 6238), compatible con Google Authenticator,
 * Authy, etc. El secreto se guarda CIFRADO con AES (aesCrypto) en reposo; aquí
 * solo se generan/verifican tokens y los códigos de recuperación.
 */
const { authenticator } = require('otplib');
const QRCode = require('qrcode');
const crypto = require('crypto');

// window: 1 → acepta el token del paso anterior y el siguiente (±30 s), para
// tolerar un pequeño desfase de reloj entre el servidor y el móvil.
authenticator.options = { window: 1 };

const SERVICIO = 'Intranet Atlético Palma del Río';
const NUM_CODIGOS_RECUPERACION = 10;

/** Nuevo secreto TOTP en base32 (texto plano; el llamador lo cifra antes de guardarlo). */
function generarSecreto() {
  return authenticator.generateSecret();
}

/** Comprueba un token de 6 dígitos contra el secreto (admite espacios). */
function verificarToken(token, secret) {
  try {
    return authenticator.check(String(token).replace(/\s+/g, ''), secret);
  } catch {
    return false;
  }
}

/** URL otpauth:// para el QR (la app la lee para dar de alta la cuenta). */
function construirOtpauth(usuario, secret) {
  return authenticator.keyuri(usuario, SERVICIO, secret);
}

/** QR de la URL otpauth como data URL (PNG) para mostrarlo en el navegador. */
function qrDataUrl(otpauth) {
  return QRCode.toDataURL(otpauth, { margin: 1, width: 240 });
}

/** Genera N códigos de recuperación de un solo uso, con formato XXXXX-XXXXX. */
function generarCodigosRecuperacion(n = NUM_CODIGOS_RECUPERACION) {
  const codigos = [];
  for (let i = 0; i < n; i++) {
    const raw = crypto.randomBytes(5).toString('hex').toUpperCase(); // 10 hex
    codigos.push(`${raw.slice(0, 5)}-${raw.slice(5)}`);
  }
  return codigos;
}

/** Normaliza un código de recuperación para comparar (sin guiones ni espacios). */
function normalizarCodigo(codigo) {
  return String(codigo || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

module.exports = {
  SERVICIO,
  NUM_CODIGOS_RECUPERACION,
  generarSecreto,
  verificarToken,
  construirOtpauth,
  qrDataUrl,
  generarCodigosRecuperacion,
  normalizarCodigo
};
