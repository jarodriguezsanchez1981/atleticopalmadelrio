const LETRAS = 'TRWAGMYFPDXBNJZSQVHLCKE';

function mapearNie(nie) {
  const p = nie[0];
  if (p === 'X') return '0' + nie.slice(1);
  if (p === 'Y') return '1' + nie.slice(1);
  if (p === 'Z') return '2' + nie.slice(1);
  return nie;
}

/**
 * Valida un DNI español (8 dígitos + letra correcta) o un NIE
 * (X/Y/Z + 7 dígitos + letra correcta). Acepta espacios y minúsculas.
 */
function validarDNI(dni) {
  if (typeof dni !== 'string') return false;
  const valor = dni.trim().toUpperCase();

  if (/^\d{8}[A-Z]$/.test(valor)) {
    return LETRAS[parseInt(valor.slice(0, 8), 10) % 23] === valor[8];
  }
  if (/^[XYZ]\d{7}[A-Z]$/.test(valor)) {
    return LETRAS[parseInt(mapearNie(valor), 10) % 23] === valor[8];
  }
  return false;
}

module.exports = { validarDNI };