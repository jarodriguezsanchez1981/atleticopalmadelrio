const TIPOS_FUTBOL = [
  { nombre: 'Futbol 7' },
  { nombre: 'Futbol 11' }
];

async function ensureTiposFutbol(TipoFutbol) {
  for (const t of TIPOS_FUTBOL) {
    await TipoFutbol.findOrCreate({
      where: { nombre: t.nombre },
      defaults: t
    });
  }
  return TipoFutbol.findAll({ order: [['id', 'ASC']] });
}

module.exports = { TIPOS_FUTBOL, ensureTiposFutbol };