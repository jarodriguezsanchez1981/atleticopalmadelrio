// Middleware centralizado de errores. Se coloca el último en la cadena de app.js.
function errorHandler(err, req, res, next) {
  console.error(err);

  const esProduccion = process.env.NODE_ENV === 'production';

  // express.json(): cuerpo con JSON mal formado o por encima del límite.
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'El cuerpo de la petición no es un JSON válido.' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ message: 'La petición supera el tamaño máximo permitido.' });
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({ message: 'El registro ya existe (violación de unicidad).', detail: err.errors?.map(e => e.message) });
  }
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(409).json({ message: 'Operación no permitida: hay registros relacionados o la referencia no existe.' });
  }
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({ message: 'Datos inválidos.', detail: err.errors?.map(e => e.message) });
  }

  return res.status(err.status || 500).json({
    message: esProduccion ? 'Error interno del servidor.' : (err.message || 'Error interno del servidor.')
  });
}

module.exports = errorHandler;
