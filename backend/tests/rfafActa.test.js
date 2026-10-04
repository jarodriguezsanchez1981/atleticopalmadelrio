import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import rfafActa from '../src/utils/rfafActa.js';

const { leerActa, normalizarNombre, nombreDesdeActa, SCRIPT } = rfafActa;

/** HTML mínimo con la misma estructura que usa RFAF en NFG_CmpPartido,
 * pero con datos inventados (no son personas reales). Cubre: goles normal y
 * de penalti, un gol en propia puerta (suma al rival y no al jugador),
 * tarjetas amarilla y roja de jugadores, y una tarjeta de un miembro del
 * cuerpo técnico (no debe aparecer como jugador). */
const HTML_EJEMPLO = `
<html><body>
<div class="dashboard-stat">
  <div class="details">
    <div class="number">Goles</div>
    <div class="desc">
      <table class="table"><tbody>
        <tr><td><i class="fa-solid fa-futbol" style="color: #0fa020;"></i></td>
            <td><span class="font-blue">(10')</span> PÉREZ GÓMEZ, JUAN </td></tr>
        <tr><td><i class="fa-solid fa-futbol" style="color: rgb(21, 114, 228);"></i></td>
            <td><span class="font-blue">(20')</span> PEREZ GOMEZ, JUAN </td></tr>
        <tr><td><i class="fa-solid fa-futbol" style="color: red;"></i></td>
            <td><span class="font-blue">(30')</span> LOPEZ RUIZ, ALVARO </td></tr>
        <tr><td><i class="fa-solid fa-futbol" style="color: #0fa020;"></i></td>
            <td><span class="font-blue">(40')</span> GARCIA TORRES, MANUEL </td></tr>
      </tbody></table>
    </div>
  </div>
</div>
<div class="dashboard-stat">
  <div class="details">
    <div class="number">EQUIPO PRUEBA C.F. </div>
    <div class="desc">
      <h5><strong>Titulares</strong></h5>
      <table class="table"><tbody>
        <tr><td>7</td><td><img class="fotojug"></td><td>PEREZ GOMEZ, JUAN</td></tr>
        <tr><td>4</td><td><img class="fotojug"></td><td>LOPEZ RUIZ, ALVARO</td></tr>
      </tbody></table>
      <h5><strong>Suplentes</strong></h5>
      <table class="table"><tbody>
        <tr><td>15</td><td><img class="fotojug"></td><td>MARTINEZ DIAZ, SERGIO</td></tr>
      </tbody></table>
      <h4>Tarjetas</h4>
      <table class="table"><tbody>
        <tr><td><img src="https://files.rfaf.es/.../tarj_amar.gif"></td>
            <td><span class="font-blue">(35')</span> LOPEZ RUIZ, ALVARO </td></tr>
        <tr><td><img src="https://files.rfaf.es/.../tarj_roja.gif"></td>
            <td><span class="font-blue">(88')</span> MARTINEZ DIAZ, SERGIO </td></tr>
        <tr><td><img src="https://files.rfaf.es/.../tarj_amar.gif"></td>
            <td><span class="font-blue">(50')</span> ENTRENADOR APELLIDO, TECNICO </td></tr>
      </tbody></table>
    </div>
  </div>
</div>
<div class="dashboard-stat">
  <div class="details">
    <div class="number">OTRO EQUIPO C.F. </div>
    <div class="desc">
      <h5><strong>Titulares</strong></h5>
      <table class="table"><tbody>
        <tr><td>9</td><td><img class="fotojug"></td><td>GARCIA TORRES, MANUEL</td></tr>
      </tbody></table>
      <h5><strong>Suplentes</strong></h5>
      <table class="table"><tbody></tbody></table>
      <h4>Tarjetas</h4>
      <table class="table"><tbody></tbody></table>
    </div>
  </div>
</div>
</body></html>
`;

// El script necesita python3 con BeautifulSoup (lo instala el Dockerfile);
// si en esta máquina no está, se saltan los tests que lo ejecutan.
let hayPython = true;
try {
  execFileSync('python3', ['-c', 'import bs4, requests'], { stdio: 'ignore' });
} catch {
  hayPython = false;
}

describe('rfafActa · normalizarNombre', () => {
  it('quita acentos, comas y mayúsculas/minúsculas', () => {
    expect(normalizarNombre('Pérez Gómez, Juan')).toBe('PEREZ GOMEZ JUAN');
  });
});

describe('rfafActa · nombreDesdeActa', () => {
  it('separa "APELLIDOS, NOMBRE" y lo pasa a mayúscula inicial', () => {
    expect(nombreDesdeActa('PIÑA PINTOR, GONZALO')).toEqual({ nombre: 'Gonzalo', apellidos: 'Piña Pintor' });
  });

  it('deja en minúscula las partículas que no van al principio', () => {
    expect(nombreDesdeActa('CRUZ TORRES, FRANCISCO DE PAULA')).toEqual({ nombre: 'Francisco de Paula', apellidos: 'Cruz Torres' });
  });

  it('sin coma toma la última palabra como nombre', () => {
    expect(nombreDesdeActa('GARCIA LEON MANUEL')).toEqual({ nombre: 'Manuel', apellidos: 'Garcia Leon' });
    expect(nombreDesdeActa('SOLO')).toEqual({ nombre: 'Solo', apellidos: '-' });
  });
});

describe.skipIf(!hayPython)('rfafActa · rfaf_acta.py', () => {
  let dir;
  let fichero;
  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'acta-'));
    fichero = path.join(dir, 'acta.html');
    fs.writeFileSync(fichero, HTML_EJEMPLO, 'utf-8');
  });
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

  const leer = () => leerActa(null, null, { args: ['--html', fichero] });

  it('saca los dos equipos con titulares y suplentes', async () => {
    const acta = await leer();
    expect(acta.local.nombre).toBe('EQUIPO PRUEBA C.F.');
    expect(acta.visitante.nombre).toBe('OTRO EQUIPO C.F.');
    expect(acta.local.jugadores).toHaveLength(3);
    expect(acta.local.jugadores.find((j) => j.dorsal === 15)).toMatchObject({ nombre: 'MARTINEZ DIAZ, SERGIO', titular: false });
  });

  it('cuenta goles normales y de penalti, pero no los de propia puerta', async () => {
    const acta = await leer();
    const goles = Object.fromEntries(acta.local.jugadores.map((j) => [j.nombre, j.goles]));
    expect(goles['PEREZ GOMEZ, JUAN']).toBe(2);
    expect(goles['LOPEZ RUIZ, ALVARO']).toBe(0);
    expect(acta.visitante.jugadores[0].goles).toBe(1);
  });

  it('calcula el resultado sumando el gol en propia puerta al rival', async () => {
    const acta = await leer();
    expect(acta.resultado).toBe('2-2');
  });

  it('cuenta tarjetas de jugadores e ignora las del cuerpo técnico', async () => {
    const acta = await leer();
    const lopez = acta.local.jugadores.find((j) => j.dorsal === 4);
    const martinez = acta.local.jugadores.find((j) => j.dorsal === 15);
    expect(lopez).toMatchObject({ tarjeta_amarilla: 1, tarjeta_roja: 0 });
    expect(martinez).toMatchObject({ tarjeta_amarilla: 0, tarjeta_roja: 1 });
    expect(acta.local.jugadores.reduce((n, j) => n + j.tarjeta_amarilla, 0)).toBe(1);
  });

  it('sin RFAF_COOKIE no llama a RFAF y avisa de que falta la sesión', async () => {
    const cookie = process.env.RFAF_COOKIE;
    delete process.env.RFAF_COOKIE;
    try {
      await expect(leerActa('1000120', '2733994', { script: SCRIPT })).rejects.toMatchObject({ status: 503 });
    } finally {
      if (cookie !== undefined) process.env.RFAF_COOKIE = cookie;
    }
  });

  it('devuelve 502 si el HTML no tiene el formato del acta', async () => {
    fs.writeFileSync(path.join(dir, 'vacio.html'), '<html><body>Nada</body></html>', 'utf-8');
    await expect(leerActa(null, null, { args: ['--html', path.join(dir, 'vacio.html')] }))
      .rejects.toMatchObject({ status: 502 });
  });
});
