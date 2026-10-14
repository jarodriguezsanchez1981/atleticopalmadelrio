import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import rfafActa from '../src/utils/rfafActa.js';

const { leerClasificacion, leerActa } = rfafActa;

/** HTML mínimo con la estructura de NFG_VisClasificacion (equipos
 * inventados): la tabla completa (con "Partidos Casa") y la resumida, que se
 * ignora. */
const fila = (pos, equipo, cod, nums) => `
  <tr><td></td><td>${pos}</td><td><a href="NFG_VisCompeticiones_Grupo?cod_primaria=1&amp;codequipo=${cod}&amp;codgrupo=2"> ${equipo} </a></td>
  ${nums.slice(0, 11).map((n) => `<td>${n}</td>`).join('')}<td><span title="Ganado">G</span></td><td>${nums[11]} </td></tr>`;
const HTML_EJEMPLO = `
<html><body>
<h4>Jornada 3 (27-09-2026)</h4>
<table class="table">
  <tr><th>Equipos</th><th>Partidos Casa</th><th>Partidos Fuera</th><th>Goles</th><th>Últimos</th><th>Sanción</th></tr>
  <tr><th>Ordenar por</th><th>Pts</th><th>J</th><th>G</th><th>E</th><th>P</th><th>J</th><th>G</th><th>E</th><th>P</th><th>F</th><th>C</th><th></th><th>Puntos</th></tr>
  ${fila(1, 'EQUIPO UNO C.F.', 11, [7, 2, 2, 0, 0, 1, 0, 1, 0, 6, 2, 0])}
  ${fila(2, 'LA PALMA C.F.', 22, [4, 1, 1, 0, 0, 2, 0, 1, 1, 3, 3, 0])}
  ${fila(3, 'PALMA DEL RIO ATLETICO C.F.', 33, [3, 1, 0, 0, 1, 2, 1, 0, 1, 4, 5, 1])}
</table>
<table class="table">
  <tr><th>Equipos</th><th>Partidos</th><th>Últimos</th><th>Sanción</th></tr>
  <tr><td></td><td>1</td><td>EQUIPO UNO C.F.</td><td>7</td><td>3</td><td>2</td><td>1</td><td>0</td><td>G</td><td>0</td></tr>
</table>
</body></html>`;

let hayPython = true;
try {
  execFileSync('python3', ['-c', 'import bs4, requests'], { stdio: 'ignore' });
} catch {
  hayPython = false;
}

describe.skipIf(!hayPython)('rfafActa · rfaf_clasificacion.py', () => {
  let dir;
  let fichero;
  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'clasif-'));
    fichero = path.join(dir, 'clasificacion.html');
    fs.writeFileSync(fichero, HTML_EJEMPLO, 'utf-8');
  });
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('saca la jornada, su fecha y cada equipo de la tabla completa', async () => {
    const datos = await leerClasificacion({}, null, { args: ['--html', fichero] });
    expect(datos).toMatchObject({ jornada: 3, fecha: '2026-09-27' });
    expect(datos.equipos).toHaveLength(3);
    expect(datos.equipos[2]).toEqual({
      posicion: 3, equipo: 'PALMA DEL RIO ATLETICO C.F.', codigo_equipo: '33', puntos: 3,
      jugados_casa: 1, ganados_casa: 0, empatados_casa: 0, perdidos_casa: 1,
      jugados_fuera: 2, ganados_fuera: 1, empatados_fuera: 0, perdidos_fuera: 1,
      jugados: 3, ganados: 1, empatados: 0, perdidos: 2,
      goles_favor: 4, goles_contra: 5, puntos_sancion: 1
    });
  });

  it('falla si la página no trae la tabla de clasificación', async () => {
    fs.writeFileSync(path.join(dir, 'vacia.html'), '<html><body>Nada</body></html>');
    await expect(leerClasificacion({}, null, { args: ['--html', path.join(dir, 'vacia.html')] }))
      .rejects.toThrow('no trae la tabla de clasificación');
  });
});

describe('rfafActa · sesión compartida acta / clasificación', () => {
  let dir;
  beforeAll(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'clasif-')); });
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('la sesión que rota al leer la clasificación vale para el acta siguiente', async () => {
    const falso = path.join(dir, 'falso.py');
    fs.writeFileSync(falso, [
      'import json, os, sys',
      'print(json.dumps({"args": sys.argv[1:], "resultado": os.environ.get("RFAF_COOKIE", ""), "cookie": "JSESSIONID=ROTADA"}))'
    ].join('\n'));
    const clasif = await leerClasificacion({ codPrimaria: 1, codGrupo: 2, codCompeticion: 3 }, 4, { script: falso });
    expect(clasif.args).toEqual(['1', '2', '3', '4']);
    const acta = await leerActa('1', '2', { script: falso });
    expect(acta.resultado).toBe('JSESSIONID=ROTADA');
  });
});
