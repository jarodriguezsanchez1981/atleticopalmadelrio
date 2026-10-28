/**
 * Reduce a LADO_MAX_ESCUDO los escudos ya guardados en la tabla equipos.
 * Los nuevos se reducen solos al guardarse (ver utils/escudo.utils.js).
 *
 *   node src/scripts/reducirEscudos.js --dry-run   # solo informa
 *   node src/scripts/reducirEscudos.js             # aplica los cambios
 */
require('../config/env');
const { Equipo, sequelize } = require('../models');
const { reducirEscudo } = require('../utils/escudo.utils');

const soloInforme = process.argv.includes('--dry-run');
const kb = (n) => Math.round(n / 1024);

(async () => {
  const ids = (await Equipo.findAll({ attributes: ['id'], raw: true, logging: false })).map((e) => e.id);
  let antes = 0, despues = 0, cambiados = 0;

  // De uno en uno: cargar todos los escudos a la vez son varios MB en memoria.
  for (const id of ids) {
    const equipo = await Equipo.findOne({ where: { id }, attributes: ['id', 'nombre', 'escudo'], logging: false });
    if (!equipo.escudo) continue;
    const nuevo = await reducirEscudo(equipo.escudo);
    antes += equipo.escudo.length;
    despues += nuevo.length;
    if (nuevo === equipo.escudo) continue;
    cambiados++;
    if (equipo.escudo.length > 100 * 1024) {
      console.log(`  ${equipo.nombre}: ${kb(equipo.escudo.length)} KB -> ${kb(nuevo.length)} KB`);
    }
    if (!soloInforme) await Equipo.update({ escudo: nuevo }, { where: { id }, logging: false });
  }

  console.log(`${soloInforme ? '[dry-run] ' : ''}Equipos: ${ids.length}, escudos reducidos: ${cambiados}, total ${kb(antes)} KB -> ${kb(despues)} KB`);
  await sequelize.close();
})().catch((err) => { console.error(err); process.exit(1); });
