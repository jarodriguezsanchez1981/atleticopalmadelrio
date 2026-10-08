/** Plantilla de la firma de correo del club (sección Firma Email).
 *
 * Los clientes de correo (Gmail, Outlook…) ignoran las hojas de estilo y las
 * clases: la firma se maqueta con tablas y estilos en línea, y el escudo se
 * enlaza por URL pública (una versión pequeña, escudo-firma.png). */

export const NOMBRE_CLUB = 'Palma del Río Atlético C.F.';
export const URL_ESCUDO = 'https://intranet.atleticopalmadelrio.com/escudo-firma.png';

export const AVISO_LEGAL_POR_DEFECTO =
  'Este mensaje y sus archivos adjuntos son confidenciales y se dirigen exclusivamente a su destinatario. ' +
  'Si lo ha recibido por error, comuníquelo al remitente y elimínelo. Sus datos personales son tratados por ' +
  `${NOMBRE_CLUB} para gestionar esta comunicación; puede ejercer sus derechos de acceso, rectificación, ` +
  'supresión y demás reconocidos por el RGPD respondiendo a este correo.';

export const DATOS_POR_DEFECTO = {
  nombre: '',
  cargo: '',
  telefono: '',
  email: '',
  web: '',
  direccion: 'Palma del Río (Córdoba)',
  colorPrincipal: '#0F3D22',
  colorSecundario: '#7A1E2B',
  mostrarEscudo: true,
  mostrarAviso: true,
  aviso: AVISO_LEGAL_POR_DEFECTO
};

export function escaparHtml(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

/** Solo colores #rgb / #rrggbb (van dentro de atributos style). */
function color(valor, porDefecto) {
  return /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(String(valor || '')) ? valor : porDefecto;
}

/** Enlace web con protocolo (si se escribe "club.es" se enlaza https://club.es). */
function urlWeb(web) {
  const limpio = String(web || '').trim();
  if (!limpio) return '';
  return /^https?:\/\//i.test(limpio) ? limpio : `https://${limpio}`;
}

/** HTML de la firma a partir de los datos del formulario. */
export function generarFirmaHtml(datos = {}) {
  const d = { ...DATOS_POR_DEFECTO, ...datos };
  const c1 = color(d.colorPrincipal, DATOS_POR_DEFECTO.colorPrincipal);
  const c2 = color(d.colorSecundario, DATOS_POR_DEFECTO.colorSecundario);
  const linea = (contenido) => `<div style="margin:0;padding:0;">${contenido}</div>`;
  const lineas = [];

  if (d.nombre) lineas.push(`<div style="margin:0;padding:0;font-size:16px;font-weight:bold;color:${c1};">${escaparHtml(d.nombre)}</div>`);
  if (d.cargo) lineas.push(`<div style="margin:0 0 6px 0;padding:0;font-size:13px;font-weight:bold;color:${c2};">${escaparHtml(d.cargo)}</div>`);
  lineas.push(`<div style="margin:0;padding:0;font-size:13px;font-weight:bold;color:#333333;">${escaparHtml(NOMBRE_CLUB)}</div>`);
  if (d.telefono) {
    const tel = String(d.telefono).replace(/[^\d+]/g, '');
    lineas.push(linea(`Tel. <a href="tel:${escaparHtml(tel)}" style="color:#333333;text-decoration:none;">${escaparHtml(d.telefono)}</a>`));
  }
  if (d.email) {
    lineas.push(linea(`<a href="mailto:${escaparHtml(d.email)}" style="color:${c1};text-decoration:none;">${escaparHtml(d.email)}</a>`));
  }
  if (d.web) {
    lineas.push(linea(`<a href="${escaparHtml(urlWeb(d.web))}" style="color:${c1};text-decoration:none;">${escaparHtml(String(d.web).replace(/^https?:\/\//i, ''))}</a>`));
  }
  if (d.direccion) lineas.push(`<div style="margin:0;padding:0;color:#777777;">${escaparHtml(d.direccion)}</div>`);

  const celdaEscudo = d.mostrarEscudo
    ? `<td style="padding:0 14px 0 0;vertical-align:middle;border-right:3px solid ${c1};">` +
      `<img src="${URL_ESCUDO}" width="71" height="80" alt="${escaparHtml(NOMBRE_CLUB)}" style="display:block;border:0;width:71px;height:80px;">` +
      '</td>'
    : '';
  const sangria = d.mostrarEscudo ? 'padding:0 0 0 14px;' : `padding:0 0 0 10px;border-left:3px solid ${c1};`;
  const aviso = d.mostrarAviso && d.aviso
    ? `<tr><td colspan="${d.mostrarEscudo ? 2 : 1}" style="padding:12px 0 0 0;font-size:10px;line-height:1.4;color:#999999;max-width:560px;">${escaparHtml(d.aviso)}</td></tr>`
    : '';

  return (
    '<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.45;color:#333333;">' +
    `<tr>${celdaEscudo}<td style="${sangria}vertical-align:middle;">${lineas.join('')}</td></tr>` +
    aviso +
    '</table>'
  );
}
