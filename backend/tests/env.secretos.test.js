import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { cargarSecretos } = require('../src/config/env.js');

describe('config/env · secretos en ficheros', () => {
  it('lee NOMBRE de NOMBRE_FILE sin el salto de línea final', () => {
    const env = { AES_SECRET_KEY_FILE: '/run/secrets/aes_secret_key', JWT_SECRET_FILE: '/run/secrets/jwt_secret' };
    const leer = vi.fn((ruta) => (ruta.endsWith('aes_secret_key') ? 'ab'.repeat(32) + '\n' : 'secreto'));
    cargarSecretos(env, leer);
    expect(env.AES_SECRET_KEY).toBe('ab'.repeat(32));
    expect(env.JWT_SECRET).toBe('secreto');
  });

  it('la variable normal tiene prioridad y los demás *_FILE no se leen', () => {
    const env = { DB_PASSWORD: 'de-entorno', DB_PASSWORD_FILE: '/x', OTRA_FILE: '/etc/passwd' };
    const leer = vi.fn(() => 'del-fichero');
    cargarSecretos(env, leer);
    expect(env.DB_PASSWORD).toBe('de-entorno');
    expect(leer).not.toHaveBeenCalled();
    expect(env.OTRA).toBeUndefined();
  });

  it('si el fichero no se puede leer, falla (no sigue con un secreto vacío)', () => {
    const leer = () => { throw new Error('ENOENT'); };
    expect(() => cargarSecretos({ JWT_SECRET_FILE: '/no/existe' }, leer)).toThrow('ENOENT');
  });
});
