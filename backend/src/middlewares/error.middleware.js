// Middleware centralizado de errores. Se coloca el último en la cadena de app.js.
function errorHandler(err, req, res, next) {
  console.error(err);

  const esProduccion = process.env.NODE_ENV === 'production';

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
