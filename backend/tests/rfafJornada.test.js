import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import rfafActa from '../src/utils/rfafActa.js';

const { leerJornada } = rfafActa;

/** HTML mínimo con la estructura de NFG_CmpJornada (equipos inventados): cada
 * partido en su tabla con los dos equipos, el marcador oculto, el botón del
 * acta y la fecha; el equipo que descansa no lleva acta. */
const partido = (local, codLocal, visitante, codVisitante, acta, fecha, hora) => `
<tr><td><table width="100%"><tbody>
  <tr>
    <td><div class="font_widgetL"><h4><a href="NFG_VisEquipos?cod_primaria=1000119&amp;Codigo_Equipo=${codLocal}"> ${local} </a></h4></div></td>
    <td><h4><strong><span class="wid2_resultado_cerrada"><script>ntype("x",4,0,"fa-1");</script></span></strong></h4>
      ${acta ? `<div class="div_icono_resultados"><a href="/pnfg/NPcd/NFG_CmpPartido?cod_primaria=1000120&amp;CodActa=${acta}&amp;cod_acta=${acta}" title="Acta del partido"></a></div>` : ''}
      ${fecha ? `<br/><span class="horario">${fecha}</span><br/><span class="horario">${hora}</span>` : ''}</td>
    <td><div class="font_widgetV"><h4>${visitante ? `<a href="NFG_VisEquipos?cod_primaria=1000119&amp;Codigo_Equipo=${codVisitante}">${visitante}</a>` : 'Descansa'}</h4></div></td>
  </tr>
</tbody></table></td></tr>`;
const HTML_EJEMPLO = `
<html><body>
<div>Temporada 2026-2027 Anterior Jornada 8 Siguiente</div>
<table class="table table-bordered table-striped table-light">
  ${partido('EQUIPO UNO C.F.', '11', 'EQUIPO DOS C.D.', '22', '9001', '24-10-2026', '18:30')}
  ${partido('EQUIPO TRES', '33', null, null, null, null, null)}
  ${partido('PALMA DEL RIO ATLETICO C.F.', '73', 'EQUIPO CUATRO', '44', '9002', '25-10-2026', '17:00')}
</table>
</body></html>`;

let hayPython = true;
try {
  execFileSync('python3', ['-c', 'import bs4, requests'], { stdio: 'ignore' });
} catch {
  hayPython = false;
}

describe.skipIf(!hayPython)('rfafActa · rfaf_jornada.py', () => {
  let dir;
  let fichero;
  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jornada-'));
    fichero = path.join(dir, 'jornada.html');
    fs.writeFileSync(fichero, HTML_EJEMPLO, 'utf-8');
  });
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('saca cada partido con su acta, equipos, códigos, fecha y hora (sin el que descansa)', async () => {
    const datos = await leerJornada({}, null, { args: ['--html', fichero] });
    expect(datos.jornada).toBe(8);
    expect(datos.partidos).toEqual([
      { codigo_acta: '9001', equipo_local: 'EQUIPO UNO C.F.', codigo_equipo_local: '11', equipo_visitante: 'EQUIPO DOS C.D.',
        codigo_equipo_visitante: '22', fecha: '2026-10-24', hora: '18:30' },
      { codigo_acta: '9002', equipo_local: 'PALMA DEL RIO ATLETICO C.F.', codigo_equipo_local: '73', equipo_visitante: 'EQUIPO CUATRO',
        codigo_equipo_visitante: '44', fecha: '2026-10-25', hora: '17:00' }
    ]);
  });
});
