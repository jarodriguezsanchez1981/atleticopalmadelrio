const { CuentaCorreo } = require('../models');
const aes = require('../utils/aesCrypto');
const { enviarConConfig, conFirma } = require('../utils/mailer');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Tamaño máximo del HTML de la firma (la plantilla ocupa unos pocos KB).
const MAX_FIRMA = 50000;

/** Quita la contraseña cifrada de la respuesta y añade `tiene_password`. */
function serializar(cuenta) {
  const json = cuenta.toJSON ? cuenta.toJSON() : cuenta;
  const { smtp_password, ...safe } = json;
  safe.tiene_password = !!smtp_password;
  return safe;
}

/** Normaliza y valida los campos SMTP del body. Devuelve { datos } o { error }. */
function validar(body, { esNuevo }) {
  const etiqueta = String(body.etiqueta ?? '').trim();
  const email = String(body.email ?? '').trim();
  const smtp_host = String(body.smtp_host ?? '').trim();
  const smtp_user = String(body.smtp_user ?? '').trim();
  const smtp_port = Number(body.smtp_port);

  const faltan = [];
  if (!etiqueta) faltan.push('etiqueta');
  if (!email) faltan.push('email');
  if (!smtp_host) faltan.push('servidor SMTP');
  if (!smtp_user) faltan.push('usuario SMTP');
  if (faltan.length) return { error: `Faltan campos obligatorios: ${faltan.join(', ')}.` };
  if (!EMAIL_RE.test(email)) return { error: 'El email no tiene un formato válido.' };
  if (!Number.isInteger(smtp_port) || smtp_port < 1 || smtp_port > 65535) {
    return { error: 'El puerto SMTP debe ser un número entre 1 y 65535.' };
  }
  if (esNuevo && !String(body.smtp_password ?? '').trim()) {
    return { error: 'La contraseña SMTP es obligatoria al crear una cuenta.' };
  }
  // Firma: ambas o ninguna (sin firma).
  const firma_html = typeof body.firma_html === 'string' && body.firma_html.trim() ? body.firma_html : null;
  const firma_datos = firma_html && body.firma_datos && typeof body.firma_datos === 'object' ? body.firma_datos : null;
  if (firma_html && firma_html.length > MAX_FIRMA) return { error: 'La firma es demasiado larga.' };
  return {
    datos: {
      etiqueta, email, smtp_host, smtp_user, smtp_port,
      smtp_secure: !!body.smtp_secure,
      activa: !!body.activa,
      firma_datos,
      firma_html: firma_datos ? firma_html : null
    }
  };
}

async function listar(req, res, next) {
  try {
    const cuentas = await CuentaCorreo.scope('conPassword').findAll({ order: [['id', 'ASC']] });
    res.json(cuentas.map(serializar));
  } catch (err) { next(err); }
}

async function obtener(req, res, next) {
  try {
    const cuenta = await CuentaCorreo.scope('conPassword').findByPk(req.params.id);
    if (!cuenta) return res.status(404).json({ message: 'Cuenta de correo no encontrada.' });
    res.json(serializar(cuenta));
  } catch (err) { next(err); }
}

async function crear(req, res, next) {
  try {
    const { datos, error } = validar(req.body, { esNuevo: true });
    if (error) return res.status(400).json({ message: error });

    const nueva = await CuentaCorreo.create({
      ...datos,
      smtp_password: aes.encrypt(String(req.body.smtp_password))
    });

    const completa = await CuentaCorreo.scope('conPassword').findByPk(nueva.id);
    res.status(201).json(serializar(completa));
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const cuenta = await CuentaCorreo.scope('conPassword').findByPk(req.params.id);
    if (!cuenta) return res.status(404).json({ message: 'Cuenta de correo no encontrada.' });

    const { datos, error } = validar(req.body, { esNuevo: false });
    if (error) return res.status(400).json({ message: error });

    const cambios = { ...datos };
    // La contraseña solo se cambia si se envía una nueva (no vacía); si no, se
    // mantiene la que había (no se puede ver, solo reemplazar).
    const nuevaPass = String(req.body.smtp_password ?? '').trim();
    if (nuevaPass) cambios.smtp_password = aes.encrypt(nuevaPass);

    await cuenta.update(cambios);

    const completa = await CuentaCorreo.scope('conPassword').findByPk(cuenta.id);
    res.json(serializar(completa));
  } catch (err) { next(err); }
}

async function eliminar(req, res, next) {
  try {
    const eliminado = await CuentaCorreo.destroy({ where: { id: req.params.id } });
    if (!eliminado) return res.status(404).json({ message: 'Cuenta de correo no encontrada.' });
    res.status(204).send();
  } catch (err) { next(err); }
}

/** Envía un correo de prueba usando la configuración de esta cuenta, para
 * comprobar que las credenciales SMTP funcionan. */
async function probar(req, res, next) {
  try {
    const cuenta = await CuentaCorreo.scope('conPassword').findByPk(req.params.id);
    if (!cuenta) return res.status(404).json({ message: 'Cuenta de correo no encontrada.' });
    if (!cuenta.smtp_password) return res.status(400).json({ message: 'La cuenta no tiene contraseña configurada.' });

    const destino = String((req.body && req.body.destino) || '').trim() || cuenta.email;
    if (!EMAIL_RE.test(destino)) return res.status(400).json({ message: 'El email de destino no es válido.' });

    const cfg = {
      host: cuenta.smtp_host,
      port: Number(cuenta.smtp_port) || 587,
      secure: !!cuenta.smtp_secure,
      user: cuenta.smtp_user,
      pass: aes.decrypt(cuenta.smtp_password),
      from: cuenta.etiqueta ? `${cuenta.etiqueta} <${cuenta.email}>` : cuenta.email
    };
    try {
      await enviarConConfig(cfg, {
        to: destino,
        subject: 'Correo de prueba — Atlético Palma del Río',
        text: `Este es un correo de prueba de la cuenta "${cuenta.etiqueta}" de la intranet del Atlético Palma del Río. Si lo recibes, la configuración SMTP funciona.`,
        html: conFirma(`<p>Este es un correo de prueba de la cuenta <strong>${cuenta.etiqueta}</strong> de la intranet del Atlético Palma del Río.</p><p>Si lo recibes, la configuración SMTP funciona.</p>`, cuenta.firma_html)
      });
    } catch (err) {
      return res.status(502).json({ message: `No se pudo enviar el correo de prueba: ${err.message}` });
    }
    res.json({ message: `Correo de prueba enviado a ${destino}.` });
  } catch (err) { next(err); }
}

module.exports = { listar, obtener, crear, actualizar, eliminar, probar };
