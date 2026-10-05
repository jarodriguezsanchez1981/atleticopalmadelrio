import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { Sequelize } = require('sequelize');
const { camposDniCifrado, ocultarDniCifrado, whereDni } = require('../src/utils/dniCrypto.mixin.js');

// Modelo real de Sequelize (sin conexión) con los campos del DNI cifrado.
const sequelize = new Sequelize('sqlite::memory:', { logging: false, dialectModule: {} });
const Persona = sequelize.define('Persona', { nombre: Sequelize.STRING, ...camposDniCifrado() }, { tableName: 'personas' });
ocultarDniCifrado(Persona);

describe('dniCrypto.mixin', () => {
  it('cifra al asignar y descifra al leer, normalizando el DNI', () => {
    const p = Persona.build({ nombre: 'Ana', dni: ' 12345678z ' });
    expect(p.dni).toBe('12345678Z');
    expect(p.getDataValue('dni_encrypted')).not.toContain('12345678');
    expect(p.getDataValue('dni_hash')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('el mismo DNI da siempre el mismo hash (para buscar y evitar duplicados)', () => {
    const a = Persona.build({ dni: '12345678Z' });
    const b = Persona.build({ dni: '12345678z' });
    expect(a.getDataValue('dni_hash')).toBe(b.getDataValue('dni_hash'));
    expect(a.getDataValue('dni_encrypted')).not.toBe(b.getDataValue('dni_encrypted'));
    expect(whereDni('12345678z')).toEqual({ dni_hash: a.getDataValue('dni_hash') });
  });

  it('vaciar el DNI borra el cifrado y el hash', () => {
    const p = Persona.build({ dni: '12345678Z' });
    p.dni = '';
    expect(p.dni).toBeNull();
    expect(p.getDataValue('dni_encrypted')).toBeNull();
    expect(p.getDataValue('dni_hash')).toBeNull();
  });

  it('el JSON muestra el DNI en claro pero no las columnas del cifrado', () => {
    const json = Persona.build({ nombre: 'Ana', dni: '12345678Z' }).toJSON();
    expect(json.dni).toBe('12345678Z');
    expect(json).not.toHaveProperty('dni_encrypted');
    expect(json).not.toHaveProperty('dni_hash');
  });
});
