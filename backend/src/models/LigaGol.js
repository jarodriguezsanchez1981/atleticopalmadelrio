const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

/** Gol de un partido de la liga con su minuto. `lado`: equipo al que suma
 * (una propia puerta suma al rival de quien la marca); `titular`: si quien
 * marca era titular (NULL en propia puerta). */
const LigaGol = sequelize.define('LigaGol', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_liga_partido: { type: DataTypes.INTEGER, allowNull: false },
  lado: { type: DataTypes.ENUM('local', 'visitante'), allowNull: false },
  nombre: { type: DataTypes.STRING(150), allowNull: true },
  minuto: { type: DataTypes.INTEGER, allowNull: true },
  tipo: { type: DataTypes.ENUM('normal', 'penalti', 'propia'), allowNull: false, defaultValue: 'normal' },
  titular: { type: DataTypes.BOOLEAN, allowNull: true }
}, {
  tableName: 'liga_goles',
  timestamps: false
});

module.exports = LigaGol;
