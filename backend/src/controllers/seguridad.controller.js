const { InformeSeguridad } = require('../models');

// Devuelve el último informe de seguridad de Docker (el que guarda el cron del
// EC2). Si todavía no hay ninguno, responde con `informe: null` en vez de 404,
// para que el frontend pueda distinguir "sin datos aún" de un error.
async function estado(req, res, next) {
  try {
    const informe = await InformeSeguridad.findOne({
      order: [['fecha', 'DESC'], ['id', 'DESC']]
    });
    res.json({ informe: informe || null });
  } catch (err) { next(err); }
}

module.exports = { estado };
