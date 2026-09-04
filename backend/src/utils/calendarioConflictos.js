const { Op } = require('sequelize');

function diaSQL(fecha) {
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Una plantilla no puede tener más de un registro en el Calendario el mismo
 * día (p.ej. entrenamiento y partido a la vez, o dos entrenamientos el mismo
 * día). Comprueba si ya existe un entrenamiento, partido o torneo para esa
 * plantilla ese día, sin contar el propio tipo que se está guardando
 * (tipoActual) salvo que se pase su id a excluir (para permitir editar un
 * registro sin que choque contra sí mismo). Devuelve el tipo en conflicto
 * ('entrenamiento'|'partido'|'torneo') o null si no hay conflicto.
 */
async function otroTipoDeEventoMismoDia({
  models, idPlantilla, fecha, tipoActual,
  excluirEntrenamientoId = null, excluirPartidoId = null
}) {
  const dia = diaSQL(fecha);
  if (!idPlantilla || !dia) return null;
  const inicioDia = new Date(`${dia}T00:00:00`);
  const finDia = new Date(`${dia}T23:59:59.999`);
  const { Entrenamiento, Partido, Torneo } = models;

  if (tipoActual !== 'entrenamiento') {
    const where = { id_plantilla: idPlantilla, fecha: { [Op.gte]: inicioDia, [Op.lte]: finDia } };
    if (excluirEntrenamientoId) where.id = { [Op.ne]: excluirEntrenamientoId };
    const n = await Entrenamiento.count({ where });
    if (n > 0) return 'entrenamiento';
  }
  if (tipoActual !== 'partido') {
    const where = { id_plantilla: idPlantilla, fecha: { [Op.gte]: inicioDia, [Op.lte]: finDia } };
    if (excluirPartidoId) where.id = { [Op.ne]: excluirPartidoId };
    const n = await Partido.count({ where });
    if (n > 0) return 'partido';
  }
  if (tipoActual !== 'torneo') {
    const n = await Torneo.count({ where: { id_plantilla: idPlantilla, fecha: dia } });
    if (n > 0) return 'torneo';
  }
  return null;
}

module.exports = { otroTipoDeEventoMismoDia, diaSQL };
